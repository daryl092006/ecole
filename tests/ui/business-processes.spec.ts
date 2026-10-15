import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { authenticateFixture, snapshot, ACCOUNT_IDS, fixtureCapabilities } from './persistent-fixture';
import { expectWorkspaceFits } from './helpers';
import { CRUD_CATALOG } from '../../src/data/crudCatalog';
import { ROLES } from '../../src/types/permissions';

async function prepare(page: Page) {
  await authenticateFixture(page);
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
}

for (const width of [390, 1440]) {
  test(`Les prérequis conduisent à la prochaine opération réelle à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 }); await prepare(page);
    const tables: Record<string, Record<string, unknown>[]> = Object.fromEntries(CRUD_CATALOG.map(spec => [spec.key, []])); let revision = 1; let writes = 0;
    await page.route('**/api/catalog/**', async route => {
      if (route.request().method() === 'GET') { await route.fulfill({ json: { revision, tables, historyLinks: [] } }); return; }
      const body = route.request().postDataJSON(); expect(body.revision).toBe(revision); writes++;
      tables[new URL(route.request().url()).pathname.split('/')[3]].push({ id: 'SITE-TEST', ...body.values }); revision++;
      await route.fulfill({ status: 201, json: { revision } });
    });
    await page.goto('/academique/referentiel?collection=rooms');
    await expect(page.getByRole('button', { name: 'Ajouter une salle', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Renseigner sites', exact: true }).click();
    await page.getByRole('button', { name: 'Ajouter un site', exact: true }).click();
    const work = page.locator('.work-page');
    await work.getByLabel('Code', { exact: true }).fill('LOME'); await work.getByLabel('Nom', { exact: true }).fill('Site de Lomé');
    await work.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    await expect(work.getByRole('region', { name: 'Vérification avant enregistrement' })).toContainText('Site de Lomé'); expect(writes).toBe(0);
    await work.getByRole('button', { name: 'Revenir aux informations' }).click();
    await expect(work.getByLabel('Nom', { exact: true })).toHaveValue('Site de Lomé'); expect(writes).toBe(0);
    await work.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    await work.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Résultat de l’opération' })).toContainText('Site de Lomé'); expect(writes).toBe(1);
    await page.getByRole('button', { name: 'Renseigner les bâtiments', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ajouter un bâtiment', exact: true })).toBeEnabled();
    await expectWorkspaceFits(page);
  });

  test(`Un échec de sauvegarde conserve les valeurs et ne confirme pas un faux résultat à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 }); await prepare(page); let requests = 0;
    await page.route('**/api/students', async route => { requests++; await route.fulfill({ status: 409, json: { error: 'Ce matricule existe déjà.' } }); });
    await page.goto('/etudiants'); await page.getByRole('button', { name: 'Ajouter un dossier étudiant' }).click();
    const work = page.locator('.work-page'); await work.getByLabel('Matricule officiel').fill('EXISTANT'); await work.getByLabel('Prénom', { exact: true }).fill('Marie'); await work.getByLabel('Nom', { exact: true }).fill('Exemple');
    await work.getByRole('button', { name: 'Vérifier les informations' }).click(); expect(requests).toBe(0);
    await work.getByRole('button', { name: 'Confirmer la création du dossier', exact: true }).click();
    await expect(work.getByRole('alert')).toContainText('Ce matricule existe déjà.'); expect(requests).toBe(1);
    await expect(page.getByRole('status', { name: 'Résultat de l’opération' })).toHaveCount(0);
    await work.getByRole('button', { name: 'Revenir aux informations' }).click(); await expect(work.getByLabel('Prénom', { exact: true })).toHaveValue('Marie');
    await page.keyboard.press('Escape'); await expect(work.getByText('Quitter sans enregistrer ?', { exact: true })).toBeVisible();
    await work.getByRole('button', { name: 'Continuer la saisie' }).click(); await expect(work.getByLabel('Matricule officiel')).toHaveValue('EXISTANT');
    await expectWorkspaceFits(page);
  });

  test(`Les rapports financiers exportent tous les résultats par nom et période à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 }); await prepare(page);
    const records = Array.from({ length: 65 }, (_, index) => ({ id: `PAY-${index}`, sourceId: String(index), batchId: 'batch-fixture', status: 'PENDING', issues: [], values: { etudiant_id: '101', montant: index + 1, date_paiement: '2026-10-01', status: 'valide' } }));
    const offsets: number[] = [];
    await page.route('**/api/history?*', async route => {
      const params = new URL(route.request().url()).searchParams;
      if (params.get('table') !== 'paiements') { await route.fallback(); return; }
      const offset = Number(params.get('offset') || 0); offsets.push(offset);
      await route.fulfill({ json: { table: 'paiements', total: records.length, offset, limit: 50, records: records.slice(offset, offset + 50) } });
    });
    await page.goto('/finance/rapports');
    await page.getByRole('searchbox', { name: 'Rechercher un étudiant ou une référence' }).fill('Alice');
    await page.locator('summary').filter({hasText:'Filtrer par période'}).click();await page.getByLabel('Versement à partir du').fill('2026-10-01'); await page.getByLabel('Jusqu’au').fill('2026-10-02');
    await expect(page.getByRole('button', { name: 'Exporter les 65 résultat(s)', exact: true })).toBeEnabled();
    const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exporter les 65 résultat(s)', exact: true }).click();
    const file = await download; const contents = await readFile((await file.path())!, 'utf8');
    expect(contents.trim().split(/\r?\n/)).toHaveLength(66); expect(contents).toContain('Alice Exemple'); expect(offsets).toEqual([0, 50]);
    await expect(page.getByRole('status')).toContainText('65 ligne(s) préparée(s)');
    await page.getByLabel('Versement à partir du').fill('2026-10-02'); await expect(page.getByRole('button', { name: 'Exporter les 0 résultat(s)', exact: true })).toBeDisabled();
    await expectWorkspaceFits(page);
  });

  test(`Le planning mène au détail de séance et les modules indisponibles ne proposent pas de fausse validation à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 }); await prepare(page); const mutations: string[] = [];
    page.on('request', request => { if (request.url().includes('/api/') && request.method() !== 'GET') mutations.push(request.url()); });
    await page.goto('/academique/emploi-du-temps'); await expect(page.getByRole('heading', { name: '12/06/2026', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Consulter la séance', exact: true }).click();
    await expect(page.locator('.work-page')).toContainText('Groupe A'); await expect(page.locator('.work-page')).toContainText('ne confirme aucune présence'); await page.keyboard.press('Escape');
    for (const href of ['/logistique/achats', '/systeme/support', '/communication/annonces', '/academique/deliberations', '/academique/reclamations']) {
      await page.goto(href); await expect(page.locator('#main-content h1:visible')).toHaveCount(1);
      await expect(page.locator('#main-content form:visible')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Soumettre la demande|Publier|Ouvrir un ticket|Confirmer la décision/ })).toHaveCount(0);
      await expectWorkspaceFits(page);
    }
    expect(mutations).toEqual([]);
  });

  test(`Les droits futurs d’un compte sont vérifiés avant attribution à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 }); await authenticateFixture(page); const campus = structuredClone(snapshot); let writes = 0;
    await page.route('**/api/campus', route => route.fulfill({ json: campus }));
    await page.route('**/api/accounts/*', async route => {
      const body = route.request().postDataJSON(); expect(body.action).toBe('role'); expect(body.role).toBe(ROLES.IT); writes++;
      campus.tables.role_grants.push({ id: 'NEW', account_id: ACCOUNT_IDS[2], role_id: 'R2', valid_from: '2020-01-01T00:00:00Z', valid_until: null });
      await route.fulfill({ json: { revision: 2 } });
    });
    await page.goto('/personnel/utilisateurs'); const account = page.getByRole('row').filter({ hasText: 'sans-role@example.test' });
    await account.getByRole('button', { name: 'Gérer', exact: true }).click(); const work = page.locator('.work-page');
    await work.getByRole('combobox', { name: 'Rôle principal', exact: true }).selectOption(ROLES.IT); await work.getByLabel('Motif', { exact: true }).fill('Attribution demandée par la direction');
    await work.getByRole('button', { name: 'Vérifier les changements' }).click(); await expect(work.locator('.action-review')).toContainText('42 permission(s)'); expect(writes).toBe(0);
    await work.getByRole('button', { name: 'Confirmer le rôle', exact: true }).click(); await expect(account).toContainText(ROLES.IT); expect(writes).toBe(1);
    await expect(page.getByRole('status', { name: 'Résultat de l’opération' })).toContainText('rôle principal modifié');
  });
}

test('Les données actuelles de finance sont lues même sans accès aux archives', async ({ page }) => {
  await authenticateFixture(page);
  await page.route('**/api/session', route => route.fulfill({ json: { capabilities: fixtureCapabilities, accountId: ACCOUNT_IDS[1], role: ROLES.RAF, availableRoles: [ROLES.RAF], name: 'Finance', email: 'finance@example.test', studentId: null, teacherId: null, mustChangePassword: false } }));
  const campus = structuredClone(snapshot);
  campus.tables.enrollments = [{ id: 'EN1', student_id: 'S1' }];
  campus.tables.payments = [{ id: 'PAY1', enrollment_id: 'EN1', payer_name: 'Payeur officiel', amount: 30000, paid_on: '2026-10-01', method: 'ESPECES', reference: 'V-001' }];
  await page.route('**/api/campus', route => route.fulfill({ json: campus }));
  await page.goto('/finance/versements'); const row = page.getByRole('row').filter({ hasText: 'V-001' });
  await expect(row).toContainText('Payeur officiel'); await expect(row).toContainText('Alice Exemple'); await expect(row).toContainText('FCFA');
  await row.getByRole('button', { name: 'Ouvrir le détail' }).click(); await expect(page.locator('.work-page')).toContainText('30');
});


test('Les actions globales sont masquées pour un compte limité à un périmètre', async ({ page }) => {
  await authenticateFixture(page);
  const capabilities = structuredClone(fixtureCapabilities);
  capabilities[ROLES.IT].globalAccess = false;
  await page.route('**/api/session', route => route.fulfill({ json: { capabilities, accountId: ACCOUNT_IDS[1], role: ROLES.IT, availableRoles: [ROLES.IT], name: 'Compte limité', mustChangePassword: false } }));
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  await page.goto('/etudiants');
  await expect(page.getByRole('heading', { name: 'Dossiers étudiants', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajouter un dossier étudiant' })).toHaveCount(0);
  await page.goto('/personnel/utilisateurs');
  await expect(page.getByRole('button', { name: 'Gérer', exact: true })).toHaveCount(0);
});
