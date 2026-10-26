import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [390, 820, 1440]) {
  test(`Liste des années : une seule action par ligne à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { problems } = await installResponsiveAudit(page, 'staff');
    await page.goto('/academique/referentiel?collection=academic_years');
    await expect(page.getByRole('heading', { name: 'Années scolaires', exact: true })).toBeVisible();
    const row = page.locator('.academic-year-row').filter({ hasText: '2026-2027' });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('button')).toHaveCount(1);
    await expect(page.locator('main').getByRole('button', { name: 'Voir', exact: true })).toHaveCount(0);
    await expect(page.locator('main').getByRole('button', { name: 'Modifier', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `tmp/screenshots/year-overview/${width}/liste.png` });
    await row.getByRole('button', { name: 'Ouvrir l’année 2026-2027', exact: true }).click();
    const manager = page.getByRole('dialog', { name: 'Année scolaire · 2026-2027', exact: true });
    await expect(manager).toBeVisible();
    await manager.getByRole('button', { name: 'Modifier les dates et le libellé', exact: true }).click();
    await expect(manager).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(problems).toEqual([]);
  });
}
