import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { getPreviousYearConfigSummary } from '../../src/services/yearPreparationService';
import type { DatabaseRow } from '../../src/types/persistence';

for (const width of [390, 1440]) test(`Encaissement : validation individuelle, sauvegarde et archivage à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await authenticateFixture(page);
  const yearId = '10000000-0000-4000-8000-000000000001';
  const previousYearId = '10000000-0000-4000-8000-000000000002';
  const years = [
    { id: yearId, name: '2026-2027', status: 'BROUILLON', starts_on: '2026-10-12', ends_on: '2027-06-30' },
    { id: previousYearId, name: '2025-2026', status: 'CLOTUREE', starts_on: '2025-10-13', ends_on: '2026-06-30' },
  ];
  const cash = { id: 'CASH', academic_year_id: yearId, name: 'Caisse principale', method: 'ESPECES' };
  const tables: Record<string, DatabaseRow[]> = { academic_years: years, annual_payment_channels: [cash] };
  const previousSummary = getPreviousYearConfigSummary({ revision: 1, tables: { academic_years: years, annual_payment_channels: [
    { ...cash, academic_year_id: previousYearId },
    { id: 'MOBILE', academic_year_id: previousYearId, name: 'TMoney', method: 'MOBILE_MONEY' },
    { id: 'BANK', academic_year_id: previousYearId, name: 'Compte bancaire', method: 'VIREMENT' },
  ] } }, previousYearId)!;
  let revision = 1, campusReads = 0, bulkWrites = 0, paymentWrites = 0;
  let failBank = true;
  const writes: { method: string; body: { values?: Record<string, unknown>; reason: string } }[] = [];
  await page.route('**/api/campus', route => {
    campusReads += 1;
    return route.fulfill({ json: { ...snapshot, academicContext: { selection: 'current', selectedYearId: yearId, currentYearId: yearId, years } } });
  });
  await page.route('**/api/payments*', route => { paymentWrites += 1; return route.fulfill({ status: 400, json: { error: 'Aucun paiement attendu.' } }); });
  await page.route('**/api/year-preparation', route => {
    if (route.request().method() !== 'GET') bulkWrites += 1;
    return route.fulfill({ json: { checks: [{ key: 'payments', label: 'Encaissement', ready: false, href: '' }], previousYear: previousSummary.previousYear, previousSummary } });
  });
  await page.route('**/api/catalog/*', route => route.fulfill({ json: { revision, tables, historyLinks: [] } }));
  await page.route('**/api/catalog/annual_payment_channels{,/**}', route => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({ json: { revision, tables, historyLinks: [] } });
    const body = request.postDataJSON();
    expect(request.headers()['x-escen-year']).toBe(yearId);
    expect(body.revision).toBe(revision);
    writes.push({ method: request.method(), body });
    if (body.values?.method === 'VIREMENT' && failBank) { failBank = false; return route.fulfill({ status: 503, json: { error: 'Enregistrement momentanément indisponible.' } }); }
    const id = request.method() === 'POST' ? `CHANNEL-${tables.annual_payment_channels.length}` : new URL(request.url()).pathname.split('/').at(-1)!;
    const existing = tables.annual_payment_channels.find(row => row.id === id);
    if (request.method() === 'DELETE') Object.assign(existing!, { archived_at: '2026-10-19', reason: body.reason });
    else if (existing) Object.assign(existing, body.values);
    else tables.annual_payment_channels.push({ id, ...body.values });
    revision += 1;
    return route.fulfill({ json: { id, revision } });
  });
  await page.goto('/academique/referentiel');
  await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
  const open = () => page.getByRole('button', { name: 'Configurer encaissement', exact: true }).click();
  await open();
  const dialog = page.getByRole('dialog');
  const row = (name: string) => dialog.getByRole('row').filter({ hasText: name });
  await expect(dialog.getByRole('heading', { name: 'Encaissement', exact: true })).toBeVisible();
  await expect(dialog.getByRole('columnheader')).toHaveText(['Caisse ou organisme', 'Mode', 'État', 'Actions']);
  await expect(dialog.locator('tbody > tr')).toHaveCount(3);
  await expect(row('Caisse principale')).toContainText('Espèces');
  await expect(row('TMoney')).toContainText('Mobile money');
  const search = dialog.getByRole('searchbox', { name: 'Rechercher', exact: true });
  await search.fill('Virement bancaire');
  await expect(dialog.locator('tbody > tr')).toHaveCount(1);
  await search.fill('inexistant');
  await expect(search).toBeVisible();
  await expect(dialog.getByRole('cell', { name: /Aucun résultat/ })).toHaveAttribute('colspan', '4');
  await search.fill('');
  const tops = await row('TMoney').getByRole('button').evaluateAll(buttons => buttons.map(button => Math.round(button.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/encaissement-liste.png` });
  await row('TMoney').getByRole('button', { name: 'Valider', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Vérification avant enregistrement' })).toContainText('Mobile money');
  expect(writes).toHaveLength(0);
  const beforeSave = campusReads;
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
  expect(writes[0]).toMatchObject({ method: 'POST', body: { values: { academic_year_id: yearId, name: 'TMoney', method: 'MOBILE_MONEY' } } });
  await expect.poll(() => campusReads).toBeGreaterThan(beforeSave);
  await open();
  await expect(dialog.locator('tbody > tr')).toHaveCount(3);
  await expect(dialog.getByText('1 proposition non enregistrée', { exact: true })).toBeVisible();
  await row('Compte bancaire').getByRole('button', { name: 'Modifier', exact: true }).click();
  const mode = dialog.getByRole('combobox', { name: 'Mode', exact: true });
  await expect(mode).toHaveValue('VIREMENT');
  await expect(mode.locator('option')).toHaveText(['Sélectionner', 'Espèces', 'Mobile money', 'Virement bancaire', 'Chèque', 'Carte bancaire']);
  await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/encaissement-formulaire.png` });
  await dialog.getByRole('button', { name: 'Enregistrer le moyen de paiement', exact: true }).click();
  expect(writes).toHaveLength(1);
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('momentanément indisponible');
  await dialog.getByRole('button', { name: 'Revenir aux informations', exact: true }).click();
  await expect(mode).toHaveValue('VIREMENT');
  await expect(dialog.getByRole('textbox', { name: 'Caisse ou organisme', exact: true })).toHaveValue('Compte bancaire');
  await dialog.getByRole('button', { name: 'Enregistrer le moyen de paiement', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
  expect(tables.annual_payment_channels).toHaveLength(3);
  await open();
  await expect(dialog.getByText('1 proposition non enregistrée', { exact: true })).toHaveCount(0);
  await row('Caisse principale').getByRole('button', { name: 'Modifier', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Caisse ou organisme', exact: true }).fill('Caisse principale matin');
  await dialog.getByLabel('Motif', { exact: true }).fill('Précision du libellé de la caisse');
  await dialog.getByRole('button', { name: 'Enregistrer le moyen de paiement', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Vérification avant enregistrement' })).toContainText('Avant : Caisse principale');
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
  expect(writes[3]).toMatchObject({ method: 'PATCH', body: { values: { name: 'Caisse principale matin', academic_year_id: yearId, method: 'ESPECES' } } });
  await open();
  await row('Caisse principale matin').getByRole('button', { name: 'Archiver', exact: true }).click();
  await dialog.getByLabel('Motif', { exact: true }).fill('Caisse non utilisée pour cette année');
  await dialog.getByRole('button', { name: 'Vérifier l’archivage', exact: true }).click();
  expect(writes).toHaveLength(4);
  await dialog.getByRole('button', { name: 'Confirmer l’archivage', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
  expect(writes[4]).toMatchObject({ method: 'DELETE', body: { reason: 'Caisse non utilisée pour cette année' } });
  expect(tables.annual_payment_channels.find(channel => channel.id === 'CASH')?.archived_at).toBeTruthy();
  expect(bulkWrites).toBe(0);
  expect(paymentWrites).toBe(0);
});
