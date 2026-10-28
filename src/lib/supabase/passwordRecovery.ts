import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './client';

let recovery: Promise<{ client: SupabaseClient; session: Session }> | null = null;

/** An emailed recovery session stays in memory and cannot replace the portal's stored login. */
export function passwordRecoverySession() {
  if (recovery) return recovery;
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!isSupabaseConfigured() || !['recovery', 'invite'].includes(params.get('type') || '') || !params.get('access_token') || !params.get('refresh_token')) {
    return Promise.reject(new Error('Le lien est expiré ou invalide. Demandez-en un nouveau.'));
  }
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { storageKey: 'escen-password-recovery', persistSession: false, autoRefreshToken: false, detectSessionInUrl: true },
  });
  recovery = (async () => {
    const { data, error } = await client.auth.getSession();
    // Also clear expired tokens, and remove the empty fragment left by the SDK.
    const url = new URL(window.location.href);
    url.hash = '';
    window.history.replaceState(window.history.state, '', url);
    if (error || !data.session) throw new Error('Le lien est expiré ou invalide. Demandez-en un nouveau.');
    return { client, session: data.session };
  })();
  return recovery;
}

export function clearPasswordRecovery() { recovery = null; }
