import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';

for (const scenario of ['admitted', 'draft', 'unresolved'] as const) {
  test(`Candidature reprise : ${scenario}`, async ({ page }) => {
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    await page.route('**/api/website-management*', route => route.fulfill({ json: {
      applications: [{ id: 'application-local', reference: 'LEGACY-LOCAL', identity: { nom: 'Candidat', prenom: 'Local', email: 'candidate@example.test' }, diploma: {}, guardians: [], documents: [],
        status: scenario === 'draft' ? 'BROUILLON' : scenario === 'admitted' ? 'CLASSE' : 'RECU', version: 1,
        legacy_source_row_id: 'source-local', legacy_state: { admitted: scenario === 'admitted', program_unresolved: scenario === 'unresolved', missing_documents: 2, source_year: '2025-2026' } }],
      intakes: [], years: [], levels: [], programs: [],
    } }));
    await page.goto('/site-web/demandes');
    await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
    await expect(page.getByText('Dossier repris pour 2026-2027. Année d’origine : 2025-2026.')).toBeVisible();
    await expect(page.getByText('2 pièce(s) référencée(s) manquante(s) dans la sauvegarde.')).toBeVisible();
    if (scenario === 'admitted') await expect(page.getByText('Admission historique conservée.', { exact: false })).toBeVisible();
    if (scenario === 'draft') await expect(page.getByText('Ce dossier n’avait pas été envoyé.', { exact: false })).toBeVisible();
    if (scenario === 'unresolved') await expect(page.getByText('La filière d’origine est absente de la sauvegarde.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Admettre et créer le dossier étudiant', exact: true })).toHaveCount(0);
  });
}
