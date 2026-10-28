import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase n’est pas configuré. Renseignez les variables publiques dans .env.local.');
  }
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      { auth: {
        // Recovery links belong to the isolated password client, never the portal session.
        detectSessionInUrl: (url, params) => url.pathname !== '/mot-de-passe-reinitialiser' && params.type !== 'recovery'
          && !!(params.access_token || params.error || params.error_description || params.error_code),
      } },
    );
  }
  return browserClient;
}

