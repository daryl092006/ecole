import { test, expect } from '@playwright/test';
import { DEMO_PASSWORD } from '../../src/services/demoSessionService';
import { ROLES } from '../../src/types/permissions';
import { openActionPanel, expectWorkspaceFits, captureWorkspace } from './helpers';

for (const width of [390, 1440]) {
  test(`Changer de rubrique et choisir une sous-page à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/connexion?retour=%2Fpersonnel%2Futilisateurs');
    await page.getByLabel('Adresse email', { exact: true }).fill('direction@escen.demo');
    await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect(page).toHaveURL(/\/personnel\/utilisateurs$/);
    await openActionPanel(page, 'Nouvel utilisateur');
    await page.getByLabel('Nom', { exact: true }).fill('Compte conservé');
    await page.getByLabel('Email', { exact: true }).fill('navigation@example.test');
    await page.getByRole('button', { name: 'Ajouter l’utilisateur', exact: true }).click();

    const destinations = [
      { module: 'Finance', href: '/finance/contrats' },
      { module: 'Académique', href: '/academique/emploi-du-temps' },
      { module: 'Étudiants', href: '/etudiants' },
      { module: 'Personnel', href: '/personnel/roles' },
      { module: 'Finance', href: '/finance/versements' },
      { module: 'Personnel', href: '/personnel/utilisateurs' },
    ];
    for (const destination of destinations) {
      const menu = page.getByRole('button', { name: 'Ouvrir la navigation', exact: true });
      if (await menu.isVisible()) await menu.click();
      const before = page.url();
      const toggle = page.getByRole('button', { name: `Déplier ${destination.module}`, exact: true });
      await toggle.focus();
      await toggle.press('Enter');
      await expect(page).toHaveURL(before);
      await expect(page.locator('#application-navigation')).toBeVisible();
      await expect(page.getByRole('button', { name: `Replier ${destination.module}`, exact: true })).toHaveAttribute('aria-expanded', 'true');
      await page.locator(`#application-navigation a.subnav-item[href="${destination.href}"]`).click();
      await expect(page).toHaveURL('http://127.0.0.1:3105' + destination.href);
      await expect(page.locator('#application-navigation .subnav-item.active')).toHaveAttribute('href', destination.href);
      if (width === 390) await expect(page.locator('#application-navigation')).not.toBeVisible();
      await expectWorkspaceFits(page);
    }
    await expect(page.getByRole('row').filter({ hasText: 'navigation@example.test' })).toBeVisible();
    await captureWorkspace(page, 'navigation-retour-annuaire');
    await page.locator('#active-role').selectOption({ label: ROLES.IT });
    const menu = page.getByRole('button', { name: 'Ouvrir la navigation', exact: true });
    if (await menu.isVisible()) await menu.click();
    await expect(page.getByRole('button', { name: 'Déplier Finance', exact: true })).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
