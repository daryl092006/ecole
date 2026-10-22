import { expect, test } from '@playwright/test';
const site = process.env.ESCEN_TEST_WEBSITE_URL || 'http://localhost:3200';

for (const width of [390, 1440]) {
  test(`Accueil → catalogue → cycle → formation → candidature à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(site + '/');
    await page.getByRole('link', { name: 'Nos formations', exact: true }).click();
    await expect(page).toHaveURL(/\/formations\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Nos Formations' })).toBeVisible();
    const licence = page.getByRole('link').filter({ has: page.getByRole('heading', { name: 'Licence Professionnelle', exact: true }) });
    await licence.scrollIntoViewIfNeeded();
    await expect.poll(() => licence.evaluate(element => getComputedStyle(element.parentElement!).opacity)).toBe('1');
    await licence.click();
    await expect(page).toHaveURL(/\/formations\/licence-professionnelle\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Licences/i);
    await page.getByRole('button', { name: 'En savoir plus', exact: true }).first().click();
    await expect(page).toHaveURL(/\/formations\/licence-professionnelle\/[^/]+\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Licence Professionnelle');
    await page.screenshot({ path: `tmp/screenshots/website-review/${width}/formation-navigation.png` });
    const apply = page.locator('a[href="/inscription"], a[href="/preparation-inscription"]').filter({ visible: true }).first();
    await apply.click();
    await expect(page).toHaveURL(/\/inscription\/?$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Identité & Coordonnées', exact: true })).toBeVisible();
  });

  test(`Menu principal → catalogue des formations à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(site + '/');
    if (width < 1024) {
      await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).click();
      await page.getByRole('button', { name: 'Formations', exact: true }).click();
      await page.getByRole('link', { name: 'Toutes les formations', exact: true }).click();
    } else {
      await page.locator('header').getByRole('link', { name: 'Formations', exact: true }).click();
    }
    await expect(page.getByRole('heading', { level: 1, name: 'Nos Formations' })).toBeVisible();
    await expect(page).toHaveURL(/\/formations\/?$/);
  });
}

test('Le catalogue reste visible sans JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(site + '/formations/');
  const heading = page.getByRole('heading', { name: 'Licence Professionnelle', exact: true });
  await expect(heading).toBeVisible();
  const opacity = await heading.evaluate(element => getComputedStyle(element.closest('.reveal')!).opacity);
  expect(opacity).toBe('1');
  await context.close();
});
