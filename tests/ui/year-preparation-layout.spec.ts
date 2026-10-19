import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';

for (const width of [390, 1440]) test(`Préparation sobre et cinq rubriques à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await authenticateFixture(page);
  const yearId = '10000000-0000-4000-8000-000000000001';
  const years = [{ id: yearId, name: '2026-2027', status: 'BROUILLON', starts_on: '2026-10-12', ends_on: '2027-06-30' }];
  await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { selection: 'current', selectedYearId: yearId, currentYearId: yearId, years } } }));
  await page.route('**/api/catalog/*', route => route.fulfill({ json: { revision: 1, tables: { academic_years: years }, historyLinks: [] } }));
  await page.route('**/api/year-preparation', route => route.fulfill({ json: {
    checks: ['offerings', 'groups', 'tuition', 'registration', 'payments'].map((key, index) => ({ key, label: key, ready: index < 2, href: '' })),
    previousYear: { id: 'previous', name: '2025-2026' },
  } }));
  await page.goto('/academique/referentiel?collection=academic_years');
  await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const rows = dialog.getByRole('list', { name: 'Préparation de l’année' }).getByRole('listitem');
  await expect(rows).toHaveCount(5);
  await expect(dialog).toContainText('2 sur 5 rubriques prêtes');
  await expect(dialog.getByText('Prêt', { exact: true })).toHaveCount(2);
  await expect(dialog.getByText('À renseigner', { exact: true })).toHaveCount(3);
  await expect(rows.getByRole('button')).toHaveText(['Ouvrir', 'Ouvrir', 'Ouvrir', 'Ouvrir', 'Ouvrir']);
  await expect(dialog.getByRole('button', { name: 'Ouvrir l’année 2026-2027', exact: true })).toHaveCount(0);
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/preparation-sobre.png` });
});
