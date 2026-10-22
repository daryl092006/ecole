import assert from 'node:assert/strict';
import { generateResaoSubjectCode, resaoSubjectChanges, resaoSubjectSchema } from './resaoCodeService';
import type { RelationalSnapshot } from '@/types/persistence';

const semesterId = '00000000-0000-4000-8000-000000000102';
const snapshot: RelationalSnapshot = { revision: 1, tables: {
  cycles: [{ id: 'C', code: 'MASTER', name: 'Master' }], levels: [{ id: 'L', cycle_id: 'C', position: 1 }],
  curricula: [{ id: 'CUR', level_id: 'L', status: 'DRAFT' }],
  curriculum_semesters: [{ id: semesterId, curriculum_id: 'CUR', position: 1 }],
  teaching_units: [{ id: 'U', semester_id: semesterId, code: 'ECN2102', archived_at: '2026-01-01' }],
  subjects: [{ id: 'OLD', academic_year_id: 'YEAR', code: 'ECN 2103' }, { id: 'OTHER', academic_year_id: 'OTHER', code: 'ECN2199' }],
} };
assert.equal(generateResaoSubjectCode(snapshot, 'ecn', semesterId, 'YEAR'), 'ECN2104');
const values = { discipline: 'ECN', semester_id: semesterId, credits: 3.75, coefficient: 0.625 };
const subject = { id: 'SUB', code: 'ECN2104', name: 'Finance digitale', academic_year_id: 'YEAR', reason: 'Création validée' };
const changes = resaoSubjectChanges(snapshot, values, subject);
assert.deepEqual(changes.map(item => item.table), ['subjects', 'teaching_units', 'curriculum_components']);
assert.equal(changes[0].record.code, changes[1].record.code);
assert.equal(changes[1].record.code, changes[2].record.code);
assert.equal(changes[2].record.unit_id, changes[1].record.id);
assert.equal(changes[2].record.subject_id, 'SUB');
assert.equal(changes[2].record.credits, 3.75);
assert.equal(changes[2].record.coefficient, 0.625);
assert.equal(snapshot.tables.subjects.length, 2);
assert.throws(() => resaoSubjectChanges(snapshot, values, { ...subject, code: 'ECN2199' }), /Actualisez/);
assert.throws(() => generateResaoSubjectCode(snapshot, 'XX', semesterId, 'YEAR'), /trois lettres/);
assert.throws(() => resaoSubjectSchema.parse({ ...values, credits: 3.755 }));
assert.throws(() => resaoSubjectSchema.parse({ ...values, coefficient: 0.0001 }));
for (const [cycle, position, expected] of [['Licence', 3, 'ECN1501'], ['Master', 2, 'ECN2301'], ['Doctorat', 1, 'ECN3101']] as const) {
  const copy = structuredClone(snapshot);
  copy.tables.cycles[0] = { id: 'C', code: cycle.toUpperCase(), name: cycle };
  copy.tables.levels[0].position = position;
  assert.equal(generateResaoSubjectCode(copy, 'ECN', semesterId, 'YEAR'), expected);
}
const approved = structuredClone(snapshot); approved.tables.curricula[0].status = 'APPROVED';
assert.throws(() => resaoSubjectChanges(approved, values, subject), /brouillon/);
const exhausted = structuredClone(snapshot); exhausted.tables.subjects.push({ id: 'MAX', academic_year_id: 'YEAR', code: 'ECN2199' });
assert.throws(() => generateResaoSubjectCode(exhausted, 'ECN', semesterId, 'YEAR'), /99 codes/);
const foreignYear = structuredClone(snapshot); foreignYear.tables.academic_offerings = [{ id: 'O', curriculum_id: 'CUR', academic_year_id: 'OTHER' }];
assert.throws(() => resaoSubjectChanges(foreignYear, values, subject), /autre année/);
const malformed = structuredClone(snapshot); malformed.tables.curriculum_semesters[0].position = 7;
assert.throws(() => generateResaoSubjectCode(malformed, 'ECN', semesterId, 'YEAR'), /position du semestre/);
