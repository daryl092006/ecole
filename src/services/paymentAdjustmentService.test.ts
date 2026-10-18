import assert from 'node:assert/strict';
import { assertPaymentAdjustment, paymentAdjustmentDirectory, receiptStatus } from './paymentAdjustmentService';
import type { RelationalSnapshot } from '@/types/persistence';

const snapshot: RelationalSnapshot = { revision: 0, tables: {
  financial_contracts: [{ id: 'C', enrollment_id: 'E', reference: 'CON' }],
  contract_versions: [{ id: 'V', contract_id: 'C', status: 'APPROVED' }],
  contract_lines: [{ id: 'L', version_id: 'V', amount: 1000 }],
  payments: [{ id: 'P', enrollment_id: 'E', amount: 500, status: 'POSTED', reference: 'PAY' }, { id: 'OUT', enrollment_id: 'OTHER', amount: 900 }],
  payment_allocations: [{ id: 'A', payment_id: 'P', line_id: 'L', amount: 400 }],
  receipts: [{ id: 'R', payment_id: 'P', reference: 'REC' }],
  refunds: [{ id: 'F', payment_id: 'P', amount: 100, reference: 'REF', reason: 'Motif initial' }],
  contract_discounts: [{ id: 'D', line_id: 'L', amount: 100 }],
  credit_notes: [{ id: 'N', line_id: 'L', amount: 50, reason: 'Avoir initial' }],
} };
const directory = paymentAdjustmentDirectory(snapshot, new Set(['E']));
assert.equal(directory.payments.length, 1);
assert.equal(directory.payments[0].available, 400);
assert.equal(directory.lines[0].available, 450);
assert.deepEqual(assertPaymentAdjustment(snapshot, 'E', { action: 'refund_payment', paymentId: 'P', amount: 400, reference: 'REF-2' }), { action: 'refund', entityId: 'P' });
assert.throws(() => assertPaymentAdjustment(snapshot, 'E', { action: 'refund_payment', paymentId: 'P', amount: 401, reference: 'REF-2' }), /net disponible/);
assert.throws(() => assertPaymentAdjustment(snapshot, 'E', { action: 'cancel_payment', paymentId: 'P' }), /remboursé/);
assert.throws(() => assertPaymentAdjustment(snapshot, 'E', { action: 'refund_payment', paymentId: 'OUT', amount: 1, reference: 'REF-2' }), /inscription/);
assert.deepEqual(assertPaymentAdjustment(snapshot, 'E', { action: 'credit_note', lineId: 'L', amount: 450 }), { action: 'credit', entityId: 'L' });
for (const amount of [451, 0, -1, 0.5]) assert.throws(() => assertPaymentAdjustment(snapshot, 'E', { action: 'credit_note', lineId: 'L', amount }));
const draft = structuredClone(snapshot); draft.tables.contract_versions[0].status = 'DRAFT';
assert.equal(paymentAdjustmentDirectory(draft, new Set(['E'])).lines.length, 0);
assert.throws(() => assertPaymentAdjustment(draft, 'E', { action: 'credit_note', lineId: 'L', amount: 1 }), /approuvé/);
const cancelled = structuredClone(snapshot); cancelled.tables.payment_reversals = [{ id: 'X', payment_id: 'P', reason: 'Annulation motivée' }];
assert.equal(receiptStatus(cancelled, 'P'), 'ANNULE');
assert.equal(paymentAdjustmentDirectory(cancelled, new Set(['E'])).payments[0].receipt?.status, 'ANNULE');
assert.throws(() => assertPaymentAdjustment(cancelled, 'E', { action: 'refund_payment', paymentId: 'P', amount: 1, reference: 'REF-2' }), /annulé/);
assert.equal(receiptStatus(snapshot, 'P'), 'POSTED');
const pending = structuredClone(snapshot); pending.tables.payments[0].status = 'PENDING'; pending.tables.refunds = [];
assert.deepEqual(assertPaymentAdjustment(pending, 'E', { action: 'cancel_payment', paymentId: 'P' }), { action: 'cancel', entityId: 'P' });
assert.throws(() => assertPaymentAdjustment(pending, 'E', { action: 'refund_payment', paymentId: 'P', amount: 1, reference: 'REF-2' }), /attente/);
console.log('Contre-opérations : périmètre, montants nets, remises, avoirs, affectations et reçus annulés contrôlés.');
