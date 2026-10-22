import { test, expect, type Page } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import type { DatabaseRow } from '../../src/types/persistence';

const ids = {
  curriculum: '00000000-0000-4000-8000-000000000101',
  semester: '00000000-0000-4000-8000-000000000102',
  unit: '00000000-0000-4000-8000-000000000103',
  subject: '00000000-0000-4000-8000-000000000104',
  created: '00000000-0000-4000-8000-000000000105',
};
const year = { id: '10000000-0000-4000-8000-000000000001', name: '2026-2027', status: 'OUVERTE', starts_on: '2026-09-01', ends_on: '2027-08-31' };

async function prepare(page: Page, rejected = '') {
  await authenticateFixture(page);
  const tables: Record<string, DatabaseRow[]> = {
    academic_years: [year],
    programs: [{ id: 'P', name: 'Finance Digitale' }],
    cycles: [{ id: 'C', code: 'MASTER', name: 'Master' }],
    levels: [{ id: 'L', cycle_id: 'C', name: 'Master 1', position: 1 }],
    curricula: [{ id: ids.curriculum, program_id: 'P', level_id: 'L', name: 'Programme UI', status: 'DRAFT' }],
    curriculum_semesters: [{ id: ids.semester, curriculum_id: ids.curriculum, name: 'Semestre de référence', position: 1, target_credits: 30 }],
    teaching_units: [{ id: ids.unit, curriculum_id: ids.curriculum, semester_id: ids.semester, code: 'ECN2101', name: 'UE de référence', credits: 3.75 }],
    subjects: [{ id: ids.subject, name: 'Matière UI', code: 'ECN2101', academic_year_id: year.id }],
    curriculum_components: [{ id: 'COMP', curriculum_id: ids.curriculum, unit_id: ids.unit, subject_id: ids.subject, code: 'ECN2101', credits: 3.75, coefficient: 0.625 }],
  };
  let revision = 1;
  let campusReads = 0;
  const writes: { collection: string; method: string; values: Record<string, unknown>; reason: string }[] = [];
  await page.route('**/api/campus', route => {
    campusReads++;
    return route.fulfill({ json: { ...snapshot, tables: { ...snapshot.tables, ...tables }, academicContext: { selection: 'current', selectedYearId: year.id, currentYearId: year.id, years: [year] } } });
  });
  await page.route('**/api/catalog/**', route => {
    const request = route.request();
    expect(request.headers().authorization).toBe('Bearer fixture-auth-token');
    if (request.method() === 'GET') return route.fulfill({ json: { revision, tables, historyLinks: [] } });
    const body = request.postDataJSON();
    expect(body.revision).toBe(revision);
    expect(body.reason.length).toBeGreaterThanOrEqual(3);
    const collection = new URL(request.url()).pathname.split('/')[3];
    writes.push({ collection, method: request.method(), ...body });
    if (rejected) return route.fulfill({ status: 409, json: { error: rejected } });
    if (request.method() === 'POST') {
      tables[collection].push({ id: ids.created, ...body.values });
      if (collection === 'subjects') {
        tables.teaching_units.push({ id: 'NEW-UNIT', curriculum_id: ids.curriculum, semester_id: ids.semester, code: body.values.code, credits: body.values.resao.credits });
        tables.curriculum_components.push({ id: 'NEW-COMP', curriculum_id: ids.curriculum, unit_id: 'NEW-UNIT', subject_id: ids.created, code: body.values.code, credits: body.values.resao.credits, coefficient: body.values.resao.coefficient });
      }
    } else {
      const id = new URL(request.url()).pathname.split('/').at(-1);
      Object.assign(tables[collection].find(row => row.id === id)!, body.values);
    }
    revision++;
    return route.fulfill({ status: request.method() === 'POST' ? 201 : 200, json: { revision, id: ids.created } });
  });
  await page.goto('/academique/filieres');
  await page.getByLabel('1. Filière').selectOption('P');
  await page.getByLabel('2. Niveau').selectOption('L');
  await page.getByLabel('3. Semestre').selectOption(ids.semester);
  await expect(page.getByRole('region', { name: 'Matières du semestre' })).toContainText('Matière UI');
  return { tables, writes, reads: () => campusReads };
}

async function review(page: Page, reason: string) {
  await page.getByRole('textbox', { name: 'Motif', exact: true }).fill(reason);
  await page.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
}
async function confirm(page: Page) {
  await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
}

test('Semestre : création décimale contextualisée et ordre entier obligatoire', async ({ page }) => {
  const fixture = await prepare(page);
  await page.getByRole('button', { name: 'Ajouter un semestre', exact: true }).click();
  await expect(page.getByLabel('Programme de formation', { exact: true })).toHaveCount(0);
  await page.getByLabel('Nom', { exact: true }).fill('Semestre UI');
  await expect(page.getByLabel('Ordre', { exact: true })).toHaveAttribute('step', '1');
  await page.getByLabel('Ordre', { exact: true }).fill('1.5');
  await expect(page.getByLabel('Crédits attendus')).toHaveAttribute('step', '0.01');
  await page.getByLabel('Crédits attendus').fill('3.75');
  await review(page, 'Création de recette UI');
  expect(fixture.writes).toHaveLength(0);
  await expect(page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true })).toHaveCount(0);
  await page.getByLabel('Ordre', { exact: true }).fill('2');
  await review(page, 'Création de recette UI');
  expect(fixture.writes).toHaveLength(0);
  const reads = fixture.reads();
  await confirm(page);
  await expect.poll(fixture.reads).toBeGreaterThan(reads);
  expect(fixture.writes).toEqual([expect.objectContaining({ collection: 'curriculum_semesters', method: 'POST', values: { curriculum_id: ids.curriculum, name: 'Semestre UI', position: 2, target_credits: 3.75 } })]);
  await page.getByLabel('3. Semestre').selectOption(ids.created);
  await expect(page.getByRole('region', { name: 'Matières du semestre' })).toContainText('Semestre UI');
});

test('Semestre : modification des crédits avec récapitulatif avant envoi', async ({ page }) => {
  const fixture = await prepare(page);
  await page.getByRole('button', { name: 'Modifier le semestre', exact: true }).click();
  await page.getByLabel('Crédits attendus').fill('4.25');
  await review(page, 'Modification des crédits du semestre');
  expect(fixture.writes).toHaveLength(0);
  await expect(page.getByRole('region', { name: 'Vérification avant' })).toContainText('4.25');
  await confirm(page);
  await expect.poll(() => fixture.writes.length).toBe(1);
  expect(fixture.writes[0]).toMatchObject({ collection: 'curriculum_semesters', method: 'PATCH', values: { curriculum_id: ids.curriculum, target_credits: 4.25 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Matière : crédits et coefficient décimaux transmis avec le code REESAO', async ({ page }) => {
  const fixture = await prepare(page);
  await page.getByRole('button', { name: 'Ajouter une matière', exact: true }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Finance UI');
  await page.getByLabel('Sigle de discipline REESAO (3 lettres)').fill('ECN');
  await expect(page.getByLabel('Crédits', { exact: true })).toHaveAttribute('step', '0.01');
  await expect(page.getByLabel('Coefficient', { exact: true })).toHaveAttribute('step', '0.001');
  await page.getByLabel('Crédits', { exact: true }).fill('3.75');
  await page.getByLabel('Coefficient', { exact: true }).fill('0.625');
  await expect(page.getByLabel('Code', { exact: true })).toHaveValue('ECN2102');
  await review(page, 'Création de matière décimale');
  expect(fixture.writes).toHaveLength(0);
  await confirm(page);
  await expect(page.getByRole('region', { name: 'Matières du semestre' })).toContainText('Finance UI');
  expect(fixture.writes[0]).toMatchObject({ collection: 'subjects', method: 'POST', values: { academic_year_id: year.id, code: 'ECN2102', resao: { semester_id: ids.semester, discipline: 'ECN', credits: 3.75, coefficient: 0.625 } } });
  await expect(page.getByRole('row').filter({ hasText: 'Finance UI' })).toContainText('0.625');
});

test('Matière : modification conserve son rattachement et ses valeurs décimales', async ({ page }) => {
  const fixture = await prepare(page);
  await page.getByRole('button', { name: 'Modifier la matière', exact: true }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Matière renommée');
  await review(page, 'Correction du nom de la matière');
  expect(fixture.writes).toHaveLength(0);
  await confirm(page);
  await expect(page.getByRole('region', { name: 'Matières du semestre' })).toContainText('Matière renommée');
  expect(fixture.writes[0]).toMatchObject({ collection: 'subjects', method: 'PATCH', values: { name: 'Matière renommée', code: 'ECN2101', academic_year_id: year.id } });
  expect(fixture.tables.curriculum_components[0]).toMatchObject({ subject_id: ids.subject, unit_id: ids.unit, credits: 3.75, coefficient: 0.625 });
});

for (const sample of [
  { name: 'semestre', button: 'Modifier le semestre', message: 'La maquette a été approuvée : modification interdite.' },
  { name: 'matière', button: 'Modifier la matière', message: 'Les données ont changé : actualisez avant de réessayer.' },
]) test(`Refus serveur : ${sample.name} conservé et erreur visible sans succès fictif`, async ({ page }) => {
  const fixture = await prepare(page, sample.message);
  const original = structuredClone(fixture.tables);
  await page.getByRole('button', { name: sample.button, exact: true }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Modification refusée');
  await review(page, 'Modification de recette refusée');
  expect(fixture.writes).toHaveLength(0);
  const reads = fixture.reads();
  await confirm(page);
  await expect(page.getByRole('alert').filter({ hasText: sample.message })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true })).toBeEnabled();
  expect(fixture.writes).toHaveLength(1);
  expect(fixture.tables).toEqual(original);
  expect(fixture.reads()).toBe(reads);
});
