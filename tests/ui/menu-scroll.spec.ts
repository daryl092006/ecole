import { test, expect } from '@playwright/test';
import { authenticateFixture } from './persistent-fixture';

for (const width of [390, 1440]) {
  test(`Défilement indépendant du menu à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    await authenticateFixture(page);
    await page.goto('/academique');
    await expect(page.locator('#main-content')).toBeVisible();
    if (width < 800) await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
    const sidebar = page.locator('#application-navigation');
    const menu = sidebar.locator('.nav-list');
    await expect(sidebar).toBeVisible();
    await page.screenshot({ path: `.tmp/interface/menu-${width}-before.png` });
    const mainTop = await page.locator('#main-content').evaluate(element => element.scrollTop);
    await menu.hover();
    await page.mouse.wheel(0, 2400);
    await expect.poll(() => menu.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await expect(sidebar.locator('.nav-item').last()).toBeInViewport();
    expect(await page.locator('#main-content').evaluate(element => element.scrollTop)).toBe(mainTop);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    if (width < 800) await expect(sidebar.getByRole('button', { name: 'Fermer le menu' })).toBeInViewport();
    await page.screenshot({ path: `.tmp/interface/menu-${width}-after.png` });
  });
}
