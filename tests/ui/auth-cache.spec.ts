import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('Auth : une réponse antérieure en vol ne rétablit pas un ancien état après une mutation', async () => {
  let current = false; let calls = 0; let release!: () => void;
  const paused = new Promise<void>(resolve => { release = resolve; });
  const client = { rpc: async () => ({ data: null }), auth: { getUser: async () => {
    const value = current;
    if (++calls === 1) await paused;
    return { data: { user: { app_metadata: { must_change_password: value } } }, error: null };
  } } };
  const compiled = ts.transpileModule(readFileSync(resolve('src/lib/supabase/server.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const api = {} as { getSupabaseServerClient: () => typeof client; invalidateAuthCache: () => void };
  runInNewContext(compiled, { exports: api, structuredClone, setTimeout,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://local.test', SUPABASE_SERVICE_ROLE_KEY: 'FAKE' } },
    require: (name: string) => name === 'server-only' ? {} : { createClient: () => client },
  });
  const wrapped = api.getSupabaseServerClient();
  const get = wrapped.auth.getUser as unknown as (token: string) => ReturnType<typeof client.auth.getUser>;
  const old = get('fake');
  api.invalidateAuthCache(); current = true;
  expect((await get('fake')).data.user.app_metadata.must_change_password).toBe(true);
  release();
  expect((await old).data.user.app_metadata.must_change_password).toBe(false);
  expect((await get('fake')).data.user.app_metadata.must_change_password).toBe(true);
  expect(calls).toBe(2);
});
