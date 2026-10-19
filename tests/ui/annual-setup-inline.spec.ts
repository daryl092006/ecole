import { test, expect } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import type { DatabaseRow } from '../../src/types/persistence';

for (const width of [390, 1440]) {
  test(`Créer une filière et un niveau pendant la préparation annuelle à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    const yearId = '10000000-0000-4000-8000-000000000001';
    const years = [{ id: yearId, name: '2026-2027', status: 'BROUILLON', starts_on: '2026-10-12', ends_on: '2027-06-30' }];
    const tables: Record<string, DatabaseRow[]> = {
      academic_years: years, cycles: [{ id: 'LIC', name: 'Licence' }],
      programs: [{ id: 'P1', code: 'INFO', name: 'Informatique', description: '', level_ids: ['L1'] }],
      levels: [{ id: 'L1', name: 'Licence 1', cycle_id: 'LIC', position: 1 }],
      curricula: [{ id: 'C1', program_id: 'P1', level_id: 'L1', name: 'Informatique · Licence 1' }], academic_offerings: [],
    };
    let revision = 1;
    let failNextOfferingsRead = false;
    const writes: { collection: string; values: Record<string, unknown> }[] = [];
    await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { selection: 'current', currentYearId: yearId, selectedYearId: yearId, years } } }));
    await page.route('**/api/catalog/**', route => {
      const path = new URL(route.request().url()).pathname.split('/');
      const collection = path[3];
      if (route.request().method() === 'GET') {
        if (collection === 'academic_offerings' && failNextOfferingsRead) { failNextOfferingsRead = false; return route.fulfill({ status: 503, json: { error: 'Relecture temporairement indisponible.' } }); }
        return route.fulfill({ json: { revision, tables, historyLinks: [] } });
      }
      const body = route.request().postDataJSON();
      expect(body.revision).toBe(revision);
      expect(route.request().headers()['x-escen-year']).toBe(yearId);
      writes.push({ collection, values: body.values });
      revision += 1;
      const id = collection === 'levels' ? 'L2' : collection === 'programs' ? 'P2' : 'O1';
      if (collection === 'programs') {
        const existing = tables.programs.find(row => row.id === path[4]);
        if (existing) Object.assign(existing, body.values);
        else { tables.programs.push({ id, ...body.values }); failNextOfferingsRead = true; }
        for (const levelId of body.values.level_ids) if (!tables.curricula.some(row => row.program_id === id && row.level_id === levelId)) tables.curricula.push({ id: `C-${id}-${levelId}`, program_id: id, level_id: levelId, name: `${body.values.name} · ${tables.levels.find(row => row.id === levelId)?.name}` });
      } else tables[collection].push({ id, ...body.values });
      return route.fulfill({ status: 201, json: { id, revision } });
    });
    await page.route('**/api/year-preparation', route => route.fulfill({ json: { checks: [{ key: 'offerings', label: 'Formations proposées', ready: false, href: '' }] } }));
    await page.goto('/academique/referentiel?collection=academic_years');
    await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
    await page.getByRole('button', { name: 'Configurer formations proposées', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'Filière', exact: true }).selectOption('P1');
    await dialog.getByRole('checkbox', { name: 'Licence 1 · Présentiel', exact: true }).check();
    await dialog.getByRole('button', { name: 'Créer une filière ici', exact: true }).click();
    await dialog.getByLabel('Nom', { exact: true }).fill('Brouillon non enregistré');
    await dialog.getByRole('button', { name: 'Revenir aux formations de l’année', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Quitter sans enregistrer ?', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Abandonner les modifications', exact: true }).click();
    await expect(dialog.getByRole('combobox', { name: 'Filière', exact: true })).toHaveValue('P1');
    await expect(dialog.getByRole('checkbox', { name: 'Licence 1 · Présentiel', exact: true })).toBeChecked();
    expect(writes).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Créer une filière ici', exact: true }).click();
    await dialog.getByLabel('Code', { exact: true }).fill('FIN');
    await dialog.getByLabel('Nom', { exact: true }).fill('Finance Digitale');
    await dialog.getByRole('button', { name: 'Créer un niveau ici', exact: true }).click();
    await dialog.getByLabel('Code', { exact: true }).fill('L2');
    await dialog.getByLabel('Nom', { exact: true }).fill('Licence 2');
    await dialog.getByLabel('Ordre dans le cycle', { exact: true }).fill('2');
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    expect(writes).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(dialog.getByLabel('Nom', { exact: true })).toHaveValue('Finance Digitale');
    await expect(dialog.getByRole('checkbox', { name: 'Licence 2', exact: true })).toBeChecked();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    expect(writes).toHaveLength(1);
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Relecture temporairement indisponible');
    await dialog.getByRole('button', { name: 'Réessayer la lecture', exact: true }).click();
    await expect(dialog.getByRole('combobox', { name: 'Filière', exact: true })).toHaveValue('P2');
    await expect(dialog.getByRole('checkbox', { name: 'Licence 2 · En ligne', exact: true })).not.toBeChecked();
    await dialog.getByRole('button', { name: 'Définir ses niveaux ici', exact: true }).click();
    await expect(dialog.getByRole('checkbox', { name: 'Licence 2', exact: true })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: 'Licence 2', exact: true })).toBeDisabled();
    await dialog.getByRole('checkbox', { name: 'Licence 1', exact: true }).check();
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    expect(writes).toHaveLength(2);
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(dialog.getByRole('combobox', { name: 'Filière', exact: true })).toHaveValue('P2');
    await expect(dialog.getByRole('checkbox', { name: 'Licence 1 · Présentiel', exact: true })).toBeVisible();
    await dialog.getByRole('checkbox', { name: 'Licence 2 · En ligne', exact: true }).check();
    await expect(dialog.getByRole('combobox', { name: 'Année universitaire', exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/\/academique\/referentiel\?collection=academic_years$/);
    await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/preparation-filiere-sur-place.png` });
    await dialog.getByRole('button', { name: 'Enregistrer les niveaux', exact: true }).click();
    expect(writes).toHaveLength(3);
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
    expect(writes.map(write => write.collection)).toEqual(['levels', 'programs', 'programs', 'academic_offerings']);
    expect(writes[1].values).toMatchObject({ name: 'Finance Digitale', level_ids: ['L2'] });
    expect(writes[2].values).toMatchObject({ name: 'Finance Digitale', level_ids: ['L2', 'L1'] });
    expect(writes[3].values).toMatchObject({ academic_year_id: yearId, program_id: 'P2', variants: [{ curriculum_id: 'C-P2-L2', delivery_mode: 'En ligne' }] });
  });
}
