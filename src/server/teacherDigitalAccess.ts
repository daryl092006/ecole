import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { PersistentChange, RelationalSnapshot } from '@/types/persistence';
import type { TeacherDigitalAccessResult } from '@/types/teacherDigitalAccess';
import { teacherIdentityKey, teacherPersonalEmailSchema } from '@/services/teacherIdentityService';
import { protectedTeacherAccount, protectedTeacherEmails } from '@/server/protectedTeacherAccounts';
import { sanitizeNameToken, getGraphAccessToken } from '@/services/microsoftGraphService';
import { deliverEmail, emailConfiguration } from '@/server/emailTransport';

interface Input {
  requestId: string; teacherId: string; personId: string; actorId: string;
  firstname: string; lastname: string; personalEmail: string;
}
interface MicrosoftUser {
  id: string; userPrincipalName: string; displayName: string;
  otherMails?: string[]; accountEnabled?: boolean;
}
type ErrorCode = 'CONFIGURATION' | 'IDENTITY_CONFLICT' | 'MICROSOFT_REJECTED' | 'LICENSE_REJECTED'
  | 'AUTH_REJECTED' | 'CONCURRENT_UPDATE' | 'NETWORK_AMBIGUOUS' | 'EMAIL_REJECTED';
class ProvisionError extends Error {
  constructor(public code: ErrorCode) { super(code); }
}
export function teacherAccessRequest(teacherId: string, personalEmail: string, actorId: string): PersistentChange {
  return { table: 'teacher_digital_access', operation: 'insert', record: {
    id: randomUUID(), teacher_id: teacherId, personal_email: teacherPersonalEmailSchema.parse(personalEmail),
    provisioning_status: 'PROCESSING', requested_by: actorId,
    reason: 'Création des accès enseignant et envoi à son e-mail personnel.',
  } };
}

/** One attempt per committed request. No delete, password reset or automatic retry of Graph POSTs. */
export async function completeTeacherDigitalAccess(client: SupabaseClient, input: Input, dependencies = {
  send: fetch, token: getGraphAccessToken, configuration: emailConfiguration, deliver: deliverEmail,
}): Promise<TeacherDigitalAccessResult> {
  let institutionalEmail: string | undefined;
  let microsoftId: string | undefined;
  let accountId: string | undefined;
  let ready = false;
  let reused = false;
  let microsoftPassword: string | undefined;
  const snapshot = async () => {
    const result = await client.rpc('escen_backend_snapshot');
    if (result.error) throw new ProvisionError('CONCURRENT_UPDATE');
    return result.data as RelationalSnapshot;
  };
  const save = async (state: RelationalSnapshot, changes: PersistentChange[]) => {
    const result = await client.rpc('escen_backend_transaction', {
      p_actor_id: input.actorId, p_expected_revision: state.revision, p_changes: changes,
    });
    if (result.error) throw new ProvisionError('CONCURRENT_UPDATE');
  };
  const finish = async (status: 'READY' | 'FAILED' | 'UNKNOWN', error: ErrorCode | null, reason: string) => {
    await save(await snapshot(), [{ table: 'teacher_digital_access', operation: 'update', record: {
      id: input.requestId, provisioning_status: status, last_error_code: error, reason,
      updated_at: new Date().toISOString(), ...(institutionalEmail ? { institutional_email: institutionalEmail } : {}),
      ...(microsoftId ? { m365_user_id: microsoftId } : {}), ...(accountId ? { account_id: accountId } : {}),
    } }]);
  };
  try {
    const personalEmail = teacherPersonalEmailSchema.parse(input.personalEmail);
    if (!client.auth?.admin || !dependencies.configuration().ready) throw new ProvisionError('CONFIGURATION');
    const state = await snapshot();
    const member = state.tables.accounts?.find(row => row.person_id === input.personId);
    if (member?.archived_at) throw new ProvisionError('IDENTITY_CONFLICT');
    let portalUser: User | undefined;
    if (member?.auth_user_id) {
      const result = await client.auth.admin.getUserById(String(member.auth_user_id));
      if (result.error || !result.data.user?.email) throw new ProvisionError('AUTH_REJECTED');
      portalUser = result.data.user;
    }
    const registered = protectedTeacherAccount(input.firstname, input.lastname);
    const token = await dependencies.token();
    if (!token) throw new ProvisionError('CONFIGURATION');
    const graph = async (path: string, payload?: object) => {
      let response: Response;
      try {
        response = await dependencies.send(`https://graph.microsoft.com/v1.0/${path}`, {
          method: payload ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          ...(payload ? { body: JSON.stringify(payload) } : {}),
        });
      } catch { throw new ProvisionError('NETWORK_AMBIGUOUS'); }
      if (!response.ok) throw new ProvisionError(payload && response.status >= 500 ? 'NETWORK_AMBIGUOUS' : 'MICROSOFT_REJECTED');
      try { return await response.json(); }
      catch { throw new ProvisionError(payload ? 'NETWORK_AMBIGUOUS' : 'MICROSOFT_REJECTED'); }
    };
    const users: MicrosoftUser[] = [];
    let path: string | undefined = 'users?$select=id,displayName,userPrincipalName,otherMails,accountEnabled&$top=999';
    while (path) {
      const page = await graph(path);
      users.push(...page.value);
      const next = page['@odata.nextLink'] as string | undefined;
      if (next && !next.startsWith('https://graph.microsoft.com/v1.0/users?')) throw new ProvisionError('MICROSOFT_REJECTED');
      path = next?.slice('https://graph.microsoft.com/v1.0/'.length);
    }
    const metadataEmail = typeof portalUser?.app_metadata.escen_m365_email === 'string'
      && portalUser.app_metadata.escen_m365_email.endsWith('@escen.university') ? portalUser.app_metadata.escen_m365_email.toLowerCase() : undefined;
    const boundEmail = metadataEmail || (portalUser?.email?.endsWith('@escen.university') ? portalUser.email.toLowerCase() : undefined);
    if (registered && boundEmail && ![registered.email, ...('aliases' in registered ? registered.aliases || [] : [])].includes(boundEmail)) {
      throw new ProvisionError('IDENTITY_CONFLICT');
    }
    const expectedEmails = registered ? [registered.email, ...('aliases' in registered ? registered.aliases || [] : [])]
      : boundEmail ? [boundEmail] : [];
    const matches = users.filter(user => expectedEmails.length ? expectedEmails.includes(user.userPrincipalName.toLowerCase())
      : (user.otherMails || []).some(mail => mail.toLowerCase() === personalEmail)
        && teacherIdentityKey(user.displayName) === teacherIdentityKey(`${input.firstname} ${input.lastname}`));
    if (matches.length > 1 || expectedEmails.length && !matches.length) throw new ProvisionError('IDENTITY_CONFLICT');
    let microsoftUser = matches[0];
    reused = !!microsoftUser;
    if (microsoftUser && !microsoftUser.accountEnabled) throw new ProvisionError('IDENTITY_CONFLICT');
    if (!microsoftUser) {
      const occupied = new Set([...users.map(user => user.userPrincipalName.toLowerCase()), ...protectedTeacherEmails]);
      const initial = sanitizeNameToken(input.lastname)[0] || 'e';
      const firstname = sanitizeNameToken(input.firstname.split(/[\s-]+/)[0]) || 'enseignant';
      let suffix = 1;
      do { institutionalEmail = `${initial}.${firstname}.coach${suffix === 1 ? '' : suffix}@escen.university`; suffix++; }
      while (occupied.has(institutionalEmail));
      // Discover a FACULTY license; never fall back to a student license.
      const skus = await graph('subscribedSkus');
      const sku = skus.value.find((row: { skuId: string; skuPartNumber: string; consumedUnits: number; prepaidUnits: { enabled: number } }) =>
        (process.env.AZURE_TEACHER_SKU_ID ? row.skuId === process.env.AZURE_TEACHER_SKU_ID : row.skuPartNumber === 'STANDARDWOFFPACK_FACULTY')
        && row.skuPartNumber.includes('FACULTY') && row.consumedUnits < row.prepaidUnits.enabled);
      if (!sku) throw new ProvisionError('LICENSE_REJECTED');
      microsoftPassword = `Es#9Aa${randomBytes(15).toString('base64url')}`;
      microsoftUser = await graph('users', {
        accountEnabled: true, displayName: `${input.firstname} ${input.lastname}`, givenName: input.firstname,
        surname: input.lastname, userPrincipalName: institutionalEmail, mailNickname: institutionalEmail.split('@')[0],
        usageLocation: 'TG', otherMails: [personalEmail],
        passwordProfile: { password: microsoftPassword, forceChangePasswordNextSignIn: true },
      });
      microsoftId = microsoftUser.id;
      try { await graph(`users/${microsoftUser.id}/assignLicense`, { addLicenses: [{ skuId: sku.skuId }], removeLicenses: [] }); }
      catch (error) { if (error instanceof ProvisionError && error.code === 'NETWORK_AMBIGUOUS') throw error; throw new ProvisionError('LICENSE_REJECTED'); }
    }
    institutionalEmail = microsoftUser.userPrincipalName.toLowerCase();
    microsoftId = microsoftUser.id;
    if (!portalUser) {
      for (let page = 1; ; page++) {
        if (page > 100) throw new ProvisionError('AUTH_REJECTED');
        const result = await client.auth.admin.listUsers({ page, perPage: 1000 });
        if (result.error) throw new ProvisionError('AUTH_REJECTED');
        portalUser = result.data.users.find(user => user.email?.toLowerCase() === institutionalEmail);
        if (portalUser || result.data.users.length < 1000) break;
      }
      if (portalUser && (state.tables.accounts || []).some(row => row.auth_user_id === portalUser!.id && row.person_id !== input.personId)) {
        throw new ProvisionError('IDENTITY_CONFLICT');
      }
      if (portalUser?.app_metadata.person_id && portalUser.app_metadata.person_id !== input.personId) throw new ProvisionError('IDENTITY_CONFLICT');
      if (!portalUser) {
        const result = await client.auth.admin.createUser({ email: institutionalEmail, email_confirm: true,
          password: `Po#8Bb${randomBytes(18).toString('base64url')}`,
          app_metadata: { must_change_password: true, person_id: input.personId },
          user_metadata: { firstname: input.firstname, lastname: input.lastname },
        });
        if (result.error || !result.data.user) throw new ProvisionError('AUTH_REJECTED');
        portalUser = result.data.user;
      }
    }
    const current = await snapshot();
    const conflictingAccount = current.tables.accounts?.find(row => row.auth_user_id === portalUser!.id && row.person_id !== input.personId);
    const currentMember = current.tables.accounts?.find(row => row.person_id === input.personId);
    if (conflictingAccount || currentMember?.archived_at || currentMember?.auth_user_id && currentMember.auth_user_id !== portalUser.id) throw new ProvisionError('IDENTITY_CONFLICT');
    const role = current.tables.roles?.find(row => row.code === 'ENS' && row.active !== false);
    if (!role) throw new ProvisionError('CONFIGURATION');
    accountId = currentMember?.id || randomUUID();
    const changes: PersistentChange[] = [{ table: 'accounts', operation: currentMember ? 'update' : 'insert', record: {
      id: accountId, person_id: input.personId, auth_user_id: portalUser.id, active: true,
      reason: 'Activation des accès du profil enseignant ; identité vérifiée.',
    } }];
    if (!(current.tables.role_grants || []).some(row => row.account_id === accountId && row.role_id === role.id
      && Date.parse(String(row.valid_from)) <= Date.now() && (!row.valid_until || Date.parse(String(row.valid_until)) > Date.now()))) {
      changes.push({ table: 'role_grants', operation: 'insert', record: { id: randomUUID(), account_id: accountId,
        role_id: role.id, granted_by: input.actorId, valid_from: new Date().toISOString(),
        reason: 'Accès personnel enseignant créé avec son profil.',
      } });
    }
    changes.push({ table: 'teacher_digital_access', operation: 'update', record: { id: input.requestId,
      institutional_email: institutionalEmail, m365_user_id: microsoftId, account_id: accountId,
      provisioning_status: 'READY', updated_at: new Date().toISOString(), last_error_code: null,
      reason: 'Comptes associés au dossier enseignant ; notification à envoyer.',
    } });
    await save(current, changes);
    ready = true;
    const metadata = await client.auth.admin.updateUserById(portalUser.id, { app_metadata: {
      ...portalUser.app_metadata, escen_m365_email: institutionalEmail, escen_m365_user_id: microsoftId,
    } });
    if (metadata.error) throw new ProvisionError('AUTH_REJECTED');
    const recovery = await client.auth.admin.generateLink({ type: 'recovery', email: portalUser.email!,
      options: { redirectTo: 'https://portail.escen.university/mot-de-passe-reinitialiser' } });
    if (recovery.error || !recovery.data.properties.action_link) throw new ProvisionError('AUTH_REJECTED');
    const text = `Bonjour ${input.firstname} ${input.lastname},\n\nVotre espace enseignant ESCEN est activé.\n\nMicrosoft 365 : https://office.com\nIdentifiant : ${institutionalEmail}\n${microsoftPassword ? `Mot de passe temporaire : ${microsoftPassword}\nChoisissez un nouveau mot de passe à la première connexion.` : 'Votre compte Microsoft 365 existant est conservé. Utilisez votre mot de passe habituel.'}\n\nEspace enseignant : https://portail.escen.university/\nIdentifiant : ${portalUser.email}\nChoisissez votre mot de passe portail avec ce lien personnel :\n${recovery.data.properties.action_link}\n\nNe partagez pas ce message.\nSupport : support.informatique@escen.university`;
    const now = new Date().toISOString();
    const outcome = await dependencies.deliver({ id: input.requestId, academic_year_id: '', event_type: 'teaching_assignment_created',
      source_table: 'teachers', source_id: input.teacherId, recipient_email: personalEmail,
      recipient_name: `${input.firstname} ${input.lastname}`, subject: 'ESCEN — Vos accès Microsoft 365 et espace enseignant',
      status: 'PROCESSING', attempts: 1, provider_reference: null, accepted_at: null, last_error_code: null,
      requested_by: input.actorId, reason: 'Envoi initial des accès enseignant.', version: 1, created_at: now, updated_at: now,
      text_body: text, html_body: '',
    });
    if (outcome.status !== 'ACCEPTED') {
      const ambiguous = outcome.status === 'UNKNOWN';
      await finish(ambiguous ? 'UNKNOWN' : 'FAILED', ambiguous ? 'NETWORK_AMBIGUOUS' : 'EMAIL_REJECTED',
        'Comptes créés ; envoi des accès non confirmé. Intervention du support requise, sans recréation Microsoft.');
      return { status: ambiguous ? 'UNKNOWN' : 'FAILED', institutionalEmail, reusedMicrosoftAccount: reused };
    }
    // Delivery is confirmed even if the final local status update is temporarily unavailable.
    try { await finish('READY', null, `Accès envoyés à l’e-mail personnel ; référence ${outcome.reference}.`); }
    catch { /* Do not turn an accepted message into an instruction to resend it. */ }
    return { status: 'SENT', institutionalEmail, reusedMicrosoftAccount: reused };
  } catch (error) {
    const code = error instanceof ProvisionError ? error.code : 'CONFIGURATION';
    const unknown = code === 'NETWORK_AMBIGUOUS';
    // The committed teacher profile remains visible. Never present partial setup as delivered access.
    try { await finish(unknown ? 'UNKNOWN' : 'FAILED', code,
      `${ready ? 'Comptes associés ; notification incomplète.' : 'Activation incomplète.'} Support requis ; aucun compte existant supprimé ni réinitialisé.`); }
    catch { /* Initial PROCESSING record remains for investigation; no automatic external retry. */ }
    return { status: unknown ? 'UNKNOWN' : 'FAILED', institutionalEmail, reusedMicrosoftAccount: reused };
  }
}
