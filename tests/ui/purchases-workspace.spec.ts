import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { localBusinessFixture as LocalFixture } from './local-business-fixture.mjs';
import { ROLES, type RoleName } from '../../src/types/permissions';
import { authenticateFixture } from './persistent-fixture';
async function fixture() {
  const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<{ localBusinessFixture: typeof LocalFixture }>;
  return (await nativeImport(pathToFileURL(resolve('tests/ui/local-business-fixture.mjs')).href)).localBusinessFixture();
}

test('Achats PostgreSQL : droits, approbation, refus, réceptions partielles, concurrence et audit', async () => {
  const local = await fixture();
  try {
    for (const code of ['ACHATS', 'RAF', 'DG']) {
      const roleId = await local.value('select id as value from escen.roles where code=$1', [code]);
      await local.insert('role_grants', { account_id: local.account.id, role_id: roleId, granted_by: local.account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Rôle de recette des achats' });
    }
    const request = (body?: object, role: RoleName = ROLES.ACHATS, year = local.year.id) => local.dispatch(new Request('http://localhost/api/purchases', { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer fixture-auth-token', 'x-escen-role': role, 'x-escen-year': year }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    const read = async () => (await (await request()).json());
    let directory = await read();
    const create = { action: 'create', revision: directory.revision, reason: 'Fournitures pour la rentrée', siteId: null, supplierId: null, lines: [{ description: 'Papier', quantity: 3.5, unitAmount: 1000 }, { description: 'Stylos', quantity: 2, unitAmount: 0 }] };
    expect((await request(create, ROLES.MKT)).status).toBe(403);
    expect((await request(create, ROLES.ACHATS, 'all')).status).toBe(409);
    expect((await request({ ...create, lines: [{ ...create.lines[0], quantity: 1.00001 }] })).status).toBe(400);
    const response = await request(create); expect(response.status).toBe(201);
    const id = (await response.json()).id;
    expect((await request(create)).status).toBe(409);
    directory = await read();
    const lines = directory.lines.filter((line: { purchase_id: string }) => line.purchase_id === id);
    const receive = { action: 'receive', revision: directory.revision, id, reason: 'Livraison vérifiée', lines: [{ lineId: lines[0].id, quantity: .5 }, { lineId: lines[1].id, quantity: 1 }] };
    expect((await request(receive)).status).toBe(409);
    const decide = { action: 'decide', id, revision: directory.revision, decision: 'APPROUVE', reason: 'Achat nécessaire validé' };
    expect((await request(decide)).status).toBe(403);
    expect((await request(decide, ROLES.RAF, local.nextYear.id)).status).toBe(404);
    expect((await request(decide, ROLES.RAF)).status).toBe(200);
    directory = await read();
    expect((await request({ ...decide, revision: directory.revision }, ROLES.DG)).status).toBe(409);
    expect((await request({ ...receive, revision: directory.revision }, ROLES.RAF)).status).toBe(403);
    const before = directory.revision;
    expect((await request({ ...receive, revision: before, lines: [{ lineId: lines[0].id, quantity: .5 }, { lineId: lines[1].id, quantity: 3 }] })).status).toBe(409);
    expect((await request({ ...receive, revision: before, lines: [{ lineId: lines[0].id, quantity: .5 }, { lineId: randomUUID(), quantity: 1 }] })).status).toBe(400);
    expect((await read()).revision).toBe(before); expect((await read()).receipts).toHaveLength(0);
    expect((await request({ ...receive, revision: before })).status).toBe(200);
    directory = await read();
    expect(directory.purchases.find((row: { id: string }) => row.id === id).status).toBe('RECEPTION_PARTIELLE');
    expect(directory.receipts).toHaveLength(2);
    expect((await request({ ...receive, revision: directory.revision, lines: [{ lineId: lines[0].id, quantity: 3 }, { lineId: lines[1].id, quantity: 1 }] })).status).toBe(200);
    directory = await read();
    expect(directory.purchases.find((row: { id: string }) => row.id === id).status).toBe('RECU');
    expect(directory.receipts).toHaveLength(4);
    expect((await request({ ...receive, revision: directory.revision })).status).toBe(409);
    expect(Number(await local.value("select count(*) as value from escen_private.audit_events where table_name='purchases' and entity_id=$1 and actor_id=$2", [id, local.account.id]))).toBe(4);
    const rejected = await request({ ...create, revision: directory.revision });
    const rejectedId = (await rejected.json()).id;
    directory = await read();
    expect((await request({ ...decide, id: rejectedId, revision: directory.revision, decision: 'REFUSE' }, ROLES.DG)).status).toBe(200);
    directory = await read();
    expect((await request({ ...receive, id: rejectedId, revision: directory.revision })).status).toBe(409);
  } finally { await local.close(); }
});

for (const width of [390, 1440]) test(`Achats : demande, décision et deux livraisons à ${width}px`, async ({ page }) => {
  const local = await fixture();
  try {
    await page.setViewportSize({ width, height: 960 }); await authenticateFixture(page);
    await page.route('**/api/**', async route => {
      const request = route.request();
      const response = await local.dispatch(new Request(request.url(), { method: request.method(), headers: request.headers(), ...(request.method() === 'GET' ? {} : { body: request.postData() }) }));
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
    });
    await page.goto('/logistique/achats');
    async function selectIT() {
      await page.getByLabel('Mon compte et mon rôle').click();
      await page.getByLabel('Rôle autorisé', { exact: true }).selectOption(ROLES.IT);
      if (await page.locator('.account-control').getAttribute('open') !== null) await page.getByLabel('Mon compte et mon rôle').click();
    }
    await selectIT();
    await page.getByRole('button', { name: 'Nouvelle demande d’achat', exact: true }).click();
    await page.getByLabel('Description de la ligne 1', { exact: true }).fill('Papier');
    await page.getByLabel('Quantité de la ligne 1', { exact: true }).fill('3');
    await page.getByLabel('Prix unitaire FCFA de la ligne 1', { exact: true }).fill('1000');
    await page.getByRole('button', { name: 'Ajouter une ligne', exact: true }).click();
    await page.getByLabel('Description de la ligne 2', { exact: true }).fill('Stylos');
    await page.getByLabel('Quantité de la ligne 2', { exact: true }).fill('2');
    await page.getByLabel('Prix unitaire FCFA de la ligne 2', { exact: true }).fill('500');
    await page.getByLabel('Motif', { exact: true }).fill('Fournitures pour la rentrée');
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    expect(local.requests.filter((entry: { path: string; method: string }) => entry.path === '/api/purchases' && entry.method === 'POST')).toHaveLength(0);
    await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer la demande', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload(); await selectIT();
    await page.getByRole('button', { name: 'Approuver', exact: true }).click();
    await page.getByLabel('Motif', { exact: true }).fill('Budget et besoin vérifiés');
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Approuver la demande', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Réceptionner', exact: true }).click();
    await page.getByLabel('Papier · reste 3', { exact: true }).fill('1');
    await page.getByLabel('Motif', { exact: true }).fill('Première livraison vérifiée');
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer la réception', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('td').getByText('Réception partielle', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Réceptionner', exact: true }).click();
    await page.getByLabel('Papier · reste 2', { exact: true }).fill('2');
    await page.getByLabel('Stylos · reste 2', { exact: true }).fill('2');
    await page.getByLabel('Motif', { exact: true }).fill('Livraison du solde vérifiée');
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer la réception', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('td').getByText('Reçue', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Réceptionner', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Ouvrir le détail', exact: true }).click();
    await expect(page.getByText('Première livraison vérifiée', { exact: true })).toBeVisible();
    await expect(page.getByRole('dialog').locator('.card').getByText('Livraison du solde vérifiée', { exact: true })).toHaveCount(2);
    await page.screenshot({ path: `tmp/screenshots/purchases-completion-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  } finally { await local.close(); }
});
