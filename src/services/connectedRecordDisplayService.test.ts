import assert from 'node:assert/strict';
import { connectedRecordValue } from './connectedRecordDisplayService';
import type { RelationalSnapshot } from '@/types/persistence';

const source: RelationalSnapshot = { revision: 1, tables: {
  people: [{ id: 'P1', firstname: 'Alice', lastname: 'Exemple' }], students: [{ id: 'S1', person_id: 'P1' }],
  enrollments: [{ id: 'EN1', student_id: 'S1' }], groups: [{ id: 'EN1', name: 'Ce groupe ne doit pas être confondu avec une inscription' }],
} };
assert.equal(connectedRecordValue('payments', 'enrollment_id', 'EN1', source), 'Alice Exemple');
assert.equal(connectedRecordValue('sessions', 'group_id', 'EN1', source), 'Ce groupe ne doit pas être confondu avec une inscription');
assert.equal(connectedRecordValue('payments', 'enrollment_id', 'ABSENT', source), 'Référence non accessible ou non retrouvée');
assert.match(connectedRecordValue('payments', 'amount', 0, source), /0.*FCFA/);
assert.equal(connectedRecordValue('payments', 'amount', null, source), 'Non renseigné');
assert.equal(connectedRecordValue('evaluations', 'status', 'PUBLIEES', source), 'Publiées');
assert.equal(connectedRecordValue('payments', 'paid_on', '2026-10-01', source), '01/10/2026');
