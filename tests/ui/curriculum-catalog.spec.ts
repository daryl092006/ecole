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
const cases = [
  { key: 'curriculum_semesters', add: 'Ajouter un semestre', valueLabel: 'Crédits attendus', step: '0.01', fields: { Nom: 'Semestre UI', Ordre: '2', 'Crédits attendus': '3.75' }, refs: { 'Programme de formation': ids.curriculum } },
  { key: 'teaching_units', add: 'Ajouter une unité d’enseignement', valueLabel: 'Crédits', step: '0.01', fields: { Code: 'UE-UI', Nom: 'UE UI', Crédits: '3.75' }, refs: { 'Programme de formation': ids.curriculum, Semestre: ids.semester } },
  { key: 'curriculum_components', add: 'Ajouter une matière du programme', valueLabel: 'Coefficient', step: '0.001', fields: { Code: 'EC-UI', Crédits: '3.75', Coefficient: '0.625' }, refs: { 'Programme de formation': ids.curriculum, 'Unité d’enseignement': ids.unit, Matière: ids.subject } },
];
async function prepare(page: Page, collection: string, archiveError = '') {
  await authenticateFixture(page);
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  const tables: Record<string, DatabaseRow[]> = {
    curricula: [{ id: ids.curriculum, name: 'Programme UI', status: 'DRAFT' }],
    curriculum_semesters: [{ id: ids.semester, curriculum_id: ids.curriculum, name: 'Semestre de référence', position: 1, target_credits: 30 }],
    teaching_units: [{ id: ids.unit, curriculum_id: ids.curriculum, semester_id: ids.semester, code: 'REF', name: 'UE de référence', credits: 30 }],
    curriculum_components: [], subjects: [{ id: ids.subject, name: 'Matière UI' }],
    programs: [], levels: [],
  };
  let revision = 1;
  const writes: { method: string; values?: Record<string, unknown>; reason: string }[] = [];
  await page.route('**/api/catalog/**', async route => {
    const request = route.request();
    expect(request.headers().authorization).toBe('Bearer fixture-auth-token');
    if (request.method() === 'GET') return route.fulfill({ json: { revision, tables, historyLinks: [] } });
    const body = request.postDataJSON();
    expect(body.revision).toBe(revision);
    expect(body.reason.length).toBeGreaterThanOrEqual(3);
    writes.push({ method: request.method(), ...body });
    if (request.method() === 'DELETE' && archiveError) return route.fulfill({ status: 409, json: { error: archiveError } });
    if (request.method() === 'POST') tables[collection].push({ id: ids.created, ...body.values });
    else {
      const id = new URL(request.url()).pathname.split('/').at(-1);
      Object.assign(tables[collection].find(row => row.id === id)!, request.method() === 'DELETE' ? { archived_at: new Date().toISOString(), reason: body.reason } : body.values);
    }
    revision++;
    return route.fulfill({ status: request.method() === 'POST' ? 201 : 200, json: { revision, id: ids.created } });
  });
  await page.goto(`/academique/filieres?collection=${collection}`);
  await expect(page.getByRole('combobox', { name: 'Rubrique', exact: true })).toHaveValue(collection);
  return { tables, writes };
}

for (const sample of cases) {
  test(`${sample.key} : création, modification décimale et archivage confirmé`, async ({ page }) => {
    const fixture = await prepare(page, sample.key);
    await page.getByRole('button', { name: sample.add, exact: true }).click();
    const dialog = page.getByRole('dialog');
    for (const [label, value] of Object.entries(sample.refs)) await dialog.getByRole('combobox', { name: label, exact: true }).selectOption(value!);
    for (const [label, value] of Object.entries(sample.fields)) await dialog.getByLabel(label, { exact: true }).fill(value!);
    await expect(dialog.getByLabel(sample.valueLabel, { exact: true })).toHaveAttribute('step', sample.step);
    if (sample.key === 'curriculum_semesters') {
      await expect(dialog.getByLabel('Ordre', { exact: true })).toHaveAttribute('step', '1');
      await dialog.getByLabel('Ordre', { exact: true }).fill('1.5');
      await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
      expect(fixture.writes).toHaveLength(0);
      await dialog.getByLabel('Ordre', { exact: true }).fill('2');
    }
    await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Création de recette UI');
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    expect(fixture.writes).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const row = page.getByRole('row').filter({ hasText: sample.key === 'curriculum_semesters' ? 'Semestre UI' : sample.key === 'teaching_units' ? 'UE-UI' : 'EC-UI' });
    await row.getByRole('button', { name: 'Modifier', exact: true }).click();
    await dialog.getByLabel(sample.valueLabel, { exact: true }).fill(sample.step === '0.001' ? '1.125' : '4.25');
    await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Modification de recette UI');
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await row.getByRole('button', { name: 'Archiver', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Retrait de recette UI');
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    expect(fixture.writes).toHaveLength(2);
    await dialog.getByRole('button', { name: /Confirmer/ }).click();
    await expect(dialog).toHaveCount(0);
    expect(fixture.writes.map(write => write.method)).toEqual(['POST', 'PATCH', 'DELETE']);
    expect(fixture.tables[sample.key].find(item => item.id === ids.created)?.archived_at).toBeTruthy();
  });
}

for (const [collection, message] of [
  ['curriculum_semesters', 'Archivage du semestre interdit : des unités d’enseignement actives y sont encore rattachées.'],
  ['teaching_units', 'Archivage de l’unité d’enseignement interdit : des matières actives y sont encore rattachées.'],
  ['curriculum_semesters', 'Archivage interdit : la maquette est approuvée ou archivée. Le gel de la maquette prime.'],
]) {
  test(`${collection} : refus visible et fenêtre conservée — ${message}`, async ({ page }) => {
    const fixture = await prepare(page, collection, message);
    await page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Archiver', exact: true }) }).first().getByRole('button', { name: 'Archiver', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Archivage refusé de recette');
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    await dialog.getByRole('button', { name: /Confirmer/ }).click();
    await expect(dialog.getByRole('alert')).toHaveText(message);
    expect(fixture.writes).toHaveLength(1);
    expect(fixture.tables[collection].every(row => !row.archived_at)).toBe(true);
  });
}
