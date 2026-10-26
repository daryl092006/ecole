import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { paymentFixture } from './payment-allocations-fixture';
import { securityContext, securityIds as id } from './security-fixture';

async function mount(page: Page, fixture = paymentFixture(securityContext(), true)) {
  await authenticateFixture(page);
  await page.route('**/api/campus', route => route.fulfill({ json: { ...fixture.snapshot, tables: { ...snapshot.tables, ...fixture.snapshot.tables, people: snapshot.tables.people, students: fixture.snapshot.tables.students.map(student => ({ ...student, matricule: 'ESCEN-TEST-001', person_id: 'P1' })) }, academicContext: { currentYearId: id.year, currentYearConfigured: true, selectedYearId: id.year, selection: 'current', years: fixture.snapshot.tables.academic_years } } }));
  await page.route('**/api/students/*/operations', async route => {
    const response = route.request().method() === 'POST' ? await fixture.post(route.request().postDataJSON()) : await fixture.get();
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  await page.goto('/etudiants/ESCEN-TEST-001');
  await page.getByRole('button', { name: 'Frais et versements', exact: true }).click();
  return fixture;
}
async function fillPayment(page: Page, amount: string) {
  await page.getByRole('button', { name: 'Enregistrer un paiement', exact: true }).click();
  await page.getByLabel('Montant FCFA', { exact: true }).fill(amount);
  await page.getByLabel('Payeur', { exact: true }).fill('Parent de recette');
  await page.getByLabel('Référence du versement').fill(`PAY-UI-${amount}`);
  await page.getByLabel('Organisme ou caisse').fill('Caisse ESCEN');
  await page.getByLabel('Date du paiement').fill('2026-10-18');
  await page.getByLabel('Motif', { exact: true }).fill('Encaissement contrôlé');
}

for (const width of [390, 1440]) {
  test(`Réaffectation relue, historique et actualisation à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const fixture = await mount(page);
    await page.getByText('Affectations aux échéances', { exact: true }).click();
    await page.getByRole('button', { name: 'Réaffecter PAY-INITIAL', exact: true }).click();
    await page.getByLabel('Affectation Première échéance', { exact: true }).fill('0');
    await page.getByLabel('Affectation Deuxième échéance', { exact: true }).fill('350');
    await page.getByLabel('Motif de réaffectation').fill('Répartition vérifiée avec le payeur');
    await page.getByRole('button', { name: 'Vérifier la réaffectation', exact: true }).click();
    expect(fixture.transactions).toHaveLength(0);
    const review = page.getByRole('region', { name: 'Vérification avant enregistrement' });
    await expect(review.getByText('Avant : 400 FCFA')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmer la réaffectation', exact: true }).click();
    await expect(page.getByText('Réaffectation enregistrée. Montant restant à affecter : 50 FCFA.', { exact: true })).toBeVisible();
    expect(fixture.transactions).toHaveLength(1);
    expect(fixture.transactions[0].args.p_action).toBe('reallocate');
  });
  test(`Encaissement et excédent explicite à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const fixture = await mount(page);
    await fillPayment(page, '1000');
    await page.getByRole('button', { name: 'Vérifier l’opération', exact: true }).click();
    expect(fixture.transactions).toHaveLength(0);
    await expect(page.getByText(/Tout excédent ou montant sans contrat approuvé restera à affecter/)).toBeVisible();
    await page.getByRole('button', { name: 'Confirmer le paiement', exact: true }).click();
    await expect(page.getByText('Paiement et reçu enregistrés.', { exact: true })).toBeVisible();
    await page.getByText('Affectations aux échéances', { exact: true }).click();
    await expect(page.getByText(/PAY-UI-1000.*Affecté : 800 FCFA.*Reste à affecter : 200 FCFA/)).toBeVisible();
    expect(fixture.transactions).toHaveLength(1);
  });
}

test('Contrat brouillon : versement conservé et réaffectation indisponible', async ({ page }) => {
  const fixture = paymentFixture(securityContext(), true);
  fixture.snapshot.tables.contract_versions[0].status = 'DRAFT';
  fixture.snapshot.tables.payment_allocations = [];
  await mount(page, fixture);
  await fillPayment(page, '500');
  await page.getByRole('button', { name: 'Vérifier l’opération', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer le paiement', exact: true }).click();
  await expect(page.getByText('Paiement et reçu enregistrés.', { exact: true })).toBeVisible();
  await page.getByText('Affectations aux échéances', { exact: true }).click();
  await expect(page.getByText(/PAY-UI-500.*Affecté : 0 FCFA.*Reste à affecter : 500 FCFA/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Réaffecter / })).toHaveCount(0);
});

test('Une erreur de réaffectation reste dans le récapitulatif et conserve les valeurs', async ({ page }) => {
  const fixture = await mount(page);
  fixture.state.fail = true;
  await page.getByText('Affectations aux échéances', { exact: true }).click();
  await page.getByRole('button', { name: 'Réaffecter PAY-INITIAL', exact: true }).click();
  await page.getByLabel('Affectation Première échéance', { exact: true }).fill('0');
  await page.getByLabel('Affectation Deuxième échéance', { exact: true }).fill('350');
  await page.getByLabel('Motif de réaffectation').fill('Répartition vérifiée');
  await page.getByRole('button', { name: 'Vérifier la réaffectation', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer la réaffectation', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Vérification avant enregistrement' }).getByRole('alert')).toContainText('Aucune opération partielle');
  expect(fixture.transactions).toHaveLength(1);
  await page.getByRole('button', { name: 'Revenir aux informations', exact: true }).click();
  await expect(page.getByLabel('Affectation Deuxième échéance', { exact: true })).toHaveValue('350');
});
