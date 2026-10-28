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

test('Accueil étudiant : suivi personnel sans cartes de gestion', async ({ page }) => {
  await installResponsiveAudit(page, 'student');
  await page.goto('/mon-espace');
  await expect(page.getByRole('region', { name: 'Mon Suivi', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Système & Comptes', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Finances & Recouvrement', exact: true })).toHaveCount(0);
});
