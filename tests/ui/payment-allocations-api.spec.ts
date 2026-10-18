import { expect, test } from '@playwright/test';
import { financeId as f, paymentFixture } from './payment-allocations-fixture';
import { securityContext, securityIds as id, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';

for (const role of [ROLES.IT, ROLES.RAF]) test(`Encaissement atomique et prorata sur les échéances les plus anciennes : ${role}`, async () => {
  const context = securityContext(role, { roleCode: role === ROLES.RAF ? 'RAF' : 'IT' });
  const fixture = paymentFixture(context);
  const response = await fixture.post(fixture.payment());
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ revision: 5, allocated: 500, unallocated: 0 });
  expect(fixture.transactions).toHaveLength(1);
  const transaction = fixture.transactions[0];
  expect(transaction.name).toBe('escen_payment_transaction');
  expect(transaction.args.p_action).toBe('record');
  expect(transaction.changes.slice(0, 2).map(row => row.table)).toEqual(['payments', 'receipts']);
  expect(transaction.changes.slice(2).map(row => [row.record.installment_id, row.record.line_id, row.record.amount])).toEqual([[f.first, f.line, 150], [f.first, f.otherLine, 50], [f.second, f.line, 225], [f.second, f.otherLine, 75]]);
});

test('Sans contrat approuvé et en cas de trop-perçu : paiement conservé, reliquat explicite', async () => {
  const draft = paymentFixture(); draft.snapshot.tables.contract_versions[0].status = 'DRAFT';
  const response = await draft.post(draft.payment());
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ allocated: 0, unallocated: 500 });
  expect(draft.transactions[0].changes).toHaveLength(2);
  const excess = paymentFixture();
  expect(await (await excess.post(excess.payment(1000))).json()).toMatchObject({ allocated: 800, unallocated: 200 });
});

test('Réaffectation par contrepassation, motif conservé, paiement et reçu inchangés', async () => {
  const fixture = paymentFixture(securityContext(), true);
  const response = await fixture.post(fixture.reallocate());
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ allocated: 350, unallocated: 50 });
  expect(fixture.transactions[0].changes.map(row => row.table)).toEqual(['allocation_reversals', 'allocation_reversals', 'payment_allocations', 'payment_allocations']);
  expect(fixture.transactions[0].changes[0].record.reason).toBe('Encaissement vérifié');
  const directory = (await (await fixture.get()).json()).allocationDirectory;
  expect(directory.payments[0]).toMatchObject({ allocated: 350, unallocated: 50, amount: 400 });
  expect(directory.installments.map((row: { settled: number }) => row.settled)).toEqual([0, 350]);
});

test('Les montants remboursés et les avoirs bornent les nouvelles affectations', async () => {
  const fixture = paymentFixture();
  fixture.snapshot.tables.refunds = [{ id: uuid(3100), payment_id: f.payment, amount: 100 }];
  expect((await fixture.post(fixture.reallocate())).status).toBe(409);
  fixture.snapshot.tables.credit_notes = [{ id: uuid(3101), line_id: f.line, amount: 100 }];
  const response = await fixture.post(fixture.payment(1000));
  expect(await response.json()).toMatchObject({ allocated: 700, unallocated: 300 });
});

test('Paiement en attente, annulé, extérieur ou contrat brouillon : aucune réaffectation', async () => {
  for (const state of ['pending', 'cancelled', 'foreign', 'draft']) {
    const fixture = paymentFixture();
    if (state === 'pending') fixture.snapshot.tables.payments[0].status = 'PENDING';
    if (state === 'cancelled') fixture.snapshot.tables.payment_reversals = [{ id: uuid(3100), payment_id: f.payment }];
    if (state === 'foreign') fixture.snapshot.tables.payments[0].enrollment_id = uuid(501);
    if (state === 'draft') fixture.snapshot.tables.contract_versions[0].status = 'DRAFT';
    expect((await fixture.post(fixture.reallocate())).status).toBe(409);
    expect(fixture.transactions).toHaveLength(0);
  }
});

test('Montants, doublons, échéance étrangère et injection sont refusés', async () => {
  const fixture = paymentFixture();
  for (const targets of [[{ installmentId: f.second, amount: 0 }], [{ installmentId: f.second, amount: 1.5 }], [], [{ installmentId: uuid(9999), amount: 1 }], [{ installmentId: f.second, amount: 401 }], [{ installmentId: f.second, amount: 1 }, { installmentId: f.second, amount: 1 }]]) {
    expect([400, 409]).toContain((await fixture.post({ ...fixture.reallocate(), targets })).status);
  }
  for (const body of [{ ...fixture.reallocate(), actorId: uuid(9999) }, { ...fixture.reallocate(), reason: '' }, { ...fixture.payment(), amount: 0 }, { ...fixture.payment(), amount: 0.5 }]) expect((await fixture.post(body)).status).toBe(400);
  expect(fixture.transactions).toHaveLength(0);
});

test('Permission manquante et rôle de consultation ne permettent aucun encaissement', async () => {
  for (const context of [securityContext(ROLES.DG), securityContext(ROLES.IT, { permissions: ['student.view', 'finance.view'] }), securityContext(ROLES.IT, { permissions: ['student.view', 'payment.record'] })]) {
    const fixture = paymentFixture(context);
    expect((await fixture.post(fixture.payment())).status).toBe(403);
    expect((await fixture.post(fixture.reallocate())).status).toBe(403);
    expect(fixture.transactions).toHaveLength(0);
  }
});

test('Année précise et inscription du dossier obligatoires', async () => {
  const fixture = paymentFixture();
  expect((await fixture.post(fixture.payment(), 'all')).status).toBe(409);
  expect((await fixture.post(fixture.payment(), id.otherYear)).status).toBe(409);
  expect((await fixture.post({ ...fixture.reallocate(), enrollmentId: uuid(501) })).status).toBe(409);
  expect(fixture.transactions).toHaveLength(0);
});

test('Le périmètre de site ou de groupe reste obligatoire pour RAF', async () => {
  for (const grant of [{ site_id: id.otherSite, group_id: null }, { site_id: id.site, group_id: id.otherGroup }]) {
    const fixture = paymentFixture(securityContext(ROLES.RAF, { roleCode: 'RAF', grants: [{ role_code: 'RAF', role_name: ROLES.RAF, academic_year_id: id.year, ...grant }] }));
    expect((await fixture.post(fixture.payment())).status).toBe(404);
    expect((await fixture.post(fixture.reallocate())).status).toBe(404);
    expect(fixture.transactions).toHaveLength(0);
  }
});

test('Canal annuel incorrect refusé, ancien exercice clôturé payable', async () => {
  const fixture = paymentFixture();
  expect((await fixture.post({ ...fixture.payment(), provider: 'Caisse étrangère' })).status).toBe(409);
  fixture.snapshot.tables.academic_years[0].status = 'CLOTUREE';
  expect((await fixture.post({ ...fixture.payment(), provider: 'Caisse ancienne' })).status).toBe(201);
});

test('Révision périmée ou échec SQL : erreur explicite sans requête de secours', async () => {
  for (const stale of [true, false]) {
    const fixture = paymentFixture(); fixture.state.fail = !stale;
    const response = await fixture.post({ ...fixture.payment(), ...(stale ? { revision: 0 } : {}) });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('Aucune opération partielle');
    expect(fixture.transactions).toHaveLength(1);
  }
});

test('Plus de 100 affectations transmises à une unique transaction financière', async () => {
  const fixture = paymentFixture();
  fixture.snapshot.tables.payment_allocations = [];
  fixture.snapshot.tables.installments = Array.from({ length: 120 }, (_, index) => ({ id: uuid(4000 + index), version_id: f.version, position: index + 1, due_on: '2026-10-01', amount: 10, description: `Échéance ${index}` }));
  const response = await fixture.post(fixture.payment(1100));
  expect(response.status).toBe(201);
  expect(fixture.transactions).toHaveLength(1);
  expect(fixture.transactions[0].changes.length).toBeGreaterThan(100);
  expect(await response.json()).toMatchObject({ allocated: 1100, unallocated: 0 });
});
