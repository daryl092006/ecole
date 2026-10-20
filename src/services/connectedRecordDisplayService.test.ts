import assert from 'node:assert/strict';
import { connectedRecordName, connectedRecordValue } from './connectedRecordDisplayService';
import { catalogLabel, programLevelChanges } from './catalogCrudService';
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
assert.equal(connectedRecordValue('grades', 'value', null, source), 'En attente de correction ou absence');
assert.equal(connectedRecordValue('grades', 'absence_status', null, source), 'Présent / En attente de correction');
assert.equal(connectedRecordValue('evaluations', 'status', 'PUBLIEES', source), 'Publiées');
assert.equal(connectedRecordValue('payments', 'paid_on', '2026-10-01', source), '01/10/2026');

const curriculum = { id: 'C1', program_id: 'F1', level_id: 'L1', version: 1 };
const fullCatalog: RelationalSnapshot = { revision: 1, tables: {
  programs: [{ id: 'F1', name: 'Informatique' }], levels: [{ id: 'L1', name: 'Licence 1' }],
  curricula: [curriculum],
} };
const curriculumName = connectedRecordName('curricula', curriculum, fullCatalog);
assert.equal(curriculumName, 'Informatique · Licence 1');
// Les listes de références ne reçoivent pas toutes les dépendances du catalogue.
const projectedCatalog: RelationalSnapshot = { revision: 1, tables: {
  curricula: [{ ...curriculum, name: curriculumName }],
} };
for (const table of ['curriculum_semesters', 'teaching_units', 'curriculum_components', 'academic_offerings']) {
  assert.equal(connectedRecordValue(table, 'curriculum_id', 'C1', projectedCatalog), curriculumName);
}
assert.equal(catalogLabel('curricula', projectedCatalog.tables.curricula[0], projectedCatalog), curriculumName);
assert.equal(connectedRecordName('curricula', { ...curriculum, version: undefined }, fullCatalog), 'Informatique · Licence 1');
const offeringName = `${curriculumName} · 2026-2027`;
assert.equal(connectedRecordName('academic_offerings', { id: 'O1', name: offeringName }, projectedCatalog), offeringName);
const levelChanges = programLevelChanges('F1', ['L1', 'L2', 'L3'], fullCatalog, 'Niveaux proposés');
assert.equal(levelChanges.length, 2);
assert.deepEqual(levelChanges.map(change => change.record.level_id), ['L2', 'L3']);
assert.ok(levelChanges.every(change => change.table === 'curricula' && change.operation === 'insert' && change.record.program_id === 'F1' && change.record.reason === 'Niveaux proposés'));
assert.equal(fullCatalog.tables.curricula.length, 1);
