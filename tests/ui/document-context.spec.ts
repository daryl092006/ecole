import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';

for (const width of [390, 1440]) {
  for (const [path, table] of [['/academique/notes', 'notes'], ['/academique/deliberations', 'releve_notes'], ['/etudiants/cartes', 'documents']]) {
    test(`Dossier requis avant consultation de ${table} à ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await authenticateFixture(page);
      await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, tables: { ...snapshot.tables, enrollments: [{ id: 'EN1', student_id: 'S1' }, { id: 'EN2', student_id: 'S2' }], evaluations: [{ id: 'EV1', name: 'Algorithmique semestre 1' }], evaluation_candidates: [{ id: 'CA1', enrollment_id: 'EN1', evaluation_id: 'EV1' }, { id: 'CA2', enrollment_id: 'EN2', evaluation_id: 'EV1' }], grades: [{ id: 'GR1', candidate_id: 'CA1', value: 15 }, { id: 'GR2', candidate_id: 'CA2', value: 19 }], jury_decisions: [{ id: 'JD1', enrollment_id: 'EN1', reason: 'DECISION_DU_DOSSIER' }, { id: 'JD2', enrollment_id: 'EN2', reason: 'DECISION_AUTRE_DOSSIER' }], student_documents: [{ id: 'DOC1', student_id: 'S1', status: 'CONFORME' }, { id: 'DOC2', student_id: 'S2', status: 'INTERDIT_AUTRE_DOSSIER' }], generated_documents: [{ id: 'GEN1', student_id: 'S1', reference: 'MON_DOCUMENT' }, { id: 'GEN2', student_id: 'S2', reference: 'AUTRE_DOCUMENT' }] } } }));
      const requests: URL[] = [];
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname === '/api/history' && url.searchParams.get('table') === table) requests.push(url);
      });
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Choisir un dossier étudiant' })).toBeVisible();
      expect(requests).toHaveLength(0);
      await expect(page.getByText('SOURCE_PARENT_MISSING')).toHaveCount(0);
      await page.getByRole('button', { name: 'Consulter le dossier', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Dossier consulté' })).toBeVisible();
      expect(requests).toHaveLength(0);
      await expect(page.getByRole('navigation', { name: 'Origine des données' })).toHaveCount(0);
      if (table === 'notes') {
        await expect(page.getByRole('cell', { name: /Algorithmique semestre 1$/ })).toBeVisible();
        await expect(page.getByRole('cell', { name: /(?:^| )15$/ })).toBeVisible();
        await expect(page.getByRole('cell', { name: /(?:^| )19$/ })).toHaveCount(0);
      }
      if (table === 'releve_notes') {
        await page.getByRole('button', { name: 'Décisions', exact: true }).click();
        await expect(page.getByRole('cell', { name: /DECISION_DU_DOSSIER$/ })).toBeVisible();
        await expect(page.getByText('DECISION_AUTRE_DOSSIER')).toHaveCount(0);
      }
      if (table === 'documents') {
        await expect(page.getByRole('cell', { name: /Conforme$/ })).toBeVisible();
        await expect(page.getByText('INTERDIT_AUTRE_DOSSIER')).toHaveCount(0);
        await page.getByRole('button', { name: 'Documents établis', exact: true }).click();
        await expect(page.getByRole('cell', { name: /MON_DOCUMENT$/ })).toBeVisible();
        await expect(page.getByText('AUTRE_DOCUMENT', { exact: true })).toHaveCount(0);
      }
      await page.getByRole('button', { name: 'Changer de dossier', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Choisir un dossier étudiant' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Télécharger le CSV' })).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

test('Les rubriques du dossier conservent leur contexte métier', async ({ page }) => {
  await authenticateFixture(page);
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  await page.goto('/etudiants/ESCEN-TEST-001');
  const sections = page.getByRole('navigation', { name: 'Sections du dossier étudiant' });
  await sections.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.getByRole('cell', { name: /Algorithmique/ })).toBeVisible();
  await expect(page.locator('.historical-workspace').getByRole('button', { name: /^Pièces/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Versements/ })).toHaveCount(0);
  await sections.getByRole('button', { name: 'Pièces du dossier', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Notes/ })).toHaveCount(1);
  const collections = page.getByRole('combobox', {name:'Consulter',exact:true});
  await expect(page.getByRole('button', { name: /^Frais étudiants/ })).toHaveCount(0);
  // The dossier navigation remains available, but its archive browser cannot switch to grades.
  await expect(collections.locator('option')).toHaveCount(2);
  await expect(collections.locator('option:checked')).toContainText('Pièces des dossiers');
});
