import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`Présentation du portail à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await installResponsiveAudit(page, 'staff');
    await page.goto('/tableau-de-bord');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main .loading-state')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const content = await page.locator('main').evaluate(element => ({
      available: element.clientWidth, actual: element.scrollWidth,
    }));
    expect(content.actual).toBeLessThanOrEqual(content.available + 1);
    await page.screenshot({ path: `tmp/screenshots/visual-refresh/dashboard-${width}.png`, fullPage: true });
  });
}
