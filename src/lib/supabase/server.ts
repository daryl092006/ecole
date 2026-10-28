import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const READ_ONLY_RPCS = new Set([
  'escen_backend_snapshot',
  'escen_history_catalog',
  'escen_academic_year_context',
  'escen_account_session',
  'escen_history_student_ids_year',
  'escen_history_catalog_year',
  'escen_import_overview',
  'escen_subject_features',
  'escen_audit_journal_page',
  'escen_admissions_context',
  'escen_application_notices',
  'escen_email_page',
  'escen_history_page',
  'escen_history_page_scoped',
  'escen_history_page_year',
  'escen_history_row_matches_year',
  'escen_catalog_history_links',
  'escen_history_exam',
  'escen_history_document',
  'escen_admission_document',
  'escen_brochures_public',
]);

function isReadOnlyRpc(name: string, args?: Record<string, unknown>): boolean {
  if (READ_ONLY_RPCS.has(name)) return true;
  if (name === 'escen_website_manage') {
    return ['overview', 'articles', 'admissions', 'document'].includes(String(args?.p_action || ''));
  }
  if (name === 'escen_brochures_manage') {
    return args?.p_action === 'list';
  }
  if (name === 'escen_website_public') {
    return ['year', 'intakes', 'draft', 'home', 'articles', 'programs'].includes(String(args?.p_action || ''));
  }
  if (name === 'escen_candidate_dossier') {
    return args?.p_action === 'read';
  }
  return false;
}

function isTransientRpcError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === '57014' ||
    code === '53300' ||
    code === '08006' ||
    code === '08003' ||
    code.startsWith('PGRST00') ||
    msg.includes('timeout') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('bad gateway') ||
    msg.includes('service unavailable')
  );
}

const READ_CACHE_TTL_MS = 4000;
const HISTORY_CACHE_TTL_MS = 60000;
const HISTORY_RPCS = new Set([
  'escen_history_catalog',
  'escen_history_student_ids_year',
  'escen_history_catalog_year',
  'escen_import_overview',
  'escen_subject_features',
]);
const readCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlightRpc = new Map<string, Promise<unknown>>();
const authCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlightAuth = new Map<string, Promise<unknown>>();

export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Connexion serveur indisponible.');
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const rawRpc = client.rpc.bind(client);
  client.rpc = ((fn: string, args?: Record<string, unknown>, options?: unknown) => {
    const readOnly = isReadOnlyRpc(fn, args);
    if (!readOnly) {
      readCache.clear();
      return (rawRpc as (f: string, a?: unknown, o?: unknown) => ReturnType<typeof rawRpc>)(fn, args, options);
    }

    const cacheKey = `${fn}:${JSON.stringify(args ?? {})}`;
    const now = Date.now();
    const cached = readCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return Promise.resolve(structuredClone(cached.value)) as unknown as ReturnType<typeof rawRpc>;
    }

    const existing = inFlightRpc.get(cacheKey);
    if (existing) {
      return existing.then(res => structuredClone(res)) as unknown as ReturnType<typeof rawRpc>;
    }

    const run = (async () => {
      const invoke = rawRpc as unknown as (f: string, a?: unknown, o?: unknown) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
      let result = await invoke(fn, args, options);
      if (result.error && isTransientRpcError(result.error)) {
        await new Promise(resolve => setTimeout(resolve, 250));
        result = await invoke(fn, args, options);
      }
      if (!result.error) {
        const ttl = HISTORY_RPCS.has(fn) ? HISTORY_CACHE_TTL_MS : READ_CACHE_TTL_MS;
        readCache.set(cacheKey, { expiresAt: Date.now() + ttl, value: result });
      }
      return result;
    })().finally(() => {
      inFlightRpc.delete(cacheKey);
    });

    inFlightRpc.set(cacheKey, run);
    return run.then(res => structuredClone(res)) as unknown as ReturnType<typeof rawRpc>;
  }) as typeof client.rpc;

  const rawGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = (async (jwt?: string) => {
    if (!jwt) return rawGetUser(jwt);
    const now = Date.now();
    const cached = authCache.get(jwt);
    if (cached && cached.expiresAt > now) {
      return structuredClone(cached.value) as Awaited<ReturnType<typeof rawGetUser>>;
    }
    const existing = inFlightAuth.get(jwt);
    if (existing) {
      return (await existing) as Awaited<ReturnType<typeof rawGetUser>>;
    }
    const run = (async () => {
      let res = await rawGetUser(jwt);
      if (res.error && (!res.error.status || res.error.status === 429 || res.error.status >= 500)) {
        await new Promise(resolve => setTimeout(resolve, 200));
        res = await rawGetUser(jwt);
      }
      if (!res.error && res.data?.user) {
        authCache.set(jwt, { expiresAt: Date.now() + READ_CACHE_TTL_MS, value: res });
      }
      return res;
    })().finally(() => {
      inFlightAuth.delete(jwt);
    });
    inFlightAuth.set(jwt, run);
    return (await run) as Awaited<ReturnType<typeof rawGetUser>>;
  }) as typeof client.auth.getUser;

  return client;
}
