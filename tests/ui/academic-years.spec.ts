import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { filterSnapshotForAcademicYear } from '../../src/services/academicYearScopeService';
import type { DatabaseRow, RelationalSnapshot } from '../../src/types/persistence';
const oldId = '10000000-0000-4000-8000-000000000001';
const currentId = '10000000-0000-4000-8000-000000000002';
const futureId = '10000000-0000-4000-8000-000000000003';
async function annualFixture(page: Page, configured = true) {
  await authenticateFixture(page);
  const years: DatabaseRow[] = [
    { id: oldId, name: '2025-2026', code: '2025-2026', starts_on: '2025-09-01', ends_on: '2026-07-31', status: 'CLOTUREE', version: 1 },
    { id: currentId, name: '2026-2027', code: '2026-2027', starts_on: '2026-09-01', ends_on: '2027-07-31', status: 'OUVERTE', version: 1 },
    { id: futureId, name: '2027-2028', code: '2027-2028', starts_on: '2027-09-01', ends_on: '2028-07-31', status: 'BROUILLON', version: 1 },
  ];
  let currentYearId: string | null = configured ? currentId : null; let revision = 1; let fail = false;
  const commands: Record<string, unknown>[] = [];
  const source: RelationalSnapshot = { revision, tables: { ...snapshot.tables, academic_years: years,
    academic_offerings: [{ id: 'O1', academic_year_id: oldId, level_id: 'LEVEL1', curriculum_id: 'CURR' }, { id: 'O2', academic_year_id: currentId, level_id: 'LEVEL2', curriculum_id: 'CURR' }],
    curricula: [{ id: 'CURR', program_id: 'PROG' }], programs: [{ id: 'PROG', name: 'Informatique' }],
    levels: [{ id: 'LEVEL1', name: 'Licence 1', cycle_id: 'CYCLE', position: 1 }, { id: 'LEVEL2', name: 'Licence 2', cycle_id: 'CYCLE', position: 2 }], cycles: [{ id: 'CYCLE', code: 'LICENCE' }],
    enrollments: [{ id: 'ENROLL1', student_id: 'S1', offering_id: 'O1', status: 'INSCRIT' }, { id: 'ENROLL2', student_id: 'S1', offering_id: 'O2', status: 'REINSCRIT' }],
  } };
  await page.route('**/api/campus', route => {
    const selection = route.request().headers()['x-escen-year'] || 'current';
    const selectedYearId = selection === 'all' ? null : selection === 'current' ? currentYearId : selection;
    return route.fulfill({ json: { ...filterSnapshotForAcademicYear({ ...source, revision }, selectedYearId), academicContext: { selection, selectedYearId, currentYearId, years } } });
  });
  await page.route('**/api/catalog/*', route => route.fulfill({ json: { revision, tables: { academic_years: years }, historyLinks: [] } }));
  await page.route('**/api/academic-years', async route => {
    const body = route.request().postDataJSON(); commands.push(body);
    if (fail) return route.fulfill({ status: 409, json: { error: 'Modification concurrente : actualisez.' } });
    expect(body.revision).toBe(revision);
    if (body.action === 'current') currentYearId = body.yearId;
    else { years.find(year => year.id === body.yearId)!.status = body.status; }
    revision++;
    return route.fulfill({ json: { revision } });
  });
  return { commands, source, fail: () => { fail = true; } };
}
for (const width of [390, 1440]) {
  test(`Année consultée : filtre, historique et préférence après rechargement à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 }); const fixture = await annualFixture(page);
    await page.goto('/etudiants');
    const select = page.getByRole('combobox', { name: 'Année consultée', exact: true });
    await expect(select).toHaveValue('current');
    await expect(select.locator('option:checked')).toHaveText('Année de travail : 2026-2027');
    await expect(page.getByRole('row').filter({ hasText: 'ESCEN-TEST-001' })).toContainText('Licence 2');
    await select.selectOption(oldId);
    await expect(page.getByRole('row').filter({ hasText: 'ESCEN-TEST-001' })).toContainText('Licence 1');
    await page.reload(); await expect(select).toHaveValue(oldId);
    await expect(page.getByRole('row').filter({ hasText: 'ESCEN-TEST-001' })).toContainText('Licence 1');
    await select.selectOption('current');
    await expect(page.getByRole('row').filter({ hasText: 'ESCEN-TEST-001' })).toContainText('Licence 2');
    expect(fixture.commands).toHaveLength(0); expect(fixture.source.tables.enrollments).toHaveLength(2);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.tmp/interface/${width}/annee-de-travail.png`, fullPage: true });
  });
  test(`Année institutionnelle : ouverture et désignation confirmées, erreur conservée à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 }); const fixture = await annualFixture(page);
    await page.goto('/academique/referentiel?collection=academic_years');
    await page.getByRole('button', { name: 'Ouvrir l’année 2027-2028', exact: true }).click();
    await page.getByLabel('Motif du changement', { exact: true }).fill('Préparation officielle de la prochaine année');
    await page.getByRole('button', { name: 'Vérifier les conséquences', exact: true }).click();
    expect(fixture.commands).toHaveLength(0);
    await page.getByRole('button', { name: 'Confirmer le changement d’année', exact: true }).click();
    await page.getByRole('button', { name: 'Utiliser 2027-2028 comme année de travail', exact: true }).click();
    await page.getByLabel('Motif du changement', { exact: true }).fill('Démarrage validé de la nouvelle année');
    await page.getByRole('button', { name: 'Vérifier les conséquences', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmer le changement d’année', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Année consultée', exact: true }).locator('option:checked')).toHaveText('Année de travail : 2027-2028');
    expect(fixture.commands[0]).toMatchObject({ action: 'transition', status: 'OUVERTE', yearId: futureId });
    expect(fixture.commands[1]).toMatchObject({ action: 'current', yearId: futureId });
    expect(fixture.source.tables.enrollments).toHaveLength(2);
    fixture.fail();
    await page.getByRole('button', { name: 'Utiliser 2026-2027 comme année de travail', exact: true }).click();
    await page.getByLabel('Motif du changement', { exact: true }).fill('Valeur conservée si la version a changé');
    await page.getByRole('button', { name: 'Vérifier les conséquences', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmer le changement d’année', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Modification concurrente' })).toBeVisible();
    await page.getByRole('button', { name: 'Revenir aux informations', exact: true }).click();
    await expect(page.getByLabel('Motif du changement', { exact: true })).toHaveValue('Valeur conservée si la version a changé');
  });
}
test('Commande annuelle refusée sans session', async ({ request }) => {
  expect((await request.post('/api/academic-years', { data: { action: 'current', yearId: currentId, revision: 0, reason: 'Interdit' } })).status()).toBe(401);
});

for (const width of [390, 1440]) {
  test(`Année absente : choix requis avant les activités à ${width}px`, async ({ page }) => {
    await page.setViewportSize({width,height:1000});
    await annualFixture(page,false);
    await page.goto('/etudiants');
    await expect(page.getByRole('heading',{name:'Choisir une année scolaire',exact:true})).toBeVisible();
    await expect(page.getByRole('link',{name:'Fiche & Dossier'})).toHaveCount(0);
    await expect(page.getByRole('combobox',{name:'Année consultée',exact:true}).locator('option:checked')).toHaveText('Choisir une année scolaire');
    await page.getByRole('combobox',{name:'Année consultée',exact:true}).selectOption(oldId);
    await expect(page.getByRole('row').filter({hasText:'ESCEN-TEST-001'})).toContainText('Licence 1');
  });
}
