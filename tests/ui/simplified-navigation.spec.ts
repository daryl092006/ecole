import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

test('Menu tablette : fermeture clavier et passage au bureau', async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await installResponsiveAudit(page, 'staff');
  await page.goto('/mon-espace');
  const open = page.getByRole('button', { name: 'Ouvrir la navigation', exact: true });
  const navigation = page.locator('#application-navigation');
  await expect(navigation).not.toBeVisible();
  await open.click();
  await expect(navigation).toHaveAttribute('aria-modal', 'true');
  await page.keyboard.press('Escape');
  await expect(navigation).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await page.setViewportSize({ width: 1025, height: 900 });
  await expect(navigation).toBeVisible();
  await expect(navigation).not.toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('.navigation-backdrop')).toHaveCount(0);
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(navigation).not.toBeVisible();
  await expect(open).toBeVisible();
});

test('Année historique sans dates : aucun encadré à compléter et aucune écriture', async ({ page }) => {
  const { problems } = await installResponsiveAudit(page, 'staff');
  await page.route('**/api/history', route => route.fulfill({ json: {
    totalSourceRows: 1, datasets: [], references: { annee_scolaires: [{
      id: 'source-year-2023', sourceId: '2023', batchId: 'legacy', status: 'FLAGGED',
      values: { libelle: 'Année scolaire 2023-2024', name: 'Année scolaire 2023-2024' }, issues: [],
    }] },
  } }));
  await page.goto('/academique/referentiel?collection=academic_years');
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('main .loading-state:visible')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Années aux dates à compléter/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Compléter les dates', exact: true })).toHaveCount(0);
  expect(problems).toEqual([]);
});

for (const width of [390, 768, 800, 820, 834, 1024, 1025, 1440]) {
  test(`Navigation directe sans sous-menu supérieur et filtres visibles à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { problems } = await installResponsiveAudit(page, 'staff');
    await page.goto('/mon-espace');
    await expect(page.getByRole('heading', { name: 'Que souhaitez-vous faire ?' })).toBeVisible();
    await expect(page.locator('.home-directory-group')).toHaveCount(0);
    if (width <= 1024) await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
    const menu = page.locator('#application-navigation');
    await expect(menu.locator('[aria-expanded]')).toHaveCount(0);
    await menu.getByRole('link', { name: 'Dossiers étudiants', exact: true }).click();
    await expect(page).toHaveURL(/\/etudiants$/);
    if (width <= 1024) await expect(menu).not.toBeVisible();
    await expect(page.locator('.workspace-page-navigation')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: /^Pages :/ })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Filière', exact: true })).toHaveCount(0);
    if (width <= 1024) await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
    await menu.getByRole('link', { name: 'Réinscriptions et statuts', exact: true }).click();
    await expect(page).toHaveURL(/\/etudiants\/parcours$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/etudiants$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(problems).toEqual([]);
  });
}

for (const width of [390, 1440]) {
  test(`Encaissement : le dossier choisi ouvre directement les finances à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { problems } = await installResponsiveAudit(page, 'staff');
    await page.goto('/finance/versements');
    await page.getByRole('button', { name: 'Enregistrer un paiement', exact: true }).click();
    await page.getByRole('button', { name: 'Consulter le dossier', exact: true }).click();
    const dossier = page.getByRole('dialog', { name: 'Dossier étudiant · ESCEN-TEST-001' });
    await expect(dossier).toBeVisible();
    await expect(dossier.getByRole('button', { name: 'Frais et versements', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(problems).toEqual([]);
  });
}
