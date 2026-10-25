import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { localBusinessFixture as LocalFixture } from './local-business-fixture.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { authenticateFixture } from './persistent-fixture';
import { ROLES } from '../../src/types/permissions';

async function localBusinessFixture() {
  const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<{ localBusinessFixture: typeof LocalFixture }>;
  return (await nativeImport(pathToFileURL(resolve('tests/ui/local-business-fixture.mjs')).href)).localBusinessFixture();
}

test('Support persistant : isolation, droits, concurrence, transaction et audit réels', async () => {
  const fixture = await localBusinessFixture();
  try {
    const request = (body?: Record<string, unknown>, role: string = ROLES.IT, year = fixture.year.id, token = 'fixture-auth-token') => fixture.dispatch(new Request('http://localhost/api/support', { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'x-escen-role': role, 'x-escen-year': year }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    expect((await request(undefined, ROLES.IT, fixture.year.id, 'invalid')).status).toBe(401);
    let directory = await (await request()).json();
    const create = { action: 'create', revision: directory.revision, title: 'Accès aux cours', description: 'Je ne retrouve pas mon document de cours.', categoryId: null, priority: 'MEDIUM' };
    expect((await request({ ...create, author_id: randomUUID() })).status).toBe(400);
    expect((await request(create, ROLES.MKT, 'all')).status).toBe(409);
    const created = await request(create, ROLES.MKT);
    expect(created.status).toBe(201);
    const ticketId = (await created.json()).id;
    expect((await request(create)).status).toBe(409);
    const person = await fixture.insert('people', { firstname: 'Autre', lastname: 'Auteur' });
    const account = await fixture.insert('accounts', { person_id: person.id, active: false });
    const foreign = await fixture.insert('support_tickets', { author_id: account.id, reference: `SUP-${randomUUID()}`, title: 'Demande privée', description: 'Privée', priority: 'MEDIUM', academic_year_id: fixture.year.id });
    const old = await fixture.insert('support_tickets', { author_id: fixture.account.id, reference: `SUP-${randomUUID()}`, title: 'Autre année', description: 'Archives', priority: 'MEDIUM', academic_year_id: fixture.nextYear.id });
    directory = await (await request(undefined, ROLES.MKT)).json();
    expect(directory.tickets.map((ticket: { id: string }) => ticket.id)).toEqual([ticketId]);
    expect((await request({ action: 'reply', ticketId: foreign.id, body: 'Tentative interdite', revision: directory.revision }, ROLES.MKT)).status).toBe(404);
    expect((await request({ action: 'reply', ticketId: old.id, body: 'Mauvaise année', revision: directory.revision })).status).toBe(404);
    const transition = { action: 'transition', revision: directory.revision, ticketId, fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', reason: 'Vérification du dossier' };
    expect((await request(transition, ROLES.MKT)).status).toBe(403);
    expect((await request({ ...transition, toStatus: 'RESOLVED' })).status).toBe(409);
    expect((await request(transition)).status).toBe(200);
    directory = await (await request()).json();
    const assigned = directory.tickets.find((ticket: { id: string }) => ticket.id === ticketId);
    expect(assigned.status).toBe('IN_PROGRESS'); expect(assigned.assigned_to).toBe(fixture.account.id);
    expect((await request({ action: 'reply', revision: directory.revision, ticketId, body: 'Le document reste introuvable.' }, ROLES.MKT)).status).toBe(200);
    directory = await (await request()).json();
    expect((await request({ ...transition, revision: directory.revision, fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED', reason: 'Document rétabli et accès vérifié' })).status).toBe(200);
    directory = await (await request()).json();
    expect(directory.messages.filter((message: { ticket_id: string }) => message.ticket_id === ticketId)).toHaveLength(3);
    expect((await request({ action: 'reply', revision: directory.revision, ticketId, body: 'Écriture après résolution' })).status).toBe(409);
    expect(Number(await fixture.value("select count(*) as value from escen_private.audit_events where table_name='support_tickets' and entity_id=$1 and actor_id=$2", [ticketId, fixture.account.id]))).toBe(3);
    // A failure in the second operation must roll back the status and revision.
    const before = directory.revision;
    const failed = await fixture.client.rpc('escen_backend_transaction', { p_actor_id: fixture.account.id, p_expected_revision: before, p_changes: [
      { table: 'support_tickets', operation: 'update', record: { id: ticketId, status: 'IN_PROGRESS' } },
      { table: 'support_messages', operation: 'insert', record: { id: randomUUID(), ticket_id: randomUUID(), author_id: fixture.account.id, body: 'Parent absent' } },
    ] });
    expect(failed.error).not.toBeNull();
    const after = await (await request()).json();
    expect(after.revision).toBe(before); expect(after.tickets.find((ticket: { id: string }) => ticket.id === ticketId).status).toBe('RESOLVED');
  } finally { await fixture.close(); }
});

for (const width of [390, 1440]) test(`Support : création, confirmation, réponse et résolution à ${width}px`, async ({ page }) => {
  const fixture = await localBusinessFixture();
  try {
    await page.setViewportSize({ width, height: 960 });
    await authenticateFixture(page);
    await page.route('**/api/**', async route => {
      const original = route.request();
      const response = await fixture.dispatch(new Request(original.url(), { method: original.method(), headers: original.headers(), ...(original.method() === 'GET' ? {} : { body: original.postData() }) }));
      await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
    });
    await page.goto('/systeme/support');
    async function selectIT() {
      await page.getByLabel('Mon compte et mon rôle').click();
      await page.getByLabel('Rôle autorisé', { exact: true }).selectOption(ROLES.IT);
      if (await page.locator('.account-control').getAttribute('open') !== null) await page.getByLabel('Mon compte et mon rôle').click();
    }
    await selectIT();
    await page.getByRole('button', { name: 'Ouvrir une demande', exact: true }).click();
    await page.getByLabel('Titre', { exact: true }).fill('Document manquant');
    await page.getByLabel('Description', { exact: true }).fill('Mon document est introuvable dans mon espace.');
    const before = fixture.requests.filter((entry: { method: string }) => entry.method === 'POST').length;
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    await expect(page.getByRole('region', { name: 'Vérification avant enregistrement' })).toBeVisible();
    expect(fixture.requests.filter((entry: { method: string }) => entry.method === 'POST').length).toBe(before);
    await page.getByRole('dialog').last().getByRole('button', { name: 'Ouvrir une demande', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'La demande a été enregistrée.' })).toBeVisible();
    await page.reload();
    await selectIT();
    await expect(page.getByText('Document manquant', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ouvrir le suivi' }).click();
    for (const [label, message] of [['Répondre', 'Le support vérifie votre accès.'], ['Prendre en charge', 'Diagnostic du problème en cours'], ['Résoudre la demande', 'Accès rétabli et vérifié']]) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.getByRole('dialog').last().getByRole('textbox').fill(message);
      await page.getByRole('button', { name: 'Vérifier les informations' }).click();
      await page.getByRole('dialog').last().getByRole('button', { name: label === 'Répondre' ? 'Envoyer la réponse' : label, exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(1);
      await expect(page.getByText(message, { exact: false })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Répondre', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `tmp/screenshots/support-completion-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  } finally { await fixture.close(); }
});
