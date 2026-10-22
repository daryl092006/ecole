import { expect, test } from '@playwright/test';
const website = process.env.ESCEN_TEST_WEBSITE_URL || 'http://localhost:3200';
const year = '44444444-4444-4444-8444-444444444444';
const level = '11111111-1111-4111-8111-111111111111';
const program = '22222222-2222-4222-8222-222222222222';
const token = 'a'.repeat(64);

for (const width of [390, 1440]) {
  for (const resume of [false, true]) {
    test(`Les pièces indisponibles bloquent ${resume ? 'le dossier' : 'la préparation'} puis permettent de réessayer à ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 });
      if (resume) await page.addInitScript(value => {
        localStorage.setItem('candidature_prep_seen', '1');
        localStorage.setItem('candidature_draft_token', value);
      }, token);
      let unavailable = true;
      await page.route('**/api/website/**', async route => {
        const path = new URL(route.request().url()).pathname;
        expect(route.request().method()).toBe('GET');
        if (path.endsWith('/candidature-config')) return route.fulfill({ json: { academic_year: { id: year, name: '2026-2027' }, champs: [], types_diplome: [], moyens_connaissance: [] } });
        if (path.endsWith('/niveau/liste')) return route.fulfill({ json: [{ id: level, nom: 'Licence 1' }] });
        if (path.endsWith('/filieres/liste')) return route.fulfill({ json: [{ id: program, nom: 'Informatique' }] });
        if (path.endsWith('/brouillon')) return route.fulfill({ json: { candidat: { academic_year_id: year, type_diplome_id: 'Baccalauréat' }, documents: [] } });
        if (path.endsWith('/document-requirements')) return route.fulfill(unavailable ? { status: 503, json: { message: 'Service indisponible.' } } : { json: [{ document_key: 'diplome_file', nom_affichage: 'Dernier diplôme', is_obligatoire: true, is_multiple: false }] });
        return route.fulfill({ json: [] });
      });
      await page.route('https://api.country.is/**', route => route.fulfill({ json: { country: 'TG' } }));
      await page.goto(`${website}/inscription/`);
      if (resume) {
        await expect(page.locator('form select').first()).toBeVisible();
        await page.locator('form select').first().selectOption(level);
        await page.locator('form select').nth(1).selectOption(program);
      } else {
        await page.getByRole('combobox', { name: 'Pour quel niveau postulez-vous ?' }).selectOption(level);
      }
      await expect(page.getByRole('alert').filter({ hasText: 'Impossible de charger les pièces' })).toBeVisible();
      const proceed = page.getByRole('button', { name: resume ? /Continuer/ : "J'ai compris, commencer" });
      await expect(proceed).toBeDisabled();
      unavailable = false;
      await page.getByRole('button', { name: 'Réessayer les pièces', exact: true }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Impossible de charger les pièces' })).toHaveCount(0);
      if (resume) await expect(page.locator('input[type="file"]').first()).toBeVisible();
      else await page.getByRole('checkbox').first().check();
      await expect(proceed).toBeEnabled();
    });
  }
}

for (const width of [390, 1440]) {
  for (const [route, cycle, slug] of [
    ['licence-professionnelle', 'LICENCE', 'licence-finance'],
    ['master-professionnel', 'MASTER', 'master-finance'],
    ['executive-education', 'EXECUTIVE', 'executive-finance'],
  ]) {
    test(`Brochure Finance Digitale : cycle ${cycle} exact à ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 });
      await page.route('**/api/website/**', handler => {
        expect(handler.request().method()).toBe('GET');
        const brochures = ['EXECUTIVE', 'LICENCE', 'MASTER'].map((item, index) => ({
          id: `brochure-${index}`, title: `${item} Finance Digitale`, slug: ['executive-finance', 'licence-finance', 'master-finance'][index],
          program_name: 'Finance Digitale', program_code: 'FD', cycle: item, filename: `${item}.pdf`, byte_size: 1000,
        }));
        return handler.fulfill({ json: handler.request().url().endsWith('/public/brochures') ? brochures : [] });
      });
      await page.goto(`${website}/formations/${route}/finance-digitale`);
      await page.getByRole('button', { name: 'Télécharger la brochure', exact: true }).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('heading', { name: `${cycle} Finance Digitale`, exact: true })).toBeVisible();
      await expect(dialog.getByRole('link', { name: 'Télécharger la brochure', exact: true })).toHaveAttribute('href', new RegExp(`/${slug}/download$`));
      await page.screenshot({ path: `tmp/screenshots/website-review/${width}/brochure-${cycle}.png`, fullPage: true });
    });
  }
}
