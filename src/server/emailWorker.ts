import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueuedEmail } from '@/types/email';
import { deliverEmail, emailConfiguration } from '@/server/emailTransport';

export async function processEmailBatch(client: Pick<SupabaseClient, 'rpc'>, env: Record<string, string | undefined> = process.env, send: typeof fetch = fetch) {
  if (!emailConfiguration(env).ready) return { configured: false, processed: 0, accepted: 0, failed: 0, unknown: 0 };
  const token = randomUUID();
  // Sequential network requests stay below the route's execution time budget.
  const claimed = await client.rpc('escen_email_claim', { p_lock_token: token, p_limit: 3 });
  if (claimed.error || !Array.isArray(claimed.data)) throw new Error('File d’envoi indisponible.');
  const counts = { configured: true, processed: 0, accepted: 0, failed: 0, unknown: 0 };
  for (const message of claimed.data as QueuedEmail[]) {
    const result = await deliverEmail(message, env, send);
    const completed = await client.rpc('escen_email_complete', {
      p_id: message.id, p_lock_token: token, p_outcome: result.status,
      p_provider_reference: result.status === 'ACCEPTED' ? result.reference : null,
      p_error_code: result.status === 'ACCEPTED' ? null : result.error,
    });
    // The lease will become UNKNOWN if persistence fails after an external send.
    if (completed.error) throw new Error('État d’envoi incertain. Vérifiez le suivi avant toute reprise.');
    counts.processed++;
    if (result.status === 'ACCEPTED') counts.accepted++;
    else if (result.status === 'FAILED') counts.failed++;
    else counts.unknown++;
  }
  return counts;
}
