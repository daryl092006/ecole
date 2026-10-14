import assert from 'node:assert/strict';
import { filterRelationalSnapshot } from './persistentPermissionsService';
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
  assert.equal(filtered.communications?.length ?? 0,0);
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
console.log('Vérification réussie : lectures persistantes, rôles, groupes, confidentialité et notes publiées.');
