import { expect, test } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { localBusinessFixture as LocalFixture } from './local-business-fixture.mjs';
import { authenticateFixture } from './persistent-fixture';
import { ROLES } from '../../src/types/permissions';

async function fixture() {
  const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<{ localBusinessFixture: typeof LocalFixture }>;
  const f = await (await nativeImport(pathToFileURL(resolve('tests/ui/local-business-fixture.mjs')).href)).localBusinessFixture();
  for (const code of ['DA', 'LOG']) {
    const roleId = await f.value('select id as value from escen.roles where code=$1', [code]);
    await f.insert('role_grants', { account_id: f.account.id, role_id: roleId, granted_by: f.account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Test corrections scolaires' });
  }
  const authId = randomUUID();
  await f.db.query('insert into auth.users(id) values ($1)', [authId]);
  const person = await f.insert('people', { firstname: 'Élève', lastname: 'Signalement' });
  const account = await f.insert('accounts', { person_id: person.id, auth_user_id: authId, active: true });
  await f.insert('students', { person_id: person.id, matricule: 'CORRECTION-001' });
  const roleId = await f.value("select id as value from escen.roles where code='STUD'");
  await f.insert('role_grants', { account_id: account.id, role_id: roleId, granted_by: f.account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Test suivi étudiant' });
  f.authUsers.set('student-correction-token', { id: authId, email: 'student@example.test', app_metadata: {} });
  const digest = createHash('sha256').update(`first-login:v1:${authId}`).digest('hex');
  const id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  const title = 'Première connexion · Filière, niveau ou dossier scolaire à corriger';
  const report = await f.insert('support_tickets', { id, author_id: account.id, reference: `SUP-${id}`, title, description: 'Je suis en L2 Marketing.', priority: 'MEDIUM', academic_year_id: f.year.id });
  const fake = await f.insert('support_tickets', { author_id: account.id, reference: randomUUID(), title, description: 'Titre identique sans origine vérifiée.', priority: 'MEDIUM', academic_year_id: f.year.id });
  const sql = await readFile(resolve('supabase/migrations/202611190115_student_correction_routing.sql'), 'utf8');
  await f.db.exec(sql);
  const categoryId = await f.value("select id as value from escen.support_categories where code='STUDENT_PROGRAM_CORRECTION'");
  const old = await f.insert('support_tickets', { author_id: account.id, reference: randomUUID(), title: 'Autre année scolaire', priority: 'MEDIUM', academic_year_id: f.nextYear.id, category_id: categoryId });
  return { ...f, report, fake, old, sql, categoryId };
}

test('Corrections : reprise vérifiée, rôles dédiés, confidentialité, suivi et absence de fausse résolution', async () => {
  const f = await fixture();
  try {
    const request = (role: string, body?: Record<string, unknown>, query = '?kind=school', token = 'fixture-auth-token') => f.dispatch(new Request(`http://localhost/api/support${query}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'x-escen-role': role, 'x-escen-year': f.year.id }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    expect(await f.value('select category_id as value from escen.support_tickets where id=$1', [f.report.id])).toBe(f.categoryId);
    expect(await f.value('select category_id as value from escen.support_tickets where id=$1', [f.fake.id])).toBeNull();
    await f.db.exec(f.sql);
    expect(await f.value("select count(*) as value from escen.role_permissions rp join escen.permissions p on p.id=rp.permission_id where p.code='student.correction.manage'")).toBe(3);
    for (const role of [ROLES.DA, ROLES.LOG, ROLES.IT]) {
      const response = await request(role);
      expect(response.status).toBe(200);
      const directory = await response.json();
      expect(directory.tickets.map((ticket: { id: string }) => ticket.id)).toEqual([f.report.id]);
      expect(directory.canManageCorrections).toBe(true);
      expect(directory.students).toEqual([{ ticketId: f.report.id, matricule: 'CORRECTION-001', name: 'Élève Signalement' }]);
    }
    expect((await request(ROLES.MKT)).status).toBe(403);
    let directory = await (await request(ROLES.LOG)).json();
    const command = { action: 'transition', revision: directory.revision, ticketId: f.report.id, fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', reason: 'Vérification par la scolarité' };
    expect((await request(ROLES.LOG, command)).status).toBe(200);
    expect((await request(ROLES.DA, command)).status).toBe(409);
    directory = await (await request(ROLES.DA)).json();
    expect((await request(ROLES.DA, { action: 'reply', revision: directory.revision, ticketId: f.report.id, body: 'Votre demande est en cours de vérification.' })).status).toBe(200);
    directory = await (await request(ROLES.DA)).json();
    expect((await request(ROLES.DA, { ...command, revision: directory.revision, fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED' })).status).toBe(409);
    expect((await request(ROLES.DA, { ...command, revision: directory.revision, ticketId: f.fake.id })).status).toBe(404);
    expect((await request(ROLES.DA, { action: 'reply', revision: directory.revision, ticketId: f.old.id, body: 'Autre année interdite' })).status).toBe(404);
    const own = await (await request(ROLES.STUD, undefined, '', 'student-correction-token')).json();
    expect(own.tickets.find((ticket: { id: string }) => ticket.id === f.report.id).status).toBe('IN_PROGRESS');
    expect(own.messages).toHaveLength(2);
    expect(own.canManageCorrections).toBe(false);
  } finally { await f.close(); }
});

for (const width of [390, 1440]) test(`Corrections scolaires : prise en charge et réponse à ${width}px`, async ({ page }) => {
  const f = await fixture();
  try {
    await page.setViewportSize({ width, height: 960 });
    await authenticateFixture(page);
    await page.route('**/api/**', async route => {
      const original = route.request();
      const response = await f.dispatch(new Request(original.url(), { method: original.method(), headers: original.headers(), ...(original.method() === 'GET' ? {} : { body: original.postData() }) }));
      await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
    });
    await page.goto('/etudiants/corrections');
    await page.getByLabel('Mon compte et mon rôle').click();
    await page.getByRole('combobox', { name: 'Changer de rôle actif', exact: true }).selectOption(ROLES.LOG);
    if (await page.locator('.account-control').getAttribute('open') !== null) await page.getByLabel('Mon compte et mon rôle').click();
    await expect(page.getByRole('heading', { name: 'Corrections scolaires', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ouvrir le suivi' }).click();
    await expect(page.getByRole('dialog').getByText('CORRECTION-001', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Consulter le dossier étudiant' })).toHaveAttribute('href', '/etudiants/CORRECTION-001');
    await page.getByRole('button', { name: 'Prendre en charge', exact: true }).click();
    await page.getByLabel('Compte rendu', { exact: true }).fill('Vérification du niveau auprès de la scolarité.');
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    await page.getByRole('dialog').last().getByRole('button', { name: 'Prendre en charge', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Résoudre la demande', exact: true })).toHaveCount(0);
    await expect(page.getByText('Prise en charge : Vérification du niveau auprès de la scolarité.')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await f.close(); }
});
