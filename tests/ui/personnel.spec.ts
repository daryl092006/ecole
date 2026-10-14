import { test, expect, type Page } from '@playwright/test';
import { ROLES } from '../../src/types/permissions';
import { DEMO_PASSWORD } from '../../src/services/demoSessionService';
import { captureWorkspace, openActionPanel } from './helpers';

async function navigate(page: Page, href: string) {
  const menu = page.getByRole('button', { name: 'Ouvrir la navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.locator(`#application-navigation a[href="${href}"]`).first().click();
  await expect(page).toHaveURL('http://127.0.0.1:3105' + href);
}

for (const width of [390, 1440]) {
  test(`Annuaire, rôle motivé et comparaison des droits à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/connexion?retour=%2Fpersonnel%2Futilisateurs');
    await page.getByLabel('Adresse email', { exact: true }).fill('direction@escen.demo');
    await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:3105/personnel/utilisateurs');
    await expect(page.locator('details.action-panel form')).not.toBeVisible();
    await expect(page.getByRole('heading', { name: /^Annuaire/ })).toBeVisible();
    await openActionPanel(page, 'Nouvel utilisateur');
    await page.getByLabel('Nom', { exact: true }).fill('Zoé Agent');
    await page.getByLabel('Email', { exact: true }).fill('zoe@example.test');
    await page.getByRole('combobox', { name: 'Rôle', exact: true }).selectOption({ label: ROLES.SURV });
    await page.getByRole('button', { name: 'Ajouter l’utilisateur', exact: true }).click();
    const record = page.getByRole('row').filter({ hasText: 'zoe@example.test' });
    await record.getByRole('button', { name: 'Changer le rôle', exact: true }).click();
    await page.getByRole('combobox', { name: 'Nouveau rôle', exact: true }).selectOption({ label: ROLES.ENS });
    await page.getByLabel('Motif du changement de rôle', { exact: true }).fill('Affectation pédagogique validée.');
    await page.getByRole('button', { name: 'Confirmer le rôle', exact: true }).click();
    await expect(record.getByRole('cell').nth(1)).toContainText(ROLES.ENS);
    await expect(page.getByText('Rôle modifié. L’ancienne attribution et le motif sont conservés.', { exact: true })).toBeVisible();
    await page.getByText('Historique des accès (2)', { exact: true }).click();
    await expect(page.getByText('Surveillant → Enseignant', { exact: true })).toBeVisible();
    await expect(page.getByText('Affectation pédagogique validée.', { exact: true })).toBeVisible();
    await captureWorkspace(page, 'personnel-role-historique');
    await page.getByRole('searchbox', { name: 'Rechercher', exact: true }).fill('zoe');
    await expect(record).toHaveCount(1);
    await page.getByRole('combobox', { name: 'Filtrer par rôle', exact: true }).selectOption({ label: ROLES.STG });
    await expect(page.getByText('Aucun utilisateur ne correspond à ces filtres.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Réinitialiser les filtres', exact: true }).click();
    await expect(record).toHaveCount(1);
    await navigate(page, '/personnel/roles');
    await expect(page.locator('.role-catalog-item')).toHaveCount(14);
    await page.getByRole('searchbox', { name: 'Rechercher un rôle', exact: true }).fill('stagiaire');
    await page.locator('.role-catalog-item').click();
    await expect(page.getByRole('heading', { name: 'Droits du rôle : Stagiaire', exact: true })).toBeVisible();
    await expect(page.getByText('0 permission(s) attribuée(s) à ce rôle.', { exact: true })).toBeVisible();
    await navigate(page, '/personnel/permissions');
    await page.getByRole('combobox', { name: 'Rôle à consulter', exact: true }).selectOption({ label: ROLES.IT });
    await page.getByRole('combobox', { name: 'Comparer avec', exact: true }).selectOption({ label: ROLES.DG });
    await page.getByRole('combobox', { name: 'Domaine', exact: true }).selectOption('finance');
    const cancellation = page.getByRole('row').filter({ hasText: 'Annuler les paiements avec motif' });
    await expect(cancellation.getByRole('cell').nth(2)).toHaveText('Autorisé');
    await expect(cancellation.getByRole('cell').nth(3)).toHaveText('Autorisé');
    await captureWorkspace(page, 'personnel-matrice-finance');
    await page.getByRole('searchbox', { name: 'Rechercher une permission', exact: true }).fill('introuvable');
    await expect(page.getByText('Aucune permission ne correspond aux filtres sélectionnés.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Réinitialiser les filtres', exact: true }).click();
    await page.getByRole('combobox', { name: 'Rôle à consulter', exact: true }).selectOption({ label: ROLES.DA });
    await page.getByRole('combobox', { name: 'Domaine', exact: true }).selectOption('grades');
    await expect(page.getByRole('row').filter({ hasText: 'Valider les notes' }).getByRole('cell').nth(2)).toHaveText('Autorisé');
    await page.getByRole('combobox', { name: 'Rôle à consulter', exact: true }).selectOption({ label: ROLES.ENS });
    await expect(page.getByRole('row').filter({ hasText: 'Valider les notes' }).getByRole('cell').nth(2)).toHaveText('Non attribué');
  });
}
