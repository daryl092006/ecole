import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';
import { ROLES } from '../../src/types/permissions';

for (const width of [390, 1440]) {
  test(`Chargé de clientèle : accès financier et saisie à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { problems } = await installResponsiveAudit(page, 'staff', ROLES.CC);
    await page.goto('/mon-espace');
    if (width < 1025) await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
    const navigation = page.locator('#application-navigation');
    await expect(navigation.getByRole('link', { name: 'Scolarité et paiements', exact: true })).toBeVisible();
    for (const href of ['/finance', '/finance/rapports', '/finance/versements']) {
      await page.goto(href);
      await expect(page.locator('main .loading-state:visible')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Accès refusé', exact: true })).toHaveCount(0);
      await expect(page.locator('main h1')).toBeVisible();
    }
    await page.getByRole('button', { name: 'Enregistrer un paiement', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(problems).toEqual([]);
  });
}
