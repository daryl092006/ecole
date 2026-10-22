import { expect, test } from '@playwright/test';
const site = process.env.ESCEN_TEST_WEBSITE_URL || 'http://localhost:3200';

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`Accueil historique conservé et parcours accessibles à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(site + '/');
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    const home = page.locator('.website-homepage');
    const hero = home.locator('section').first();
    await expect(hero.getByRole('link', { name: 'Nos formations', exact: true })).toHaveAttribute('href', '/formations');
    await expect(hero.getByRole('link', { name: 'Candidater', exact: true })).toHaveAttribute('href', '/inscription');
    await expect(hero.locator('button')).toHaveCount(5);
    expect(await home.locator('section').count()).toBeGreaterThan(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const nav = page.locator('.website-header-row');
    const brand = page.locator('.website-header-brand');
    const before = await nav.boundingBox();
    const logoBefore = await brand.boundingBox();
    if (width > 1024) {
      const links = await page.locator('.website-header-links').boundingBox();
      const cta = await page.locator('.website-header-cta').boundingBox();
      expect(Math.abs(links!.y + links!.height / 2 - (logoBefore!.y + logoBefore!.height / 2))).toBeLessThan(2);
      expect(Math.abs(links!.x + links!.width / 2 - width / 2)).toBeLessThan(2);
      expect(logoBefore!.x).toBe(24);
      expect(Math.abs(cta!.x + cta!.width - (width - 24))).toBeLessThan(2);
      expect(links!.x).toBeGreaterThanOrEqual(logoBefore!.x + logoBefore!.width);
      expect(links!.x + links!.width).toBeLessThanOrEqual(cta!.x);
    }
    const spacer = await page.locator('.website-header-spacer').boundingBox();
    const headerBefore = await page.locator('header').boundingBox();
    expect(Math.abs(spacer!.height - headerBefore!.height)).toBeLessThan(2);
    await page.evaluate(() => scrollTo(0, 450));
    await expect(page.locator('.website-header-contact')).toHaveAttribute('aria-hidden', 'true');
    await expect.poll(async () => Math.round((await page.locator('header').boundingBox())!.height)).toBe(Math.round(before!.height));
    expect((await nav.boundingBox())!.height).toBe(before!.height);
    expect((await brand.boundingBox())!.width).toBe(logoBefore!.width);
    if (width <= 1024) await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeVisible();
    await page.screenshot({ path: `tmp/screenshots/website-review/${width}/menu-defile.png` });
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator('.website-header-contact')).toHaveAttribute('aria-hidden', 'false');
    const flag = page.locator('.website-country-flag').first();
    await page.locator('#origins').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('#origins .reveal').evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === '1'))).toBe(true);
    await expect.poll(() => flag.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect.poll(() => flag.evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(width <= 768 ? 144 : 180);
    const flagStyle = await flag.evaluate(element => ({ width: parseFloat(getComputedStyle(element).width), radius: getComputedStyle(element).borderRadius }));
    expect(Math.round(flagStyle.width)).toBe(width <= 768 ? 144 : 180);
    expect(flagStyle.radius).toBe('0px');
    await page.screenshot({ path: `tmp/screenshots/website-review/${width}/drapeaux.png` });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `tmp/screenshots/website-review/${width}/accueil-conserve.png`, fullPage: true });
  });
}
