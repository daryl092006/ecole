import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';

const years = [
  { id: '10000000-0000-4000-8000-000000000001', name: '2025-2026', status: 'OUVERTE', starts_on: '2025-10-01', ends_on: '2026-07-31' },
  { id: '10000000-0000-4000-8000-000000000002', name: '2026-2027', status: 'BROUILLON', starts_on: '2026-10-01', ends_on: '2027-07-31' },
];

async function admissions(page: Page, filled = false) {
  await authenticateFixture(page);
  let fail = false;
  let reads = 0;
  await page.route('**/api/campus', route => {
    const selection = route.request().headers()['x-escen-year'] || 'current';
    const selectedYearId = selection === 'current' ? years[0].id : selection;
    return route.fulfill({ json: { ...snapshot, tables: { ...snapshot.tables, academic_years: years }, academicContext: { currentYearId: years[0].id, currentYearConfigured: true, selectedYearId, selection, years } } });
  });
  await page.route('**/api/website-management*', route => {
    expect(route.request().method()).toBe('GET');
    reads++;
    if (fail) return route.fulfill({ status: 503, json: { error: 'Service temporairement indisponible.' } });
    const selectedYearId = route.request().headers()['x-escen-year'] === years[1].id ? years[1].id : years[0].id;
    return route.fulfill({ json: { applications: filled && selectedYearId === years[0].id ? [{ id: 'APP', academic_year_id: years[0].id, reference: 'WEB-2025-001', identity: { nom: 'Candidate', prenom: 'Alice', email: 'alice@example.test' }, status: 'RECU', intake_label: 'Licence Informatique', documents: [], guardians: [], diploma: {}, version: 1 }] : [], intakes: [], levels: [], programs: [], years } });
  });
  return { fail: (value: boolean) => { fail = value; }, reads: () => reads };
}

for (const width of [390, 1440]) {
  test(`Demandes : état vide explicite et accès aux formations à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await admissions(page);
    await page.goto('/site-web/demandes');
    await expect(page.getByText('Aucune demande pour 2025-2026', { exact: true })).toBeVisible();
    await expect(page.getByText('Les dossiers apparaissent ici après leur envoi final depuis le formulaire du site.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Vérifier les formations ouvertes', exact: true })).toHaveAttribute('href', '/site-web/documents');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/demandes-vides.png`, fullPage: true });
  });

  test(`Demandes : aucun résultat de recherche expliqué et recherche réinitialisable à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await admissions(page, true);
    await page.goto('/site-web/demandes');
    await expect(page.getByText('WEB-2025-001', { exact: true })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Rechercher un dossier', exact: true }).fill('Introuvable');
    await expect(page.getByText('Aucun dossier ne correspond à votre recherche.', { exact: true })).toBeVisible();
    await expect(page.getByText('Aucune demande pour 2025-2026', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Effacer la recherche', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ouvrir le dossier', exact: true })).toHaveCount(1);
    await expect(page.getByText('WEB-2025-001', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`Demandes : échec de chargement distinct d’une liste vide, puis reprise à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await admissions(page);
    fixture.fail(true);
    await page.goto('/site-web/demandes');
    await expect(page.getByText('Le chargement des demandes a échoué.', { exact: true })).toBeVisible();
    await expect(page.getByText('Aucune demande pour 2025-2026', { exact: true })).toHaveCount(0);
    fixture.fail(false);
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByText('Aucune demande pour 2025-2026', { exact: true })).toBeVisible();
    expect(fixture.reads()).toBe(2);
  });

  test(`Demandes : changement d’année sans afficher les dossiers de l’autre année à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await admissions(page, true);
    await page.goto('/site-web/demandes');
    await expect(page.getByText('WEB-2025-001', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Année consultée', exact: true }).selectOption(years[1].id);
    await expect(page.getByText('Aucune demande pour 2026-2027', { exact: true })).toBeVisible();
    await expect(page.getByText('WEB-2025-001', { exact: true })).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Année consultée', exact: true }).selectOption('current');
    await expect(page.getByText('WEB-2025-001', { exact: true })).toBeVisible();
  });
}
