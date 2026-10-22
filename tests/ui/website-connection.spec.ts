import { expect, test } from '@playwright/test';

const website = process.env.ESCEN_TEST_WEBSITE_URL;
test.skip(!website, 'Lancer la copie Nuxt et fournir ESCEN_TEST_WEBSITE_URL.');
for (const width of [390, 1440]) {
  test(`Site vitrine vers connexion sécurisée à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // Isolate the old site's external services during the local review.
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
    });
    await page.goto(`${website}/`);
    const links = page.getByRole('link', { name: 'Espace étudiant', exact: true });
    await expect(links.last()).toHaveAttribute('href', '/connexion');
    await links.last().click();
    await expect(page.getByRole('heading', { name: 'Espace étudiant ESCEN' })).toBeVisible();
    await page.getByRole('link', { name: 'Ouvrir le portail ESCEN' }).click();
    await expect(page).toHaveURL(/:3000\/connexion$/);
    await expect(page.getByLabel('Adresse email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Mot de passe', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeVisible();
    await page.screenshot({ animations: 'disabled', path: `tmp/screenshots/website-review/${width}/interconnexion-portail.png`, fullPage: true });
    await page.getByRole('link', { name: 'Site ESCEN', exact: true }).click();
    await expect(page).toHaveURL(`${website}/`);
    if (width < 1024) await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).click();
    const studentAccess = page.getByRole('link', { name: 'Espace étudiant', exact: true }).filter({ visible: true }).first();
    await studentAccess.click();
    await expect(page.getByRole('link', { name: 'Ouvrir le portail ESCEN' })).toHaveAttribute('href', 'http://127.0.0.1:3000/connexion');
  });
}
