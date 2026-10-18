import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';

for (const rejected of [false, true]) {
  test(`Soumission des notes : ${rejected ? 'arrêt après échec de sauvegarde' : 'révision retournée par la sauvegarde'}`, async ({ page }) => {
    await authenticateFixture(page);
    const campus = structuredClone(snapshot);
    const year = { id: '10000000-0000-4000-8000-000000000001', name: '2026-2027', status: 'OUVERTE' as const, starts_on: '2026-10-01', ends_on: '2027-07-01' };
    campus.academicContext = { currentYearId: year.id, selectedYearId: year.id, selection: 'current', years: [year] };
    campus.tables.academic_years = [year];
    campus.tables.evaluations = [{ id: 'EVAL', name: 'Épreuve de régression', kind: 'DEVOIR', status: 'SAISIES' }];
    campus.tables.evaluation_candidates = [{ id: 'CANDIDATE', evaluation_id: 'EVAL', enrollment_id: 'ENROLLMENT' }];
    campus.tables.grades = [{ id: 'GRADE', candidate_id: 'CANDIDATE', value: 12, absence_status: null }];
    const commands: { action: string; revision: number }[] = [];
    await page.route('**/api/campus', route => route.fulfill({ json: campus }));
    await page.route('**/api/evaluations', async route => {
      const body = route.request().postDataJSON();
      commands.push(body);
      if (body.action === 'enter_grades') {
        expect(body.revision).toBe(1);
        expect(body.grades).toEqual([{ candidateId: 'CANDIDATE', value: 15, absenceStatus: null }]);
        if (rejected) return route.fulfill({ status: 409, json: { error: 'Sauvegarde refusée pour le test.' } });
        // Deliberately not revision + 1: the client must use the response.
        campus.revision = 7;
        campus.tables.grades[0].value = 15;
        return route.fulfill({ json: { ok: true, revision: 7 } });
      }
      expect(body.action).toBe('transition_workflow');
      expect(body.revision).toBe(7);
      expect(body.fromStatus).toBe('SAISIES');
      expect(body.toStatus).toBe('SOUMISES');
      campus.revision = 8;
      campus.tables.evaluations[0].status = 'SOUMISES';
      return route.fulfill({ json: { ok: true, revision: 8 } });
    });
    await page.goto('/academique/evaluations');
    await page.getByRole('button', { name: 'Saisir / Gérer', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('spinbutton').fill('15');
    await dialog.getByRole('button', { name: 'Soumettre à la direction académique', exact: true }).click();
    expect(commands).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Confirmer la soumission des notes', exact: true }).click();
    if (rejected) {
      await expect(dialog.getByRole('alert')).toContainText('Sauvegarde refusée pour le test.');
      expect(commands.map(command => command.action)).toEqual(['enter_grades']);
    } else {
      await expect(dialog.getByRole('status')).toContainText('Statut mis à jour avec succès : SOUMISES');
      expect(commands.map(command => [command.action, command.revision])).toEqual([['enter_grades', 1], ['transition_workflow', 7]]);
    }
  });
}
