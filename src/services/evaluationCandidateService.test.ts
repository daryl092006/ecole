import assert from 'node:assert/strict';
import { isEvaluationEnrollmentStatus } from './evaluationCandidateService';

for (const status of ['INSCRIT', 'REINSCRIT']) assert.equal(isEvaluationEnrollmentStatus(status), true);
for (const status of ['SUSPENDU', 'ABANDON', 'DIPLOME', '', null, undefined]) {
  assert.equal(isEvaluationEnrollmentStatus(status), false);
}
