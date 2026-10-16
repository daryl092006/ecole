import { test, expect } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';

for (const width of [390, 1440]) {
  test(`Menus organisés par activité à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    await page.goto('/mon-espace');
    const home = page.locator('.home-navigation');
    await expect(home.getByRole('region', { name: 'Année scolaire', exact: true })).toContainText('Préparer et gérer l’année');
    await expect(home.getByRole('region', { name: 'Cours et présences', exact: true })).toContainText('Enseignants et affectations');
    await expect(home.getByRole('region', { name: 'Comptes et droits d’accès', exact: true })).toContainText('Comptes étudiants');
    if (width < 800) await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
    const menu = page.locator('#application-navigation');
    await menu.getByRole('button', { name: 'Déplier Examens et résultats', exact: true }).click();
    await menu.getByRole('link', { name: 'Notes et résultats', exact: true }).click();
    await expect(page).toHaveURL(/\/academique\/notes$/);
    await expect(page.getByRole('navigation', { name: 'Fil d’Ariane' })).toContainText('Examens et résultats');
    if (width < 800) await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
    await expect(menu.getByRole('link', { name: 'Notes et résultats', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.screenshot({ path: `.tmp/interface/reorganized-menu-${width}.png` });
    if (width < 800) await menu.getByRole('button', { name: 'Fermer le menu', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Rechercher une page ou un dossier autorisé' }).fill('année');
    await expect(page.locator('#portal-search-results')).toContainText('Préparer et gérer l’année');
  });
}
