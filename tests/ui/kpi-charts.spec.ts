import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';
import { uuid } from './security-fixture';

for (const width of [390, 1440]) test(`Graphiques : effectifs, données exactes et paiements en attente à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  const { snapshot } = await installResponsiveAudit(page, 'staff');
  snapshot.tables.payments.push({ id: uuid(9980), enrollment_id: snapshot.tables.enrollments[0].id, amount: 99999, status: 'PENDING', reference: 'PENDING-CHART', paid_on: '2026-10-19' });
  await page.goto('/mon-espace');
  const population = page.getByRole('region', { name: 'Répartition des étudiants', exact: true });
  await expect(population.locator('.kpi-chart-bars > li').first()).toBeVisible();
  await population.getByRole('button', { name: 'Par groupe', exact: true }).click();
  await expect(population.getByRole('button', { name: 'Par groupe', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await population.getByRole('button', { name: 'Afficher les données', exact: true }).click();
  await expect(population.getByRole('table')).toBeVisible();
  const values = await population.locator('tbody tr td:last-child').allTextContents();
  expect(values.reduce((sum, value) => sum + Number(value.replace(/\s/g, '')), 0)).toBe(snapshot.tables.students.length);
  await population.getByRole('button', { name: 'Afficher le graphique', exact: true }).click();
  const finance = page.getByRole('region', { name: 'Répartition des frais', exact: true });
  await expect(finance.locator('.kpi-chart-center')).toContainText('33,3 %');
  await finance.getByRole('button', { name: 'Afficher les données', exact: true }).click();
  await expect(finance.getByRole('row').filter({ hasText: 'Réglé' })).toContainText(/400\s*FCFA/);
  await expect(finance.getByRole('row').filter({ hasText: 'Reste à régler' })).toContainText(/800\s*FCFA/);
  await finance.getByRole('button', { name: 'Afficher le graphique', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[aria-label="Indicateurs graphiques"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `tmp/screenshots/kpi-charts/staff-${width}.png` });
});

test('Graphiques financiers : une sélection vide ne devient pas un solde nul', async ({ page }) => {
  await installResponsiveAudit(page, 'staff');
  await page.goto('/finance');
  const chart = page.getByRole('region', { name: 'Répartition des frais', exact: true });
  await expect(chart.locator('.kpi-chart-ring')).toBeVisible();
  await chart.screenshot({ path: 'tmp/screenshots/kpi-charts/finance-global.png' });
  await page.getByPlaceholder('Rechercher par étudiant, matricule ou formation…').fill('AUCUN-DOSSIER-CORRESPONDANT');
  await expect(chart).toContainText('Données non disponibles pour cette sélection.');
  await expect(chart.locator('.kpi-chart-ring')).toHaveCount(0);
  await expect(page.locator('.kpi-card').filter({ hasText: 'Reste à recouvrer' })).toContainText('Non établi');
});

test('Graphique étudiant : seulement sa situation personnelle', async ({ page }) => {
  await installResponsiveAudit(page, 'student');
  await page.goto('/mon-espace');
  const chart = page.getByRole('region', { name: 'Mes frais et paiements', exact: true });
  await chart.getByRole('button', { name: 'Afficher les données', exact: true }).click();
  await expect(chart.getByRole('row').filter({ hasText: 'Réglé' })).toContainText(/400\s*FCFA/);
  await expect(chart.getByRole('row').filter({ hasText: 'Reste à régler' })).toContainText(/800\s*FCFA/);
  await expect(page.getByRole('region', { name: 'Répartition des étudiants', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'État des comptes', exact: true })).toHaveCount(0);
  await chart.getByRole('button', { name: 'Afficher le graphique', exact: true }).click();
  await chart.screenshot({ path: 'tmp/screenshots/kpi-charts/student-finance.png' });
});
