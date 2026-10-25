import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { localBusinessFixture as LocalFixture } from './local-business-fixture.mjs';
import { ROLES } from '../../src/types/permissions';
import { authenticateFixture } from './persistent-fixture';
async function fixture() {
  const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<{ localBusinessFixture: typeof LocalFixture }>;
  return (await nativeImport(pathToFileURL(resolve('tests/ui/local-business-fixture.mjs')).href)).localBusinessFixture();
}

test('Annonces PostgreSQL : brouillon privé, audience, publication, retrait et droits', async () => {
  const local = await fixture();
  try {
    const studentPersonId = await local.value("select person_id as value from escen.students where matricule='RECETTE-LOCAL-001'");
    const studentAuth = randomUUID();
    await local.db.query('insert into auth.users(id) values ($1)', [studentAuth]);
    const studentAccount = await local.insert('accounts', { person_id: studentPersonId, auth_user_id: studentAuth, active: true });
    const studentRole = await local.value("select id as value from escen.roles where code='STUD'");
    await local.insert('role_grants', { account_id: studentAccount.id, role_id: studentRole, granted_by: local.account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Compte étudiant de recette' });
    local.authUsers.set('student-auth-token', { id: studentAuth, email: 'student@example.test', app_metadata: {} });
    const request = (body?: object, student = false, year = local.year.id) => local.dispatch(new Request('http://localhost/api/communications', { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${student ? 'student-auth-token' : 'fixture-auth-token'}`, 'x-escen-role': student ? ROLES.STUD : ROLES.MKT, 'x-escen-year': year }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    let admin = await (await request()).json();
    const create = { action: 'create', revision: admin.revision, title: 'Rentrée des étudiants', content: 'Informations de rentrée à consulter.', audiences: [{ kind: 'role', id: studentRole }] };
    expect((await request(create, true)).status).toBe(403);
    expect((await request(create, false, 'all')).status).toBe(409);
    expect((await request({ ...create, audiences: [{ kind: 'group', id: randomUUID() }] })).status).toBe(400);
    expect((await request({ ...create, audiences: [{ kind: 'all' }, { kind: 'role', id: studentRole }] })).status).toBe(400);
    const created = await request(create); expect(created.status).toBe(201);
    const id = (await created.json()).id;
    const studentRead = async () => (await (await request(undefined, true)).json()).announcements;
    expect(await studentRead()).toHaveLength(0);
    expect((await request(create)).status).toBe(409);
    admin = await (await request()).json();
    expect((await request({ action: 'publish', revision: admin.revision, id, expiresAt: '2020-01-01T00:00:00Z' })).status).toBe(400);
    expect((await request({ action: 'publish', revision: admin.revision, id, expiresAt: null }, false, local.nextYear.id)).status).toBe(404);
    expect((await request({ action: 'publish', revision: admin.revision, id, expiresAt: null })).status).toBe(200);
    expect((await studentRead()).map((row: { id: string }) => row.id)).toEqual([id]);
    admin = await (await request()).json();
    expect((await request({ action: 'publish', revision: admin.revision, id, expiresAt: null })).status).toBe(409);
    expect((await request({ action: 'withdraw', revision: admin.revision, id, reason: 'Information remplacée par une nouvelle annonce' })).status).toBe(200);
    expect(await studentRead()).toHaveLength(0);
    const retained = (await (await request()).json()).announcements.find((row: { id: string }) => row.id === id);
    expect(retained.withdrawal_reason).toContain('remplacée');
    expect(Number(await local.value("select count(*) as value from escen_private.audit_events where table_name='communications' and entity_id=$1 and actor_id=$2", [id, local.account.id]))).toBe(3);
    admin = await (await request()).json();
    const itRole = await local.value("select id as value from escen.roles where code='IT'");
    const internal = await request({ ...create, revision: admin.revision, audiences: [{ kind: 'role', id: itRole }] });
    const internalId = (await internal.json()).id;
    admin = await (await request()).json();
    expect((await request({ action: 'publish', revision: admin.revision, id: internalId, expiresAt: new Date(Date.now() + 86400000).toISOString() })).status).toBe(200);
    expect(await studentRead()).toHaveLength(0);
    for (const future of [false, true]) {
      const timed = await local.insert('communications', { author_id: local.account.id, academic_year_id: local.year.id, title: 'Annonce non active', content: 'Invisible', published_at: new Date(Date.now() + (future ? 86400000 : -172800000)).toISOString(), expires_at: future ? null : new Date(Date.now() - 86400000).toISOString() });
      await local.insert('communication_audiences', { communication_id: timed.id, role_id: studentRole });
    }
    expect(await studentRead()).toHaveLength(0);
  } finally { await local.close(); }
});

for (const width of [390, 1440]) test(`Annonces : brouillon, publication relue et retrait à ${width}px`, async ({ page }) => {
  const local = await fixture();
  try {
    await page.setViewportSize({ width, height: 960 });
    await authenticateFixture(page);
    await page.route('**/api/**', async route => {
      const request = route.request();
      const response = await local.dispatch(new Request(request.url(), { method: request.method(), headers: request.headers(), ...(request.method() === 'GET' ? {} : { body: request.postData() }) }));
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
    });
    await page.goto('/communication/annonces');
    await page.getByRole('button', { name: 'Rédiger une annonce', exact: true }).click();
    await page.getByLabel('Titre', { exact: true }).fill('Message de rentrée');
    await page.getByLabel('Contenu', { exact: true }).fill('Bienvenue dans votre nouvelle année scolaire.');
    const postCount = () => local.requests.filter((entry: { path: string; method: string }) => entry.path === '/api/communications' && entry.method === 'POST').length;
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    expect(postCount()).toBe(0);
    await expect(page.getByText('Tous les comptes', { exact: true }).last()).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer le brouillon', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Brouillon', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Publier l’annonce', exact: true }).click();
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    expect(postCount()).toBe(1);
    await page.getByRole('dialog').getByRole('button', { name: 'Publier l’annonce', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Publiée', { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Retirer l’annonce', exact: true }).click();
    await page.getByLabel('Motif de retrait', { exact: true }).fill('Annonce remplacée par le calendrier définitif');
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Retirer l’annonce', exact: true }).click();
    await expect(page.getByText('Retirée', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retirer l’annonce', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `tmp/screenshots/communications-completion-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  } finally { await local.close(); }
});
