import { expect, test } from '@playwright/test';
const site = process.env.ESCEN_TEST_WEBSITE_URL || 'http://localhost:3200';

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`Accueil historique conservé et parcours accessibles à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(site + '/');
    const home = page.locator('.website-homepage');
    const hero = home.locator('section').first();
    await expect(hero.getByRole('link', { name: 'Nos formations', exact: true })).toHaveAttribute('href', '/formations');
    await expect(hero.getByRole('link', { name: 'Candidater', exact: true })).toHaveAttribute('href', '/inscription');
    await expect(hero.locator('button')).toHaveCount(5);
    expect(await home.locator('section').count()).toBeGreaterThan(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `tmp/screenshots/website-review/${width}/accueil-conserve.png`, fullPage: true });
  });
}
