import { expect, test } from '@playwright/test';
const website = process.env.ESCEN_TEST_WEBSITE_URL;
test('Pièces : mêmes exigences dans la préparation et avant inscription', async ({ page }) => {
  test.skip(!website, 'Copie du site requise.');
  await page.route('**/api/website/**', route => {
    const url = route.request().url();
    if (url.endsWith('/public/niveau/liste')) return route.fulfill({ json: [{ id: 'L1', nom: 'Licence 1', libelle: 'Licence 1' }] });
    if (url.endsWith('/public/candidature-config')) return route.fulfill({ json: { academic_year: { id: 'YEAR', name: '2025-2026' }, champs: [], types_diplome: [] } });
    if (url.includes('/document-requirements')) return route.fulfill({ json: [
      { document_key: 'cv_file', nom_affichage: 'Curriculum vitae', is_obligatoire: true },
      { document_key: 'diplome_file', nom_affichage: 'Dernier diplôme', is_obligatoire: false },
    ] });
    return route.fulfill({ json: [] });
  });
  await page.goto(`${website}/preparation-inscription/`);
  const required = page.locator('.prep-doc-group').filter({ hasText: 'Pièces obligatoires' });
  await expect(required).toContainText('Curriculum vitae');
  await expect(required).not.toContainText('Dernier diplôme');
  await page.goto(`${website}/inscription/`);
  await page.getByRole('combobox', { name: 'Pour quel niveau postulez-vous ?' }).selectOption('L1');
  await expect(page.getByText('Curriculum vitae', { exact: true })).toBeVisible();
  await expect(page.getByText('Dernier diplôme', { exact: true })).toBeVisible();
});
for (const width of [390, 1440]) {
  test(`Niveaux du site : année active, erreur et reprise à ${width}px`, async ({ page }) => {
    test.skip(!website, 'Copie du site requise.');
    await page.setViewportSize({ width, height: 950 });
    let fail = true;
    let year = '2025-2026';
    await page.route('**/api/website/**', async route => {
      const url = route.request().url();
      if (url.endsWith('/public/candidature-config')) return route.fulfill({ json: { academic_year: { id: year, name: year }, champs: [], types_diplome: [], moyens_connaissance: [] } });
      if (url.endsWith('/public/niveau/liste')) {
        if (fail) return route.fulfill({ status: 503, json: { message: 'Indisponible' } });
        return route.fulfill({ json: [{ id: year, nom: year === '2025-2026' ? 'Licence 1' : 'Master 1' }] });
      }
      return route.fulfill({ json: [] });
    });
    await page.goto(`${website}/inscription/`);
    await expect(page.getByText('Impossible de charger les niveaux. Réessayez.')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Pour quel niveau postulez-vous ?' })).toBeDisabled();
    fail = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByText('Année scolaire : 2025-2026')).toBeVisible();
    const select = page.getByRole('combobox', { name: 'Pour quel niveau postulez-vous ?' });
    await expect(select.locator('option')).toHaveText(['Veuillez sélectionner un niveau...', 'Licence 1']);
    await select.selectOption('2025-2026');
    await expect(page.getByRole('button', { name: "J'ai compris, commencer" })).toBeEnabled();
    year = '2026-2027';
    await page.reload();
    await expect(page.getByText('Année scolaire : 2026-2027')).toBeVisible();
    await expect(select.locator('option')).toHaveText(['Veuillez sélectionner un niveau...', 'Master 1']);
    await page.screenshot({ path: `tmp/screenshots/website-review/${width}/website-levels.png`, fullPage: true });
  });
}
test('Site : niveaux réels de l’année active, sans envoi de dossier', async ({ page, request }) => {
  test.skip(!website, 'Copie du site requise.');
  const response = await request.get('http://127.0.0.1:3000/api/website/public/niveau/liste');
  expect(response.ok()).toBe(true);
  const levels = await response.json() as { id: string; nom: string }[];
  const config = await (await request.get('http://127.0.0.1:3000/api/website/public/candidature-config')).json();
  await page.goto(`${website}/inscription/`);
  const select = page.getByRole('combobox', { name: 'Pour quel niveau postulez-vous ?' });
  await expect(select.locator('option')).toHaveCount(levels.length + 1);
  if (config.academic_year) await expect(page.getByText(`Année scolaire : ${config.academic_year.name}`, { exact: true })).toBeVisible();
  if (levels.length) {
    await expect(select).toBeEnabled();
    await select.selectOption(levels[0].id);
    await expect(select).toHaveValue(levels[0].id);
  }
});
