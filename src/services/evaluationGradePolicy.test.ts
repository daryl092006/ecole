import assert from 'node:assert/strict';
import { evaluationGradeIsComplete, evaluationGradeValue } from './evaluationGradePolicy';

for (const value of [null, 0, '0']) {
  const grade = { value, absence_status: 'NON_TRAITE' };
  assert.equal(evaluationGradeValue(grade), 0);
  assert.equal(evaluationGradeIsComplete(grade), false);
}
for (const absence_status of ['ABSENT', 'JUSTIFIE']) {
  assert.equal(evaluationGradeValue({ value: null, absence_status }), null);
  assert.equal(evaluationGradeIsComplete({ value: null, absence_status }), true);
  assert.equal(evaluationGradeIsComplete({ value: 0, absence_status }), false);
}
for (const value of [0, 12, 20, '12.5']) {
  assert.equal(evaluationGradeValue({ value }), Number(value));
  assert.equal(evaluationGradeIsComplete({ value }), true);
}
for (const value of [null, undefined, '', ' ', 'invalide', NaN, Infinity, -1, 21]) {
  assert.equal(evaluationGradeValue({ value }), null);
  assert.equal(evaluationGradeIsComplete({ value }), false);
}
for (const grade of [null, undefined, { value: 12, absence_status: 'NON_TRAITE' }, { value: 12, absence_status: 'INCONNU' }]) {
  assert.equal(evaluationGradeIsComplete(grade), false);
}
const values = [{ value: 12 }, { value: null, absence_status: 'NON_TRAITE' }, { value: null, absence_status: 'JUSTIFIE' }]
  .map(evaluationGradeValue).filter((value): value is number => value !== null);
assert.equal(values.reduce((sum, value) => sum + value, 0) / values.length, 6);
