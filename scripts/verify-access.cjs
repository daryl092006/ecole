/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { ROLES } = require('../src/types/permissions.ts');
const { ROLE_ACCESS, hasPermission } = require('../src/permissions/rolePermissions.ts');
const { PERMISSION_LABELS } = require('../src/permissions/permissionLabels.ts');
const { getPermissionCatalog, getRolePermissionSummary } = require('../src/services/permissionCatalogService.ts');
const { createDemoUser, toggleDemoUser, changeDemoUserRole, queryDemoUsers, assignableUserRoles } = require('../src/services/userService.ts');

const technical = getRolePermissionSummary(ROLES.IT, ROLES.IT);
assert(technical.domains.filter(domain => ['finance', 'grades'].includes(domain.id)).every(domain => domain.permissions.every(permission => permission.granted)));
assert.equal(getRolePermissionSummary(ROLES.STG, ROLES.DG).count, 0);
assert(getRolePermissionSummary(ROLES.ENS, ROLES.DG).scope.includes('affectés'));
assert.throws(() => getPermissionCatalog(ROLES.STUD));
const catalog = getPermissionCatalog(ROLES.DG).flatMap(domain => domain.permissions.map(permission => permission.code));
assert.equal(new Set(catalog).size, Object.keys(PERMISSION_LABELS).length);
assert.equal(catalog.length, Object.keys(PERMISSION_LABELS).length);

const user = createDemoUser('Zoé Agent', 'zoe@example.test', ROLES.SURV, [], ROLES.DG, 'direction@escen.demo');
const changed = changeDemoUserRole(user, ROLES.ENS, 'Nouvelle affectation pédagogique', ROLES.IT, 'support@escen.demo');
assert.equal(user.role, ROLES.SURV);
assert.equal(changed.history.length, 2);
assert.equal(changed.history[1].oldValue, ROLES.SURV);
assert.equal(changed.history[1].newValue, ROLES.ENS);
assert.equal(changed.history[1].actor, 'support@escen.demo');
assert.equal(changed.history[1].role, ROLES.IT);
assert.equal(changed.history[1].reason, 'Nouvelle affectation pédagogique');
assert.doesNotThrow(() => changeDemoUserRole(user, ROLES.RAF, 'Attribution sensible', ROLES.IT));
assert.throws(() => changeDemoUserRole(user, ROLES.ENS, 'Motif', ROLES.STUD));
assert.throws(() => changeDemoUserRole(changed, ROLES.ENS, 'Identique', ROLES.DG));
assert.throws(() => changeDemoUserRole(user, ROLES.ENS, ' x ', ROLES.DG));
assert.throws(() => changeDemoUserRole(user, 'Super administrateur', 'Inconnu', ROLES.DG));
const director = createDemoUser('Direction adjointe', 'adjoint@example.test', ROLES.DGA, [], ROLES.DG);
assert.doesNotThrow(() => changeDemoUserRole(director, ROLES.STG, 'Retrait de direction', ROLES.IT));
assert.equal(changeDemoUserRole(director, ROLES.DA, 'Nouvelle responsabilité de direction', ROLES.DG).role, ROLES.DA);
assert(assignableUserRoles(ROLES.IT).includes(ROLES.DGA));
assert(assignableUserRoles(ROLES.IT).includes(ROLES.RAF));
const inactive = toggleDemoUser(changed, 'Fin de mission', ROLES.DG, 'direction@escen.demo');
assert.equal(inactive.role, ROLES.ENS);
assert.equal(inactive.history[2].actor, 'direction@escen.demo');
assert.deepEqual(queryDemoUsers([user, inactive], ROLES.IT, { search: 'zoe', role: ROLES.ENS, status: 'INACTIF' }), [inactive]);
assert.throws(() => queryDemoUsers([user], ROLES.RAF, { search: '', role: '', status: '' }));
assert.throws(() => queryDemoUsers([user], ROLES.DG, { search: '', role: '', status: 'Inconnu' }));
assert.throws(() => toggleDemoUser(user, ' ', ROLES.DG));

for (const role of Object.values(ROLES)) {
  assert.equal(hasPermission(role, 'staff.manage'), [ROLES.DG, ROLES.RAF, ROLES.IT].includes(role));
  assert.equal(hasPermission(role, 'purchase.create'), (role === ROLES.ACHATS || role === ROLES.IT));
  assert.equal(hasPermission(role, 'purchase.approve'), [ROLES.DG, ROLES.RAF, ROLES.IT].includes(role));
  assert.equal(hasPermission(role, 'purchase.receive'), (role === ROLES.ACHATS || role === ROLES.IT));
  assert.equal(hasPermission(role, 'asset.manage'), [ROLES.ACHATS, ROLES.SITE, ROLES.IT].includes(role));
  assert.equal(hasPermission(role, 'student.update'), (role === ROLES.LOG || role === ROLES.IT));
  assert(ROLE_ACCESS[role].permissions.every(permission => catalog.includes(permission)));
}
console.log('Vérification réussie : catalogue des accès, changements de rôle tracés, filtres et séparation des pouvoirs.');

assert.deepEqual(new Set(ROLE_ACCESS[ROLES.IT].permissions), new Set(catalog));
