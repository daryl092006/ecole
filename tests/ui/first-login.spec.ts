import { expect, test } from '@playwright/test';
import { firstLoginState } from '../../src/services/firstLoginService';
import { loadSecurityApi, securityContext, uuid, securityIds } from './security-fixture';
import { authenticateFixture, fixtureCapabilities, ACCOUNT_IDS, snapshot as campusSnapshot } from './persistent-fixture';
import { ROLES } from '../../src/types/permissions';

const profile = { firstname: 'Alice', lastname: 'Exemple', email: 'alice@example.test', personalEmail: 'alice@example.test', phone: '+22890000000', address: 'Quartier Test, Lomé', birthDate: '2000-01-01', programName: null };
function fixture(options: { required?: boolean; failAuth?: boolean; failTicket?: boolean; otherCurrentYear?: boolean; emptyPerson?: boolean } = {}) {
  const context = securityContext();
  const writes: Record<string, unknown>[] = []; let transactions = 0;
  const personData = options.emptyPerson ? { firstname: 'Alice', lastname: 'Exemple', email: null, phone: null, address: null, birth_date: null } : { firstname: 'Alice', lastname: 'Exemple', email: profile.email, phone: profile.phone, address: profile.address, birth_date: profile.birthDate };
  const tables: Record<string, Record<string, unknown>[]> = { academic_years: [{ id: securityIds.year, name: '2026-2027', status: 'OUVERTE', starts_on: '2026-09-01', ends_on: '2027-08-31' }], support_tickets: [], people: [] };
  let failAuth = !!options.failAuth;
  const client = { rpc: async (name: string, args?: Record<string, unknown>) => {
    if (name === 'escen_backend_snapshot') return { data: { revision: 5 + transactions, tables } };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: options.otherCurrentYear ? securityIds.otherYear : securityIds.year } };
    if (name === 'escen_backend_transaction') {
      transactions++;
      if (options.failTicket) return { error: { code: '40001' } };
      for (const change of args?.p_changes as { table: string; record: Record<string, unknown> }[]) {
        if (change.table === 'support_tickets') tables.support_tickets.push(change.record);
        if (change.table === 'people') tables.people.push(change.record);
      }
      return { data: 6 };
    }
    throw new Error('RPC inattendue');
  }, auth: { admin: { updateUserById: async (id: string, attributes: Record<string, unknown>) => {
    expect(id).toBe(context.authUserId); writes.push(attributes);
    if (failAuth) { failAuth = false; return { error: { message: 'failed' }, data: { user: null } }; }
    return { data: { user: { id } } };
  } } } };
  const route = loadSecurityApi('app/api/session/first-login/route.ts', client, context, undefined, {
    mustVerifyProfile: options.required !== false, profile: { person: personData }, email: profile.email,
    user: { app_metadata: { provider: 'email', escen_first_login: { version: 1, password_changed_at: '2026-10-28T10:00:00Z' } } },
  }) as { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };
  const get = (query = '') => route.GET(new Request(`http://local.test/api/session/first-login${query}`));
  const post = (body: unknown) => route.POST(new Request('http://local.test/api/session/first-login', { method: 'POST', body: JSON.stringify(body) }));
  return { get, post, writes, tables, transactions: () => transactions };
}

test('Première connexion : ordre obligatoire, états persistés et conservation des comptes existants', () => {
  expect(firstLoginState({}, true)).toEqual({ firstLoginRequired: true, mustChangePassword: true, mustVerifyProfile: false });
  expect(firstLoginState({ escen_first_login: { version: 1, password_changed_at: 'date' } }, true)).toEqual({ firstLoginRequired: true, mustChangePassword: false, mustVerifyProfile: true });
  for (const record of [{ version: 1, exempt: true }, { version: 1, password_changed_at: 'date', profile_reviewed_at: 'date', profile_review: 'REPORT' }]) {
    expect(firstLoginState({ escen_first_login: record }, true)).toMatchObject({ firstLoginRequired: false, mustChangePassword: false, mustVerifyProfile: false });
  }
  expect(firstLoginState({ must_change_password: true, escen_first_login: { version: 1, exempt: true } }, true).mustChangePassword).toBe(true);
  expect(firstLoginState({}, false).mustChangePassword).toBe(false);
  expect(firstLoginState({ escen_first_login: { version: 1, profile_reviewed_at: 'date', profile_review: 'CONFIRM' } }, true).mustChangePassword).toBe(true);
});

test('Serveur : les étapes de première connexion bloquent les API métier même par appel direct', async () => {
  const previous = process.env.ESCEN_FIRST_LOGIN_ENABLED;
  process.env.ESCEN_FIRST_LOGIN_ENABLED = 'true';
  try {
    for (const metadata of [{}, { escen_first_login: { version: 1, password_changed_at: 'date' } }]) {
      const context = securityContext(); let reads = 0;
      const client = { auth: { getUser: async () => ({ data: { user: { id: context.authUserId, app_metadata: metadata } } }) },
        rpc: async () => { reads++; return { data: { account: { id: context.accountId, person_id: context.personId, auth_user_id: context.authUserId, active: true },
          person: profile, student: null, teacher: null, grants: [{ role_code: 'IT', role_name: ROLES.IT, site_id: null, group_id: null, academic_year_id: null }], permissions: [] } }; } };
      const auth = loadSecurityApi('server/auth.ts', {}, context, client) as { requireAccount: (request: Request) => Promise<unknown> };
      await expect(auth.requireAccount(new Request('http://local.test/api/campus', { headers: { Authorization: 'Bearer fake' } }))).rejects.toMatchObject({ status: 403 });
      expect(reads).toBe(0);
      await expect(auth.requireAccount(new Request('http://local.test/api/session', { headers: { Authorization: 'Bearer fake' } }))).resolves.toBeTruthy();
    }
  } finally { if (previous === undefined) delete process.env.ESCEN_FIRST_LOGIN_ENABLED; else process.env.ESCEN_FIRST_LOGIN_ENABLED = previous; }
});

test('Vérification : profil propre, confirmation serveur, champs officiels conservés', async () => {
  const f = fixture(); const response = await f.get();
  expect(response.headers.get('cache-control')).toBe('no-store');
  const page = await response.json(); expect(page.profile).toEqual(profile);
  expect((await f.post({ decision: 'CONFIRM', snapshot: page.snapshot })).status).toBe(200);
  expect(f.transactions()).toBe(0);
  expect(f.writes[0]).toMatchObject({ app_metadata: { provider: 'email', escen_first_login: { profile_review: 'CONFIRM', profile_snapshot: page.snapshot } } });
  expect(f.writes[0]).not.toHaveProperty('user_metadata');
});

test('Vérification : refus des identifiants injectés, état déjà terminé, version périmée et données invalides', async () => {
  const f = fixture(); const { snapshot } = await (await f.get()).json();
  for (const body of [{ decision: 'CONFIRM', snapshot, accountId: uuid(42) }, { decision: 'REPORT', snapshot, details: ' ' }, { decision: 'CONFIRM', snapshot: 'bad' }]) expect((await f.post(body)).status).toBe(400);
  expect((await f.post({ decision: 'CONFIRM', snapshot: '0'.repeat(64) })).status).toBe(409);
  expect((await fixture({ required: false }).get()).status).toBe(409);
  expect(f.writes).toHaveLength(0);
});

test('Vérification : adresse, email personnel et date de naissance manquante enregistrés dans la table people', async () => {
  const f = fixture({ emptyPerson: true }); const { snapshot } = await (await f.get()).json();
  const res = await f.post({ decision: 'CONFIRM', snapshot, address: 'Lomé Totsi', personalEmail: 'perso@test.com', phone: '+22899999999', birthDate: '2001-05-10' });
  expect(res.status).toBe(200);
  expect(f.transactions()).toBe(1);
  expect(f.tables.people[0]).toMatchObject({ id: uuid(901), address: 'Lomé Totsi', email: 'perso@test.com', phone: '+22899999999', birth_date: '2001-05-10' });
});

test('Signalement : ticket audité avant validation Auth, reprise sans doublon après échec Auth', async () => {
  const f = fixture({ failAuth: true }); const { snapshot } = await (await f.get()).json();
  const body = { decision: 'REPORT', snapshot, details: 'Mon prénom doit être corrigé.', yearId: securityIds.year };
  expect((await f.post(body)).status).toBe(503);
  expect(f.transactions()).toBe(1);
  expect(f.tables.support_tickets[0]).toMatchObject({ author_id: uuid(900), academic_year_id: securityIds.year, description: body.details, status: 'OPEN' });
  expect((await f.post(body)).status).toBe(200);
  expect(f.transactions()).toBe(1);
  expect(f.writes.at(-1)).toMatchObject({ app_metadata: { escen_first_login: { profile_review: 'REPORT', ticket_id: f.tables.support_tickets[0].id } } });
});

test('Signalement : un échec de transaction ne termine jamais la première connexion', async () => {
  const f = fixture({ failTicket: true }); const { snapshot } = await (await f.get()).json();
  expect((await f.post({ decision: 'REPORT', snapshot, details: 'Mon téléphone est incorrect.', yearId: securityIds.year })).status).toBe(409);
  expect(f.writes).toHaveLength(0);
});

test('Signalement : année explicitement choisie parmi les années accessibles, même hors année de travail', async () => {
  const f = fixture({ otherCurrentYear: true });
  expect(await (await f.get('?support=1')).json()).toEqual({ years: [{ id: securityIds.year, name: '2026-2027' }], currentYearId: null });
  const { snapshot } = await (await f.get()).json();
  expect((await f.post({ decision: 'REPORT', snapshot, details: 'Téléphone à corriger.', yearId: securityIds.year })).status).toBe(200);
});

test('Signalement : une année non attribuée est refusée sans ticket ni validation Auth', async () => {
  const f = fixture(); const { snapshot } = await (await f.get()).json();
  expect((await f.post({ decision: 'REPORT', snapshot, details: 'Téléphone à corriger.', yearId: securityIds.otherYear })).status).toBe(403);
  expect(f.writes).toHaveLength(0); expect(f.transactions()).toBe(0);
});

for (const width of [390, 1440]) for (const decision of ['CONFIRM', 'REPORT'] as const) test(`Première connexion complète : mot de passe puis ${decision} à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  await authenticateFixture(page);
  let phase = 'PASSWORD'; let saved = 0;
  await page.route('**/api/campus', route => { expect(phase).toBe('DONE'); return route.fulfill({ json: campusSnapshot }); });
  await page.route('**/api/session', route => route.fulfill({ json: { capabilities: fixtureCapabilities,
    accountId: ACCOUNT_IDS[1], name: 'Alice Exemple', email: profile.email, role: ROLES.IT, availableRoles: [ROLES.IT],
    studentId: null, teacherId: null, matricule: null, mustChangePassword: phase === 'PASSWORD', mustVerifyProfile: phase === 'PROFILE' } }));
  await page.route('**/api/session/password', route => { phase = 'PROFILE'; return route.fulfill({ json: { updated: true, next: 'PROFILE' } }); });
  await page.route('**/api/session/first-login', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { profile, snapshot: 'a'.repeat(64) } });
    expect(route.request().postDataJSON()).toMatchObject({ decision, snapshot: 'a'.repeat(64) });
    if (decision === 'REPORT') expect(route.request().postDataJSON().details).toBe('Mon numéro doit être corrigé.');
    if (decision === 'REPORT') expect(route.request().postDataJSON().yearId).toBe(securityIds.year);
    phase = 'DONE'; saved++; return route.fulfill({ json: { updated: true, ticketId: null } });
  });
  await page.route('**/api/session/first-login?*', route => route.fulfill({ json: { years: [{ id: securityIds.year, name: '2026-2027' }], currentYearId: securityIds.year } }));
  await page.goto('/mon-espace');
  await expect(page).toHaveURL(/mot-de-passe-modifier$/);
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('Nouveau-password-2026!');
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill('Nouveau-password-2026!');
  await page.getByRole('button', { name: 'Enregistrer le nouveau mot de passe', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vérifiez vos informations', exact: true })).toBeVisible();
  await expect(page.getByText('Alice', { exact: true })).toBeVisible();
  await expect(page.locator('#main-content')).toHaveCount(0);
  if (decision === 'REPORT') {
    await page.getByLabel('Non, je souhaite signaler une erreur').check();
    await page.getByLabel('Informations à corriger', { exact: true }).fill('Mon numéro doit être corrigé.');
    await page.getByRole('combobox', { name: 'Année du signalement', exact: true }).selectOption(securityIds.year);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `tmp/screenshots/first-login/${width}-${decision}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Vérifier avant de confirmer', exact: true }).click();
  expect(saved).toBe(0);
  await page.getByRole('button', { name: decision === 'CONFIRM' ? 'Confirmer mes informations' : 'Transmettre le signalement et continuer', exact: true }).click();
  await expect(page).toHaveURL(/mon-espace$/); await expect(page.locator('#main-content')).toBeVisible();
  expect(saved).toBe(1);
});
