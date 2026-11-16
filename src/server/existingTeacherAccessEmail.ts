import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
import type { TeacherDigitalAccessResult } from '@/types/teacherDigitalAccess';
import { teacherMicrosoftEmail } from './teacherMicrosoftIdentity';
import { deliverEmail, emailConfiguration } from './emailTransport';

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
    const outcome = await dependencies.deliver({ id: randomUUID(), academic_year_id: '', event_type: 'teaching_assignment_created',
      source_table: 'teachers', source_id: teacherId, recipient_email: personalEmail,
      recipient_name: `${String(person.firstname)} ${String(person.lastname)}`, subject: 'ESCEN — Vos accès Microsoft 365 et espace enseignant',
      status: 'PROCESSING', attempts: 1, provider_reference: null, accepted_at: null, last_error_code: null,
      requested_by: actorId, reason: 'Contact personnel complété avant programmation.', version: 1, created_at: now, updated_at: now,
      text_body: text, html_body: '',
    });
    return { status: outcome.status === 'ACCEPTED' ? 'SENT' : outcome.status === 'UNKNOWN' ? 'UNKNOWN' : 'FAILED',
      institutionalEmail, reusedMicrosoftAccount: true };
  } catch { return { status: 'FAILED' }; }
}
