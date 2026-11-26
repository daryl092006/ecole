import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
import type { TeacherDigitalAccessResult } from '@/types/teacherDigitalAccess';
import { teacherMicrosoftEmail } from './teacherMicrosoftIdentity';
import { deliverEmail, emailConfiguration } from './emailTransport';
import { buildEscenEmailHtml } from './escenEmailTemplate';

/** Completing a legacy contact sends access instructions without recreating or resetting Microsoft 365. */
export async function emailExistingTeacherAccess(client: SupabaseClient, snapshot: RelationalSnapshot,
  person: DatabaseRow, teacherId: string, personalEmail: string, actorId: string,
  dependencies = { configuration: emailConfiguration, deliver: deliverEmail }): Promise<TeacherDigitalAccessResult> {
  try {
    if (!client.auth?.admin || !dependencies.configuration().ready) return { status: 'FAILED' };
    const account = snapshot.tables.accounts?.find(row => row.person_id === person.id && row.active && !row.archived_at);
    if (!account?.auth_user_id) return { status: 'FAILED' };
    const user = await client.auth.admin.getUserById(String(account.auth_user_id));
    if (user.error || !user.data.user?.email) return { status: 'FAILED' };
    const institutionalEmail = await teacherMicrosoftEmail(client, snapshot, person);
    if (!institutionalEmail) return { status: 'FAILED' };
    const recovery = await client.auth.admin.generateLink({ type: 'recovery', email: user.data.user.email,
      options: { redirectTo: 'https://portail.escen.university/mot-de-passe-reinitialiser' } });
    if (recovery.error || !recovery.data.properties.action_link) return { status: 'FAILED', institutionalEmail };
    const now = new Date().toISOString();
    const text = `Bonjour ${String(person.firstname)} ${String(person.lastname)},\n\nVotre e-mail personnel a été complété avant la programmation de vos cours.\n\nMicrosoft 365 : https://office.com\nIdentifiant : ${institutionalEmail}\nVotre compte et votre mot de passe Microsoft 365 existants sont conservés.\n\nEspace enseignant : https://portail.escen.university/\nIdentifiant : ${user.data.user.email}\nChoisissez votre mot de passe portail via ce lien personnel :\n${recovery.data.properties.action_link}\n\nNe partagez pas ce message.\nSupport : support.informatique@escen.university`;
    const html = buildEscenEmailHtml(`
      <h2 style="color: #01b4d5; margin-top: 0; font-size: 20px;">Bienvenue sur votre Espace Enseignant ESCEN</h2>
      <p style="margin-top: 16px;">Bonjour <strong>${String(person.firstname)} ${String(person.lastname)}</strong>,</p>
      <p>Votre e-mail personnel a été complété avant la programmation de vos cours. Voici vos accès officiels :</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Identifiant (Portail &amp; Microsoft 365) :</p>
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold; color: #0f172a;">${institutionalEmail}</p>
        <p style="margin: 0; font-size: 14px; color: #64748b;">Votre compte et votre mot de passe Microsoft 365 existants sont conservés.</p>
      </div>
      <p style="text-align: center; margin: 28px 0 14px 0;">
        <a href="${recovery.data.properties.action_link}" style="display: inline-block; padding: 12px 24px; background-color: #01b4d5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px rgba(1,180,213,0.2); margin: 4px 6px;">
          Choisir mon mot de passe Portail
        </a>
        <a href="https://office.com" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 4px 6px;">
          Ouvrir Microsoft 365
        </a>
      </p>
    `);
    const outcome = await dependencies.deliver({ id: randomUUID(), academic_year_id: '', event_type: 'teaching_assignment_created',
      source_table: 'teachers', source_id: teacherId, recipient_email: personalEmail,
      recipient_name: `${String(person.firstname)} ${String(person.lastname)}`, subject: 'ESCEN — Vos accès Microsoft 365 et espace enseignant',
      status: 'PROCESSING', attempts: 1, provider_reference: null, accepted_at: null, last_error_code: null,
      requested_by: actorId, reason: 'Contact personnel complété avant programmation.', version: 1, created_at: now, updated_at: now,
      text_body: text, html_body: html,
    });
    return { status: outcome.status === 'ACCEPTED' ? 'SENT' : outcome.status === 'UNKNOWN' ? 'UNKNOWN' : 'FAILED',
      institutionalEmail, reusedMicrosoftAccount: true };
  } catch { return { status: 'FAILED' }; }
}
