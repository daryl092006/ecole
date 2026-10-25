import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

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
  const paper = {
    id: 'existing-paper', libraryId: 'library', version: 2, archived: false, status: 'BROUILLON',
    title: 'Sujet déjà préparé', instructions: 'Consignes conservées', durationMinutes: 90,
    purpose: 'EXAMEN', evaluationId: null, sourceEvaluationRowId: null,
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
    return route.fulfill({ json: { revision, subjects: [paper] } });
  });
  await page.goto('/academique/sujets?sujet=existing-paper');
  await expect(page.getByRole('heading', { name: 'Modifier l’épreuve', exact: true })).toBeVisible();
  await expect(page.locator('input[value="Sujet déjà préparé"]')).toBeVisible();
  await expect(page.locator('.subject-prompt')).toHaveValue('Question déjà rédigée');
  await page.getByRole('button', { name: 'Enregistrer le brouillon', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer la sauvegarde du brouillon', exact: true }).click();
  await expect(page).toHaveURL(/sujet=saved-paper/);
  await page.reload();
  await expect(page.locator('.subject-prompt')).toHaveValue('Question déjà rédigée');
});
