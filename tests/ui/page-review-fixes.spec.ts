import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [390, 1440]) {
  test(`Paramètres : les maquettes et les jurys s’ouvrent à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await installResponsiveAudit(page, 'staff');
    await page.goto('/academique/parametres');
    await page.getByRole('link', { name: 'Consulter les maquettes de cours' }).click();
    await expect(page).toHaveURL(/\/academique\/filieres$/);
    await expect(page.getByRole('heading', { name: 'Programmes de cours et matières', exact: true })).toBeVisible();
    await page.goto('/academique/parametres');
    await page.getByRole('link', { name: 'Consulter les jurys enregistrés' }).click();
    await expect(page).toHaveURL(/\/academique\/deliberations$/);
    await expect(page.getByRole('heading', { name: 'Délibérations et relevés', exact: true })).toBeVisible();
  });

  test(`Contrat et versement : le choix du dossier annonce la bonne action à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await installResponsiveAudit(page, 'staff');
    for (const [href, action] of [['/finance/contrats', 'gérer le contrat'], ['/finance/versements', 'encaisser']]) {
      await page.goto(href);
      await page.getByRole('button', { name: `Choisir le dossier pour ${action}`, exact: true }).click();
      await expect(page.getByRole('dialog', { name: `Choisir le dossier pour ${action}`, exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test(`Frais personnels : l’aide reste adaptée à l’étudiant à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await installResponsiveAudit(page, 'student');
    await page.goto('/mon-espace/scolarite');
    await expect(page.locator('.availability-details')).toContainText('votre inscription');
    await expect(page.locator('main')).not.toContainText('Pour encaisser');
    await expect(page.locator('main')).toContainText('contactez la scolarité ou le service financier');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
