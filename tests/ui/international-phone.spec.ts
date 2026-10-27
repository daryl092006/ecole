import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { projectRelationalCampus } from '../../src/services/relationalCampusAdapter';

async function studentFixture(page: Page, phone = '90 12 34 56') {
  await authenticateFixture(page);
  const campus = structuredClone(snapshot);
  campus.tables.people.find(row => row.id === 'P1')!.phone = phone;
  const years = [{ id: '10000000-0000-4000-8000-000000000001', name: '2026-2027', status: 'OUVERTE', starts_on: '2026-09-01', ends_on: '2027-07-31' }];
  let campusReads = 0;
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/campus', route => {
    campusReads++;
    return route.fulfill({ json: { ...campus, academicContext: { selection: 'current', currentYearId: years[0].id, selectedYearId: years[0].id, years } } });
  });
  await page.route('**/api/students/ESCEN-TEST-001', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { student: projectRelationalCampus(campus).data.students[0] } });
    const body = route.request().postDataJSON();
    expect(body.revision).toBe(campus.revision);
    writes.push(body);
    Object.assign(campus.tables.people.find(row => row.id === 'P1')!, body);
    campus.revision++;
    return route.fulfill({ json: { revision: campus.revision } });
  });
  await page.goto('/etudiants/ESCEN-TEST-001');
  await page.getByRole('button', { name: 'Modifier les informations civiles', exact: true }).click();
  return { writes, campus, reads: () => campusReads };
}

for (const width of [360, 390, 768, 1440]) test(`Téléphone international : indicatif, collage, confirmation et persistance à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const f = await studentFixture(page);
  const dialog = page.getByRole('dialog');
  const code = dialog.getByRole('combobox', { name: 'Indicatif — Téléphone', exact: true });
  const phone = dialog.getByLabel('Téléphone', { exact: true });
  await expect(code).toHaveValue('');
  await expect(phone).toHaveValue('90 12 34 56');
  expect(await code.locator('option').count()).toBeGreaterThan(240);
  await code.selectOption('FR-33');
  await phone.fill('06 12 34 56 78');
  await expect(phone).toHaveValue('612345678');
  await phone.fill('+229 01 90 00 00 00');
  await expect(code).toHaveValue('BJ-229');
  await expect(phone).toHaveValue('0190000000');
  await code.selectOption('IT-39');
  await phone.fill('06 12345678');
  await expect(phone).toHaveValue('0612345678');
  await phone.fill('0033 6 12 34 56 78');
  await expect(code).toHaveValue('FR-33');
  await expect(phone).toHaveValue('612345678');
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: `tmp/screenshots/page-phone-input/${width}/etudiant.png` });
  await dialog.getByRole('button', { name: 'Vérifier les modifications', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Vérification avant enregistrement' })).toContainText('+33612345678');
  expect(f.writes).toHaveLength(0);
  const before = f.reads();
  await dialog.getByRole('button', { name: 'Enregistrer les informations civiles', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(f.reads).toBeGreaterThan(before);
  expect(f.writes[0].phone).toBe('+33612345678');
  await page.reload();
  await page.getByRole('button', { name: 'Modifier les informations civiles', exact: true }).click();
  await expect(code).toHaveValue('FR-33');
  await expect(phone).toHaveValue('612345678');
});

test('Indicatif partagé : pays non inventé, choix conservé et téléphone effaçable', async ({ page }) => {
  const f = await studentFixture(page, '+14155552671');
  const dialog = page.getByRole('dialog');
  const code = dialog.getByRole('combobox', { name: 'Indicatif — Téléphone', exact: true });
  const phone = dialog.getByLabel('Téléphone', { exact: true });
  await expect(code).toHaveValue('code:1');
  await code.selectOption('CA-1');
  await expect(code).toHaveValue('CA-1');
  await phone.fill('4165550123');
  await expect(code).toHaveValue('CA-1');
  await phone.fill('');
  await expect(code).toHaveValue('CA-1');
  await dialog.getByRole('button', { name: 'Vérifier les modifications', exact: true }).click();
  await dialog.getByRole('button', { name: 'Enregistrer les informations civiles', exact: true }).click();
  expect(f.writes[0].phone).toBe('');
});

test('Une ancienne valeur non normalisée reste intacte si un autre champ est modifié', async ({ page }) => {
  const legacy = 'Ancien numéro à reprendre';
  const f = await studentFixture(page, legacy);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Téléphone', { exact: true })).toHaveValue(legacy);
  await dialog.getByLabel('Prénom', { exact: true }).fill('Alice corrigée');
  await dialog.getByRole('button', { name: 'Vérifier les modifications', exact: true }).click();
  await dialog.getByRole('button', { name: 'Enregistrer les informations civiles', exact: true }).click();
  expect(f.writes[0].phone).toBe(legacy);
});

test('Fournisseur : le champ partagé enregistre un indicatif autre que le Togo', async ({ page }) => {
  await authenticateFixture(page);
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/catalog/suppliers', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { revision: 1, tables: { suppliers: [] }, historyLinks: [] } });
    writes.push(route.request().postDataJSON());
    return route.fulfill({ json: { id: 'SUPPLIER', revision: 2 } });
  });
  await page.goto('/logistique/fournisseurs');
  await page.getByRole('button', { name: 'Ajouter un fournisseur', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom', { exact: true }).fill('Fournisseur international');
  await dialog.getByRole('combobox', { name: 'Indicatif — Téléphone', exact: true }).selectOption('GH-233');
  await dialog.getByLabel('Téléphone', { exact: true }).fill('0241234567');
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Vérification avant enregistrement' })).toContainText('+233241234567');
  expect(writes).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  expect(writes[0]).toMatchObject({ values: { phone: '+233241234567' } });
});
