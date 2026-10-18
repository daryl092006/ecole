import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { authenticateFixture, fixtureCapabilities } from './persistent-fixture';
import { ROLES } from '../../src/types/permissions';

const testPassword = 'Fixture-password-2026!';
const authId = '10000000-0000-4000-8000-000000000001';

function passwordRoute(options: { authenticated?: boolean; required?: boolean; fail?: boolean; missingUser?: boolean } = {}) {
  const calls: { id: string; attributes: Record<string, unknown> }[] = [];
  class RequestError extends Error {
    constructor(public status: number, message: string) { super(message); }
  }
  const serverAuth = {
    RequestError,
    requireAccount: async () => {
      if (options.authenticated === false) throw new RequestError(401, 'Connexion requise.');
      return {
        context: { authUserId: authId },
        user: { app_metadata: { provider: 'email', must_change_password: true } },
        mustChangePassword: options.required !== false,
        client: { auth: { admin: { updateUserById: async (id: string, attributes: Record<string, unknown>) => {
          calls.push({ id, attributes });
          return { data: { user: options.fail || options.missingUser ? null : { id } }, error: options.fail ? new Error('Auth unavailable') : null };
        } } } },
      };
    },
    errorResponse: (error: unknown) => Response.json({ error: 'Demande refusée.' }, {
      status: error instanceof RequestError ? error.status : error instanceof z.ZodError ? 400 : 500,
    }),
  };
  const filename = resolve('src/app/api/session/password/route.ts');
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const moduleExports: { POST?: (request: Request) => Promise<Response> } = {};
  const localRequire = createRequire(filename);
  runInNewContext(compiled.outputText, {
    exports: moduleExports, Request, Response,
    require: (name: string) => name === '@/server/auth' ? serverAuth : localRequire(name),
  });
  return { post: moduleExports.POST!, calls };
}

test('La route refuse toute levée sans nouveau mot de passe valide', async () => {
  for (const body of [undefined, '{}', '{', JSON.stringify({ password: 'court' }), JSON.stringify({ password: 'x'.repeat(129) }), JSON.stringify({ password: testPassword, authUserId: 'other' })]) {
    const route = passwordRoute();
    const response = await route.post(new Request('http://localhost/api/session/password', { method: 'POST', body }));
    expect(response.status).toBe(400);
    expect(route.calls).toEqual([]);
  }
});

test('La route change le mot de passe et le marqueur en un seul appel pour le compte authentifié', async () => {
  const route = passwordRoute();
  const response = await route.post(new Request('http://localhost/api/session/password', { method: 'POST', body: JSON.stringify({ password: testPassword }) }));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ updated: true });
  expect(route.calls).toEqual([{ id: authId, attributes: { password: testPassword, app_metadata: { provider: 'email', must_change_password: false } } }]);
});

test('Un refus Auth ne déclenche aucun second appel de déblocage', async () => {
  const route = passwordRoute({ fail: true });
  const response = await route.post(new Request('http://localhost/api/session/password', { method: 'POST', body: JSON.stringify({ password: testPassword }) }));
  expect(response.status).toBe(503);
  expect(route.calls).toHaveLength(1);
  expect(route.calls[0].attributes).toHaveProperty('password', testPassword);
});

test('Une réponse Auth sans utilisateur ne confirme pas la levée de l’obligation', async () => {
  const route = passwordRoute({ missingUser: true });
  const response = await route.post(new Request('http://localhost/api/session/password', { method: 'POST', body: JSON.stringify({ password: testPassword }) }));
  expect(response.status).toBe(503);
  expect(route.calls).toHaveLength(1);
  expect(route.calls[0].attributes).toHaveProperty('password', testPassword);
});

test('La route exige une session et une obligation en attente', async () => {
  for (const [options, status] of [[{ authenticated: false }, 401], [{ required: false }, 409]] as const) {
    const route = passwordRoute(options);
    const response = await route.post(new Request('http://localhost/api/session/password', { method: 'POST', body: JSON.stringify({ password: testPassword }) }));
    expect(response.status).toBe(status);
    expect(route.calls).toEqual([]);
  }
});

for (const path of ['/mot-de-passe-modifier', '/mot-de-passe-reinitialiser']) {
  for (const rejected of [false, true]) test(`Changement obligatoire ${rejected ? 'refusé' : 'réussi'} : ${path}`, async ({ page }) => {
    await authenticateFixture(page);
    await page.route('**/api/session', route => route.fulfill({ json: {
      capabilities: fixtureCapabilities, accountId: authId, name: 'Compte test', email: 'test@example.test',
      role: ROLES.IT, availableRoles: [ROLES.IT], mustChangePassword: true,
    } }));
    let updates = 0;
    let directPasswordUpdates = 0;
    await page.route('**/auth/v1/user', route => {
      if (route.request().method() === 'PUT') directPasswordUpdates++;
      return route.fulfill({ json: { id: authId, email: 'test@example.test' } });
    });
    await page.route('**/api/session/password', route => {
      expect(route.request().headers().authorization).toBe('Bearer fixture-auth-token');
      expect(route.request().postDataJSON()).toEqual({ password: testPassword });
      updates++;
      return rejected ? route.fulfill({ status: 503, json: { error: 'Indisponible' } }) : route.fulfill({ json: { updated: true } });
    });
    await page.goto(path);
    await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(testPassword);
    await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Enregistrer le nouveau mot de passe', exact: true }).click();
    if (rejected) {
      await expect(page.locator('.auth-error[role="alert"]')).toContainText('Le changement n’a pas été confirmé');
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    } else {
      await expect(page).toHaveURL(/\/connexion\?mot-de-passe-modifie=1$/);
    }
    expect(updates).toBe(1);
    expect(directPasswordUpdates).toBe(0);
  });
}

test('La récupération sans obligation conserve le changement Supabase utilisateur', async ({ page }) => {
  await authenticateFixture(page);
  let directUpdates = 0;
  let mandatoryUpdates = 0;
  await page.route('**/auth/v1/user', route => {
    if (route.request().method() === 'PUT') {
      expect(route.request().postDataJSON()).toMatchObject({ password: testPassword });
      directUpdates++;
    }
    return route.fulfill({ json: { id: authId, email: 'test@example.test' } });
  });
  await page.route('**/api/session/password', route => {
    mandatoryUpdates++;
    return route.fulfill({ status: 409, json: { error: 'Aucune obligation' } });
  });
  await page.goto('/mot-de-passe-reinitialiser');
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(testPassword);
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill(testPassword);
  await page.getByRole('button', { name: 'Enregistrer le nouveau mot de passe', exact: true }).click();
  await expect(page).toHaveURL(/\/connexion\?mot-de-passe-modifie=1$/);
  expect(directUpdates).toBe(1);
  expect(mandatoryUpdates).toBe(0);
});
