import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [390, 768, 1024, 1440]) {
  test(`Navigation directe, pages voisines et filtres visibles à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { problems } = await installResponsiveAudit(page, 'staff');
    await page.goto('/mon-espace');
    await expect(page.getByRole('heading', { name: 'Que souhaitez-vous faire ?' })).toBeVisible();
    await expect(page.locator('.home-directory-group')).toHaveCount(0);
    if (width <= 768) await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
    const menu = page.locator('#application-navigation');
    await expect(menu.locator('[aria-expanded]')).toHaveCount(0);
    await menu.getByRole('link', { name: 'Dossiers étudiants', exact: true }).click();
    await expect(page).toHaveURL(/\/etudiants$/);
    if (width <= 768) await expect(menu).not.toBeVisible();
    const local = page.getByRole('navigation', { name: 'Pages : Dossiers étudiants' });
    await expect(local.getByRole('link', { name: 'Dossiers et inscriptions', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('combobox', { name: 'Filière', exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Filière', exact: true }).selectOption({ index: 1 });
    await expect(page.getByRole('button', { name: 'Effacer les filtres', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Effacer les filtres', exact: true }).click();
    await local.getByRole('link', { name: 'Réinscriptions et statuts', exact: true }).click();
    await expect(page).toHaveURL(/\/etudiants\/parcours$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/etudiants$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(problems).toEqual([]);
  });
}

for (const width of [390, 1440]) {
  test(`Encaissement : le dossier choisi ouvre directement les finances à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { problems } = await installResponsiveAudit(page, 'staff');
    await page.goto('/finance/versements');
    await page.getByRole('button', { name: 'Choisir le dossier pour encaisser', exact: true }).click();
    await page.getByRole('button', { name: 'Consulter le dossier', exact: true }).click();
    const dossier = page.getByRole('dialog', { name: 'Dossier étudiant · ESCEN-TEST-001' });
    await expect(dossier).toBeVisible();
    await expect(dossier.getByRole('button', { name: 'Frais et versements', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(problems).toEqual([]);
  });
}
