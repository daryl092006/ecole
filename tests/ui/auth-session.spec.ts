import { expect, test, type BrowserContext } from '@playwright/test';
import { snapshot, fixtureCapabilities, historyCatalog, ACCOUNT_IDS } from './persistent-fixture';
import { authenticationErrorMessage } from '../../src/services/authenticationService';
import { postLoginPath } from '../../src/permissions/navigation';
import { ROLES } from '../../src/types/permissions';

const key = 'sb-zmxapemyktxhppdxenzb-auth-token';
const user = { id: ACCOUNT_IDS[1], aud: 'authenticated', role: 'authenticated', email: 'it@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const token = { access_token: 'fixture-auth-token', refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, user };
async function fixture(context: BrowserContext, signedIn = false) {
  if (signedIn) await context.addInitScript(({ key, token }) => {
    if (!localStorage.getItem('auth-fixture-seeded')) {
      localStorage.setItem(key, JSON.stringify({ ...token, expires_at: Math.floor(Date.now() / 1000) + 3600 }));
      localStorage.setItem('auth-fixture-seeded', 'true');
    }
  }, { key, token });
  let unavailable = false;
  let mustChange = false;
  let authError = '';
  let tokenCalls = 0;
  let pause: Promise<void> = Promise.resolve();
  let denied = false;
  let alternate = false;
  const logoutScopes: string[] = [];
  await context.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'API non prévue dans ce scénario.' } }));
  await context.route('**/auth/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/token')) {
      tokenCalls++;
      expect(route.request().postDataJSON().email).toBe('it@example.test');
      await pause;
      if (authError) return route.fulfill({ status: 429, json: { code: 'over_request_rate_limit', msg: 'Too many requests' } });
      return route.fulfill({ json: token });
    }
    if (url.pathname.endsWith('/logout')) { logoutScopes.push(url.searchParams.get('scope') || 'global'); return route.fulfill({ json: {} }); }
    return route.fulfill({ json: user });
  });
  await context.route('**/api/session', route => route.fulfill(denied ? { status: 403, json: { error: 'Votre compte doit être activé par ESCEN.' } } : unavailable ? { status: 503, json: { error: 'Le service des accès est indisponible.' } } : { json: {
    capabilities: fixtureCapabilities, accountId: alternate ? ACCOUNT_IDS[0] : ACCOUNT_IDS[1], name: alternate ? 'Autre Compte' : 'Jean Technique', email: 'it@example.test', role: ROLES.IT,
    availableRoles: [ROLES.IT, ROLES.MKT], studentId: null, teacherId: null, matricule: null, mustChangePassword: mustChange,
  } }));
  await context.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  await context.route('**/api/history*', route => route.fulfill({ json: historyCatalog }));
  return { switchAccount: () => { alternate = true; }, pause: (value: Promise<void>) => { pause = value; }, deny: () => { denied = true; }, fail: (value: boolean) => { unavailable = value; }, requirePassword: () => { mustChange = true; }, rateLimit: () => { authError = 'rate'; }, tokenCalls: () => tokenCalls, logoutScopes };
}

test('Une panne du profil conserve la session et propose une reprise', async ({ context, page }) => {
  const state = await fixture(context, true); state.fail(true);
  await page.goto('/etudiants');
  await expect(page.getByRole('heading', { name: 'Vérification de connexion impossible' })).toBeVisible();
  expect(state.logoutScopes).toEqual([]);
  expect(await page.evaluate(key => !!localStorage.getItem(key), key)).toBe(true);
  state.fail(false);
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(page.locator('#main-content')).toBeVisible();
});

test('La déconnexion est propagée aux autres onglets et reste locale à cette session', async ({ context, page }) => {
  const state = await fixture(context, true);
  await page.goto('/mon-espace');
  await expect(page.locator('#main-content')).toBeVisible();
  const second = await context.newPage();
  await second.goto('/mon-espace');
  await expect(second.locator('#main-content')).toBeVisible();
  await page.getByLabel('Mon compte et mon rôle').click();
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(second).toHaveURL(/\/connexion/);
  await expect(second.locator('#main-content')).toHaveCount(0);
  expect(state.logoutScopes).toEqual(['local']);
});

test('La connexion distingue une limitation de tentatives d’un mauvais mot de passe', async ({ context, page }) => {
  const state = await fixture(context); state.rateLimit();
  await page.goto('/connexion');
  await page.getByLabel('Adresse email', { exact: true }).fill('it@example.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Mot-de-passe-de-test');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.locator('.auth-error[role="alert"]')).toContainText('Trop de tentatives');
  await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeEnabled();
  expect(state.tokenCalls()).toBe(1);
});

test('Un compte déjà connecté passe en priorité par le changement obligatoire', async ({ context, page }) => {
  const state = await fixture(context, true); state.requirePassword();
  await page.goto('/connexion?retour=%2Ffinance%2Fversements');
  await expect(page).toHaveURL(/\/mot-de-passe-modifier$/);
  await expect(page.getByRole('heading', { name: 'Choisissez un nouveau mot de passe' })).toBeVisible();
});


test('Connexion : lien direct conservé avec ses filtres, email normalisé et un seul envoi', async ({ context, page }) => {
  const state = await fixture(context);
  let release!: () => void;
  state.pause(new Promise<void>(resolve => { release = resolve; }));
  await page.goto('/etudiants?recherche=Alice');
  await expect(page).toHaveURL(/connexion\?retour=%2Fetudiants%3Frecherche%3DAlice$/);
  await page.getByLabel('Adresse email', { exact: true }).fill('IT@EXAMPLE.TEST');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Mot-de-passe-de-test');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.getByLabel('Adresse email', { exact: true })).toBeDisabled();
  await page.keyboard.press('Enter');
  expect(state.tokenCalls()).toBe(1);
  release();
  await expect(page).toHaveURL(/\/etudiants\?recherche=Alice$/);
  await expect(page.locator('#main-content')).toBeVisible();
});

test('Identifiants acceptés : une panne des accès se reprend sans saisir le mot de passe à nouveau', async ({ context, page }) => {
  const state = await fixture(context); state.fail(true);
  await page.goto('/connexion?retour=%2Fetudiants');
  await page.getByLabel('Adresse email', { exact: true }).fill('it@example.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Mot-de-passe-de-test');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vérification de connexion impossible' })).toBeVisible();
  expect(state.logoutScopes).toEqual([]);
  state.fail(false);
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(page).toHaveURL(/\/etudiants$/);
  expect(state.tokenCalls()).toBe(1);
});

test('Un compte refusé reste hors du portail et peut réessayer sans session résiduelle', async ({ context, page }) => {
  const state = await fixture(context); state.deny();
  await page.goto('/connexion');
  await page.getByLabel('Adresse email', { exact: true }).fill('it@example.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Mot-de-passe-de-test');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.locator('.auth-error[role="alert"]')).toContainText('activé par ESCEN');
  await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeEnabled();
  await expect(page.locator('#main-content')).toHaveCount(0);
  expect(state.logoutScopes).toEqual(['local']);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
});

test('Les erreurs réseau et de validation ne sont pas confondues', () => {
  expect(authenticationErrorMessage({ name: 'AuthRetryableFetchError' })).toContain('temporairement inaccessible');
  expect(authenticationErrorMessage({ status: 503 })).toContain('temporairement inaccessible');
  expect(authenticationErrorMessage({ code: 'invalid_credentials', status: 400 })).toBe('Adresse email ou mot de passe incorrect.');
  expect(authenticationErrorMessage({ code: 'email_not_confirmed' })).toContain('email à confirmer');
});

test('Le retour après connexion conserve les filtres sans accepter une origine externe', () => {
  expect(postLoginPath('/etudiants?recherche=Alice#resultats', ROLES.IT)).toBe('/etudiants?recherche=Alice#resultats');
  for (const value of ['https://example.test', '//example.test', '/\\example.test', '/connexion', '/etudiants\n']) {
    expect(postLoginPath(value, ROLES.IT)).toBe('/mon-espace');
  }
});


test('Une session refusée au chargement quitte les écrans métier', async ({ context, page }) => {
  const state = await fixture(context, true);
  await context.route('**/api/campus', route => route.fulfill({ status: 401, json: { error: 'Votre session a expiré.' } }));
  await page.goto('/etudiants');
  await expect(page).toHaveURL(/\/connexion/);
  await expect(page.locator('#main-content')).toHaveCount(0);
  await expect(page.locator('.auth-error[role="alert"]')).toContainText(/session.*(fin|expiré)/);
  expect(state.logoutScopes).toEqual(['local']);
});

test('Un changement de compte dans le navigateur recharge le profil et retire l’ancien', async ({ context, page }) => {
  const state = await fixture(context, true);
  await page.goto('/mon-espace');
  await expect(page.locator('#main-content')).toBeVisible();
  state.switchAccount();
  await page.evaluate(async ({ key, token, id }) => {
    const session = { ...token, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { ...token.user, id } };
    localStorage.setItem(key, JSON.stringify(session));
    const channel = new BroadcastChannel(key);
    channel.postMessage({ event: 'SIGNED_IN', session });
    await new Promise(resolve => setTimeout(resolve, 50));
    channel.close();
  }, { key, token, id: ACCOUNT_IDS[0] });
  await expect(page.locator('#main-content')).toBeVisible();
  await page.getByLabel('Mon compte et mon rôle').click();
  await expect(page.locator('.account-name')).toHaveText('Autre Compte');
  await expect(page.locator('.account-name')).not.toContainText('Jean Technique');
});


for (const width of [360, 1440]) {
  test(`Connexion et reprise restent lisibles à ${width}px`, async ({ context, page }) => {
    const state = await fixture(context);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/connexion?mot-de-passe-modifie=1');
    await expect(page.getByRole('status')).toContainText('Votre mot de passe a été modifié');
    await page.getByLabel('Adresse email', { exact: true }).fill('it@example.test');
    await page.getByLabel('Mot de passe', { exact: true }).fill('Mot-de-passe-de-test');
    await page.getByRole('button', { name: 'Afficher le mot de passe', exact: true }).click();
    await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Masquer le mot de passe', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `tmp/screenshots/auth-review/${width}/connexion.png`, fullPage: true });
    state.fail(true);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Vérification de connexion impossible' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Réessayer', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `tmp/screenshots/auth-review/${width}/reprise.png`, fullPage: true });
  });
}
