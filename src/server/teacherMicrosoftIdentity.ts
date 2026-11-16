import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
import { protectedTeacherAccount } from '@/server/protectedTeacherAccounts';

/** The personal contact address must never become the organizer of an ESCEN Teams meeting. */
export async function teacherMicrosoftEmail(client: SupabaseClient, snapshot: RelationalSnapshot, person?: DatabaseRow): Promise<string | null> {
  if (!person) return null;
  const institutional = (value: unknown): string | null => typeof value === 'string'
    && /^[^\s@]+@escen\.university$/i.test(value.trim()) ? value.trim().toLowerCase() : null;
  const account = snapshot.tables.accounts?.find(row => row.person_id === person.id && !row.archived_at);
  if (account?.auth_user_id && client.auth?.admin) {
    const result = await client.auth.admin.getUserById(String(account.auth_user_id));
    if (!result.error && result.data.user) {
      const email = institutional(result.data.user.app_metadata.escen_m365_email) || institutional(result.data.user.email);
      if (email) return email;
    }
  }
  return protectedTeacherAccount(String(person.firstname || ''), String(person.lastname || ''))?.email
    || institutional(person.email);
}
