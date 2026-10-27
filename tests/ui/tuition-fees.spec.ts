import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { getPreviousYearConfigSummary } from '../../src/services/yearPreparationService';
import type { DatabaseRow } from '../../src/types/persistence';

for (const category of ['SCOLARITE', 'INSCRIPTION'] as const) for (const width of [360, 390, 1440]) test(`${category} : valider un tarif, modifier et retrouver le montant à ${width}px`, async ({ page }) => {
  const step = category === 'SCOLARITE' ? 'tuition' : 'registration';
  const label = category === 'SCOLARITE' ? 'frais de scolarité' : 'frais d’inscription';
  const artifactName = category === 'SCOLARITE' ? 'scolarite' : 'inscription';
  await page.setViewportSize({ width, height: 1000 });
  await authenticateFixture(page);
  const yearId = '10000000-0000-4000-8000-000000000001';
  const previousYearId = '10000000-0000-4000-8000-000000000002';
  const years = [
    { id: yearId, name: '2026-2027', status: 'BROUILLON', starts_on: '2026-10-12', ends_on: '2027-06-30' },
    { id: previousYearId, name: '2025-2026', status: 'CLOTUREE', starts_on: '2025-10-13', ends_on: '2026-06-30' },
  ];
  const tables: Record<string, DatabaseRow[]> = {
    academic_years: years,
    programs: [{ id: 'FIN', name: 'Finance Digitale', level_ids: ['L1'] }],
    levels: [{ id: 'L1', name: 'Licence 1' }],
    annual_fee_schedules: [],
  };
  const previousSummary = getPreviousYearConfigSummary({ revision: 1, tables: { ...tables, annual_fee_schedules: [
    { id: 'COMMON', academic_year_id: previousYearId, category, amount: 480000 },
    { id: 'SPECIFIC', academic_year_id: previousYearId, category, amount: 700000, program_id: 'FIN', level_id: 'L1', delivery_mode: 'En ligne' },
    { id: 'REGISTRATION', academic_year_id: previousYearId, category: category === 'SCOLARITE' ? 'INSCRIPTION' : 'SCOLARITE', amount: 50000 },
  ] } }, previousYearId)!;
  let revision = 1;
  let bulkWrites = 0;
  let failWrite = true;
  const writes: { method: string; values: Record<string, unknown> }[] = [];
  await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { selection: 'current', selectedYearId: yearId, currentYearId: yearId, years } } }));
  await page.route('**/api/year-preparation', route => {
    if (route.request().method() !== 'GET') bulkWrites += 1;
    return route.fulfill({ json: { checks: [{ key: step, label, ready: false, href: '' }], previousYear: previousSummary.previousYear, previousSummary } });
  });
  await page.route('**/api/catalog/*', route => route.fulfill({ json: { revision, tables, historyLinks: [] } }));
  await page.route('**/api/catalog/annual_fee_schedules{,/**}', route => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({ json: { revision, tables, historyLinks: [] } });
    const body = request.postDataJSON();
    expect(request.headers()['x-escen-year']).toBe(yearId);
    expect(body.revision).toBe(revision);
    writes.push({ ...body, method: request.method() });
    if (body.values.amount === 720000 && failWrite) {
      failWrite = false;
      return route.fulfill({ status: 503, json: { error: 'Enregistrement momentanément indisponible.' } });
    }
    revision += 1;
    const id = request.method() === 'PATCH' ? new URL(request.url()).pathname.split('/').at(-1)! : `FEE-${tables.annual_fee_schedules.length + 1}`;
    const existing = tables.annual_fee_schedules.find(row => row.id === id);
    const values = { id, ...body.values, program_id: body.values.program_id || null, level_id: body.values.level_id || null, delivery_mode: body.values.delivery_mode || null };
    if (existing) Object.assign(existing, values);
    else tables.annual_fee_schedules.push(values);
    return route.fulfill({ status: 201, json: { id, revision } });
  });
  await page.goto('/academique/referentiel');
  await page.getByRole('button', { name: 'Ouvrir l’année 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
  const openFees = () => page.getByRole('button', { name: `Configurer ${label}`, exact: true }).click();
  await openFees();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('columnheader')).toHaveText(['Filière', 'Niveau', 'Mode', 'Montant FCFA', 'État', 'Actions']);
  await expect(dialog.locator('tbody > tr')).toHaveCount(2);
  for (const row of await dialog.locator('tbody > tr').all()) {
    const tops = await row.getByRole('button').evaluateAll(buttons => buttons.map(button => Math.round(button.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'Les actions restent sur une ligne pour chaque tarif').toBe(1);
  }
  await expect(dialog.getByRole('cell', { name: /50\s000 FCFA$/ })).toHaveCount(0);
  const search = dialog.getByRole('searchbox', { name: 'Rechercher', exact: true });
  await search.fill('480000');
  await expect(dialog.locator('tbody > tr')).toHaveCount(1);
  await expect(dialog.getByRole('cell', { name: /480\s000 FCFA$/ })).toBeVisible();
  await search.fill('tarif introuvable');
  await expect(search).toBeVisible();
  await expect(dialog.getByRole('cell', { name: /Aucun résultat/ })).toHaveAttribute('colspan', '6');
  await search.fill('');
  await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/frais-${artifactName}-liste.png` });
  const common = dialog.getByRole('row').filter({ hasText: 'Toutes les filières' });
  await expect(common.getByRole('button', { name: 'Valider', exact: true })).toHaveAttribute('title', 'Valider');
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const proposalTops = await common.getByRole('button').evaluateAll(buttons => buttons.map(button => Math.round(button.getBoundingClientRect().top)));
  expect(new Set(proposalTops).size, 'Les quatre icônes de proposition restent sur une ligne').toBe(1);
  await common.getByRole('button', { name: 'Valider', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Vérification avant enregistrement' })).toContainText(/480\s000 FCFA/);
  expect(writes).toHaveLength(0);
  expect(bulkWrites).toBe(0);
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].values).toMatchObject({ academic_year_id: yearId, category, amount: 480000 });
  expect(tables.annual_fee_schedules).toHaveLength(1);
  await openFees();
  await expect(dialog.locator('tbody > tr')).toHaveCount(2);
  await expect(dialog.getByText('1 proposition non enregistrée', { exact: true })).toBeVisible();
  await dialog.getByRole('row').filter({ hasText: 'Finance Digitale' }).getByRole('button', { name: 'Modifier', exact: true }).click();
  await expect(dialog.getByLabel('Montant FCFA', { exact: true })).toHaveValue('700000');
  await expect(dialog.getByRole('checkbox', { name: 'Finance Digitale', exact: true })).toBeChecked();
  await dialog.getByLabel('Montant FCFA', { exact: true }).fill('720000');
  await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/frais-${artifactName}-formulaire.png` });
  await dialog.getByRole('button', { name: 'Enregistrer le tarif', exact: true }).click();
  const review = dialog.getByRole('region', { name: 'Vérification avant enregistrement' });
  await expect(review).toContainText(/Avant : 700\s000 FCFA/);
  await expect(review).toContainText(/720\s000 FCFA/);
  await expect(review).toContainText('Les contrats et paiements existants ne seront pas recalculés automatiquement.');
  expect(writes).toHaveLength(1);
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('momentanément indisponible');
  expect(tables.annual_fee_schedules).toHaveLength(1);
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
  expect(writes).toHaveLength(3);
  expect(writes[2].values).toMatchObject({ academic_year_id: yearId, category, amount: 720000, program_id: 'FIN', level_id: 'L1', delivery_mode: 'En ligne' });
  expect(bulkWrites).toBe(0);
  await openFees();
  await expect(dialog.locator('tbody > tr')).toHaveCount(2);
  await expect(dialog.getByText('proposition non enregistrée')).toHaveCount(0);
  await dialog.getByRole('row').filter({ hasText: 'Finance Digitale' }).getByRole('button', { name: 'Modifier', exact: true }).click();
  await expect(dialog.getByLabel('Montant FCFA', { exact: true })).toHaveValue('720000');
  await expect(dialog.getByRole('combobox', { name: 'Mode de formation (facultatif)', exact: true })).toHaveValue('En ligne');
  await dialog.getByLabel('Montant FCFA', { exact: true }).fill('730000');
  await dialog.getByLabel('Motif', { exact: true }).fill('Ajustement du tarif de scolarité');
  await dialog.getByRole('button', { name: 'Enregistrer le tarif', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Vérification avant enregistrement' })).toContainText(/Avant : 720\s000 FCFA/);
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
  expect(writes[3]).toMatchObject({ method: 'PATCH', values: { academic_year_id: yearId, category, amount: 730000 } });
  expect(tables.annual_fee_schedules).toHaveLength(2);
});
