import assert from 'node:assert/strict';
import {
  evaluationCandidateStatusLabel,
  evaluationGradeIsComplete,
  evaluationGradeNoteLabel,
  evaluationGradeValue,
} from './evaluationGradePolicy';

for (const value of [null, 0, '0']) {
  const grade = { value, absence_status: 'NON_TRAITE' };
  assert.equal(evaluationGradeValue(grade), 0);
  assert.equal(evaluationGradeIsComplete(grade), false);
  assert.equal(evaluationCandidateStatusLabel(grade), 'Copie non traitée');
  assert.equal(evaluationGradeNoteLabel(grade), '0 / 20 (provisoire)');
}
for (const absence_status of ['ABSENT', 'JUSTIFIE']) {
  assert.equal(evaluationGradeValue({ value: null, absence_status }), null);
  assert.equal(evaluationGradeIsComplete({ value: null, absence_status }), true);
  assert.equal(evaluationGradeIsComplete({ value: 0, absence_status }), false);
}
for (const value of [0, 12, 20, '12.5']) {
  assert.equal(evaluationGradeValue({ value }), Number(value));
  assert.equal(evaluationGradeIsComplete({ value }), true);
  assert.equal(evaluationCandidateStatusLabel({ value }), 'Présent · Copie corrigée');
}
for (const value of [null, undefined, '', ' ', 'invalide', NaN, Infinity, -1, 21]) {
  assert.equal(evaluationGradeValue({ value }), null);
  assert.equal(evaluationGradeIsComplete({ value }), false);
}
assert.equal(evaluationCandidateStatusLabel({ value: null, absence_status: null }), 'En attente de correction par l’enseignant');
assert.equal(
  evaluationCandidateStatusLabel({ value: null, absence_status: null }, 'REMISE'),
  'Présent · Copie remise (en attente de correction par l’enseignant)'
);
assert.equal(evaluationGradeNoteLabel({ value: null, absence_status: null }), 'En attente de correction');
assert.equal(evaluationGradeNoteLabel({ value: null, absence_status: null }, 'REMISE'), 'Copie remise · À corriger');
for (const grade of [null, undefined, { value: 12, absence_status: 'NON_TRAITE' }, { value: 12, absence_status: 'INCONNU' }]) {
  assert.equal(evaluationGradeIsComplete(grade), false);
}
const values = [{ value: 12 }, { value: null, absence_status: 'NON_TRAITE' }, { value: null, absence_status: 'JUSTIFIE' }]
  .map(evaluationGradeValue).filter((value): value is number => value !== null);
assert.equal(values.reduce((sum, value) => sum + value, 0) / values.length, 6);
