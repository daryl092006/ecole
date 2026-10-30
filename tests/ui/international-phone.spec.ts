import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { projectRelationalCampus } from '../../src/services/relationalCampusAdapter';

async function studentFixture(page: Page, phone = '90 12 34 56') {
  await authenticateFixture(page);
  const campus = structuredClone(snapshot);
  campus.tables.people.find(row => row.id === 'P1')!.phone = phone;
  campus.tables.people.find(row => row.id === 'P1')!.nationality = 'Ancienne nationalité';
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
  await expect(code).toHaveText('Sans indicatif précisé⌄');
  await expect(phone).toHaveValue('90 12 34 56');
  await code.click();
  expect(await dialog.getByRole('option').count()).toBeGreaterThan(240);
  for (const [name, region] of [['Togo (+228)', 'tg'], ['France (+33)', 'fr'], ['Bénin (+229)', 'bj']]) {
    await expect(dialog.getByRole('option', { name, exact: true }).locator('img')).toHaveAttribute('src', `https://flagcdn.com/w40/${region}.png`);
  }
  await page.keyboard.press('Escape');
  const nationality = dialog.getByRole('combobox', { name: 'Nationalité', exact: true });
  await nationality.click();
  await dialog.getByRole('searchbox', { name: 'Rechercher — Nationalité', exact: true }).fill('beninoise');
  await dialog.getByRole('option', { name: 'Béninoise', exact: true }).click();
  await expect(nationality.locator('img')).toHaveAttribute('src', 'https://flagcdn.com/w40/bj.png');
  await code.click();
  await dialog.getByRole('option', { name: 'France (+33)', exact: true }).click();
  await phone.fill('06 12 34 56 78');
  await expect(phone).toHaveValue('612345678');
  await phone.fill('+229 01 90 00 00 00');
  await expect(code).toContainText('Bénin (+229)');
  await expect(phone).toHaveValue('0190000000');
  await code.click();
  await dialog.getByRole('option', { name: 'Italie (+39)', exact: true }).click();
  await phone.fill('06 12345678');
  await expect(phone).toHaveValue('0612345678');
  await phone.fill('0033 6 12 34 56 78');
  await expect(code).toContainText('France (+33)');
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
  expect(f.writes[0].nationality).toBe('Béninoise');
  await page.reload();
  await page.getByRole('button', { name: 'Modifier les informations civiles', exact: true }).click();
  await expect(code).toContainText('France (+33)');
  await expect(phone).toHaveValue('612345678');
  await expect(nationality).toContainText('Béninoise');
});

test('Indicatif partagé : pays non inventé, choix conservé et téléphone effaçable', async ({ page }) => {
  const f = await studentFixture(page, '+14155552671');
  const dialog = page.getByRole('dialog');
  const code = dialog.getByRole('combobox', { name: 'Indicatif — Téléphone', exact: true });
  const phone = dialog.getByLabel('Téléphone', { exact: true });
  await expect(code).toContainText('Indicatif +1 · pays non précisé');
  await expect(code.locator('img')).toHaveCount(0);
  await code.click();
  await dialog.getByRole('option', { name: 'Canada (+1)', exact: true }).click();
  await expect(code).toContainText('Canada (+1)');
  await phone.fill('4165550123');
  await expect(code).toContainText('Canada (+1)');
  await phone.fill('');
  await expect(code).toContainText('Canada (+1)');
  await dialog.getByRole('button', { name: 'Vérifier les modifications', exact: true }).click();
  await dialog.getByRole('button', { name: 'Enregistrer les informations civiles', exact: true }).click();
  expect(f.writes[0].phone).toBe('');
});

test('Une ancienne valeur non normalisée reste intacte si un autre champ est modifié', async ({ page }) => {
  const legacy = 'Ancien numéro à reprendre';
  const f = await studentFixture(page, legacy);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Téléphone', { exact: true })).toHaveValue(legacy);
  await expect(dialog.getByRole('combobox', { name: 'Nationalité', exact: true })).toContainText('Ancienne nationalité');
  await dialog.getByLabel('Prénom', { exact: true }).fill('Alice corrigée');
  await dialog.getByRole('button', { name: 'Vérifier les modifications', exact: true }).click();
  await dialog.getByRole('button', { name: 'Enregistrer les informations civiles', exact: true }).click();
  expect(f.writes[0].phone).toBe(legacy);
  expect(f.writes[0].nationality).toBe('Ancienne nationalité');
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
  await dialog.getByRole('combobox', { name: 'Indicatif — Téléphone', exact: true }).click();
  await dialog.getByRole('option', { name: 'Ghana (+233)', exact: true }).click();
  await dialog.getByLabel('Téléphone', { exact: true }).fill('0241234567');
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Vérification avant enregistrement' })).toContainText('+233241234567');
  expect(writes).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  expect(writes[0]).toMatchObject({ values: { phone: '+233241234567' } });
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`Nationalité : protéger une sélection sans saisie à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const fixture = await studentFixture(page);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'Nationalité', exact: true }).click();
    await dialog.getByRole('option', { name: 'Béninoise', exact: true }).click();
    await dialog.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Quitter sans enregistrer ?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Continuer la saisie', exact: true }).click();
    await expect(dialog.getByRole('combobox', { name: 'Nationalité', exact: true })).toContainText('Béninoise');
    expect(fixture.writes).toHaveLength(0);
  });

  test(`Nationalité : rechercher sans modifier le dossier à ${width}px`, async ({ page }) => {
    const fixture = await studentFixture(page);
    await page.setViewportSize({ width, height: 1000 });
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'Nationalité', exact: true }).click();
    await dialog.getByRole('searchbox', { name: 'Rechercher — Nationalité', exact: true }).fill('beninoise');
    await page.keyboard.press('Escape');
    await dialog.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(fixture.writes).toHaveLength(0);
  });
}

test('Drapeaux images : recherche au clavier et fermeture sans quitter le dossier', async ({ page }) => {
  await studentFixture(page);
  const dialog = page.getByRole('dialog');
  const nationality = dialog.getByRole('combobox', { name: 'Nationalité', exact: true });
  await nationality.focus();
  await nationality.press('ArrowDown');
  const search = dialog.getByRole('searchbox', { name: 'Rechercher — Nationalité', exact: true });
  await expect(search).toBeFocused();
  await search.fill('togolaise');
  await search.press('ArrowDown');
  await expect(dialog.getByRole('option', { name: 'Togolaise', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(nationality).toContainText('Togolaise');
  await expect(nationality.locator('img')).toHaveJSProperty('naturalWidth', 40);
  await nationality.click();
  await search.fill('inconnue');
  await expect(dialog.getByText('Aucun résultat.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(nationality).toBeFocused();
  await expect(dialog.getByRole('listbox')).toHaveCount(0);
});

test('Nationalité : la flèche haute depuis la recherche atteint la dernière option', async ({ page }) => {
  await studentFixture(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Nationalité', exact: true }).click();
  const search = dialog.getByRole('searchbox', { name: 'Rechercher — Nationalité', exact: true });
  await expect(search).toBeFocused();
  await search.press('ArrowUp');
  await expect(dialog.getByRole('listbox', { name: 'Nationalité', exact: true }).getByRole('option').last()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(dialog.getByRole('listbox', { name: 'Nationalité', exact: true }).getByRole('option').first()).toBeFocused();
});
