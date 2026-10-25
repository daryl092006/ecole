import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture, fixtureCapabilities, snapshot } from './persistent-fixture';
import { ROLES } from '../../src/types/permissions';

async function prepare(page: Page, status = 'SAISIES', legacyUnprocessed = false, teacher = false) {
  await authenticateFixture(page);
  if (teacher) await page.route('**/api/session', route => route.fulfill({ json: {
    capabilities: fixtureCapabilities, accountId: 'teacher-account', name: 'Enseignant Test', email: 'teacher@example.test', role: ROLES.ENS, availableRoles: [ROLES.ENS], studentId: null, teacherId: 'TEACHER', matricule: null, mustChangePassword: false,
  } }));
  const campus = structuredClone(snapshot);
  const year = { id: '10000000-0000-4000-8000-000000000001', name: '2026-2027', status: 'OUVERTE' as const, starts_on: '2026-01-01', ends_on: '2027-12-31' };
  campus.academicContext = { currentYearId: year.id, selectedYearId: year.id, selection: 'current', years: [year] };
  Object.assign(campus.tables, {
    academic_years: [year],
    people: [...(campus.tables.people || []), ...['Anne Première', 'Boris Copie', 'Clara Absence'].map((name, index) => ({ id: `POLICY_PERSON${index}`, firstname: name.split(' ')[0], lastname: name.split(' ')[1] }))],
    students: [0, 1, 2].map(index => ({ id: `S${index}`, person_id: `POLICY_PERSON${index}`, matricule: `NOTES-${index}` })),
    programs: [{ id: 'PROG', name: 'Informatique' }], levels: [{ id: 'LEVEL', name: 'Licence 1' }],
    curricula: [{ id: 'CUR', program_id: 'PROG', level_id: 'LEVEL' }],
    academic_offerings: [{ id: 'OFF', academic_year_id: year.id, curriculum_id: 'CUR', level_id: 'LEVEL' }],
    groups: [{ id: 'GROUP', academic_year_id: year.id, level_id: 'LEVEL', name: 'Groupe A' }],
    enrollments: [0, 1, 2].map(index => ({ id: `ENR${index}`, student_id: `S${index}`, offering_id: 'OFF', status: 'INSCRIT' })),
    enrollment_groups: [0, 1, 2].map(index => ({ id: `LINK${index}`, enrollment_id: `ENR${index}`, group_id: 'GROUP', valid_from: '2026-01-01' })),
    subjects: [{ id: 'SUB', name: 'Algorithmique' }], curriculum_components: [{ id: 'COMP', subject_id: 'SUB', curriculum_id: 'CUR' }],
    teaching_assignments: [{ id: 'ASSIGN', group_id: 'GROUP', offering_id: 'OFF', component_id: 'COMP' }],
    evaluations: [{ id: 'EVAL', name: 'Politique des copies', kind: 'DEVOIR', assignment_id: 'ASSIGN', offering_id: 'OFF', component_id: 'COMP', status }],
    evaluation_candidates: [0, 1, 2].map(index => ({ id: `C${index}`, evaluation_id: 'EVAL', enrollment_id: `ENR${index}`, eligibility: 'ELIGIBLE' })),
    grades: [
      { id: 'G0', candidate_id: 'C0', value: 12, absence_status: null },
      { id: 'G1', candidate_id: 'C1', value: null, absence_status: legacyUnprocessed ? 'NON_TRAITE' : null },
      { id: 'G2', candidate_id: 'C2', value: null, absence_status: 'JUSTIFIE' },
    ],
  });
  const commands: Record<string, unknown>[] = [];
  await page.route('**/api/campus', route => route.fulfill({ json: campus }));
  await page.route('**/api/evaluations', async route => {
    const body = route.request().postDataJSON();
    commands.push(body);
    if (body.action === 'enter_grades') {
      expect(body.revision).toBe(1);
      expect(body.advanceToSaisies).toBe(status === 'BROUILLON');
      expect(body.grades).toEqual([
        { candidateId: 'C0', value: 12, absenceStatus: null },
        { candidateId: 'C1', value: null, absenceStatus: status === 'BROUILLON' ? 'ABSENT' : 'JUSTIFIE' },
        { candidateId: 'C2', value: null, absenceStatus: 'JUSTIFIE' },
      ]);
      campus.tables.grades[1].value = null;
      campus.tables.grades[1].absence_status = status === 'BROUILLON' ? 'ABSENT' : 'JUSTIFIE';
      if (body.advanceToSaisies) campus.tables.evaluations[0].status = 'SAISIES';
      campus.revision = 7;
      return route.fulfill({ json: { ok: true, revision: 7 } });
    }
    expect(body).toMatchObject({ action: 'transition_workflow', fromStatus: 'SAISIES', toStatus: 'SOUMISES', revision: 7 });
    campus.tables.evaluations[0].status = 'SOUMISES';
    campus.revision = 8;
    return route.fulfill({ json: { ok: true, revision: 8 } });
  });
  await page.goto('/academique/evaluations');
  return { commands, campus };
}

for (const width of [390, 1440]) test(`Enseignant : lire la bonne copie sans perdre la note en cours à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const { campus, commands } = await prepare(page, 'SAISIES', false, true);
  campus.tables.exam_attempts = [0, 1].map(index => ({ id: `COPY${index}`, candidate_id: `C${index}`, evaluation_id: 'EVAL', paper_id: `PAPER${index}`, status: 'REMISE', completion_status: 'PARTIELLE' }));
  campus.tables.exam_questions = [0, 1].map(index => ({ id: `QUESTION${index}`, paper_id: `PAPER${index}`, prompt: `Question pour le candidat ${index}` }));
  campus.tables.exam_answers = [0, 1].map(index => ({ id: `ANSWER${index}`, attempt_id: `COPY${index}`, question_id: `QUESTION${index}`, response: { text: `Réponse du candidat ${index}\nDeuxième ligne`, option_ids: [] } }));
  await page.reload();
  await page.getByRole('button', { name: 'Saisir / Gérer', exact: true }).click();
  const grades = page.getByRole('dialog', { name: 'Notes · Politique des copies', exact: true });
  const student = grades.getByRole('row', { name: /Boris Copie/ });
  await student.getByRole('spinbutton').fill('14.5');
  await student.getByRole('button', { name: /Lire la copie de/ }).click();
  const copy = page.getByRole('dialog', { name: 'Copies en ligne', exact: true });
  await expect(copy.getByRole('heading', { name: /Boris Copie/ })).toBeVisible();
  await expect(copy.getByRole('heading', { name: /Anne Première/ })).toHaveCount(0);
  await copy.getByRole('button', { name: 'Lire les réponses', exact: true }).click();
  await expect(copy.getByRole('heading', { name: 'Question pour le candidat 1', exact: true })).toBeVisible();
  await expect(copy.locator('.online-exam-question p')).toContainText('Réponse du candidat 1');
  await expect(copy.locator('.online-exam-question p')).toHaveCSS('white-space', 'pre-wrap');
  await copy.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
  await expect(student.getByRole('spinbutton')).toHaveValue('14.5');
  await expect(grades.getByRole('button', { name: 'Soumettre à la direction académique', exact: true })).toBeVisible();
  await expect(grades.getByRole('button', { name: 'Valider les notes', exact: true })).toHaveCount(0);
  expect(commands).toEqual([]);
});

for (const status of ['BROUILLON', 'SAISIES']) {
  test(`NON_TRAITE bloque puis une absence traitée permet la soumission depuis ${status}`, async ({ page }) => {
    const { commands } = await prepare(page, status);
    await page.getByRole('button', { name: 'Saisir / Gérer', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const row = dialog.getByRole('row', { name: /Boris Copie/ });
    await row.getByRole('combobox').selectOption('NON_TRAITE');
    await expect(row.getByRole('spinbutton')).toHaveValue('0');
    await expect(row.getByRole('spinbutton')).toBeDisabled();
    await row.getByRole('combobox').selectOption('');
    await expect(row.getByRole('spinbutton')).toHaveValue('');
    await expect(row.getByRole('spinbutton')).toBeEnabled();
    await row.getByRole('combobox').selectOption('NON_TRAITE');
    await dialog.getByRole('button', { name: 'Soumettre à la direction académique', exact: true }).click();
    const summary = dialog.locator('.action-review');
    const field = (label: string) => summary.locator('.review-values > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd');
    await expect(field('Notes chiffrées')).toHaveText('2');
    await expect(field('Copies non traitées (soumission bloquée)')).toHaveText('1');
    await expect(field('Absences')).toHaveText('1');
    await expect(field('Sans note')).toHaveText('0');
    await expect(field('Moyenne /20')).toHaveText('6');
    expect(commands).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Confirmer la soumission des notes', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Traitez toutes les copies NON_TRAITE');
    expect(commands).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Revenir aux informations', exact: true }).click();
    await row.getByRole('combobox').selectOption(status === 'BROUILLON' ? 'ABSENT' : 'JUSTIFIE');
    await dialog.getByRole('button', { name: 'Soumettre à la direction académique', exact: true }).click();
    await expect(field('Copies non traitées (soumission bloquée)')).toHaveText('0');
    await expect(field('Absences')).toHaveText('2');
    await dialog.getByRole('button', { name: 'Confirmer la soumission des notes', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('SOUMISES');
    expect(commands.map(command => command.action)).toEqual(['enter_grades', 'transition_workflow']);
  });
}

test('Une saisie vide sans statut bloque la soumission sans devenir zéro', async ({ page }) => {
  const { commands } = await prepare(page);
  await page.getByRole('button', { name: 'Saisir / Gérer', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('row', { name: /Boris Copie/ }).getByRole('spinbutton')).toHaveValue('');
  await dialog.getByRole('button', { name: 'Soumettre à la direction académique', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmer la soumission des notes', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Renseignez une note ou une absence ABSENT/JUSTIFIE');
  expect(commands).toHaveLength(0);
});

test('Ancien NON_TRAITE publié : zéro et moyenne cohérents dans la liste et les fenêtres', async ({ page }) => {
  const { commands } = await prepare(page, 'PUBLIEES', true);
  await expect(page.getByRole('row', { name: /Politique des copies/ })).toContainText('Moy. 6/20');
  await page.getByRole('button', { name: 'Saisir / Gérer', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('row', { name: /Boris Copie/ })).toContainText('0 / 20');
  await expect(dialog.getByRole('row', { name: /Boris Copie/ })).toContainText('Copie non traitée');
  await dialog.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
  await page.getByRole('button', { name: 'Ouvrir le détail', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('row', { name: /Boris Copie/ })).toContainText('0');
  await expect(dialog.getByRole('row', { name: /Boris Copie/ })).toContainText('Copie non traitée');
  expect(commands).toHaveLength(0);
});

test('Notes publiées avec le marqueur PRESENT : aucune copie annoncée à corriger', async ({ page }) => {
  const { campus } = await prepare(page, 'PUBLIEES');
  campus.tables.grades = [0, 1, 2].map(index => ({ id: `PRESENT${index}`, candidate_id: `C${index}`, value: 12, absence_status: 'PRESENT' }));
  await page.reload();
  const row = page.getByRole('row', { name: /Politique des copies/ });
  await expect(row).toContainText('3 note(s)');
  await expect(row).toContainText('Moy. 12/20');
  await expect(row).toContainText('Résultats publiés');
  await expect(row).not.toContainText('à corriger');
});


test('Copie en ligne vide remise à l’échéance : zéro et NON_TRAITE préremplis', async ({ page }) => {
  const { campus } = await prepare(page);
  campus.tables.exam_attempts = [{ id: 'BLANK_COPY', candidate_id: 'C1', evaluation_id: 'EVAL', attempt_number: 1, status: 'EXPIREE', completion_status: 'NON_TRAITE' }];
  await page.reload();
  await page.getByRole('button', { name: 'Saisir / Gérer', exact: true }).click();
  const row = page.getByRole('dialog').getByRole('row', { name: /Boris Copie/ });
  await expect(row.getByRole('spinbutton')).toHaveValue('0');
  await expect(row.getByRole('combobox')).toHaveValue('NON_TRAITE');
  await expect(row.getByRole('spinbutton')).toBeDisabled();
});


test('Correction publiée : saisie vide et hors barème bloquées, zéro explicite accepté au récapitulatif', async ({ page }) => {
  const { commands } = await prepare(page, 'PUBLIEES');
  await page.getByRole('button', { name: 'Saisir / Gérer', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('row', { name: /Anne Première/ }).getByRole('button', { name: 'Corriger', exact: true }).click();
  const form = dialog.getByRole('form', { name: 'Formulaire de correction de note' });
  const input = form.getByRole('spinbutton');
  await form.getByRole('textbox').fill('Correction motivée de recette');
  for (const value of ['', '-1', '21']) {
    await input.fill(value);
    await expect(dialog.getByRole('button', { name: 'Valider la révision', exact: true })).toBeDisabled();
    expect(commands).toHaveLength(0);
  }
  await input.fill('0');
  await expect(dialog.getByRole('button', { name: 'Valider la révision', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Valider la révision', exact: true }).click();
  await expect(form.locator('.action-review')).toContainText('0');
  expect(commands).toHaveLength(0);
});
