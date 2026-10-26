import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture, fixtureCapabilities, snapshot } from './persistent-fixture';
import { adjustmentFixture } from './payment-adjustments-fixture';
import { securityContext, securityIds as id, uuid } from './security-fixture';
import { ROLES, type RoleName } from '../../src/types/permissions';

async function mount(page: Page, role: RoleName = ROLES.IT, fixture = adjustmentFixture(securityContext(role, { roleCode: role === ROLES.DG ? 'DG' : role === ROLES.RAF ? 'RAF' : role === ROLES.DGA ? 'DGA' : 'IT' }), true)) {
  await authenticateFixture(page);
  await page.route('**/api/session', route => route.fulfill({ json: { capabilities: fixtureCapabilities, accountId: uuid(900), name: 'Gestion financière', email: 'finance@example.test', role, availableRoles: [role], studentId: null, teacherId: null, mustChangePassword: false } }));
  let campusReads = 0;
  await page.route('**/api/campus', route => {
    campusReads++;
    return route.fulfill({ json: { ...fixture.snapshot, tables: { ...snapshot.tables, ...fixture.snapshot.tables, people: snapshot.tables.people, students: fixture.snapshot.tables.students.map(student => ({ ...student, matricule: 'ESCEN-TEST-001', person_id: 'P1' })) }, academicContext: { currentYearId: id.year, currentYearConfigured: true, selectedYearId: id.year, selection: 'current', years: fixture.snapshot.tables.academic_years } } });
  });
  await page.route('**/api/students/*/operations', async route => {
    const response = route.request().method() === 'POST' ? await fixture.post(route.request().postDataJSON()) : await fixture.get();
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  await page.goto('/etudiants/ESCEN-TEST-001');
  await page.getByRole('button', { name: 'Frais et versements', exact: true }).click();
  await page.getByText('Annulations, remboursements et avoirs', { exact: true }).click();
  return { ...fixture, campusReads: () => campusReads };
}

for (const width of [390, 1440]) test(`Annulation relue par DG, reçu annulé et actualisation à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const fixture = await mount(page, ROLES.DG); const before = fixture.campusReads();
  await page.getByRole('button', { name: 'Annuler PAY-INITIAL', exact: true }).click();
  await page.getByLabel('Motif de l’opération').fill('Double saisie confirmée par la direction');
  await page.getByRole('button', { name: 'Vérifier l’opération financière', exact: true }).click();
  expect(fixture.transactions).toHaveLength(0);
  const review = page.getByRole('region', { name: 'Vérification avant enregistrement' });
  await expect(review.getByText('Avant : Enregistré')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmer l’annulation', exact: true }).click();
  await expect(page.getByText('Paiement annulé. Le reçu est marqué annulé.', { exact: true })).toBeVisible();
  await page.getByText('Annulations, remboursements et avoirs', { exact: true }).click();
  await expect(page.getByText('Reçu REC-INITIAL · Annulé', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annuler PAY-INITIAL', exact: true })).toHaveCount(0);
  expect(fixture.transactions).toHaveLength(1);
  await expect.poll(fixture.campusReads).toBeGreaterThan(before);
});

for (const width of [390, 1440]) test(`Remboursement et avoir relus par RAF à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const fixture = adjustmentFixture(securityContext(ROLES.RAF, { roleCode: 'RAF' }), true);
  fixture.snapshot.tables.payment_allocations = []; // Refund consumes unallocated cash in this UI fixture.
  await mount(page, ROLES.RAF, fixture);
  await expect(page.getByRole('button', { name: 'Annuler PAY-INITIAL', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Rembourser PAY-INITIAL', exact: true }).click();
  await page.getByLabel('Montant FCFA', { exact: true }).fill('100');
  await page.getByLabel('Référence du remboursement').fill('REF-UI');
  await page.getByLabel('Motif de l’opération').fill('Remboursement vérifié avec le payeur');
  await page.getByRole('button', { name: 'Vérifier l’opération financière', exact: true }).click();
  expect(fixture.transactions).toHaveLength(0);
  await page.getByRole('button', { name: 'Confirmer le remboursement', exact: true }).click();
  await expect(page.getByText('Remboursement enregistré et affectations ajustées.', { exact: true })).toBeVisible();
  await page.getByText('Annulations, remboursements et avoirs', { exact: true }).click();
  await expect(page.getByText(/Remboursement REF-UI · 100 FCFA/)).toBeVisible();
  await page.getByRole('button', { name: 'Créer un avoir · Frais 1', exact: true }).click();
  await page.getByLabel('Montant FCFA', { exact: true }).fill('200');
  await page.getByLabel('Motif de l’opération').fill('Réduction contractuelle vérifiée');
  await page.getByRole('button', { name: 'Vérifier l’opération financière', exact: true }).click();
  expect(fixture.transactions).toHaveLength(1);
  await page.getByRole('button', { name: 'Confirmer l’avoir', exact: true }).click();
  await expect(page.getByText('Avoir enregistré.', { exact: true })).toBeVisible();
  expect(fixture.transactions.map(row => row.p_action)).toEqual(['refund', 'credit']);
});

test('Lecture seule : historique disponible, aucune action financière', async ({ page }) => {
  await mount(page, ROLES.DGA);
  await expect(page.getByText('Reçu REC-INITIAL · Valide', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^(Annuler PAY|Rembourser PAY|Créer un avoir)/ })).toHaveCount(0);
});

test('Échec SQL : récapitulatif conservé et valeurs récupérables sans deuxième écriture', async ({ page }) => {
  const fixture = await mount(page); fixture.state.fail = true;
  await page.getByRole('button', { name: 'Rembourser PAY-INITIAL', exact: true }).click();
  await page.getByLabel('Montant FCFA', { exact: true }).fill('100');
  await page.getByLabel('Référence du remboursement').fill('REF-ERREUR');
  await page.getByLabel('Motif de l’opération').fill('Remboursement vérifié');
  await page.getByRole('button', { name: 'Vérifier l’opération financière', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer le remboursement', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Vérification avant enregistrement' }).getByRole('alert')).toContainText('Aucune opération partielle');
  expect(fixture.transactions).toHaveLength(1);
  await page.getByRole('button', { name: 'Revenir aux informations', exact: true }).click();
  await expect(page.getByLabel('Montant FCFA', { exact: true })).toHaveValue('100');
  await expect(page.getByLabel('Référence du remboursement')).toHaveValue('REF-ERREUR');
});

test('La liste connectée et le détail du reçu affichent Annulé sans modifier son snapshot', async ({ page }) => {
  const fixture = await mount(page);
  fixture.snapshot.tables.payment_reversals = [{ id: uuid(6100), payment_id: fixture.snapshot.tables.payments[0].id, reason: 'Annulation vérifiée' }];
  await page.goto('/finance/versements');
  await page.getByRole('navigation', { name: 'Données disponibles' }).getByRole('button', { name: /Reçus/ }).click();
  const row = page.getByRole('row').filter({ hasText: 'REC-INITIAL' });
  await expect(row.getByRole('cell', { name: /Annulé$/ })).toBeVisible();
  await row.getByRole('button', { name: 'Ouvrir le détail' }).click();
  await expect(page.getByRole('dialog').getByText('Annulé', { exact: true })).toBeVisible();
  expect(fixture.snapshot.tables.receipts[0].snapshot).toEqual({ amount: 400 });
});
