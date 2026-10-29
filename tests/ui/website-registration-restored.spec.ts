import { test, expect } from '@playwright/test';
import { identitySchema, diplomaSchema } from '../../src/services/websiteService';

const year = '11111111-1111-4111-8111-111111111111';
const level = '22222222-2222-4222-8222-222222222222';
const program = '33333333-3333-4333-8333-333333333333';

for (const width of [1440, 390]) {
  test(`Le formulaire reste sur le site et transmet les quatre étapes à l’API (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const writes: { path: string; body: string }[] = [];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/website/**', async route => {
      const request = route.request(); const path = new URL(request.url()).pathname;
      let json: unknown = [];
      if (request.method() !== 'GET') {
        writes.push({ path, body: request.postData() || '' });
        json = path.endsWith('/etape1') ? { draft_token: 'a'.repeat(64) }
          : path.endsWith('/etape4-finaliser') ? { reference: 'TEST-LOCAL-001' } : {};
      } else if (path.endsWith('/candidature-config')) json = { academic_year: { id: year, name: '2026-2027' } };
      else if (path.endsWith('/niveau/liste')) json = [{ id: level, nom: 'Licence 1' }];
      else if (path.endsWith('/filieres/liste')) json = [{ id: program, nom: 'Commerce' }];
      else if (path.endsWith('/document-requirements')) json = [{ document_key: 'photo_identite_file', nom_affichage: 'Photo', is_obligatoire: true }];
      await route.fulfill({ json });
    });
    await page.goto('/inscription');
    await page.locator('#nom').fill('Exemple');
    await expect(page).toHaveURL(/\/inscription$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('#prenom').fill('Essai'); await page.locator('#genre').selectOption('F');
    await page.locator('#date_naissance').fill('2005-02-10'); await page.locator('#lieu_naissance').fill('Lomé');
    await page.locator('.nat-trigger').click(); await page.getByRole('button', { name: 'Togolaise', exact: true }).click();
    await page.locator('#tel').fill('+22890000000'); await page.locator('#email').fill('essai@example.invalid');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.locator('#diploma').selectOption('BAC'); await page.locator('#serie').selectOption('D'); await page.locator('#year').fill('2025');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.locator('#level').selectOption(level); await page.locator('#program').selectOption(program);
    await expect(page.locator('input[type=file]')).toBeVisible();
    // A missing attachment must not prevent reception of a candidature.
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.locator('#guardian-0-nom').fill('Parent'); await page.locator('#guardian-0-prenom').fill('Essai'); await page.locator('#guardian-0-tel').fill('+22890000001');
    await page.locator('#accept_cgu').check(); await page.getByRole('button', { name: 'Soumettre ma candidature' }).click();
    await expect(page.getByText('TEST-LOCAL-001', { exact: true })).toBeVisible();
    expect(writes).toHaveLength(4);
    const { academic_year_id, ...identity } = JSON.parse(writes[0].body);
    expect(academic_year_id).toBe(year); expect(identitySchema.safeParse(identity).success).toBe(true);
    expect(diplomaSchema.safeParse(JSON.parse(writes[1].body)).success).toBe(true);
    expect(writes[2].body).toContain(level); expect(writes[3].body).toContain('tuteurs[0][nom]');
    expect(await page.evaluate(() => localStorage.getItem('escen-site-registration-draft'))).toBeNull();
    expect(errors).toEqual([]);
  });
}
