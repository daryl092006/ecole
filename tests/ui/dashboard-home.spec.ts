import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [390, 1440]) test(`Accueil : tableau de bord IT et raccourcis à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  await installResponsiveAudit(page, 'staff');
  await page.goto('/mon-espace');
  await expect(page.getByRole('region', { name: 'Système & Comptes', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'À suivre', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Que souhaitez-vous faire ?', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `tmp/screenshots/dashboard-home/${width}.png`, fullPage: true });
});

for (const width of [360, 390, 768, 1024, 1440]) test(`Accueil étudiant : cours, démarches et navigation à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  await page.clock.setFixedTime(new Date('2026-10-19T07:00:00Z'));
  await installResponsiveAudit(page, 'student');
  await page.goto('/mon-espace');
  await expect(page.getByRole('heading', { name: 'Bonjour Élise.', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Mes prochains cours', exact: true })).toContainText('08:00');
  await expect(page.locator('.student-agenda li').first()).toContainText('Prochaine séance');
  await expect(page.getByRole('navigation', { name: 'Mes accès rapides' }).getByRole('link')).toHaveCount(4);
  await expect(page.getByRole('region', { name: 'Mes démarches' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Système & Comptes', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Finances & Recouvrement', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `tmp/screenshots/dashboard-home/student-${width}.png`, fullPage: true });
  if (width <= 1024) await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
  const menu = page.locator('#application-navigation');
  await expect(menu.getByRole('link', { name: 'Mon rôle de délégué', exact: true })).toHaveCount(0);
  await menu.getByRole('link', { name: 'Mes démarches', exact: true }).click();
  await expect(page).toHaveURL(/\/mon-espace\/scolarite$/);
  if (width <= 1024) await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
  await expect(menu.getByRole('link', { name: 'Mes documents', exact: true })).toBeVisible();
  if (width <= 1024) await page.getByRole('button', { name: 'Fermer le menu', exact: true }).click();
  await page.goto('/mon-espace');
  await page.getByRole('navigation', { name: 'Mes accès rapides' }).getByRole('link', { name: /Mes notes et résultats/ }).click();
  await expect(page).toHaveURL(/\/academique\/notes$/);
  if (width <= 768) {
    const mobile = page.getByRole('navigation', { name: 'Navigation étudiante', exact: true });
    await expect(mobile.getByRole('link', { name: 'Résultats', exact: true })).toHaveAttribute('aria-current', 'page');
    await mobile.getByRole('link', { name: 'Accueil', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bonjour Élise.' })).toBeVisible();
  }
});

test('Accueil étudiant : séances annulées, autre groupe et données absentes', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-19T07:00:00Z'));
  const { snapshot } = await installResponsiveAudit(page, 'student');
  snapshot.tables.sessions[2] = { ...snapshot.tables.sessions[0], id: snapshot.tables.sessions[2].id, starts_at: '2026-10-21T08:00:00Z', ends_at: '2026-10-21T10:00:00Z' };
  snapshot.tables.sessions[0].status = 'ANNULE';
  // The second session belongs to another group; the third is the only visible upcoming course.
  await page.goto('/mon-espace');
  const agenda = page.locator('.student-agenda');
  await expect(agenda.locator('li')).toHaveCount(1);
  await expect(agenda).toContainText('21 octobre');
  await expect(agenda).not.toContainText('19 octobre');
  await expect(agenda).not.toContainText('20 octobre');
  snapshot.tables.sessions.forEach(row => { row.status = 'ANNULE'; });
  snapshot.tables.financial_contracts = [];
  snapshot.tables.contract_versions = [];
  snapshot.tables.contract_lines = [];
  snapshot.tables.installments = [];
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Aucune séance à venir' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Mes frais et paiements' })).toContainText('Votre situation financière n’est pas encore disponible');
  await expect(page.locator('.student-finance-amount')).toHaveCount(0);
});

test('Accueil délégué : accès personnels conservés et présence du groupe accessible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await installResponsiveAudit(page, 'delegate');
  await page.goto('/mon-espace');
  await expect(page.getByRole('heading', { name: 'Bonjour Élise.', exact: true })).toBeVisible();
  await page.locator('#application-navigation').getByRole('link', { name: 'Mon rôle de délégué', exact: true }).click();
  await expect(page).toHaveURL(/\/academique\/presences$/);
  await expect(page.locator('#application-navigation').getByRole('link', { name: 'Mon assiduité', exact: true })).toBeVisible();
});
