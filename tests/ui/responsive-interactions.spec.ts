import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [360, 390, 768]) {
  test(`Filtres et année restent utilisables à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await installResponsiveAudit(page, 'staff');
    await page.goto('/academique/evaluations');
    await expect(page.locator('main .loading-state')).toHaveCount(0);
    const filters = page.locator('.browser-toolbar > .form-group');
    await expect(filters).toHaveCount(4);
    for (const filter of await filters.all()) {
      const control = filter.locator('input, select');
      const bounds = await control.boundingBox();
      const parent = await page.locator('.browser-toolbar').boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(parent!.width - 2);
    }
    await expect(page.getByRole('combobox', { name: 'Année consultée' })).toHaveCSS('font-size', '16px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `tmp/screenshots/responsive-review/filters-${width}.png`, fullPage: true });
  });

  test(`Navigation modale et retour au bouton à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await installResponsiveAudit(page, 'staff');
    await page.goto('/tableau-de-bord');
    const toggle = page.getByRole('button', { name: 'Ouvrir la navigation' });
    await toggle.click();
    await expect(page.getByRole('dialog', { name: 'Navigation principale' })).toBeVisible();
    await expect(page.locator('.topbar')).toHaveAttribute('inert', '');
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.setViewportSize({ width: 1024, height: 844 });
    await expect(page.locator('.topbar')).not.toHaveAttribute('inert', '');
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    await expect(page.locator('.sidebar')).not.toHaveAttribute('role', 'dialog');
  });
}

test('Une fenêtre protège aussi la navigation et rétablit le fond à la fermeture', async ({ page }) => {
  await installResponsiveAudit(page, 'staff');
  await page.goto('/site-web/articles');
  await page.getByRole('button', { name: 'Modifier : Ouverture de l’année universitaire et des formations', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.app-wrapper')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.app-wrapper')).not.toHaveAttribute('inert', '');
});

for (const width of [390, 1024]) {
  test(`Les panneaux du bandeau ne se superposent pas à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await installResponsiveAudit(page, 'staff');
    await page.goto('/tableau-de-bord');
    const account = page.getByLabel('Mon compte et mon rôle');
    const notifications = page.getByRole('button', { name: /^Notifications :/ });
    await account.click();
    await expect(page.locator('.account-popover')).toBeVisible();
    await notifications.click();
    await expect(page.locator('.notification-panel')).toBeVisible();
    await expect(page.locator('.account-popover')).toBeHidden();
    await account.click();
    await expect(page.locator('.notification-panel')).toHaveCount(0);
    await expect(page.locator('.account-popover')).toBeVisible();
    await page.getByRole('searchbox').fill('notes');
    await expect(page.locator('.account-popover')).toBeHidden();
    const result = page.locator('.search-result').first();
    await expect(result).toBeVisible();
    await result.click();
    await expect(page.locator('.search-results')).toHaveCount(0);
  });
}
