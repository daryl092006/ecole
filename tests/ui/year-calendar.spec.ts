import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
for (const width of [390, 1440]) {
  test(`Années sans tableau dupliqué à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    const years = [{ id: 'Y1', name: '2025-2026', status: 'OUVERTE', starts_on: '2025-10-01', ends_on: '2026-06-30' }, { id: 'Y2', name: '2026-2027', status: 'BROUILLON', starts_on: '2026-10-01', ends_on: '2027-06-30' }];
    await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { currentYearId: 'Y1', selectedYearId: 'Y1', selection: 'current', years } } }));
    await page.route('**/api/catalog/academic_years', route => route.fulfill({ json: { revision: 1, tables: { academic_years: years }, historyLinks: [] } }));
    await page.goto('/academique/referentiel');
    await expect(page.getByRole('button', { name: 'Configurer 2025-2026', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Préparer 2026-2027', exact: true })).toHaveCount(1);
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Archiver', exact: true })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Année consultée', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  test(`Calendrier des séances et détail à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, tables: { ...snapshot.tables, sessions: [{ id: 'SESSION', starts_at: '2026-10-15T08:00:00Z', ends_at: '2026-10-15T10:00:00Z', status: 'PLANIFIEE' }] } } }));
    await page.goto('/academique/emploi-du-temps');
    await expect(page.getByLabel('Calendrier des séances', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'octobre 2026', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Mois suivant', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'novembre 2026', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Mois précédent', exact: true }).click();
    await page.locator('.calendar-session').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const width of [390, 1440]) test(`Calendrier limité aux dates de l’année à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await authenticateFixture(page);
  const years = [{ id: 'Y', name: '2025-2026', status: 'OUVERTE', starts_on: '2025-10-13', ends_on: '2026-06-30' }];
  await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { currentYearId: 'Y', selectedYearId: 'Y', selection: 'current', years }, tables: { ...snapshot.tables, sessions: [
    { id: 'BEFORE', starts_at: '2025-10-01T08:00:00Z', ends_at: '2025-10-01T10:00:00Z' },
    { id: 'WITHIN', starts_at: '2025-10-15T08:00:00Z', ends_at: '2025-10-15T10:00:00Z' },
    { id: 'AFTER', starts_at: '2026-07-01T08:00:00Z', ends_at: '2026-07-01T10:00:00Z' },
  ] } } }));
  await page.goto('/academique/emploi-du-temps');
  await expect(page.getByRole('heading', { name: 'octobre 2025', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mois précédent', exact: true })).toBeDisabled();
  await expect(page.locator('.calendar-session')).toHaveCount(1);
  await expect(page.getByLabel('2025-10-01', { exact: true })).toHaveCount(0);
  const month = page.getByLabel('Mois', { exact: true });
  await expect(month).toHaveAttribute('min', '2025-10');
  await expect(month).toHaveAttribute('max', '2026-06');
  await month.fill('2026-06');
  await expect(page.getByRole('button', { name: 'Mois suivant', exact: true })).toBeDisabled();
  await month.fill('2027-01');
  await expect(month).toHaveValue('2026-06');
  await expect(page.getByText(/Séances sans date valide/)).toHaveCount(0);
});
