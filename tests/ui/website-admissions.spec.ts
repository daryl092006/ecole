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

for (const width of [390, 1440]) {
  test(`Formations et pièces : filtres, confirmation, reprise et année à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    const levels = [{ id: 'L1', name: 'Licence 1' }, { id: 'M1', name: 'Master 1' }];
    const programs = [{ id: 'FIN', name: 'Finance Digitale' }, { id: 'MKT', name: 'Marketing Digital' }];
    const intakes = [
      { id: 'FIN-L1', academic_year_id: years[0].id, level_id: 'L1', level_name: 'Licence 1', program_id: 'FIN', program_name: 'Finance Digitale', label: 'Finance Digitale · Licence 1', active: true, required_documents: [] as string[], version: 1 },
      { id: 'MKT-L1', academic_year_id: years[0].id, level_id: 'L1', level_name: 'Licence 1', program_id: 'MKT', program_name: 'Marketing Digital', label: 'Marketing Digital · Licence 1', active: false, required_documents: ['naissance_file'], version: 1 },
      { id: 'FIN-M1', academic_year_id: years[0].id, level_id: 'M1', level_name: 'Master 1', program_id: 'FIN', program_name: 'Finance Digitale', label: 'Finance Digitale · Master 1', active: true, required_documents: ['diplome_file'], version: 1 },
    ];
    let failSave = true;
    const writes: Record<string, unknown>[] = [];
    await page.route('**/api/campus', route => {
      const selection = route.request().headers()['x-escen-year'] || 'current';
      return route.fulfill({ json: { ...snapshot, academicContext: { currentYearId: years[0].id, selectedYearId: selection === 'current' ? years[0].id : selection, selection, years } } });
    });
    await page.route('**/api/website-management*', route => {
      if (route.request().method() === 'POST') {
        const command = route.request().postDataJSON();
        writes.push(command);
        if (failSave) { failSave = false; return route.fulfill({ status: 409, json: { error: 'La configuration a changé. Réessayez.' } }); }
        Object.assign(intakes.find(item => item.id === command.id)!, command);
        return route.fulfill({ json: { id: command.id } });
      }
      const nextYear = route.request().headers()['x-escen-year'] === years[1].id;
      return route.fulfill({ json: { applications: [], intakes: nextYear ? [] : intakes, levels, programs, years } });
    });
    await page.goto('/site-web/documents');
    const section = page.getByRole('region', { name: 'Configuration des formations' });
    await expect(section).toContainText('3 formations');
    await expect(section).toContainText('2 ouvertes');
    await expect(section).toContainText('1 sans pièce obligatoire');
    await expect(page.getByRole('button', { name: 'Actualiser les formations', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actualiser les dossiers', exact: true })).toHaveCount(0);
    await section.getByLabel('Filtrer par filière').selectOption('FIN');
    await section.getByLabel('Filtrer par niveau').selectOption('L1');
    await expect(section.getByRole('button', { name: /^Configurer :/ })).toHaveCount(1);
    await section.getByLabel('Ouverture sur le site').selectOption('closed');
    await expect(section).toContainText('Aucune formation ne correspond aux filtres choisis.');
    await section.getByRole('button', { name: 'Réinitialiser les filtres' }).click();
    await section.getByRole('searchbox', { name: 'Rechercher une formation' }).fill('financé');
    await expect(section).toContainText('2 formations affichées sur 3');
    await section.getByRole('button', { name: 'Configurer : Finance Digitale · Licence 1', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Acte de naissance', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Ouvrir aux inscriptions sur le site', exact: true }).uncheck();
    await page.getByLabel('Motif de la configuration').fill('Fermeture et pièces pour la rentrée');
    await page.getByRole('button', { name: 'Relire la configuration', exact: true }).click();
    expect(writes).toHaveLength(0);
    const review = page.getByRole('region', { name: 'Vérification avant enregistrement' });
    await expect(review).toContainText('Avant : Ouverte');
    await expect(review).toContainText('Acte de naissance');
    await page.getByRole('button', { name: 'Confirmer la configuration', exact: true }).click();
    await expect(review.getByRole('alert')).toContainText('La configuration a changé');
    await page.getByRole('button', { name: 'Confirmer la configuration', exact: true }).click();
    await expect(section.getByRole('searchbox', { name: 'Rechercher une formation' })).toHaveValue('financé');
    const row = section.getByRole('row').filter({ has: page.getByRole('button', { name: 'Configurer : Finance Digitale · Licence 1', exact: true }) });
    await expect(row).toContainText('Fermée');
    await expect(row).toContainText('Acte de naissance');
    expect(writes).toHaveLength(2);
    expect(writes[1]).toMatchObject({ action: 'intake-save', id: 'FIN-L1', active: false, required_documents: ['naissance_file'], academic_year_id: years[0].id });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `tmp/screenshots/website-review/${width}/formations-pieces.png`, fullPage: true });
    await page.getByRole('combobox', { name: 'Année consultée', exact: true }).selectOption(years[1].id);
    await expect(section).toContainText('Aucune formation pour 2026-2027');
    await expect(section.getByRole('searchbox', { name: 'Rechercher une formation' })).toHaveValue('');
    await expect(section.getByRole('button', { name: /^Configurer :/ })).toHaveCount(0);
  });
}
