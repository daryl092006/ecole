import assert from 'node:assert/strict';
import { computeSubjectAverage, DEVOIR_WEIGHT, EXAM_WEIGHT } from './gradeCalculationService';

// Test 1 : Pondération officielle 40% Devoir et 60% Examen
assert.equal(DEVOIR_WEIGHT, 0.40);
assert.equal(EXAM_WEIGHT, 0.60);

// Test 2 : Calcul de la moyenne pondérée avec un devoir (14) et un examen (16)
// 14 * 0.40 + 16 * 0.60 = 5.6 + 9.6 = 15.2
const result1 = computeSubjectAverage([
  { kind: 'DEVOIR', value: 14 },
  { kind: 'EXAMEN', value: 16 },
]);
assert.equal(result1.isComplete, true);
assert.equal(result1.devoirAverage, 14);
assert.equal(result1.examFinalNote, 16);
assert.equal(result1.average, 15.2);

// Test 3 : Moyenne de plusieurs devoirs (12 et 16) et un examen (15)
// Moyenne devoirs = 14
// Moyenne examen = 15
// Note finale = 14 * 0.4 + 15 * 0.6 = 5.6 + 9.0 = 14.6
const result2 = computeSubjectAverage([
  { kind: 'DEVOIR', value: 12 },
  { kind: 'DEVOIR', value: 16 },
  { kind: 'EXAMEN', value: 15 },
]);
assert.equal(result2.isComplete, true);
assert.equal(result2.devoirAverage, 14);
assert.equal(result2.examFinalNote, 15);
assert.equal(result2.average, 14.6);

// Test 4 : Rattrapage supérieur remplace la note d'examen
// Devoir = 10, Examen initial = 8, Rattrapage = 13
// Examen retenu = 13
// Note finale = 10 * 0.40 + 13 * 0.60 = 4.0 + 7.8 = 11.8
const result3 = computeSubjectAverage([
  { kind: 'DEVOIR', value: 10 },
  { kind: 'EXAMEN', value: 8 },
  { kind: 'RATTRAPAGE', value: 13 },
]);
assert.equal(result3.isComplete, true);
assert.equal(result3.examFinalNote, 13);
assert.equal(result3.average, 11.8);

// Test 5 : Rattrapage inférieur conserve la note d'examen initiale
const result4 = computeSubjectAverage([
  { kind: 'DEVOIR', value: 10 },
  { kind: 'EXAMEN', value: 12 },
  { kind: 'RATTRAPAGE', value: 9 },
]);
assert.equal(result4.examFinalNote, 12);
assert.equal(result4.average, 11.2);

// Test 6 : Moyenne incomplète quand le devoir ou l'examen manque
const onlyDevoir = computeSubjectAverage([{ kind: 'DEVOIR', value: 14 }]);
assert.equal(onlyDevoir.isComplete, false);
assert.equal(onlyDevoir.average, null);
assert.equal(onlyDevoir.devoirAverage, 14);

const onlyExam = computeSubjectAverage([{ kind: 'EXAMEN', value: 15 }]);
assert.equal(onlyExam.isComplete, false);
assert.equal(onlyExam.average, null);
assert.equal(onlyExam.examFinalNote, 15);
