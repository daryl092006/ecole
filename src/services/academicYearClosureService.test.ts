import assert from 'node:assert/strict';
import { academicYearClosureReview } from './academicYearClosureService';
import type { RelationalSnapshot } from '@/types/persistence';

const snapshot: RelationalSnapshot = { revision: 12, tables: {
  academic_offerings: [{ id: 'O1', academic_year_id: 'Y1', archived_at: '2026-01-01' }, { id: 'O2', academic_year_id: 'Y2' }],
  evaluations: [{ id: 'E1', offering_id: 'O1', status: 'BROUILLON' }, { id: 'E2', offering_id: 'O1', status: 'BROUILLON', cancelled_at: '2026-01-01' }, { id: 'E3', offering_id: 'O1', status: 'PUBLIEES' }, { id: 'E4', offering_id: 'O2', status: 'BROUILLON' }],
  evaluation_candidates: [{ id: 'C1', evaluation_id: 'E1' }, { id: 'C2', evaluation_id: 'E4' }],
  complaints: [{ id: 'R1', candidate_id: 'C1', status: 'NOUVELLE' }, { id: 'R2', candidate_id: 'C1', status: 'CLOTUREE' }, { id: 'R3', candidate_id: 'C2', status: 'NOUVELLE' }],
  exam_attempts: [{ id: 'A1', evaluation_id: 'E1', status: 'EN_COURS' }, { id: 'A2', evaluation_id: 'E1', status: 'TERMINEE' }, { id: 'A3', evaluation_id: 'E4', status: 'EN_COURS' }],
} };
const review = academicYearClosureReview(snapshot, 'Y1');
assert.equal(review.revision, 12);
assert.equal(review.ready, false);
assert.deepEqual(review.checks.map(check => check.count), [1, 1, 1]);
snapshot.tables.evaluations[0].status = 'PUBLIEES';
snapshot.tables.complaints[0].status = 'CLOTUREE';
snapshot.tables.exam_attempts[0].status = 'TERMINEE';
assert.equal(academicYearClosureReview(snapshot, 'Y1').ready, true);
assert.equal(academicYearClosureReview(snapshot, 'Y2').ready, false);
