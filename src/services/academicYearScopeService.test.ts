import assert from 'node:assert/strict';
import { accessibleAcademicYears, filterSnapshotForAcademicYear } from './academicYearScopeService';
import { projectRelationalCampus } from './relationalCampusAdapter';
import { enrichHistoricalStudent } from './historyStudentService';
import { ROLES } from '@/types/permissions';
import type { PersistentContext, RelationalSnapshot } from '@/types/persistence';
const snapshot: RelationalSnapshot = { revision: 1, tables: {
  academic_years: [{ id: 'Y1', name: '2025-2026', status: 'CLOTUREE', starts_on: '2025-09-01', ends_on: '2026-07-31' }, { id: 'Y2', name: '2026-2027', status: 'OUVERTE', starts_on: '2026-09-01', ends_on: '2027-07-31' }, { id: 'DRAFT', name: 'Préparation', status: 'BROUILLON' }],
  people: [{ id: 'P1', firstname: 'Alice', lastname: 'Test' }], students: [{ id: 'S1', person_id: 'P1', matricule: 'ETU-1' }],
  academic_offerings: [{ id: 'O1', academic_year_id: 'Y1', site_id: 'SITE1' }, { id: 'O2', academic_year_id: 'Y2', site_id: 'SITE2' }],
  enrollments: [{ id: 'E1', offering_id: 'O1', student_id: 'S1', status: 'INSCRIT' }, { id: 'E2', offering_id: 'O2', student_id: 'S1', status: 'REINSCRIT' }],
  groups: [{ id: 'G1', academic_year_id: 'Y1' }, { id: 'G2', academic_year_id: 'Y2' }],
  teaching_assignments: [{ id: 'A1', offering_id: 'O1', teacher_id: 'T1', group_id: 'G1' }, { id: 'A2', offering_id: 'O2', teacher_id: 'T2', group_id: 'G2' }],
  evaluations: [{ id: 'V1', offering_id: 'O1', assignment_id: 'A1' }, { id: 'V2', offering_id: 'O2', assignment_id: 'A2' }],
  evaluation_candidates: [{ id: 'C1', evaluation_id: 'V1', enrollment_id: 'E1' }, { id: 'C2', evaluation_id: 'V2', enrollment_id: 'E2' }],
  grades: [{ id: 'N1', candidate_id: 'C1', value: 10 }, { id: 'N2', candidate_id: 'C2', value: 15 }],
  financial_contracts: [{ id: 'F1', enrollment_id: 'E1' }, { id: 'F2', enrollment_id: 'E2' }],
  payments: [{ id: 'PAYER1', enrollment_id: 'E1', amount: 100 }, { id: 'PAYER2', enrollment_id: 'E2', amount: 200 }],
  contract_versions: [{ id: 'VERSION1', contract_id: 'F1' }, { id: 'VERSION2', contract_id: 'F2' }],
  accounts: [{ id: 'ACCOUNT' }], role_grants: [{ id: 'GRANT', academic_year_id: 'Y1' }],
} };
const selected = filterSnapshotForAcademicYear(snapshot, 'Y1');
for (const [table, expected] of Object.entries({ enrollments: 'E1', groups: 'G1', teaching_assignments: 'A1', evaluations: 'V1', grades: 'N1', payments: 'PAYER1', contract_versions: 'VERSION1' })) assert.deepEqual(selected.tables[table].map(row => row.id), [expected]);
assert.equal(selected.tables.accounts.length, 1); assert.equal(selected.tables.role_grants.length, 1);
assert.equal(snapshot.tables.enrollments.length, 2);
assert.equal(filterSnapshotForAcademicYear(snapshot, null), snapshot);
const projection = projectRelationalCampus(selected);
assert.equal(projection.data.students[0].academicYearId, 'Y1');
assert.equal(projection.data.academicYears.find(year => year.id === 'DRAFT')!.active, false);
assert.equal(projection.data.academicYears.find(year => year.id === 'Y1')!.active, false);
assert.equal(projection.data.academicYears.find(year => year.id === 'Y2')!.active, true);
const context = { role: ROLES.IT, permissions: ['academic.view'], grants: [{ site_id: null, group_id: null, academic_year_id: null }] } as PersistentContext;
const replacementSnapshot = { ...snapshot, tables: { ...snapshot.tables,
  sessions: [{ id: 'REPLACEMENT', offering_id: 'O2', teacher_id: 'T2', replacement_teacher_id: 'REPLACEMENT_TEACHER' }],
} };
assert.deepEqual(accessibleAcademicYears(replacementSnapshot, { ...context, role: ROLES.ENS, teacherId: 'REPLACEMENT_TEACHER' }).map(year => year.id), ['Y2']);
assert.deepEqual(accessibleAcademicYears(replacementSnapshot, { ...context, role: ROLES.ENS, teacherId: 'REPLACEMENT_TEACHER', grants: [{ ...context.grants[0], academic_year_id: 'Y1' }] }), []);
assert.equal(accessibleAcademicYears(snapshot, context).length, 3);
assert.deepEqual(accessibleAcademicYears(snapshot, { ...context, grants: [{ ...context.grants[0], academic_year_id: 'Y1' }] }).map(year => year.id), ['Y1']);
assert.deepEqual(accessibleAcademicYears(snapshot, { ...context, role: ROLES.ENS, teacherId: 'T1' }).map(year => year.id), ['Y1']);
assert.deepEqual(accessibleAcademicYears(snapshot, { ...context, role: ROLES.STUD, studentId: 'S1' }).map(year => year.id), ['Y2', 'Y1']);
const student = projection.data.students[0];
const enriched = enrichHistoricalStudent(student, { totalSourceRows: 1, datasets: [], references: { etudiants: [{ id: 'legacy', sourceId: '1', batchId: 'B', status: 'MAPPED', values: { matricule: 'ETU-1' }, issues: [] }], etudiant_group: [{ id: 'old', sourceId: '2', batchId: 'B', status: 'MAPPED', values: { etudiant_id: '1', statut_scolaire: 'Autre année' }, issues: [] }] } });
assert.equal(enriched.status, student.status);
console.log('Vérification réussie : année ouverte exacte, consultations annuelles isolées, finances liées à leur inscription, historique et périmètres conservés.');

const supervisorSnapshot = {...snapshot,tables:{...snapshot.tables,sessions:[{id:'SESSION',offering_id:'O1'}],exam_deliveries:[{id:'DELIVERY',session_id:'SESSION'}],exam_rooms:[{id:'ROOM',delivery_id:'DELIVERY'}],exam_room_supervisors:[{id:'LINK',exam_room_id:'ROOM',account_id:'SUPERVISOR'}]}};
assert.deepEqual(accessibleAcademicYears(supervisorSnapshot,{...context,role:ROLES.SURV,accountId:'SUPERVISOR'}).map(year=>year.id),['Y1']);

const annualRoots: RelationalSnapshot = { ...snapshot, tables: { ...snapshot.tables,
  communications: [{id:'COM1',academic_year_id:'Y1'},{id:'COM2',academic_year_id:'Y2'},{id:'COM_UNKNOWN',academic_year_id:null}],
  communication_files: [{id:'FILE1',communication_id:'COM1'},{id:'FILE2',communication_id:'COM2'}],
  support_tickets: [{id:'TICKET1',academic_year_id:'Y1'},{id:'TICKET2',academic_year_id:'Y2'}],
  support_messages: [{id:'MESSAGE1',ticket_id:'TICKET1'},{id:'MESSAGE2',ticket_id:'TICKET2'}],
  exam_papers: [{id:'DRAFT1',academic_year_id:'Y1'},{id:'DRAFT2',academic_year_id:'Y2'},{id:'DRAFT_UNKNOWN',evaluation_id:null}],
  student_documents: [{id:'DOC1',academic_year_id:'Y1',student_id:'S1'},{id:'DOC2',academic_year_id:'Y2',student_id:'S1'},{id:'DOC_UNKNOWN',academic_year_id:null,student_id:'S1'},{id:'DOC_LINKED',enrollment_id:'E1'},{id:'CYCLE1',supersedes_id:'CYCLE2'},{id:'CYCLE2',supersedes_id:'CYCLE1'}],
} };
const scopedRoots=filterSnapshotForAcademicYear(annualRoots,'Y1');
for(const [table,expected] of Object.entries({communications:['COM1'],communication_files:['FILE1'],support_tickets:['TICKET1'],support_messages:['MESSAGE1'],exam_papers:['DRAFT1'],student_documents:['DOC1','DOC_LINKED']})) assert.deepEqual(scopedRoots.tables[table].map(row=>row.id),expected);
assert.equal(annualRoots.tables.student_documents.length,6);
assert.equal(accessibleAcademicYears(snapshot,{...context,role:ROLES.MKT,permissions:['communication.view']}).length,3);

assert.deepEqual(filterSnapshotForAcademicYear({...snapshot,tables:{...snapshot.tables,students:[...snapshot.tables.students,{id:'NO_YEAR',person_id:'P1',matricule:'SANS_ANNEE'}]}},'Y1').tables.students.map(row=>row.id),['S1']);

const multiYearAccounts: RelationalSnapshot = { ...snapshot, tables: { ...snapshot.tables,
  people: [{ id: 'P1', firstname: 'Alice', lastname: 'Y1' }, { id: 'P2', firstname: 'Bob', lastname: 'Y2' }, { id: 'P_STAFF', firstname: 'Claire', lastname: 'Staff' }],
  students: [{ id: 'S1', person_id: 'P1', matricule: 'ETU-1' }, { id: 'S2', person_id: 'P2', matricule: 'ETU-2' }],
  enrollments: [{ id: 'E1', offering_id: 'O1', student_id: 'S1', status: 'INSCRIT' }, { id: 'E2', offering_id: 'O2', student_id: 'S2', status: 'INSCRIT' }],
  accounts: [{ id: 'ACC_S1', person_id: 'P1', account_type: 'student', active: true }, { id: 'ACC_S2', person_id: 'P2', account_type: 'student', active: true }, { id: 'ACC_STAFF', person_id: 'P_STAFF', account_type: 'staff', active: true }],
} };
const scopedY2 = filterSnapshotForAcademicYear(multiYearAccounts, 'Y2');
assert.deepEqual(scopedY2.tables.students.map(row => row.id), ['S2']);
assert.deepEqual(scopedY2.tables.accounts.map(row => row.id), ['ACC_S2', 'ACC_STAFF']);
const projectedY2 = projectRelationalCampus(scopedY2);
assert.equal(projectedY2.users.filter(user => user.kind === 'student').length, 1);
assert.equal(projectedY2.users.filter(user => user.kind === 'staff').length, 1);
assert.equal(projectedY2.users.filter(user => (user.kind ?? 'unclassified') === 'unclassified').length, 0);
const projectedAll = projectRelationalCampus({ ...multiYearAccounts, tables: { ...multiYearAccounts.tables, students: [{ id: 'S2', person_id: 'P2', matricule: 'ETU-2' }] } });
assert.equal(projectedAll.users.filter(user => user.kind === 'student').length, 2);
assert.equal(projectedAll.users.filter(user => (user.kind ?? 'unclassified') === 'unclassified').length, 0);
