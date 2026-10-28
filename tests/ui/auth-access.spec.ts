import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { ROLES } from '../../src/types/permissions';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';
import { firstLoginState } from '../../src/services/firstLoginService';

function access(error: { status?: number } | null, throws = false) {
  let accountReads = 0;
  const client = {
    auth: { getUser: async () => {
      if (throws) throw new TypeError('fetch failed');
      return { data: { user: null }, error };
    } },
    rpc: async () => { accountReads++; throw new Error('Aucun profil ne doit être lu sans authentification vérifiée.'); },
  };
  const filename = resolve('src/server/auth.ts');
  const localRequire = createRequire(filename);
  const moduleExports = {} as {
    requireAccount: (request: Request) => Promise<unknown>;
    errorResponse: (error: unknown) => Response;
  };
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(compiled, {
    exports: moduleExports, Request, Response,
    require: (name: string) => name === 'server-only' ? {}
      : name === '@/lib/supabase/server' ? { getSupabaseServerClient: () => client }
      : name === '@/types/permissions' ? { ROLES }
      : name === '@/permissions/rolePermissions' ? { ROLE_ACCESS }
      : name === '@/services/firstLoginService' ? { firstLoginState } : localRequire(name),
  });
  return { ...moduleExports, accountReads: () => accountReads };
}

for (const [name, error, throws, status] of [
  ['panne Auth', { status: 503 }, false, 503],
  ['limitation Auth', { status: 429 }, false, 503],
  ['erreur de transport sans statut', {}, false, 503],
  ['exception réseau', null, true, 503],
  ['jeton invalide', { status: 401 }, false, 401],
  ['jeton refusé', { status: 403 }, false, 401],
  ['utilisateur absent', null, false, 401],
] as const) {
  test(`Accès serveur : ${name} donne HTTP ${status}`, async () => {
    const server = access(error, throws);
    let response: Response | undefined;
    try { await server.requireAccount(new Request('http://localhost/api/session', { headers: { Authorization: 'Bearer fixture-token' } })); }
    catch (cause) { response = server.errorResponse(cause); }
    expect(response?.status).toBe(status);
    expect(server.accountReads()).toBe(0);
    expect(await response?.json()).toMatchObject({ error: status === 503 ? 'Le service de connexion est temporairement indisponible. Réessayez.' : 'Votre session a expiré. Reconnectez-vous.' });
  });
}
