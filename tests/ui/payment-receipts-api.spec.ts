import { expect, test } from '@playwright/test';
import { adjustmentFixture } from './payment-adjustments-fixture';
import { securityContext, securityIds as id, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';
import { financeId as f } from './payment-allocations-fixture';

for (const [role, roleCode] of [[ROLES.RAF, 'RAF'], [ROLES.DG, 'DG'], [ROLES.DGA, 'DGA'], [ROLES.IT, 'IT']] as const) test(`Reçu consultable pour ${role} dans son année et son dossier`, async () => {
  const fixture = adjustmentFixture(securityContext(role, { roleCode }));
  const original = structuredClone(fixture.snapshot.tables.receipts);
  const response = await fixture.getReceipt(uuid(6000));
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
  const body = await response.json(); expect(Object.keys(body)).toEqual(['receipt']);
  expect(body.receipt).toMatchObject({ reference: 'REC-INITIAL', paymentReference: 'PAY-INITIAL', amount: 400, net: 400, status: 'POSTED', academicYear: 'Année 0' });
  expect(fixture.transactions).toEqual([]); expect(fixture.snapshot.tables.receipts).toEqual(original);
});

test('Reçu annulé : montant original conservé, motif et net nul', async () => {
  const fixture = adjustmentFixture();
  fixture.snapshot.tables.payment_reversals = [{ id: uuid(6100), payment_id: f.payment, reason: 'Double saisie vérifiée' }];
  const { receipt } = await (await fixture.getReceipt(uuid(6000))).json();
  expect(receipt).toMatchObject({ amount: 400, net: 0, status: 'ANNULE', cancellationReason: 'Double saisie vérifiée' });
});

test('Remboursement et paiement en attente sont distingués dans le reçu', async () => {
  const fixture = adjustmentFixture();
  fixture.snapshot.tables.refunds = [{ id: uuid(6100), payment_id: f.payment, amount: 150, reference: 'REF-1', reason: 'Décision vérifiée' }];
  expect((await (await fixture.getReceipt(uuid(6000))).json()).receipt).toMatchObject({ amount: 400, refunded: 150, net: 250 });
  fixture.snapshot.tables.payments[0].status = 'PENDING';
  expect((await (await fixture.getReceipt(uuid(6000))).json()).receipt).toMatchObject({ status: 'PENDING', net: 0 });
});

test('Reçu étranger, autre année et consultation toutes années ne donnent aucun document', async () => {
  const fixture = adjustmentFixture();
  expect((await fixture.getReceipt(uuid(9999))).status).toBe(404);
  expect((await fixture.getReceipt(uuid(6000), id.otherYear)).status).toBe(404);
  expect((await fixture.getReceipt(uuid(6000), 'all')).status).toBe(409);
  fixture.snapshot.tables.payments[0].enrollment_id = uuid(501);
  expect((await fixture.getReceipt(uuid(6000))).status).toBe(404);
});

test('La permission financière et le périmètre de site sont obligatoires', async () => {
  const noPermission = adjustmentFixture(securityContext(ROLES.IT, { permissions: ['student.view'] }));
  expect((await noPermission.getReceipt(uuid(6000))).status).toBe(403);
  const scoped = adjustmentFixture(securityContext(ROLES.RAF, { roleCode: 'RAF', grants: [{ role_code: 'RAF', role_name: ROLES.RAF, academic_year_id: id.year, site_id: id.otherSite, group_id: null }] }));
  expect((await scoped.getReceipt(uuid(6000))).status).toBe(404);
});

test('Identifiant invalide refusé et snapshot privé exclu du document', async () => {
  const fixture = adjustmentFixture();
  expect((await fixture.getReceipt('invalid-id')).status).toBe(400);
  fixture.snapshot.tables.receipts[0].snapshot = { amount: 400, private: 'DO_NOT_EXPOSE' };
  const text = await (await fixture.getReceipt(uuid(6000))).text();
  expect(text).not.toContain('DO_NOT_EXPOSE'); expect(text).not.toContain('snapshot');
});
