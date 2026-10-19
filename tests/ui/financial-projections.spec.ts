import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture } from './persistent-fixture';
import { financialProjectionFixture } from './financial-projections-fixture';
import { securityIds as id } from './security-fixture';
import { filterSnapshotForAcademicYear } from '../../src/services/academicYearScopeService';

async function mount(page: Page, fallback = false) {
  await authenticateFixture(page);
  const fixture = financialProjectionFixture();
  const campus = filterSnapshotForAcademicYear(fixture.snapshot, id.year);
  if (fallback) for (const table of ['financial_contracts', 'contract_versions', 'contract_lines', 'contract_discounts', 'credit_notes', 'installments', 'payment_allocations']) campus.tables[table] = [];
  await page.route('**/api/campus', route => route.fulfill({ json: { ...campus, academicContext: { currentYearId: id.year, currentYearConfigured: true, selectedYearId: id.year, selection: 'current', years: fixture.snapshot.tables.academic_years } } }));
  await page.route('**/api/students/*/operations*', async route => {
    const response = await fixture.get();
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  return fixture;
}

for (const width of [390, 1440]) test(`Situation, export CSV et dossier affichent les mêmes montants nets à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await mount(page);
  await page.goto('/finance');
  const summary = page.locator('dl.data-summary');
  await expect(summary.locator('div').filter({ has: page.getByText('Montant contractuel', { exact: true }) }).locator('dd')).toHaveText('900 FCFA');
  await expect(summary.locator('div').filter({ has: page.getByText('Montant payé', { exact: true }) }).locator('dd')).toHaveText('300 FCFA');
  await expect(summary.locator('div').filter({ has: page.getByText('Reste à payer', { exact: true }) }).locator('dd')).toHaveText('600 FCFA');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter les situations financières', exact: true }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  let csv = ''; for await (const chunk of stream) csv += chunk.toString();
  expect(csv).toContain('ESCEN-FIN-001'); expect(csv).toContain('"900";"300";"600"'); expect(csv).not.toContain('19000');
  await page.getByRole('link', { name: 'Élise Finance', exact: true }).click();
  await expect(page.getByText(/Encaissements nets des remboursements, hors paiements en attente ou annulés/)).toContainText('300 FCFA');
});

for (const fallback of [false, true]) test(`Pilotage : encaissement net identique avec ${fallback ? 'calcul de secours sans contrat' : 'projection principale'}`, async ({ page }) => {
  await mount(page, fallback);
  await page.goto('/tableau-de-bord');
  await expect(page.locator('.kpi-stat-tile').filter({ has: page.getByText('Encaissé', { exact: true }) }).locator('strong')).toHaveText('300 FCFA');
});
