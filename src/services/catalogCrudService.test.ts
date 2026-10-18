import assert from 'node:assert/strict';
import { catalogSpec, parseCatalogRecord } from './catalogCrudService';

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
console.log('Catalogue : crédits au centième, coefficients au millième, bornes SQL et positions entières vérifiés.');
