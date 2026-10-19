import { openAccountMenu } from './helpers';
import { openActionPanel } from './helpers';
import { test, expect, type Page } from '@playwright/test';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './legacy-demo-fixture';
import { ROLES } from '../../src/types/permissions';

test('L’Informaticien administre aussi les rôles de direction', async ({ page }) => {
  await page.goto('/connexion?retour=%2Fpersonnel%2Futilisateurs');
  await connect(page, 'informatique@escen.demo');
  await expect(page).toHaveURL('http://127.0.0.1:3105/personnel/utilisateurs');
  const roleSelect = page.getByRole('combobox', { name: 'Rôle', exact: true });
  await expect(roleSelect.locator('option').filter({ hasText: ROLES.DGA })).toHaveCount(1);
  await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: ROLES.DG });
  await openActionPanel(page, 'Nouvel utilisateur');
  await page.getByLabel('Nom', { exact: true }).fill('Direction adjointe test');
  await page.getByLabel('Email', { exact: true }).fill('adjoint@example.test');
  await roleSelect.selectOption({ label: ROLES.DGA });
  await page.getByRole('button', { name: 'Ajouter l’utilisateur' }).click();
  const record = page.locator('.ledger-item').filter({ hasText: 'adjoint@example.test' });
  await expect(record.getByRole('button', { name: 'Désactiver', exact: true })).toBeVisible();
  await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: ROLES.IT });
  await expect(record).toBeVisible();
  await expect(record.getByRole('button', { name: 'Désactiver', exact: true })).toBeVisible();
});

async function connect(page: Page, email = DEMO_ACCOUNTS[0].email) {
  await page.getByLabel('Adresse email', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
}
test('Connexion, lien direct, historique du navigateur et déconnexion', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/finance/contrats');
  await expect(page).toHaveURL(/\/connexion\?retour=%2Ffinance%2Fcontrats$/);
  await expect(page.getByRole('img', { name: /École supérieure/ })).toHaveAttribute('src', '/logo-escen.png');
  await page.screenshot({ path: '.tmp/connexion-desktop.png', fullPage: true });
  await page.getByLabel('Adresse email', { exact: true }).fill(DEMO_ACCOUNTS[0].email);
  await page.getByLabel('Mot de passe', { exact: true }).fill('MotDePasseIncorrect');
  await page.getByRole('button', { name: 'Afficher le mot de passe' }).click();
  await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Masquer le mot de passe' }).click();
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Adresse email ou mot de passe incorrect.' })).toBeVisible();
  await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3105/finance/contrats');
  await expect(page.getByRole('heading', { name: 'Contrats, frais et bourses', exact: true })).toBeVisible();
  await page.locator('#application-navigation').getByRole('link', { name: 'Rapports Financiers', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3105/finance/rapports');
  await page.goBack(); await expect(page).toHaveURL('http://127.0.0.1:3105/finance/contrats');
  await expect(page.getByRole('heading', { name: 'Contrats, frais et bourses', exact: true })).toBeVisible();
  await page.goForward(); await expect(page).toHaveURL('http://127.0.0.1:3105/finance/rapports');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3105/connexion');
  await expect(page.locator('#application-navigation')).toHaveCount(0);
  await page.goBack(); await expect(page).toHaveURL(/\/connexion/);
  await expect(page.locator('#main-content')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Les routes non autorisées ne montrent aucun écran métier', async ({ page }) => {
  await page.goto('/finance/contrats'); await expect(page).toHaveURL(/\/connexion/);
  await connect(page, 'stagiaire@escen.demo'); await expect(page).toHaveURL('http://127.0.0.1:3105/mon-espace');
  await expect(page.locator('#application-navigation').getByRole('link', { name: 'Finance', exact: true })).toHaveCount(0);
  await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: 'Directeur Général' });
  await page.locator('#application-navigation').getByRole('link', { name: 'Finance', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3105/finance');
  await page.locator('#application-navigation').getByRole('link', { name: 'Contrats, frais & Bourses', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3105/finance/contrats');
  await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: 'Stagiaire' });
  await expect(page).toHaveURL('http://127.0.0.1:3105/mon-espace');
  await page.goBack(); await expect(page).toHaveURL('http://127.0.0.1:3105/finance');
  await expect(page.getByRole('heading', { name: 'Accès refusé', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Situation financière', exact: true })).toHaveCount(0);
});

test('Aide à la connexion, logo et page introuvable', async ({ page }) => {
  await page.goto('/'); await expect(page).toHaveURL('http://127.0.0.1:3105/connexion');
  await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3105/mot-de-passe-oublie');
  await page.getByLabel('Adresse email', { exact: true }).fill('personne@example.test');
  await page.getByRole('button', { name: 'Demander de l’aide' }).click();
  await expect(page.getByRole('status')).toContainText('Aucun email n’est envoyé');
  await page.getByRole('link', { name: 'Revenir à la connexion', exact: true }).click();
  await connect(page, 'informatique@escen.demo'); await expect(page).toHaveURL('http://127.0.0.1:3105/mon-espace');
  await page.locator('#application-navigation').getByRole('link', { name: 'Système & Audit', exact: true }).click();
  await page.locator('#application-navigation').getByRole('link', { name: 'Tickets de Support', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3105/systeme/support');
  await expect(page.getByRole('heading', { name: 'Demande d’aide à la connexion', exact: true })).toBeVisible();
  const response = await page.goto('/adresse-inconnue'); expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
  await expect(page.getByRole('img', { name: /École supérieure/ })).toBeVisible();
});

test('La connexion est lisible sur mobile avec le logo fourni', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/connexion');
  await expect(page.getByRole('heading', { name: 'Connexion', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /École supérieure/ })).toBeVisible();
  await page.getByText('Accès de démonstration', { exact: true }).click();
  await page.getByRole('button', { name: 'Préremplir cet accès' }).click();
  await expect(page.getByLabel('Adresse email', { exact: true })).toHaveValue(DEMO_ACCOUNTS[0].email);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.screenshot({ path: '.tmp/connexion-mobile.png', fullPage: true });
});
