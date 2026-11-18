import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';
import { subjectProgrammingFixture } from './subject-programming-fixture';

for (const width of [390, 1440]) test(`Préparer un examen et son rattrapage à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 960 });
  const { problems } = await installResponsiveAudit(page, 'staff');
  await page.goto('/academique/examens');
  await page.getByRole('button', { name: 'Nouvelle évaluation', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('combobox', { name: 'Nature de l’évaluation' })).toHaveValue('EXAMEN');
  await dialog.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
  await page.getByRole('button', { name: 'Ouvrir le détail', exact: true }).first().click();
  await expect(page.getByRole('region', { name: 'Préparation de l’épreuve' })).toBeVisible();
  await page.screenshot({ path: `tmp/screenshots/exam-setup-${width}.png` });
  const planning = dialog.getByRole('link', { name: 'Planifier la date et la salle', exact: true });
  const target = new URL((await planning.getAttribute('href'))!, 'http://localhost');
  expect(target.searchParams.get('affectation')).toBeTruthy();
  await planning.click();
  await expect(dialog.getByRole('heading', { name: 'Nouvelle séance', exact: true })).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'Type de séance' })).toHaveValue('PAPIER');
  await expect(dialog.getByRole('combobox', { name: 'Enseignant du cours' })).not.toHaveValue('');
  await dialog.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
  await page.getByRole('link', { name: 'Revenir à la préparation de l’épreuve', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Préparation de l’épreuve' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
  await page.getByRole('navigation', { name: 'Type d’évaluation' }).getByRole('link', { name: 'Rattrapages' }).click();
  await expect(page.getByRole('heading', { name: 'Rattrapages', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle évaluation', exact: true }).click();
  await expect(dialog.getByRole('combobox', { name: 'Nature de l’évaluation' })).toHaveValue('RATTRAPAGE');
  await expect(dialog.getByRole('combobox', { name: 'Évaluation parente à rattraper' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(problems).toEqual([]);
});

test('Modifier le sujet enregistré conserve ses questions', async ({ page }) => {
  await installResponsiveAudit(page, 'staff');
  const fixture = subjectProgrammingFixture();
  const { exams } = await (await fixture.get()).json();
  const paper = {
    id: 'existing-paper', libraryId: 'library', version: 2, archived: false, status: 'BROUILLON',
    title: 'Sujet déjà préparé', instructions: 'Consignes conservées', durationMinutes: 90,
    purpose: 'EXAMEN', evaluationId: fixture.subject.evaluationId, sourceEvaluationRowId: null,
    parts: [{ title: 'Partie conservée', instructions: '', questions: [{ prompt: 'Question déjà rédigée', kind: 'TEXTE', points: 20, options: [], correction: 'Corrigé conservé' }] }],
  };
  let revision = 1;
  await page.route('**/api/subjects', async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      expect(body.previousId).toBe('existing-paper');
      expect(body.subject.parts[0].questions[0].prompt).toBe('Question déjà rédigée');
      Object.assign(paper, { id: 'saved-paper', version: 3 }); revision++;
      return route.fulfill({ json: { id: paper.id, revision } });
    }
    return route.fulfill({ json: { revision, subjects: [paper], exams } });
  });
  await page.goto('/academique/sujets?sujet=existing-paper');
  await expect(page.getByRole('heading', { name: 'Modifier le sujet', exact: true })).toBeVisible();
  await expect(page.getByText('Examen de finance programmé', { exact: true })).toBeVisible();
  await expect(page.locator('.subject-prompt')).toHaveValue('Question déjà rédigée');
  await page.getByRole('button', { name: 'Enregistrer le brouillon', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer la sauvegarde du brouillon', exact: true }).click();
  await expect(page).toHaveURL(/sujet=saved-paper/);
  await page.reload();
  await expect(page.locator('.subject-prompt')).toHaveValue('Question déjà rédigée');
});

for (const stage of ['create', 'schedule_delivery'] as const) test(`Création d’épreuve : reprise après conflit ${stage} sans doublon`, async ({ page }) => {
  const { snapshot } = await installResponsiveAudit(page, 'staff');
  const commands: Record<string, unknown>[] = [];
  let failed = false;
  await page.route('**/api/evaluations', async route => {
    const body = route.request().postDataJSON();
    commands.push(body);
    if (body.action === stage && !failed) {
      failed = true;
      snapshot.revision += 1;
      return route.fulfill({ status: 409, json: { error: 'Les données ont changé depuis leur chargement.' } });
    }
    expect(body.revision).toBe(snapshot.revision);
    snapshot.revision += 1;
    if (body.action === 'create') {
      const assignment = snapshot.tables.teaching_assignments.find(a => a.id === body.assignmentId)!;
      snapshot.tables.evaluations.push({ id: 'created-conflict-test', assignment_id: assignment.id,
        offering_id: assignment.offering_id, component_id: assignment.component_id, name: body.name, kind: body.kind, status: 'BROUILLON' });
    } else expect(body.evaluationId).toBe('created-conflict-test');
    return route.fulfill({ json: { id: 'created-conflict-test', revision: snapshot.revision } });
  });
  await page.goto('/academique/examens');
  await page.getByRole('button', { name: 'Nouvelle évaluation', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Intitulé de l’épreuve', { exact: true }).fill('Épreuve conservée');
  await dialog.getByRole('combobox', { name: 'Mode de passage', exact: true }).selectOption('PAPIER');
  await dialog.getByLabel('Début de l’épreuve (Date et heure)', { exact: true }).fill('2026-11-16T07:35');
  await dialog.getByLabel('Fin de l’épreuve (Date et heure)', { exact: true }).fill('2026-11-16T09:35');
  await dialog.getByRole('button', { name: 'Confirmer et programmer l’épreuve', exact: true }).click();
  expect(commands).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Confirmer la création et la programmation', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Votre saisie est conservée');
  await expect(dialog.getByLabel('Intitulé de l’épreuve', { exact: true })).toHaveValue('Épreuve conservée');
  await expect(dialog.getByLabel('Début de l’épreuve (Date et heure)', { exact: true })).toHaveValue('2026-11-16T07:35');
  if (stage === 'schedule_delivery') await expect(dialog.getByRole('status')).toContainText('déjà enregistrés');
  const countBeforeReview = commands.length;
  await dialog.getByRole('button', { name: 'Confirmer et programmer l’épreuve', exact: true }).click();
  expect(commands).toHaveLength(countBeforeReview);
  const confirmation = stage === 'create' ? 'Confirmer la création et la programmation' : 'Confirmer la programmation de l’évaluation créée';
  await dialog.getByRole('button', { name: confirmation, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Créer et programmer une épreuve', exact: true })).toHaveCount(0);
  expect(commands.map(c => c.action)).toEqual(stage === 'create'
    ? ['create', 'create', 'schedule_delivery'] : ['create', 'schedule_delivery', 'schedule_delivery']);
});
