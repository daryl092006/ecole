import assert from 'node:assert/strict';
import { filterRelationalSnapshot } from './persistentPermissionsService';
import { filterSnapshotForAcademicYear } from './academicYearScopeService';
import { ROLE_ACCESS } from '@/permissions/rolePermissions';
import { ROLES, type RoleName } from '@/types/permissions';
import type { PersistentContext, RelationalSnapshot } from '@/types/persistence';

const snapshot: RelationalSnapshot = { revision: 5, tables: {
  people: [{ id:'p1',firstname:'Alice',email:'private1@example.test' },{ id:'p2',firstname:'Bob',email:'private2@example.test' },{ id:'pm',firstname:'Marketing' },{ id:'pt',firstname:'Teacher' }],
  students: [{ id:'s1',person_id:'p1' },{ id:'s2',person_id:'p2' }],
  academic_offerings: [{ id:'o1',site_id:'site1',academic_year_id:'y1',curriculum_id:'c1' }],
  enrollments: [{ id:'n1',student_id:'s1',offering_id:'o1' },{ id:'n2',student_id:'s2',offering_id:'o1' }],
  enrollment_groups: [{ id:'ng1',enrollment_id:'n1',group_id:'g1' },{ id:'ng2',enrollment_id:'n2',group_id:'g2' }],
  groups: [{ id:'g1' },{ id:'g2' }],
  group_offerings: [{ id:'go1',group_id:'g1',offering_id:'o1' },{ id:'go2',group_id:'g2',offering_id:'o1' }],
  teaching_assignments: [{ id:'a1',teacher_id:'t1',offering_id:'o1',group_id:'g1' },{ id:'a2',teacher_id:'t2',offering_id:'o1',group_id:'g2' }],
  evaluations: [{ id:'e1',assignment_id:'a1',status:'PUBLIEES' },{ id:'e2',assignment_id:'a1',status:'SAISIES' },{ id:'e3',assignment_id:'a2',status:'PUBLIEES' }],
  evaluation_candidates: [{ id:'ec1',evaluation_id:'e1',enrollment_id:'n1' },{ id:'ec2',evaluation_id:'e2',enrollment_id:'n1' },{ id:'ec3',evaluation_id:'e3',enrollment_id:'n2' }],
  grades: [{ id:'mark1',candidate_id:'ec1',value:12 },{ id:'mark2',candidate_id:'ec2',value:15 },{ id:'mark3',candidate_id:'ec3',value:18 }],
  exam_papers: [{ id:'paper1',evaluation_id:'e1',status:'AUTORISE',reason:'Secret' }],
  exam_questions: [{ id:'q1',paper_id:'paper1',prompt:'Secret',configuration:{ answer:'Secret' } }],
  exam_options: [{ id:'option1',question_id:'q1',is_correct:true,label:'Secret' }],
  financial_contracts: [{ id:'contract1',enrollment_id:'n1' },{ id:'contract2',enrollment_id:'n2' }],
  payments: [{ id:'payment1',enrollment_id:'n1',amount:100 },{ id:'payment2',enrollment_id:'n2',amount:200 }],
  accounts: [{ id:'account1',auth_user_id:'secret-auth' }],
  communications: [{ id:'draft',title:'Draft',published_at:null }],
} };
const context = (role: RoleName, extra: Partial<PersistentContext> = {}): PersistentContext => ({
  accountId:'account1',personId:'pm',authUserId:'auth1',roleCode:'MKT',role,
  permissions:ROLE_ACCESS[role].permissions,studentId:null,teacherId:null,
  grants:[{ role_code:'MKT',role_name:role,site_id:null,academic_year_id:null,group_id:null }],...extra,
});
const student = filterRelationalSnapshot(snapshot,context(ROLES.STUD,{ personId:'p1',studentId:'s1' })).tables;
assert.deepEqual(student.students.map(row => row.id),['s1']);
assert.deepEqual(student.payments.map(row => row.id),['payment1']);
assert.deepEqual(student.grades.map(row => row.id),['mark1']);
assert.deepEqual(student.exam_options,[{ id:'option1' }]);
assert.deepEqual(student.exam_questions,[{ id:'q1' }]);
assert.equal(student.people.some(row => row.id === 'p2'),false);
const teacher = filterRelationalSnapshot(snapshot,context(ROLES.ENS,{ personId:'pt',teacherId:'t1' })).tables;
const attendanceSnapshot: RelationalSnapshot = { ...snapshot, tables: { ...snapshot.tables,
  sessions: [
    { id: 'own-session', offering_id: 'o1', group_id: 'g1', assignment_id: 'a1', teacher_id: 't1' },
    { id: 'colleague-session', offering_id: 'o1', group_id: 'g1', assignment_id: 'a2', teacher_id: 't2' },
  ],
  attendances: [{ id: 'own-presence', session_id: 'own-session', enrollment_id: 'n1' }, { id: 'other-presence', session_id: 'colleague-session', enrollment_id: 'n1' }],
  teacher_attendances: [{ id: 'own-teacher-presence', session_id: 'own-session', teacher_id: 't1' }, { id: 'other-teacher-presence', session_id: 'colleague-session', teacher_id: 't2' }],
  absence_justifications: [{ id: 'own-proof', attendance_id: 'own-presence' }, { id: 'other-proof', attendance_id: 'other-presence' }],
} };
const attendanceTeacher = filterRelationalSnapshot(attendanceSnapshot, context(ROLES.ENS, { personId: 'pt', teacherId: 't1' })).tables;
assert.deepEqual(attendanceTeacher.attendances.map(row => row.id), ['own-presence']);
assert.deepEqual(attendanceTeacher.teacher_attendances.map(row => row.id), ['own-teacher-presence']);
assert.deepEqual(attendanceTeacher.absence_justifications.map(row => row.id), ['own-proof']);
const attendanceSupervisor = filterRelationalSnapshot({ ...attendanceSnapshot, tables: { ...attendanceSnapshot.tables,
  session_supervisors: [{ id: 'supervision', account_id: 'account1', session_id: 'colleague-session' }],
} }, context(ROLES.SURV)).tables;
assert.deepEqual(attendanceSupervisor.attendances.map(row => row.id), ['other-presence']);
assert.deepEqual(attendanceSupervisor.absence_justifications.map(row => row.id), ['other-proof']);
assert.deepEqual(teacher.teaching_assignments.map(row => row.id),['a1']);
assert.deepEqual(teacher.grades.map(row => row.id),['mark1','mark2']);
assert.equal(teacher.people.some(row => row.id === 'p2'),false);
assert.equal(teacher.people.find(row => row.id === 'p1')?.email,undefined);
assert.equal(teacher.payments,undefined);
for (const role of [ROLES.MKT,ROLES.STG,ROLES.ACHATS]) {
  const filtered = filterRelationalSnapshot(snapshot,context(role)).tables;
  assert.deepEqual(filtered.people.map(row => row.id),['pm']);
  assert.equal(filtered.grades,undefined);
  assert.equal(filtered.payments,undefined);
  assert.equal(filtered.communications?.length ?? 0,role === ROLES.MKT ? 1 : 0);
}
const technician = filterRelationalSnapshot(snapshot,context(ROLES.IT)).tables;
assert.equal(technician.grades.length,3);
assert.equal(technician.payments.length,2);
assert.equal(technician.accounts[0].auth_user_id,undefined);
const scoped = filterRelationalSnapshot(snapshot,context(ROLES.LOG,{ grants:[{ role_code:'LOG',role_name:ROLES.LOG,site_id:'site1',academic_year_id:'y1',group_id:'g1' }] })).tables;
assert.deepEqual(scoped.students.map(row => row.id),['s1']);
assert.deepEqual(scoped.groups.map(row => row.id),['g1']);
assert.deepEqual(scoped.teaching_assignments.map(row => row.id),['a1']);
assert.equal(scoped.people.some(row => row.id === 'p2'),false);
const multipleScopes = filterRelationalSnapshot(snapshot,context(ROLES.LOG,{ grants:[
  { role_code:'LOG',role_name:ROLES.LOG,site_id:'site1',academic_year_id:'y1',group_id:'g1' },
  { role_code:'LOG',role_name:ROLES.LOG,site_id:'site2',academic_year_id:'y1',group_id:'g2' },
] })).tables;
assert.deepEqual(multipleScopes.groups.map(row => row.id),['g1']);
assert.deepEqual(multipleScopes.teaching_assignments.map(row => row.id),['a1']);
assert.deepEqual(multipleScopes.students.map(row => row.id),['s1']);
const recoveredSnapshot: RelationalSnapshot = {
  revision: 6,
  tables: {
    ...snapshot.tables,
    evaluations: [...snapshot.tables.evaluations, { id:'e_rec', assignment_id:null, offering_id:'o1', group_id:'g1', status:'PUBLIEES' }],
    evaluation_candidates: [...snapshot.tables.evaluation_candidates, { id:'ec_rec', evaluation_id:'e_rec', enrollment_id:'n1', offering_id:'o1' }],
    grades: [...snapshot.tables.grades, { id:'mark_rec', candidate_id:'ec_rec', value:16 }],
  },
};
assert.ok(filterRelationalSnapshot(recoveredSnapshot,context(ROLES.IT)).tables.grades.some(row => row.id === 'mark_rec'));
assert.ok(filterRelationalSnapshot(recoveredSnapshot,context(ROLES.STUD,{ personId:'p1',studentId:'s1' })).tables.grades.some(row => row.id === 'mark_rec'));
assert.ok(!filterRelationalSnapshot(recoveredSnapshot,context(ROLES.STUD,{ personId:'p2',studentId:'s2' })).tables.grades.some(row => row.id === 'mark_rec'));
assert.ok(!filterRelationalSnapshot(recoveredSnapshot,context(ROLES.ENS,{ personId:'pt',teacherId:'t1' })).tables.grades.some(row => row.id === 'mark_rec'));
console.log('Vérification réussie : lectures persistantes, rôles, groupes, confidentialité et notes publiées.');

const communicationSnapshot: RelationalSnapshot = { revision: 7, tables: {
  ...snapshot.tables,
  roles: [{id:'role-student',code:'STUD',active:true},{id:'role-marketing',code:'MKT',active:true},{id:'role-delegate',code:'DEL',active:true}],
  groups: [{id:'g1',academic_year_id:'y1'},{id:'g2',academic_year_id:'y1'}],
  communications: [
    ...['all','role','group','site','other-group','other-role','no-audience','draft','future','expired','withdrawn','invalid-date','other-year'].map(id => ({
      id,title:id,content:`Contenu ${id}`,author_id:'account1',academic_year_id:id === 'other-year' ? 'y2' : 'y1',
      published_at:id === 'draft' ? null : id === 'future' ? '2999-01-01T00:00:00Z' : id === 'invalid-date' ? 'invalid' : '2000-01-01T00:00:00Z',
      expires_at:id === 'expired' ? '2001-01-01T00:00:00Z' : null,
      withdrawn_at:id === 'withdrawn' ? '2001-01-01T00:00:00Z' : null,
    })),
  ],
  communication_audiences: [
    ...['all','draft','future','expired','withdrawn','invalid-date','other-year'].map(id => ({id:`aud-${id}`,communication_id:id,all_accounts:true})),
    {id:'aud-role',communication_id:'role',role_id:'role-student'},
    {id:'aud-group',communication_id:'group',group_id:'g1'},
    {id:'aud-site',communication_id:'site',site_id:'site1'},
    {id:'aud-other-group',communication_id:'other-group',group_id:'g2'},
    {id:'aud-other-role',communication_id:'other-role',role_id:'role-marketing'},
    {id:'aud-unknown',communication_id:'no-audience',all_accounts:false},
    {id:'aud-hidden-target',communication_id:'group',group_id:'g2'},
  ],
  communication_files: [{id:'file-visible',communication_id:'group',file_id:'private-file'},{id:'file-draft',communication_id:'draft',file_id:'secret-file'}],
  file_objects: [{id:'private-file',storage_path:'private/path'},{id:'secret-file',storage_path:'secret/path'}],
  communication_reads: [{id:'read-own',communication_id:'group',account_id:'account1'},{id:'read-other',communication_id:'group',account_id:'account2'},{id:'read-draft',communication_id:'draft',account_id:'account1'}],
} };
const communicationStudent = context(ROLES.STUD,{personId:'p1',studentId:'s1',roleCode:'STUD'});
const readCommunications = (actor: PersistentContext) => filterRelationalSnapshot(communicationSnapshot,actor);
const personalCommunications = readCommunications(communicationStudent);
assert.deepEqual(personalCommunications.tables.communications.map(row => row.id),['all','role','group','site','other-year']);
assert.deepEqual(personalCommunications.tables.communication_audiences.map(row => row.id),['aud-all','aud-other-year','aud-role','aud-group','aud-site']);
assert.deepEqual(personalCommunications.tables.communication_reads.map(row => row.id),['read-own']);
assert.deepEqual(personalCommunications.tables.communication_files.map(row => row.id),['file-visible']);
assert.deepEqual(personalCommunications.tables.file_objects,[]);
assert.deepEqual(filterSnapshotForAcademicYear(personalCommunications,'y1').tables.communications.map(row => row.id),['all','role','group','site']);
assert.deepEqual(filterSnapshotForAcademicYear(personalCommunications,'y1').tables.communication_files.map(row => row.id),['file-visible']);
for (const role of [ROLES.DG,ROLES.IT,ROLES.MKT]) {
  const managed = readCommunications(context(role));
  assert.equal(managed.tables.communications.length,communicationSnapshot.tables.communications.length);
  assert.equal(managed.tables.communication_audiences.length,communicationSnapshot.tables.communication_audiences.length);
  assert.ok(managed.tables.communication_reads.every(row => row.account_id === 'account1'));
}
for (const role of [ROLES.ENS,ROLES.STG,ROLES.ACHATS]) assert.equal(readCommunications(context(role)).tables.communications,undefined);
assert.equal(readCommunications(context(ROLES.IT,{permissions:[]})).tables.communications,undefined);
const restrictedMarketing = context(ROLES.MKT,{grants:[{role_code:'MKT',role_name:ROLES.MKT,site_id:null,group_id:null,academic_year_id:'y1'}]});
assert.deepEqual(readCommunications(restrictedMarketing).tables.communications.map(row => row.id),['all','group','site','other-group','other-role']);
const delegated = readCommunications(context(ROLES.DEL,{personId:'p1',studentId:'s1',roleCode:'DEL'})).tables.communications;
assert.ok(!delegated.some(row => row.id === 'role')); // No implicit STUD-to-DEL role equivalence.
const orphanStudent = readCommunications(context(ROLES.STUD,{personId:'missing',studentId:'missing',roleCode:'STUD'}));
assert.ok(!orphanStudent.tables.communications.some(row => ['group','site'].includes(row.id)));
const teacherReader = readCommunications(context(ROLES.ENS,{teacherId:'t1',roleCode:'ENS',permissions:['communication.view']}));
assert.ok(teacherReader.tables.communications.some(row => row.id === 'group'));
assert.ok(!teacherReader.tables.communications.some(row => row.id === 'other-group'));
assert.equal(communicationSnapshot.tables.communication_audiences.length,14);
console.log('Communications : administration, audiences exactes, états, année, lectures privées et pièces protégées vérifiés.');

const delegateSnapshot: RelationalSnapshot = { ...attendanceSnapshot, tables: { ...attendanceSnapshot.tables,
  enrollment_groups: [
    { id: 'delegate-member', enrollment_id: 'n1', offering_id: 'o1', group_id: 'g1', valid_from: '2026-01-01' },
    { id: 'classmate-member', enrollment_id: 'n2', offering_id: 'o1', group_id: 'g1', valid_from: '2026-01-01' },
  ],
  sessions: [{ id: 'own-session', offering_id: 'o1', group_id: 'g1', assignment_id: 'a1', teacher_id: 't1', starts_at: '2026-11-01T08:00:00Z' }],
  attendances: [{ id: 'own-presence', session_id: 'own-session', enrollment_id: 'n1' }, { id: 'peer-presence', session_id: 'own-session', enrollment_id: 'n2' }],
  absence_justifications: [{ id: 'own-proof', attendance_id: 'own-presence' }, { id: 'peer-proof', attendance_id: 'peer-presence', reason: 'Santé privée du camarade' }],
  evaluation_candidates: [...snapshot.tables.evaluation_candidates, { id: 'peer-candidate', evaluation_id: 'e1', enrollment_id: 'n2' }],
  grades: [...snapshot.tables.grades, { id: 'peer-mark', candidate_id: 'peer-candidate', value: 19 }],
} };
const delegate = filterRelationalSnapshot(delegateSnapshot, context(ROLES.DEL, { personId: 'p1', studentId: 's1', roleCode: 'DEL' })).tables;
assert.deepEqual(delegate.grades.map(row => row.id), ['mark1']);
assert.deepEqual(delegate.students.map(row => row.id), ['s1']);
assert.deepEqual(delegate.payments.map(row => row.id), ['payment1']);
assert.deepEqual(delegate.absence_justifications.map(row => row.id), ['own-proof']);
assert.equal(JSON.stringify(delegate).includes('Santé privée du camarade'), false);
console.log('Délégué : présences du groupe sans élargir les notes, finances, identités ou justificatifs privés des camarades.');
