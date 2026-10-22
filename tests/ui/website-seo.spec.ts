import { expect, test } from '@playwright/test';

const site = process.env.ESCEN_TEST_WEBSITE_URL || 'http://localhost:3200';
for (const [route, title] of [
  ['/formations/licence-professionnelle/finance-digitale', 'Licence Professionnelle en Finance Digitale'],
  ['/formations/master-professionnel/finance-digitale', 'Master Professionnel en Finance Digitale'],
  ['/formations/executive-education/finance-digitale', 'Executive Master'],
]) {
  test(`Référencement spécifique et formation structurée : ${route}`, async ({ page, request }) => {
    const response = await request.get(site + route);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain('application/ld+json');
    expect(html).toContain('EducationalOrganization');
    expect(html.includes('Course'), 'Le HTML initial contient le schéma de la formation').toBe(true);
    await page.goto(site + route + '?origine=brochure');
    await expect(page).toHaveTitle(new RegExp(`${title}.*Lomé, Togo`));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site + route);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Lomé au Togo/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', site + '/formations/financedigital.jpg');
  });
}

test('Catalogue et portail : routes propres, sitemap public et ancienne connexion redirigée', async ({ page, request }) => {
  await page.goto(site + '/brochures/');
  await expect(page.getByRole('heading', { level: 1, name: 'Brochures ESCEN' })).toBeVisible();
  const sitemap = await (await request.get(site + '/sitemap.xml')).text();
  expect(sitemap).toContain(site + '/brochures');
  expect(sitemap).not.toMatch(/<loc>[^<]*\/(candidat|docs)\//);
  await page.goto(site + '/connexion/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await page.goto(site + '/candidat/login/');
  await expect(page.getByRole('link', { name: 'Ouvrir le portail ESCEN' })).toHaveAttribute('href', 'http://127.0.0.1:3000/connexion');
  await expect(page.getByLabel('CODE D’ACCÈS')).toHaveCount(0);
});

test('Une formation sans brochure publiée ne propose pas le PDF d’un autre cycle', async ({ page }) => {
  await page.route('**/api/website/public/brochures', route => route.fulfill({ json: [{
    id: 'other', title: 'Licence Finance Digitale', slug: 'licence-finance', cycle: 'LICENCE', program_code: 'FD',
  }] }));
  await page.goto(site + '/formations/master-professionnel/finance-digitale/');
  const trigger = page.getByRole('button', { name: 'Télécharger la brochure', exact: true }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Aucune brochure publiée pour cette formation');
  await expect(dialog.locator('a')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

for (const width of [390, 1440]) {
  test(`Accueil : actions claires sans doublon et conseiller à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(site + '/');
    const hero = page.locator('section').filter({ has: page.getByRole('heading', { level: 1 }) }).first();
    await expect(hero.getByRole('link', { name: 'Nos formations', exact: true })).toHaveAttribute('href', '/formations');
    await expect(hero.getByRole('link', { name: 'Candidater', exact: true })).toHaveAttribute('href', '/inscription');
    await expect(hero.locator('a')).toHaveCount(2);
    for (const slide of [1, 2, 0]) {
      await hero.locator('button').nth(slide).click();
      await expect(hero.getByRole('link', { name: 'Nos formations', exact: true })).toHaveAttribute('href', '/formations');
      await expect(hero.getByRole('link', { name: 'Candidater', exact: true })).toHaveAttribute('href', '/inscription');
      await expect(hero.locator('a')).toHaveCount(2);
    }
    await expect(page.getByRole('link', { name: 'Postuler en ligne', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Brochures ESCEN', exact: true })).toHaveAttribute('href', '/brochures');
    await expect(page.getByRole('link', { name: 'Échanger avec ESCEN sur WhatsApp' })).toHaveAttribute('href', 'https://api.whatsapp.com/send?phone=22898012727');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `tmp/screenshots/website-review/${width}/accueil-corrige.png`, fullPage: true });
  });
}
