import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
const yearId = '44444444-4444-4444-8444-444444444444';
const brochureId = '55555555-5555-4555-8555-555555555555';
for (const width of [390, 1440]) {
  test(`Brochures : PDF, confirmation, retrait et reprise après erreur à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { currentYearId: yearId, selectedYearId: yearId, selection: 'current', years: [{ id: yearId, name: '2026-2027', status: 'OUVERTE', starts_on: '2026-09-01', ends_on: '2027-07-31' }] } } }));
    await page.route('**/api/website-management*', route => route.fulfill({ json: [] }));
    let saved = false;
    let posts = 0;
    let fail = false;
    let status = 'PUBLIE';
    await page.route('**/api/website-brochures', async route => {
      if (route.request().method() === 'POST') {
        posts++;
        expect(route.request().headers().authorization).toBe('Bearer fixture-auth-token');
        expect(route.request().postDataBuffer()?.toString()).toContain('Brochure licence');
        if (fail) return route.fulfill({ status: 409, json: { error: 'Version concurrente. Réessayez.' } });
        saved = true;
        status = posts > 1 ? 'RETIRE' : 'PUBLIE';
        return route.fulfill({ status: 201, json: { id: brochureId } });
      }
      return route.fulfill({ json: saved ? [{ id: brochureId, academic_year_id: yearId, title: 'Brochure licence', slug: 'brochure-licence', description: 'Les formations', status, filename: 'licence.pdf', byte_size: 100, version: 1 }] : [] });
    });
    await page.goto('/site-web/brochures');
    await page.getByRole('button', { name: 'Ajouter une brochure', exact: true }).click();
    await page.getByLabel('Titre', { exact: true }).fill('Brochure licence');
    await page.getByLabel('Adresse de la brochure').fill('brochure-licence');
    await page.getByLabel('Description', { exact: true }).fill('Les formations');
    await page.getByLabel('Fichier PDF').setInputFiles({ name: 'licence.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%%EOF') });
    await page.getByLabel('Diffusion').selectOption('PUBLIE');
    await page.getByRole('button', { name: 'Vérifier la brochure' }).click();
    expect(posts).toBe(0);
    await page.getByRole('button', { name: 'Confirmer l’enregistrement' }).click();
    await page.getByRole('button', { name: 'Modifier : Brochure licence' }).click();
    await page.getByLabel('Diffusion').selectOption('RETIRE');
    await page.getByRole('button', { name: 'Vérifier la brochure' }).click();
    fail = true;
    await page.getByRole('button', { name: 'Confirmer l’enregistrement' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Version concurrente' })).toBeVisible();
    await expect(page.getByLabel('Titre', { exact: true })).toHaveValue('Brochure licence');
    fail = false;
    await page.getByRole('button', { name: 'Confirmer l’enregistrement' }).click();
    await expect(page.getByText('Retirée · licence.pdf', { exact: false })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.tmp/interface/${width}/brochures.png`, fullPage: true });
  });
  test(`Site : catalogue des brochures et téléchargement à ${width}px`, async ({ page }) => {
    const website = process.env.ESCEN_TEST_WEBSITE_URL;
    test.skip(!website, 'La copie du site doit être lancée.');
    await page.setViewportSize({ width, height: 950 });
    await page.route('**/api/website/public/brochures', route => route.fulfill({ json: [{ id: brochureId, title: 'Brochure licence', slug: 'brochure-licence', description: 'Formations ESCEN' }] }));
    await page.route('**/api/website/public/brochures/brochure-licence/download', route => route.fulfill({ contentType: 'application/pdf', headers: { 'Content-Disposition': 'attachment; filename="brochure-licence.pdf"' }, body: '%PDF-1.7\n%%EOF' }));
    await page.goto(`${website}/brochures`);
    await expect(page.getByRole('heading', { name: 'Brochures ESCEN', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Télécharger le PDF — Brochure licence' })).toHaveAttribute('href', /\/api\/website\/public\/brochures\/brochure-licence\/download$/);
    await expect(page.getByRole('textbox')).toHaveCount(0);
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Télécharger le PDF — Brochure licence' }).click();
    expect((await download).suggestedFilename()).toBe('brochure-licence.pdf');
    await page.screenshot({ path: `.tmp/interface/${width}/brochures-site.png`, fullPage: true });
  });
}
test('Gestion des brochures inaccessible sans session', async ({ request }) => {
  expect((await request.get('/api/website-brochures')).status()).toBe(401);
  expect((await request.post('/api/website-brochures')).status()).toBe(401);
});
