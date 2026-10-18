import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';

for (const rejected of [false, true]) {
  test(`Évaluation : inscrits et réinscrits comptés, ${rejected ? 'échec atomique explicite' : 'création confirmée'}`, async ({ page }) => {
    await authenticateFixture(page);
    const campus = structuredClone(snapshot);
    const year = { id: '10000000-0000-4000-8000-000000000001', name: '2026-2027', status: 'OUVERTE' as const, starts_on: '2026-01-01', ends_on: '2027-12-31' };
    campus.academicContext = { currentYearId: year.id, selectedYearId: year.id, selection: 'current', years: [year] };
    Object.assign(campus.tables, {
      academic_years: [year],
      groups: [{ id: 'GROUP', name: 'Groupe A', academic_year_id: year.id }],
      subjects: [{ id: 'SUBJECT', name: 'Algorithmique', academic_year_id: year.id }],
      curriculum_components: [{ id: 'COMP', subject_id: 'SUBJECT' }],
      teaching_assignments: [{ id: 'ASSIGN', group_id: 'GROUP', offering_id: 'OFF', component_id: 'COMP' }],
      evaluations: [{ id: 'SEED', assignment_id: 'ASSIGN', name: 'Épreuve existante', kind: 'DEVOIR', status: 'BROUILLON' }],
      enrollments: ['INSCRIT', 'REINSCRIT', 'SUSPENDU', 'ABANDON', 'DIPLOME'].map((status, index) => ({ id: `ENR${index}`, offering_id: 'OFF', status })),
      enrollment_groups: [0, 1, 2, 3, 4].map(index => ({ id: `EG${index}`, enrollment_id: `ENR${index}`, group_id: 'GROUP', valid_until: null })),
    });
    const commands: Record<string, unknown>[] = [];
    await page.route('**/api/campus', route => route.fulfill({ json: campus }));
    await page.route('**/api/evaluations', async route => {
      const body = route.request().postDataJSON(); commands.push(body);
      expect(body).toMatchObject({ action: 'create', assignmentId: 'ASSIGN', name: 'Évaluation de recette', revision: 1 });
      if (rejected) return route.fulfill({ status: 409, json: { error: 'Création refusée. Aucun lot partiel n’est conservé : l’évaluation et tous ses candidats sont enregistrés ensemble.' } });
      campus.tables.evaluations.push({ id: 'CREATED', assignment_id: 'ASSIGN', name: body.name, kind: 'DEVOIR', status: 'BROUILLON' });
      campus.revision = 7;
      return route.fulfill({ status: 201, json: { id: 'CREATED', revision: 7 } });
    });
    await page.goto('/academique/evaluations');
    await page.getByRole('button', { name: 'Nouvelle évaluation', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('p').filter({ hasText: 'Effectif rattaché' })).toContainText('2 étudiant(s)');
    await dialog.getByRole('textbox', { name: 'Intitulé de l’évaluation' }).fill('Évaluation de recette');
    await dialog.getByRole('button', { name: 'Créer l’évaluation en brouillon', exact: true }).click();
    expect(commands).toHaveLength(1);
    if (rejected) {
      await expect(dialog.getByRole('alert')).toContainText('Aucun lot partiel');
      await expect(dialog.getByRole('textbox', { name: 'Intitulé de l’évaluation' })).toHaveValue('Évaluation de recette');
    } else await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText('Notes · Évaluation de recette');
  });
}
