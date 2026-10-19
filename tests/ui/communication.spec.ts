import { openAccountMenu } from './helpers';
import { test, expect, type Page } from '@playwright/test';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './legacy-demo-fixture';
import { ROLES } from '../../src/types/permissions';
import { captureWorkspace } from './helpers';

async function follow(page: Page, href: string) {
  const toggle = page.getByRole('button', { name: 'Ouvrir la navigation', exact: true });
  if (await toggle.isVisible()) await toggle.click();
  await page.locator(`#application-navigation a[href="${href}"]`).first().click();
  await expect(page).toHaveURL(`http://127.0.0.1:3105${href}`);
}

for (const width of [320, 1440]) {
  test(`Diffusion ciblée et retrait conservé à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/connexion');
    await page.getByLabel('Adresse email', { exact: true }).fill(DEMO_ACCOUNTS.find(item => item.role === ROLES.MKT)!.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:3105/mon-espace');
    await follow(page, '/communication/annonces');
    await page.getByLabel("Titre de l'annonce", { exact: true }).fill('Information pour les étudiants');
    await page.getByLabel('Corps du message', { exact: true }).fill('La séance aura lieu dans la salle indiquée au planning.');
    await page.getByLabel('Destinataires').selectOption('Étudiants');
    await page.getByLabel('Date d’expiration (facultative)', { exact: true }).fill('2099-12-31');
    await page.getByRole('button', { name: "Diffuser l'annonce", exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Annonce publiée');
    await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: ROLES.ENS });
    await expect(page).toHaveURL('http://127.0.0.1:3105/mon-espace');
    await follow(page, '/mon-espace/annonces');
    await expect(page.getByRole('heading', { name: 'Information pour les étudiants' })).toHaveCount(0);
    for (const role of [ROLES.STUD, ROLES.DEL]) {
      await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: role });
      await follow(page, '/mon-espace/annonces');
      await expect(page.getByRole('heading', { name: 'Information pour les étudiants' })).toBeVisible();
    }
    await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: ROLES.MKT });
    await follow(page, '/communication/annonces');
    await page.getByRole('button', { name: 'Retirer l’annonce « Information pour les étudiants »', exact: true }).click();
    await page.getByLabel('Motif du retrait', { exact: true }).fill('Le planning a été mis à jour.');
    await captureWorkspace(page, 'annonce-retrait');
    await page.getByRole('button', { name: 'Confirmer le retrait', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Annonce retirée');
    await expect(page.getByText('Étudiants · Retirée', { exact: false })).toBeVisible();
    await page.getByText('Historique de diffusion', { exact: true }).click();
    await expect(page.getByText('Le planning a été mis à jour.', { exact: false })).toBeVisible();
    await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: ROLES.STUD });
    await expect(page).toHaveURL('http://127.0.0.1:3105/mon-espace');
    await follow(page, '/mon-espace/annonces');
    await expect(page.getByRole('heading', { name: 'Information pour les étudiants' })).toHaveCount(0);
    await expect(page.getByText('Aucune annonce', { exact: true })).toBeVisible();
  });
}
