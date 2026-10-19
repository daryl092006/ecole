import assert from 'node:assert/strict';
import { netContractAmount, netPaymentTotal } from './financialProjectionService';
import type { RelationalSnapshot } from '@/types/persistence';

const snapshot: RelationalSnapshot = { revision: 1, tables: {
  payments: [
    { id: 'PAID', enrollment_id: 'E1', status: 'POSTED', amount: 900 },
    { id: 'LEGACY', enrollment_id: 'E1', status: 'CONFIRMED', amount: 100 },
    { id: 'PENDING', enrollment_id: 'E1', status: 'PENDING', amount: 500 },
    { id: 'CANCELLED', enrollment_id: 'E1', status: 'POSTED', amount: 700 },
    { id: 'OTHER', enrollment_id: 'E2', status: 'POSTED', amount: 400 },
  ],
  payment_reversals: [{ id: 'REV', payment_id: 'CANCELLED' }],
  refunds: [
    { id: 'REF1', payment_id: 'PAID', amount: 150 }, { id: 'REF2', payment_id: 'PAID', amount: 50 },
    { id: 'REF3', payment_id: 'PENDING', amount: 100 }, { id: 'REF4', payment_id: 'CANCELLED', amount: 200 },
    { id: 'REF5', payment_id: 'OTHER', amount: 100 },
  ],
  contract_lines: [{ id: 'L1', version_id: 'V1', amount: 900 }, { id: 'L2', version_id: 'V1', amount: 300 }, { id: 'L3', version_id: 'V2', amount: 600 }],
  contract_discounts: [{ id: 'D1', version_id: 'V1', amount: 100 }, { id: 'D2', version_id: 'V2', amount: 50 }],
  credit_notes: [{ id: 'C1', line_id: 'L1', amount: 80 }, { id: 'C2', line_id: 'L1', amount: 20 }, { id: 'C3', line_id: 'L3', amount: 60 }],
} };
const before = structuredClone(snapshot);
assert.equal(netPaymentTotal(snapshot, new Set(['E1'])), 800);
assert.equal(netPaymentTotal(snapshot, new Set(['E2'])), 300);
assert.equal(netPaymentTotal(snapshot), 1100, 'Fallback totals must subtract each effective payment refund exactly once.');
assert.equal(netPaymentTotal(snapshot, new Set()), 0);
assert.equal(netContractAmount(snapshot, 'V1'), 1000);
assert.equal(netContractAmount(snapshot, 'V2'), 490);
assert.equal(netContractAmount(snapshot, 'MISSING'), 0);
assert.equal(netPaymentTotal({ revision: 0, tables: {} }), 0);
assert.deepEqual(snapshot, before, 'Projections must preserve immutable financial history.');
console.log('Projections financières : remboursements et avoirs nets, périmètre isolé et règle unique des paiements effectifs.');
