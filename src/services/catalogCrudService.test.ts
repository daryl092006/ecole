import assert from 'node:assert/strict';
import { catalogSpec, parseCatalogRecord, programLevelChanges, annualFeeScheduleChanges } from './catalogCrudService';
import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';

const uuid = '00000000-0000-4000-8000-000000000035';
const samples = [
  { collection: 'curriculum_semesters', values: { curriculum_id: uuid, name: 'Semestre', position: 1, target_credits: 3.75 }, field: 'target_credits', min: 0.01, max: 9999.99, step: 0.01 },
  { collection: 'teaching_units', values: { curriculum_id: uuid, semester_id: uuid, code: 'UE', name: 'Unité', credits: 3.75 }, field: 'credits', min: 0.01, max: 9999.99, step: 0.01 },
  { collection: 'curriculum_components', values: { curriculum_id: uuid, unit_id: uuid, subject_id: uuid, code: 'EC', coefficient: 0.625, credits: 3.75 }, field: 'credits', min: 0, max: 9999.99, step: 0.01 },
  { collection: 'curriculum_components', values: { curriculum_id: uuid, unit_id: uuid, subject_id: uuid, code: 'EC', coefficient: 0.625, credits: 3.75 }, field: 'coefficient', min: 0.001, max: 99999.999, step: 0.001 },
];
for (const { collection, values, field, min, max, step } of samples) {
  const spec = catalogSpec(collection).fields.find(item => item.key === field)!;
  assert.deepEqual({ min: spec.min, max: spec.max, step: spec.step }, { min, max, step });
  for (const value of [min, max, step === 0.001 ? 0.625 : 1.1, step === 0.001 ? 1.001 : 1.01]) {
    assert.equal(parseCatalogRecord(collection, { ...values, [field]: value })[field], value);
  }
  for (const value of [min - step, max + step, step / 2, NaN, Infinity]) {
    assert.throws(() => parseCatalogRecord(collection, { ...values, [field]: value }), `${collection}.${field} doit refuser ${value}`);
  }
}
for (const position of [0, 1.5, 32768]) {
  assert.throws(() => parseCatalogRecord('curriculum_semesters', { ...samples[0].values, position }));
}
assert.equal(parseCatalogRecord('curriculum_semesters', { ...samples[0].values, position: 32767 }).position, 32767);
assert.throws(() => parseCatalogRecord('rooms', { code: 'R', name: 'Salle', capacity: 1.5 }));
const levelsSnapshot: RelationalSnapshot = { revision: 1, tables: {
  levels: [{ id: 'L1', name: 'Licence 1' }, { id: 'L2', name: 'Licence 2' }],
  curricula: [
    { id: 'C1', program_id: 'P', level_id: 'L1', status: 'DRAFT', version: 1 },
    { id: 'C2', program_id: 'P', level_id: 'L2', status: 'DRAFT', version: 1 },
    { id: 'C3', program_id: 'OTHER', level_id: 'L2', status: 'DRAFT', version: 1 },
  ],
} };
const removed = programLevelChanges('P', ['L1'], levelsSnapshot, 'Niveau retiré');
assert.equal(removed.length, 1);
assert.equal(removed[0].record.id, 'C2');
assert.equal(removed[0].operation, 'update');
assert.ok(removed[0].record.archived_at);
assert.equal(removed[0].record.reason, 'Niveau retiré');
assert.equal(programLevelChanges('P', [], levelsSnapshot, 'Retrait des niveaux').length, 2);
assert.deepEqual(programLevelChanges('P', ['L1', 'L2'], levelsSnapshot, 'Inchangé'), []);
for (const table of ['academic_offerings', 'curriculum_semesters', 'curriculum_components']) {
  assert.throws(() => programLevelChanges('P', ['L1'], { ...levelsSnapshot, tables: {
    ...levelsSnapshot.tables, [table]: [{ id: 'LINK', curriculum_id: 'C2' }],
  } }, 'Retrait'), /déjà utilisé|encore rattachés/);
}
assert.throws(() => programLevelChanges('P', ['L1'], { ...levelsSnapshot, tables: {
  ...levelsSnapshot.tables, curricula: levelsSnapshot.tables.curricula.map(row => row.id === 'C2' ? { ...row, status: 'APPROVED' } : row),
} }, 'Retrait'), /approuvé/);
const restored = programLevelChanges('P', ['L1', 'L2'], { ...levelsSnapshot, tables: {
  ...levelsSnapshot.tables, curricula: levelsSnapshot.tables.curricula.map(row => row.id === 'C2' ? { ...row, archived_at: '2026-10-19' } : row),
} }, 'Niveau ajouté de nouveau');
assert.equal(restored.length, 1);
assert.equal(restored[0].operation, 'insert');
assert.equal(restored[0].record.version, 2);
assert.equal(restored[0].record.level_id, 'L2');
console.log('Catalogue : crédits au centième, coefficients au millième, bornes SQL et positions entières vérifiés.');

const feeIds = [1, 2, 3, 4].map(value => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`);
const feeSnapshot: RelationalSnapshot = { revision: 1, tables: {
  academic_years: [{ id: feeIds[0] }], programs: [{ id: feeIds[1] }, { id: feeIds[2] }],
  levels: [{ id: feeIds[3] }], annual_fee_schedules: [],
} };
const feeInput = { academic_year_id: feeIds[0], category: 'SCOLARITE', level_id: feeIds[3], delivery_mode: 'Présentiel', amount: 480000, program_ids: [feeIds[1], feeIds[2]] };
const feeBatch = annualFeeScheduleChanges(feeSnapshot, feeInput, 'Tarif commun à deux filières');
assert.equal(feeBatch.length, 2);
assert.deepEqual(feeBatch.map(change => change.record.program_id), feeIds.slice(1, 3));
assert.equal(new Set(feeBatch.map(change => change.record.id)).size, 2);
assert.ok(feeBatch.every(change => change.operation === 'insert' && change.record.amount === 480000));
assert.equal(annualFeeScheduleChanges(feeSnapshot, { ...feeInput, program_ids: [null] }, 'Tarif général')[0].record.program_id, null);
for (const ids of [[], [null, feeIds[1]], [feeIds[1], feeIds[1]], [uuid], Array(51).fill(feeIds[1])]) {
  assert.throws(() => annualFeeScheduleChanges(feeSnapshot, { ...feeInput, program_ids: ids }, 'Sélection invalide'));
}
assert.throws(() => annualFeeScheduleChanges(feeSnapshot, { ...feeInput, program_id: feeIds[1] }, 'Sélection ambiguë'));
const savedFee = { ...feeBatch[0].record, id: uuid } as DatabaseRow;
const existingFees = { ...feeSnapshot, tables: { ...feeSnapshot.tables, annual_fee_schedules: [savedFee] } };
assert.throws(() => annualFeeScheduleChanges(existingFees, feeInput, 'Doublon'), /existe déjà/);
const editedFees = annualFeeScheduleChanges(existingFees, { ...feeInput, amount: 500000 }, 'Montant corrigé', uuid);
assert.deepEqual(editedFees.map(change => change.operation), ['update', 'insert']);
assert.equal(editedFees[0].record.id, uuid);
assert.equal(existingFees.tables.annual_fee_schedules[0].amount, 480000);
assert.throws(() => annualFeeScheduleChanges(existingFees, { ...feeInput, academic_year_id: feeIds[1] }, 'Autre année', uuid));
assert.throws(() => annualFeeScheduleChanges({ ...feeSnapshot, tables: { ...feeSnapshot.tables, programs: [{ id: feeIds[1] }, { id: feeIds[2], archived_at: '2026-10-27' }] } }, feeInput, 'Filière archivée'));
console.log('Tarifs : sélection multiple bornée, tarif général explicite, doublons, archivage et modification vérifiés.');
