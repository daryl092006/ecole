import assert from 'node:assert/strict';
import { activePaymentAllocations, paymentAllocationDirectory, planPaymentAllocations } from './paymentAllocationService';
import type { RelationalSnapshot } from '@/types/persistence';

const fixture = (): RelationalSnapshot => ({ revision: 4, tables: {
  financial_contracts: [{ id: 'C', enrollment_id: 'E' }],
  contract_versions: [{ id: 'V', contract_id: 'C', status: 'APPROVED' }],
  contract_lines: [{ id: 'L1', contract_id: 'C', version_id: 'V', amount: 900 }, { id: 'L2', contract_id: 'C', version_id: 'V', amount: 300 }],
  installments: [{ id: 'I2', version_id: 'V', position: 1, due_on: '2026-12-01', amount: 600 }, { id: 'I1', version_id: 'V', position: 2, due_on: '2026-11-01', amount: 600 }],
  payments: [{ id: 'P', enrollment_id: 'E', amount: 400 }],
  payment_allocations: [{ id: 'A1', payment_id: 'P', line_id: 'L1', installment_id: 'I1', amount: 300 }, { id: 'A2', payment_id: 'P', line_id: 'L2', installment_id: 'I1', amount: 100 }],
} });
const command = { paymentId: 'NEW', enrollmentId: 'E', amount: 500, actorId: 'ACTOR' };
const source = fixture(), before = structuredClone(source);
const plan = planPaymentAllocations(source, command);
assert.deepEqual(source, before, 'Planning must never mutate the snapshot.');
assert.equal(plan.allocated, 500); assert.equal(plan.unallocated, 0);
assert.deepEqual(plan.changes.map(row => [row.record.installment_id, row.record.line_id, row.record.amount]), [['I1', 'L1', 150], ['I1', 'L2', 50], ['I2', 'L1', 225], ['I2', 'L2', 75]]);
assert.equal(planPaymentAllocations(source, { ...command, amount: 1000 }).unallocated, 200);
const noContract = fixture(); noContract.tables.contract_versions[0].status = 'DRAFT';
assert.deepEqual(planPaymentAllocations(noContract, command), { changes: [], allocated: 0, unallocated: 500 });
assert.throws(() => planPaymentAllocations(noContract, { ...command, paymentId: 'P', targets: [{ installmentId: 'I1', amount: 100 }], reason: 'Décision contrôlée' }), /Approuvez/);
const realloc = { ...command, paymentId: 'P', targets: [{ installmentId: 'I2', amount: 350 }], reason: 'Nouvelle répartition validée' };
const replaced = planPaymentAllocations(source, realloc);
assert.deepEqual(replaced.changes.slice(0, 2).map(row => row.table), ['allocation_reversals', 'allocation_reversals']);
assert.equal(replaced.allocated, 350); assert.equal(replaced.unallocated, 50);
assert.ok(replaced.changes.slice(2).every(row => row.record.installment_id === 'I2'));
for (const targets of [[{ installmentId: 'OTHER', amount: 100 }], [{ installmentId: 'I2', amount: 401 }], [{ installmentId: 'I2', amount: 0.5 }], [{ installmentId: 'I2', amount: 10 }, { installmentId: 'I2', amount: 20 }], []]) {
  assert.throws(() => planPaymentAllocations(source, { ...realloc, targets }));
}
assert.throws(() => planPaymentAllocations(source, { ...realloc, reason: '' }), /motif/);
const net = fixture(); net.tables.contract_discounts = [{ id: 'D', line_id: 'L1', amount: 50 }]; net.tables.credit_notes = [{ id: 'N', line_id: 'L2', amount: 50 }];
assert.equal(planPaymentAllocations(net, { ...command, amount: 1000 }).allocated, 700);
net.tables.refunds = [{ id: 'F', payment_id: 'P', amount: 100 }];
assert.throws(() => planPaymentAllocations(net, realloc), /remboursements/);
for (const state of ['pending', 'cancelled', 'allocation-reversed']) {
  const inactive = fixture();
  if (state === 'pending') inactive.tables.payments[0].status = 'PENDING';
  if (state === 'cancelled') inactive.tables.payment_reversals = [{ id: 'R', payment_id: 'P' }];
  if (state === 'allocation-reversed') inactive.tables.allocation_reversals = [{ id: 'R', allocation_id: 'A1' }, { id: 'R2', allocation_id: 'A2' }];
  assert.equal(activePaymentAllocations(inactive).length, 0);
  assert.equal(paymentAllocationDirectory(inactive, new Set(['E'])).payments[0].allocated, 0);
  if (state !== 'allocation-reversed') assert.throws(() => planPaymentAllocations(inactive, realloc), /attente ou annulé/);
}
for (const amount of [1, 2, 3, 7, 101, 333, 599, 800]) {
  const result = planPaymentAllocations(source, { ...command, amount });
  assert.equal(result.changes.reduce((sum, row) => sum + Number(row.record.amount), 0), amount);
  assert.ok(result.changes.every(row => Number.isSafeInteger(row.record.amount) && Number(row.record.amount) > 0));
}
const large = fixture(); large.tables.payment_allocations = [];
large.tables.contract_lines = [2147483647, 2147483646].map((amount, index) => ({ id: `L${index}`, version_id: 'V', amount }));
large.tables.installments = [{ id: 'I', version_id: 'V', position: 1, due_on: '2026-11-01', amount: 4294967293 }];
const precise = planPaymentAllocations(large, { ...command, amount: 2147483647 });
assert.deepEqual(precise.changes.map(row => row.record.amount), [1073741824, 1073741823]);
console.log('Affectations : échéance la plus ancienne, prorata entier exact, excédents, réaffectation motivée et plafonds nets contrôlés.');
