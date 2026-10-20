import { expect, test, type Locator, type Page } from '@playwright/test';
import { authenticateFixture, snapshot as baseSnapshot } from './persistent-fixture';
import { teacherFixture } from './teacher-management-fixture';
import { securityContext, securityIds as id, uuid } from './security-fixture';

async function connectedTeachers(page: Page) {
  await authenticateFixture(page);
  const fixture = teacherFixture(securityContext(), true);
  let reads = 0;
  await page.route('**/api/campus', route => {
    reads++;
    return route.fulfill({ json: {
      ...fixture.snapshot, tables: { ...baseSnapshot.tables, ...fixture.snapshot.tables, people: [...baseSnapshot.tables.people, ...fixture.snapshot.tables.people] },
      academicContext: { currentYearId: id.year, currentYearConfigured: true, selectedYearId: id.year, selection: 'current', years: fixture.snapshot.tables.academic_years },
    } });
  });
  for (const [path, api] of [['teachers', fixture.api], ['staff', fixture.staffApi]] as const) await page.route(`**/api/${path}`, async route => {
    const request = route.request();
    const input = new Request(`http://local.test/api/${path}`, { method: request.method(), headers: request.headers(), ...(request.method() === 'POST' ? { body: request.postData()! } : {}) });
    const response = request.method() === 'POST' ? await api.POST(input) : await api.GET(input);
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  return { ...fixture, campusReads: () => reads };
}

async function confirm(dialog: Locator) {
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Vérification avant enregistrement' })).toBeVisible();
  await dialog.getByRole('button', { name: /^Confirmer/ }).click();
  await expect(dialog).not.toBeVisible();
}

test('Suivi enseignant : distinguer les copies remises des résultats manquants et les remplacements', async ({ page }) => {
  const { snapshot } = await connectedTeachers(page);
  const tables = snapshot.tables;
  const assignment = tables.teaching_assignments.find(row => row.teacher_id === uuid(20))!;
  tables.evaluations = [{ id: uuid(6001), assignment_id: assignment.id, offering_id: assignment.offering_id, status: 'SAISIES' }];
  tables.evaluation_candidates = [0, 1, 2, 3].map(index => ({
    id: uuid(6100 + index), evaluation_id: uuid(6001), eligibility: 'ELIGIBLE',
  }));
  tables.grades = [
    { id: uuid(6200), candidate_id: uuid(6100), value: 0, absence_status: null },
    { id: uuid(6201), candidate_id: uuid(6101), value: 0, absence_status: 'NON_TRAITE' },
  ];
  tables.exam_attempts = [
    { id: uuid(6301), candidate_id: uuid(6101), attempt_number: 1, status: 'REMISE' },
    { id: uuid(6302), candidate_id: uuid(6103), attempt_number: 1, status: 'REMISE' },
    { id: uuid(6303), candidate_id: uuid(6103), attempt_number: 2, status: 'EN_COURS' },
  ];
  tables.sessions = [
    { id: uuid(6400), teacher_id: uuid(20), replacement_teacher_id: uuid(21), status: 'PLANIFIE' },
    { id: uuid(6401), teacher_id: uuid(20), status: 'ANNULE' },
  ];
  await page.goto('/personnel/enseignants');
  const alice = page.getByRole('row').filter({ hasText: 'Alice Enseignant' });
  await expect(alice).toContainText('1 copie en ligne à corriger');
  await expect(alice).toContainText('2 résultat(s) à renseigner');
  await expect(alice).toContainText('0 séance');
  await expect(page.getByRole('row').filter({ hasText: 'Benoît Enseignant' })).toContainText('1 séance');
});

for (const width of [390, 1440]) {
  test(`Personnel : case enseignant, récapitulatif et transaction unique à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await connectedTeachers(page);
    await page.goto('/personnel');
    await page.getByRole('button', { name: 'Nouveau membre', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nouveau membre du personnel', exact: true });
    await dialog.getByRole('textbox', { name: 'Prénom', exact: true }).fill('Dina');
    await dialog.getByRole('textbox', { name: 'Nom', exact: true }).fill('Pédagogie');
    await dialog.getByRole('textbox', { name: 'Matricule officiel du personnel', exact: true }).fill('ENS-RECETTE');
    await dialog.getByRole('checkbox', { name: 'C’est un enseignant', exact: true }).check();
    await dialog.getByRole('textbox', { name: 'Spécialité enseignante', exact: true }).fill('Statistiques');
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    await expect(dialog.locator('.action-review')).toContainText('Profil enseignant');
    await expect(dialog.locator('.action-review')).toContainText('Statistiques');
    expect(fixture.transactions).toEqual([]);
    await dialog.getByRole('button', { name: 'Confirmer la création du dossier', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'ENS-RECETTE' })).toContainText('Dina Pédagogie');
    expect(fixture.transactions[0].map(change => change.table)).toEqual(['people', 'staff', 'teachers']);
    expect(fixture.transactions[0][2].record).toMatchObject({ specialty: 'Statistiques', active: true });
    await expect.poll(fixture.campusReads).toBeGreaterThan(1);
  });

  test(`Profils : créer, modifier, désactiver et réactiver avec motif à ${width}px`, async ({ page }) => {
    const fixture = await connectedTeachers(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/personnel/enseignants');
    await page.getByRole('button', { name: 'Créer un profil enseignant', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'Membre du personnel', exact: true }).selectOption(uuid(912));
    await dialog.getByRole('textbox', { name: 'Spécialité', exact: true }).fill('Communication');
    await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Qualification pédagogique vérifiée');
    await confirm(dialog);
    let row = page.getByRole('row').filter({ hasText: 'Claire Enseignant' });
    await expect(row).toContainText('Communication');
    await row.getByRole('button', { name: 'Modifier le profil', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Spécialité', exact: true }).fill('Communication numérique');
    await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Spécialité actualisée');
    await confirm(dialog);
    row = page.getByRole('row').filter({ hasText: 'Claire Enseignant' });
    await expect(row).toContainText('Communication numérique');
    for (const label of ['Désactiver', 'Activer']) {
      await row.getByRole('button', { name: label, exact: true }).click();
      dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill(`${label} selon le dossier validé`);
      await confirm(dialog);
      row = page.getByRole('row').filter({ hasText: 'Claire Enseignant' });
      await expect(row.getByRole('cell', { name: label === 'Désactiver' ? /^(Statut )?Inactif$/ : /^(Statut )?Actif$/ })).toBeVisible();
    }
    expect(fixture.transactions).toHaveLength(4);
    expect(fixture.transactions.every(changes => changes[0].record.reason)).toBe(true);
  });
}

for (const width of [360, 390, 1440]) test(`Affectation : dépendances, confirmation et fin motivée à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const fixture = await connectedTeachers(page);
  await page.goto('/personnel/enseignants');
  await page.getByRole('row').filter({ hasText: 'Alice Enseignant' }).getByRole('button', { name: 'Affecter', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Nouvelle affectation', exact: true });
  await expect(dialog.getByRole('combobox', { name: 'Groupe', exact: true })).toBeDisabled();
  await dialog.getByRole('combobox', { name: 'Formation annuelle', exact: true }).selectOption(uuid(40));
  await dialog.getByRole('combobox', { name: 'Groupe', exact: true }).selectOption(id.group);
  await dialog.getByRole('combobox', { name: 'Matière du programme', exact: true }).selectOption(uuid(60));
  await dialog.getByLabel('Début de l’affectation', { exact: true }).fill('2026-10-20');
  await dialog.getByLabel('Fin prévue (facultative)', { exact: true }).fill('2027-06-30');
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Affectation pédagogique approuvée');
  const reviewButton = dialog.getByRole('button', { name: 'Vérifier les informations', exact: true });
  if (width < 768) await expect(reviewButton).toBeInViewport();
  await confirm(dialog);
  expect(fixture.transactions[0][0].record).toMatchObject({ teacher_id: id.teacher, group_id: id.group, offering_id: uuid(40), component_id: uuid(60), valid_from: '2026-10-20' });
  await page.getByRole('button', { name: /^Affectations \(/ }).click();
  const row = page.getByRole('row').filter({ hasText: '2026-10-20' });
  await row.getByRole('button', { name: 'Terminer l’affectation', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Terminer l’affectation', exact: true });
  await dialog.getByLabel('Fin de l’affectation', { exact: true }).fill('2027-05-03');
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Fin de mission validée');
  await confirm(dialog);
  await expect(page.getByRole('row').filter({ hasText: '2026-10-20' })).toContainText('2027-05-03');
  expect(fixture.transactions).toHaveLength(2);
});

test('Pendant la sauvegarde les champs sont verrouillés ; un refus reste dans la fenêtre', async ({ page }) => {
  const fixture = await connectedTeachers(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/teachers', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    await gate;
    return route.fulfill({ status: 409, json: { error: 'Des séances futures empêchent la désactivation.' } });
  });
  await page.goto('/personnel/enseignants');
  await page.getByRole('row').filter({ hasText: 'Alice Enseignant' }).getByRole('button', { name: 'Désactiver', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Demande de désactivation');
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  await dialog.getByRole('button', { name: /^Confirmer/ }).click();
  await expect(dialog.getByText('Enregistrement en cours…', { exact: true })).toBeVisible();
  await expect(dialog.locator('textarea')).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Enregistrement…', exact: true })).toBeDisabled();
  release();
  await expect(dialog.getByRole('alert')).toHaveText('Des séances futures empêchent la désactivation.');
  expect(fixture.transactions).toEqual([]);
  await dialog.getByRole('button', { name: 'Revenir aux informations', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Motif', exact: true })).toHaveValue('Demande de désactivation');
});

test('Annuler une modification demande confirmation et conserve la saisie si refusée', async ({ page }) => {
  const fixture = await connectedTeachers(page);
  await page.goto('/personnel/enseignants');
  await page.getByRole('row').filter({ hasText: 'Alice Enseignant' }).getByRole('button', { name: 'Modifier le profil', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Spécialité', exact: true }).fill('Analyse modifiée');
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Quitter sans enregistrer ?', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Continuer la saisie', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Spécialité', exact: true })).toHaveValue('Analyse modifiée');
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: 'Abandonner les modifications', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(fixture.transactions).toEqual([]);
});
