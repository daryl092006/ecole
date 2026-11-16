import { expect, test } from '@playwright/test';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { PersistentChange, RelationalSnapshot } from '../../src/types/persistence';
import type { QueuedEmail } from '../../src/types/email';
import { loadSecurityApi, securityContext, uuid } from './security-fixture';
import registry from '../../src/data/protectedTeacherAccounts.json';
const { protectedTeacherAccount, protectedTeacherEmails } = loadSecurityApi('server/protectedTeacherAccounts.ts', {}, securityContext()) as typeof import('../../src/server/protectedTeacherAccounts');

type Service = typeof import('../../src/server/teacherDigitalAccess');
function fixture(options: { existing?: boolean; missingProtected?: boolean; emailUnknown?: boolean; licenseFailure?: boolean; identityConflict?: boolean } = {}) {
  const input = { requestId: uuid(10), teacherId: uuid(20), personId: uuid(30), actorId: uuid(40),
    firstname: options.existing || options.missingProtected ? 'Edwige' : 'Alice',
    lastname: options.existing || options.missingProtected ? 'AKOUETE' : 'Nouveau', personalEmail: 'prof@example.test' };
  const state: RelationalSnapshot = { revision: 1, tables: {
    roles: [{ id: uuid(50), code: 'ENS', active: true }], accounts: [], role_grants: [],
    teacher_digital_access: [{ id: input.requestId, teacher_id: input.teacherId, personal_email: input.personalEmail, provisioning_status: 'PROCESSING' }],
  } };
  const authUsers: User[] = options.existing ? [{ id: uuid(60), email: 'a.edwige.coach@escen.university', app_metadata: {}, user_metadata: {} } as User] : [];
  if (options.identityConflict) state.tables.accounts.push({ id: uuid(61), person_id: uuid(999), auth_user_id: uuid(60) });
  const client = {
    async rpc(name: string, args?: { p_changes: PersistentChange[] }) {
      if (name === 'escen_backend_snapshot') return { data: state, error: null };
      if (name !== 'escen_backend_transaction') throw new Error(`RPC inattendue ${name}`);
      for (const change of args!.p_changes) {
        const rows = state.tables[change.table] ||= [];
        if (change.operation === 'insert') rows.push(change.record as typeof rows[number]);
        else Object.assign(rows.find(row => row.id === change.record.id)!, change.record);
      }
      return { data: ++state.revision, error: null };
    },
    auth: { admin: {
      getUserById: async (id: string) => ({ data: { user: authUsers.find(user => user.id === id) }, error: null }),
      listUsers: async () => ({ data: { users: authUsers }, error: null }),
      createUser: async (attributes: object) => {
        const user = { id: uuid(70), ...attributes } as User;
        authUsers.push(user); return { data: { user }, error: null };
      },
      generateLink: async () => ({ data: { properties: { action_link: 'https://auth.example.test/recovery/secret' } }, error: null }),
      updateUserById: async (id: string, attributes: object) => {
        Object.assign(authUsers.find(user => user.id === id)!, attributes);
        return { data: { user: authUsers.find(user => user.id === id) }, error: null };
      },
    } },
  } as unknown as SupabaseClient;
  const requests: { url: string; method: string; payload?: Record<string, unknown> }[] = [];
  const messages: QueuedEmail[] = [];
  const send = (async (url: string, init: RequestInit) => {
    const path = url.replace('https://graph.microsoft.com/v1.0/', '');
    const payload = init.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({ url: path, method: String(init.method), payload });
    if (path.startsWith('users?')) return Response.json({ value: options.existing ? [{ id: uuid(80), displayName: 'Dr. AKOUETE Edwige', userPrincipalName: 'a.edwige.coach@escen.university', accountEnabled: true }] : [] });
    if (path === 'subscribedSkus') return Response.json({ value: [{ skuId: uuid(90), skuPartNumber: 'STANDARDWOFFPACK_FACULTY', consumedUnits: 1, prepaidUnits: { enabled: 100 } }] });
    if (path === 'users' && init.method === 'POST') return Response.json({ id: uuid(81), ...payload });
    if (path.endsWith('/assignLicense')) return Response.json({}, { status: options.licenseFailure ? 403 : 200 });
    throw new Error(`Requête Graph inattendue : ${path}`);
  }) as typeof fetch;
  const service = loadSecurityApi('server/teacherDigitalAccess.ts', client, securityContext()) as Service;
  const run = () => service.completeTeacherDigitalAccess(client, input, {
    send, token: async () => 'test-token',
    configuration: () => ({ ready: true, provider: 'microsoft', from: 'noreply@example.test', issue: null }),
    deliver: async message => { messages.push(message); return options.emailUnknown ? { status: 'UNKNOWN', error: 'NETWORK_AMBIGUOUS' } : { status: 'ACCEPTED', reference: 'test-delivery' }; },
  });
  return { run, state, input, requests, messages, authUsers };
}

test('Accès enseignants : toute la liste protégée et ses variantes sont réservées', () => {
  for (const row of registry) {
    expect(protectedTeacherAccount(row.name, '')?.email).toBe(row.email);
    expect(protectedTeacherEmails.has(row.email)).toBe(true);
  }
  expect(protectedTeacherAccount('Edwige', 'AKOUETE')?.email).toBe('a.edwige.coach@escen.university');
  expect(protectedTeacherAccount('Bruce', 'ATA')?.email).toBe('b.ata.coach@escen.university');
  expect(protectedTeacherAccount('Thomas', 'GNAMALO')?.email).toBe('g.thomas@escen.university');
  expect(protectedTeacherAccount('Nana', 'CHEVREUIL')?.email).toBe('c.nana.coach@escen.university');
  expect(protectedTeacherEmails.has('a.enoc.coah@escen.university')).toBe(true);
  expect(protectedTeacherAccount('Autre', 'AKOUETE')).toBeUndefined();
});

test('Accès enseignants : compte protégé réutilisé sans création, suppression ou mot de passe modifié', async () => {
  const f = fixture({ existing: true });
  expect(await f.run()).toMatchObject({ status: 'SENT', reusedMicrosoftAccount: true });
  expect(f.requests.every(request => request.method === 'GET')).toBe(true);
  expect(f.authUsers).toHaveLength(1);
  expect(f.messages[0].recipient_email).toBe(f.input.personalEmail);
  expect(f.messages[0].text_body).toContain('mot de passe habituel');
  expect(f.messages[0].text_body).not.toContain('Mot de passe temporaire');
  expect(f.state.tables.accounts[0]).toMatchObject({ person_id: f.input.personId, auth_user_id: uuid(60), active: true });
});

test('Accès enseignants : nouvelle identité, licence enseignant, rôle ENS et envoi au mail personnel', async () => {
  const f = fixture();
  expect(await f.run()).toMatchObject({ status: 'SENT', institutionalEmail: 'n.alice.coach@escen.university', reusedMicrosoftAccount: false });
  expect(f.requests.filter(request => request.method === 'POST').map(request => request.url)).toEqual(['users', `users/${uuid(81)}/assignLicense`]);
  expect(f.requests.find(request => request.url === 'users')?.payload).toMatchObject({ otherMails: [f.input.personalEmail], passwordProfile: { forceChangePasswordNextSignIn: true } });
  expect(f.messages).toHaveLength(1);
  expect(f.messages[0].recipient_email).toBe(f.input.personalEmail);
  expect(f.messages[0].text_body).toContain('Mot de passe temporaire');
  expect(f.messages[0].text_body).toContain('https://auth.example.test/recovery/secret');
  expect(JSON.stringify(f.state)).not.toContain('recovery/secret');
  expect(JSON.stringify(f.state)).not.toContain('password');
  expect(f.state.tables.role_grants[0]).toMatchObject({ role_id: uuid(50), account_id: f.state.tables.accounts[0].id });
  expect(f.state.tables.teacher_digital_access[0]).toMatchObject({ provisioning_status: 'READY', last_error_code: null });
});

test('Accès enseignants : un compte protégé absent ne doit jamais être recréé', async () => {
  const f = fixture({ missingProtected: true });
  expect(await f.run()).toMatchObject({ status: 'FAILED' });
  expect(f.requests.every(request => request.method === 'GET')).toBe(true);
  expect(f.authUsers).toEqual([]);
  expect(f.messages).toEqual([]);
  expect(f.state.tables.teacher_digital_access[0].last_error_code).toBe('IDENTITY_CONFLICT');
});

test('Accès enseignants : un compte portail appartenant à une autre personne est refusé', async () => {
  const f = fixture({ existing: true, identityConflict: true });
  expect(await f.run()).toMatchObject({ status: 'FAILED' });
  expect(f.messages).toEqual([]);
  expect(f.state.tables.accounts).toHaveLength(1);
  expect(f.state.tables.accounts[0].person_id).toBe(uuid(999));
});

test('Accès enseignants : licence refusée, aucune fausse activation ni suppression compensatoire', async () => {
  const f = fixture({ licenseFailure: true });
  expect(await f.run()).toMatchObject({ status: 'FAILED' });
  expect(f.authUsers).toEqual([]);
  expect(f.messages).toEqual([]);
  expect(f.state.tables.teacher_digital_access[0]).toMatchObject({ provisioning_status: 'FAILED', last_error_code: 'LICENSE_REJECTED' });
  expect(f.requests.some(request => request.method === 'DELETE')).toBe(false);
});

test('Accès enseignants : envoi ambigu conservé sans nouvelle tentative automatique', async () => {
  const f = fixture({ existing: true, emailUnknown: true });
  expect(await f.run()).toMatchObject({ status: 'UNKNOWN' });
  expect(f.messages).toHaveLength(1);
  expect(f.state.tables.teacher_digital_access[0]).toMatchObject({ provisioning_status: 'UNKNOWN', last_error_code: 'NETWORK_AMBIGUOUS' });
});

test('Teams : adresse Microsoft conservée quand le contact et la connexion sont personnels', async () => {
  const person = { id: uuid(30), firstname: 'Alice', lastname: 'Nouveau', email: 'prof@example.test' };
  const state: RelationalSnapshot = { revision: 1, tables: { accounts: [{ id: uuid(31), person_id: person.id, auth_user_id: uuid(32) }] } };
  const client = { auth: { admin: { getUserById: async () => ({ data: { user: {
    email: 'prof@example.test', app_metadata: { escen_m365_email: 'n.alice.coach@escen.university' },
  } }, error: null }) } } } as unknown as SupabaseClient;
  const service = loadSecurityApi('server/teacherMicrosoftIdentity.ts', client, securityContext()) as typeof import('../../src/server/teacherMicrosoftIdentity');
  expect(await service.teacherMicrosoftEmail(client, state, person)).toBe('n.alice.coach@escen.university');
  expect(await service.teacherMicrosoftEmail({} as SupabaseClient, { revision: 1, tables: {} }, person)).toBeNull();
  expect(await service.teacherMicrosoftEmail({} as SupabaseClient, { revision: 1, tables: {} }, {
    ...person, firstname: 'Edwige', lastname: 'AKOUETE',
  })).toBe('a.edwige.coach@escen.university');
});

test('Contact historique : accès envoyés au mail personnel sans réinitialiser Microsoft ni renvoyer automatiquement', async () => {
  const person = { id: uuid(30), firstname: 'Edwige', lastname: 'AKOUETE', email: null };
  const state: RelationalSnapshot = { revision: 1, tables: { accounts: [{ id: uuid(31), person_id: person.id, auth_user_id: uuid(32), active: true }] } };
  let links = 0;
  const client = { auth: { admin: {
    getUserById: async () => ({ data: { user: { email: 'a.edwige.coach@escen.university', app_metadata: {} } }, error: null }),
    generateLink: async () => { links++; return { data: { properties: { action_link: 'https://auth.example.test/private-link' } }, error: null }; },
  } } } as unknown as SupabaseClient;
  const service = loadSecurityApi('server/existingTeacherAccessEmail.ts', client, securityContext()) as typeof import('../../src/server/existingTeacherAccessEmail');
  const messages: QueuedEmail[] = [];
  const result = await service.emailExistingTeacherAccess(client, state, person, uuid(20), 'edwige@example.test', uuid(40), {
    configuration: () => ({ ready: true, provider: 'microsoft', from: 'noreply@example.test', issue: null }),
    deliver: async message => { messages.push(message); return { status: 'UNKNOWN', error: 'NETWORK_AMBIGUOUS' }; },
  });
  expect(result).toMatchObject({ status: 'UNKNOWN', reusedMicrosoftAccount: true });
  expect(links).toBe(1);
  expect(messages).toHaveLength(1);
  expect(messages[0].recipient_email).toBe('edwige@example.test');
  expect(messages[0].text_body).toContain('mot de passe Microsoft 365 existants sont conservés');
  expect(messages[0].text_body).toContain('https://auth.example.test/private-link');
});
