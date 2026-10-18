import { expect, test } from '@playwright/test';
import { adjustmentFixture } from './payment-adjustments-fixture';
import { financeId as f } from './payment-allocations-fixture';
import { securityContext, securityIds as id, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';

for (const [role, roleCode] of [[ROLES.DG, 'DG'], [ROLES.IT, 'IT']] as const) test(`Annulation autorisée pour ${role}, paiement et reçu conservés`, async () => {
  const fixture = adjustmentFixture(securityContext(role, { roleCode }), true);
  const before = structuredClone(fixture.snapshot.tables.receipts);
  const response = await fixture.post(fixture.cancel());
  expect(response.status).toBe(201);
  expect(fixture.transactions[0]).toMatchObject({ p_action: 'cancel', p_entity_id: f.payment, p_amount: null, p_reference: null, p_reason: 'Décision financière vérifiée' });
  expect(fixture.snapshot.tables.receipts).toEqual(before);
  expect((await (await fixture.get()).json()).adjustmentDirectory.payments[0].receipt.status).toBe('ANNULE');
});
for (const [role, roleCode] of [[ROLES.RAF, 'RAF'], [ROLES.IT, 'IT']] as const) test(`Remboursement et avoir autorisés pour ${role}, une seule RPC avec auteur serveur`, async () => {
  const fixture = adjustmentFixture(securityContext(role, { roleCode }));
  expect((await fixture.post(fixture.refund())).status).toBe(201);
  expect((await fixture.post(fixture.credit())).status).toBe(201);
  expect(fixture.transactions.map(row => row.p_action)).toEqual(['refund', 'credit']);
  expect(fixture.transactions[0]).toMatchObject({ p_entity_id: f.payment, p_amount: 100, p_reference: 'REF-TEST', p_actor_id: uuid(900) });
});

test('Droits distincts : RAF ne peut annuler, DG ne peut rembourser ni créer un avoir', async () => {
  const finance = adjustmentFixture(securityContext(ROLES.RAF, { roleCode: 'RAF' }));
  expect((await finance.post(finance.cancel())).status).toBe(403);
  const direction = adjustmentFixture(securityContext(ROLES.DG, { roleCode: 'DG' }));
  expect((await direction.post(direction.refund())).status).toBe(403);
  expect((await direction.post(direction.credit())).status).toBe(403);
  expect([...finance.transactions, ...direction.transactions]).toEqual([]);
});

test('Permission manquante ou rôle consultatif : aucune opération financière', async () => {
  for (const context of [securityContext(ROLES.DGA, { roleCode: 'DGA' }), securityContext(ROLES.IT, { permissions: ['student.view', 'finance.view'] }), securityContext(ROLES.IT, { permissions: ['student.view', 'payment.record', 'payment.cancel'] })]) {
    const fixture = adjustmentFixture(context);
    for (const body of [fixture.cancel(), fixture.refund(), fixture.credit()]) expect((await fixture.post(body)).status).toBe(403);
    expect(fixture.transactions).toEqual([]);
  }
});

test('Annulation PENDING autorisée, remboursement PENDING refusé', async () => {
  const fixture = adjustmentFixture(); fixture.snapshot.tables.payments[0].status = 'PENDING';
  expect((await fixture.post(fixture.cancel())).status).toBe(201);
  expect((await fixture.post(fixture.refund())).status).toBe(409);
  expect(fixture.transactions).toHaveLength(1);
});

test('Paiement déjà annulé : annulation et remboursement refusés', async () => {
  const fixture = adjustmentFixture(); fixture.snapshot.tables.payment_reversals = [{ id: uuid(6100), payment_id: f.payment }];
  expect((await fixture.post(fixture.cancel())).status).toBe(409);
  expect((await fixture.post(fixture.refund())).status).toBe(409);
  expect(fixture.transactions).toEqual([]);
});

test('Remboursements précédents déduits, remboursement total possible et annulation interdite', async () => {
  const fixture = adjustmentFixture(); fixture.snapshot.tables.refunds = [{ id: uuid(6100), payment_id: f.payment, amount: 100 }];
  expect((await fixture.post(fixture.refund(301))).status).toBe(409);
  expect((await fixture.post(fixture.cancel())).status).toBe(409);
  expect((await fixture.post(fixture.refund(300))).status).toBe(201);
  expect(fixture.transactions).toHaveLength(1);
});

test('Avoir borné par remises, avoirs et affectations ; contrat approuvé obligatoire', async () => {
  const fixture = adjustmentFixture();
  fixture.snapshot.tables.contract_discounts = [{ id: uuid(6100), line_id: f.line, version_id: f.version, amount: 100 }];
  fixture.snapshot.tables.credit_notes = [{ id: uuid(6101), line_id: f.line, amount: 50 }];
  expect((await fixture.post(fixture.credit(451))).status).toBe(409);
  expect((await fixture.post(fixture.credit(450))).status).toBe(201);
  fixture.snapshot.tables.contract_versions[0].status = 'DRAFT';
  expect((await fixture.post(fixture.credit(1))).status).toBe(409);
  expect(fixture.transactions).toHaveLength(1);
});

test('Paiement, ligne et inscription étrangers : aucune écriture', async () => {
  const fixture = adjustmentFixture();
  for (const body of [{ ...fixture.cancel(), paymentId: uuid(9999) }, { ...fixture.refund(), paymentId: uuid(9999) }, { ...fixture.credit(), lineId: uuid(9999) }, { ...fixture.cancel(), enrollmentId: uuid(501) }]) expect((await fixture.post(body)).status).toBe(409);
  expect(fixture.transactions).toEqual([]);
});

test('Année précise et périmètre exact restent obligatoires', async () => {
  const fixture = adjustmentFixture();
  for (const body of [fixture.cancel(), fixture.refund(), fixture.credit()]) {
    expect((await fixture.post(body, 'all')).status).toBe(409);
    expect((await fixture.post(body, id.otherYear)).status).toBe(409);
  }
  const scoped = adjustmentFixture(securityContext(ROLES.RAF, { roleCode: 'RAF', grants: [{ role_code: 'RAF', role_name: ROLES.RAF, site_id: id.otherSite, academic_year_id: id.year, group_id: null }] }));
  expect((await scoped.post(scoped.refund())).status).toBe(404);
  expect(fixture.transactions.concat(scoped.transactions)).toEqual([]);
});

test('Montants, motif, référence et injection sont validés strictement', async () => {
  const fixture = adjustmentFixture();
  for (const body of [{ ...fixture.cancel(), reason: '' }, { ...fixture.cancel(), reason: 'a' }, { ...fixture.cancel(), reason: 'x'.repeat(1001) }, { ...fixture.cancel(), actorId: uuid(9999) }, { ...fixture.refund(), amount: 0 }, { ...fixture.refund(), amount: 0.5 }, { ...fixture.refund(), reference: '' }, { ...fixture.credit(), amount: -1 }, { ...fixture.credit(), amount: 1.5 }]) expect((await fixture.post(body)).status).toBe(400);
  expect(fixture.transactions).toEqual([]);
});

test('Révision périmée et erreur SQL renvoient un refus sans tentative partielle', async () => {
  for (const action of ['cancel', 'refund', 'credit'] as const) {
    const fixture = adjustmentFixture(); fixture.state.fail = true;
    const response = await fixture.post(fixture[action]());
    expect(response.status).toBe(409); expect((await response.json()).error).toContain('Aucune opération partielle');
    expect(fixture.transactions).toHaveLength(1);
  }
});

test('Consultation seule et année clôturée conservent le statut dérivé du reçu', async () => {
  const fixture = adjustmentFixture(securityContext(ROLES.DGA, { roleCode: 'DGA' }));
  fixture.snapshot.tables.academic_years[0].status = 'CLOTUREE';
  fixture.snapshot.tables.payment_reversals = [{ id: uuid(6100), payment_id: f.payment, reason: 'Annulation motivée' }];
  const response = await fixture.get();
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect((await response.json()).adjustmentDirectory.payments[0].receipt).toMatchObject({ reference: 'REC-INITIAL', status: 'ANNULE' });
});
