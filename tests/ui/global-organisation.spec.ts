import { test, expect } from '@playwright/test';
import { ROLES } from '../../src/types/permissions';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { captureWorkspace, openActionPanel } from './helpers';

for (const width of [390, 1440]) {
  test(`Accueils des modules et accès globaux à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    await page.goto('/mon-espace');
    for (const name of ['Étudiants', 'Pédagogie', 'Finance', 'Personnel', 'Achats & Logistique', 'Communication', 'Administration']) {
      await expect(page.locator('.home-destinations').getByRole('heading', { name, exact: true })).toBeVisible();
    }
    for (const [path, name, section] of [
      ['/academique', 'Pédagogie', 'Composition des épreuves'],
      ['/communication', 'Communication', 'Créer une Annonce'],
      ['/logistique', 'Achats & Logistique', 'Fournisseurs'],
      ['/systeme', 'Administration', 'Tickets de Support'],
    ]) {
      await page.goto(path);
      await expect(page.locator('.module-overview').getByRole('heading', { name, exact: true })).toBeVisible();
      await expect(page.locator('.module-overview').getByRole('link', { name: new RegExp(section) })).toBeVisible();
      await expect(page).toHaveURL(new RegExp(path + '$'));
      await captureWorkspace(page, `module-${path.slice(1)}`);
    }
    await page.goto('/academique/examens');
    if (width === 390) await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
    const menu = page.locator('#application-navigation');
    await expect(page.locator('.module-navigation')).toHaveCount(0);
    await expect(menu.getByRole('button', { name: 'Replier Pédagogie' })).toHaveAttribute('aria-expanded', 'true');
    await menu.getByRole('button', { name: 'Replier Pédagogie' }).click();
    await expect(menu.getByRole('link', { name: 'Rattrapages', exact: true })).toHaveCount(0);
    await menu.getByRole('button', { name: 'Déplier Pédagogie' }).click();
    await menu.getByRole('link', { name: 'Rattrapages', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Rattrapages', exact: true })).toBeVisible();
    if (width === 390) await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
    await expect(menu.getByRole('link', { name: 'Rattrapages', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(menu.locator('details')).toHaveCount(0);
    await menu.getByRole('link', { name: 'Communication', exact: true }).click();
    await expect(page.locator('.module-overview')).toBeVisible();
    if (width === 390) await expect(menu).not.toBeVisible();

  });

  test(`Support et communication en pages centrales à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    await page.route('**/api/session', route => route.fulfill({ json: { accountId: '00000000-0000-4000-8000-000000000002', name: 'Jean Technique', email: 'it@example.test', role: ROLES.MKT, availableRoles: [ROLES.MKT], studentId: null, teacherId: null, matricule: null, mustChangePassword: false } }));
    await page.goto('/mon-espace/support');
    await openActionPanel(page, 'Nouvelle demande');
    const work = page.locator('.work-page');
    await expect(work).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await work.getByLabel('Objet', { exact: true }).fill('Demande de suivi technique');
    await work.getByLabel('Description', { exact: true }).fill('Vérification du formulaire de support.');
    await work.getByRole('button', { name: 'Ouvrir un ticket' }).click();
    // A real session must expose the server integration limitation, never claim a mock save.
    await expect(work.getByRole('alert')).toBeVisible();
    await captureWorkspace(page, 'support-page-centrale');
    await work.getByRole('button', { name: 'Retour à la liste', exact: false }).click();
    await expect(work).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Support technique', exact: true })).toBeVisible();
    await page.goto('/communication/annonces');
    await page.getByRole('button', { name: 'Créer une annonce', exact: true }).click();
    await expect(work).toBeVisible();
    await work.getByLabel("Titre de l'annonce").fill('Information pratique');
    await work.getByLabel('Corps du message').fill('Message de vérification.');
    await work.getByRole('button', { name: "Diffuser l'annonce" }).click();
    await expect(work.getByRole('alert')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(work).toHaveCount(0);
  });
}
