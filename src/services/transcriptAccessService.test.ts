import assert from 'node:assert/strict';
import { authorizedTranscriptDocument } from './transcriptAccessService';
import { ROLE_ACCESS } from '@/permissions/rolePermissions';
import { ROLES } from '@/types/permissions';
import type { PersistentContext, RelationalSnapshot } from '@/types/persistence';

const content = { institution: { name: 'ESCEN' }, student: { name: 'Alice', matricule: 'ETU-1' }, academicYear: '2026-2027', level: 'Master', program: 'Finance', semesters: [{ name: 'Semestre 1', rows: [{ code: 'ECN2101', name: 'Finance', credits: 3, average: 14, validated: true }], totalCredits: 3, earnedCredits: 3 }], totalCredits: 3, earnedCredits: 3, average: 14, mention: 'Bien', city: 'Lomé' };
const snapshot: RelationalSnapshot = { revision: 1, tables: {
  people: [{ id: 'P1' }, { id: 'P2' }], students: [{ id: 'S1', person_id: 'P1' }, { id: 'S2', person_id: 'P2' }],
  academic_years: [{ id: 'Y1' }, { id: 'Y2' }],
  academic_offerings: [{ id: 'O1', academic_year_id: 'Y1' }, { id: 'O2', academic_year_id: 'Y2' }],
  offering_semesters: [{ id: 'OS1', offering_id: 'O1' }, { id: 'OS2', offering_id: 'O2' }],
  enrollments: [{ id: 'E1', student_id: 'S1', offering_id: 'O1' }, { id: 'E2', student_id: 'S2', offering_id: 'O1' }, { id: 'E3', student_id: 'S1', offering_id: 'O2' }],
  juries: [{ id: 'J1', offering_semester_id: 'OS1' }, { id: 'J2', offering_semester_id: 'OS2' }],
  jury_decisions: [{ id: 'D1', enrollment_id: 'E1', jury_id: 'J1', offering_id: 'O1', decision: 'ADMIS' }, { id: 'D2', enrollment_id: 'E2', jury_id: 'J1', offering_id: 'O1', decision: 'ADMIS' }, { id: 'D3', enrollment_id: 'E3', jury_id: 'J2', offering_id: 'O2', decision: 'ADMIS' }],
  generated_documents: [
    { id: 'DOC1', kind: 'RELEVE', student_id: 'S1', enrollment_id: 'E1', decision_id: 'D1', reference: 'REL-1', issued_at: '2026-10-22', content_snapshot: content },
    { id: 'DOC2', kind: 'RELEVE', student_id: 'S2', enrollment_id: 'E2', decision_id: 'D2', reference: 'REL-2', issued_at: '2026-10-23', content_snapshot: { ...content, student: { name: 'Bob', matricule: 'ETU-2' } } },
    { id: 'DOC3', kind: 'RELEVE', student_id: 'S1', enrollment_id: 'E3', decision_id: 'D3', reference: 'REL-3', issued_at: '2027-10-22', content_snapshot: content },
  ],
} };
const personal: PersistentContext = { accountId: 'A', personId: 'P1', authUserId: 'AUTH', roleCode: 'STUD', role: ROLES.STUD, permissions: ROLE_ACCESS[ROLES.STUD].permissions, studentId: 'S1', teacherId: null, grants: [{ role_code: 'STUD', role_name: ROLES.STUD, site_id: null, group_id: null, academic_year_id: null }] };
assert.equal(authorizedTranscriptDocument(snapshot, personal, 'Y1', 'DOC1')?.student.name, 'Alice');
assert.equal(authorizedTranscriptDocument(snapshot, personal, 'Y1', 'DOC2'), null);
assert.equal(authorizedTranscriptDocument(snapshot, personal, 'Y1', 'DOC3'), null);
assert.equal(authorizedTranscriptDocument(snapshot, personal, 'Y2', 'DOC3')?.reference, 'REL-3');
assert.equal(authorizedTranscriptDocument(snapshot, personal, null, 'DOC2'), null);
assert.equal(authorizedTranscriptDocument(snapshot, { ...personal, permissions: [] }, 'Y1', 'DOC1'), null);
const academic: PersistentContext = { ...personal, role: ROLES.DA, roleCode: 'DA', permissions: ROLE_ACCESS[ROLES.DA].permissions, studentId: null, personId: 'DA' };
assert.equal(authorizedTranscriptDocument(snapshot, academic, 'Y1', 'DOC2')?.student.name, 'Bob');
assert.equal(authorizedTranscriptDocument(snapshot, academic, 'Y2', 'DOC2'), null);
