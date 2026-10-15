import assert from 'node:assert/strict';
import { projectRelationalCampus } from './relationalCampusAdapter';
import { filterRelationalSnapshot } from './persistentPermissionsService';
import { ROLE_ACCESS } from '@/permissions/rolePermissions';
import { ROLES } from '@/types/permissions';
import { emptyDataset } from '@/types/application';
import { deriveEnrollments } from './campusWorkflowService';
import { getFinancialReport } from './financialReportService';
import { queryDemoUsers, changeDemoUserRole } from './userService';
import type { RelationalSnapshot } from '@/types/persistence';

const snapshot: RelationalSnapshot = { revision: 7, tables: {
  people: [{ id: 'P1', firstname: 'Alice', lastname: 'Étudiante', email: 'alice@example.test', phone: '123' }, { id: 'P2', firstname: 'Jean', lastname: 'Technique', email: 'it@example.test' }, { id: 'P3', firstname: 'Sans', lastname: 'Rôle' }],
  students: [{ id: 'S1', person_id: 'P1', matricule: 'ESCEN-001' }],
  accounts: [{ id: 'A1', person_id: 'P1', active: false, auth_user_id: 'auth-secret' }, { id: 'A2', person_id: 'P2', active: true }, { id: 'A3', person_id: 'P3', active: false }],
  roles: [{ id: 'R1', code: 'STUD', active: true }, { id: 'R2', code: 'IT', active: true }, { id: 'R3', code: 'MKT', active: true }],
  role_grants: [
    { id: 'G1', account_id: 'A1', role_id: 'R1', valid_from: '2020-01-01T00:00:00Z', valid_until: null },
    { id: 'G2', account_id: 'A2', role_id: 'R2', valid_from: '2020-01-01T00:00:00Z', valid_until: null },
    { id: 'G3', account_id: 'A2', role_id: 'R3', valid_from: '2020-01-01T00:00:00Z', valid_until: '2026-10-14T13:00:00Z' },
    { id: 'G4', account_id: 'A3', role_id: 'R2', valid_from: '2020-01-01T00:00:00Z', valid_until: '2026-10-14T08:00:00Z' },
  ],
} };
const filtered = filterRelationalSnapshot(snapshot, { accountId: 'A2', personId: 'P2', authUserId: 'auth2', roleCode: 'IT', role: ROLES.IT, permissions: ROLE_ACCESS[ROLES.IT].permissions, studentId: null, teacherId: null, grants: [{ role_code: 'IT', role_name: ROLES.IT, site_id: null, academic_year_id: null, group_id: null }] });
assert.equal(filtered.tables.people.length, 3, 'The directory must include account identities, even without staff or enrollment rows.');
assert.equal(filtered.tables.accounts[0].auth_user_id, undefined);
const { data, users, revision } = projectRelationalCampus(filtered, new Date('2026-10-14T12:00:00Z'));
assert.equal(revision, 7);
assert.equal(data.students.length, 1);
assert.equal(data.students[0].matricule, 'ESCEN-001');
assert.equal(data.students[0].email, 'alice@example.test');
assert.equal(data.students[0].status, 'Inscription à reprendre');
assert.equal(data.students[0].academicYearId, '');
assert.equal(data.students[0].financials.available, false);
assert.deepEqual(data.enrollments, []);
assert.deepEqual(deriveEnrollments({ ...emptyDataset(), students: data.students }), []);
assert.deepEqual(getFinancialReport(data.students, ROLES.IT), [], 'Unknown finances must not be classified as zero or without a contract.');
assert.equal(users.length, 3);
assert.equal(users.find(user => user.id === 'A1')?.active, false);
assert.deepEqual(users.find(user => user.id === 'A2')?.roles, [ROLES.IT, ROLES.MKT]);
assert.equal(users.find(user => user.id === 'A3')?.role, null, 'No automatic role may be invented.');
assert.equal(queryDemoUsers(users, ROLES.IT, { search: '', role: ROLES.MKT, status: '' }).length, 1);
const technician = users.find(user => user.id === 'A2')!;
assert.deepEqual(changeDemoUserRole(technician, ROLES.ENS, 'Changement motivé', ROLES.IT).roles, [ROLES.ENS, ROLES.MKT]);
assert.deepEqual(technician.roles, [ROLES.IT, ROLES.MKT]);
assert.deepEqual(projectRelationalCampus({ revision: 0, tables: {} }).data.students, []);
console.log('Vérification réussie : projection des identités réelles, comptes sans rôle, attributions multiples, absence de données financières et aucune inscription inventée.');

const operational: RelationalSnapshot = { revision: 1, tables: { ...snapshot.tables,
  academic_years: [{ id: 'YEAR', name: '2025-2026', starts_on: '2025-10-13', ends_on: '2026-06-30', status: 'OUVERTE' }],
  levels: [{ id: 'LEVEL', name: 'Licence 1', code: 'L1', position: 1, cycle_id: null }],
  groups: [{ id: 'GROUP', academic_year_id: 'YEAR', level_id: 'LEVEL', name: 'Groupe existant' }],
  academic_offerings: [{ id: 'OFFER', curriculum_id: null, academic_year_id: 'YEAR', level_id: 'LEVEL' }],
  enrollments: [{ id: 'ENROLL', student_id: 'S1', offering_id: 'OFFER', status: 'INSCRIT' }],
  enrollment_groups: [{ id: 'MEMBER', enrollment_id: 'ENROLL', offering_id: 'OFFER', group_id: 'GROUP', valid_from: null }],
  financial_contracts: [{ id: 'CONTRACT', enrollment_id: 'ENROLL' }],
  contract_versions: [{ id: 'VERSION', contract_id: 'CONTRACT', status: 'EN_COURS' }],
  contract_lines: [{ id: 'LINE', version_id: 'VERSION', amount: 480000 }],
  payments: [{ id: 'PAID', enrollment_id: 'ENROLL', amount: 100000, status: 'POSTED' }, { id: 'PENDING', enrollment_id: 'ENROLL', amount: 50000, status: 'PENDING' }, { id: 'CANCELLED', enrollment_id: 'ENROLL', amount: 10000, status: 'POSTED' }],
  payment_reversals: [{ id: 'REV', payment_id: 'CANCELLED' }],
} };
const actual = projectRelationalCampus(operational).data;
assert.equal(actual.students[0].groupe, 'Groupe existant');
assert.equal(actual.students[0].filiere, 'Filière non renseignée');
assert.equal(actual.levels.length, 1);
assert.equal(actual.levels[0].cycle, '');
assert.deepEqual(actual.students[0].financials, { available: true, expected: 480000, paid: 100000, remaining: 380000, installments: [] });
assert.equal(actual.enrollments[0].financials.paid, 100000);
console.log('Dossiers opérationnels : groupe sans date supposée, filière absente conservée et paiements en attente ou annulés exclus du solde.');
