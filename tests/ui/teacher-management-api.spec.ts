import { expect, test } from '@playwright/test';
import { ROLES } from '../../src/types/permissions';
import { getAvailableTabs } from '../../src/permissions/navigation';
import { securityContext, securityIds as id, uuid } from './security-fixture';
import { teacherFixture } from './teacher-management-fixture';

const assignment = { action: 'create_assignment', teacherId: id.teacher, offeringId: uuid(40), groupId: id.group, componentId: uuid(60), validFrom: '2026-10-01', validUntil: '2027-06-30' };
test('Les profils et affectations sont accessibles avec leurs permissions distinctes', async () => {
  const personnel = teacherFixture(securityContext(ROLES.RAF));
  expect((await personnel.get()).status).toBe(200);
  expect((await personnel.post({ action: 'create_profile', staffId: uuid(912), specialty: 'Gestion' })).status).toBe(201);
  expect((await personnel.post(assignment)).status).toBe(403);
  const planning = teacherFixture(securityContext(ROLES.LOG));
  expect((await planning.post({ action: 'update_profile', teacherId: id.teacher, specialty: 'Gestion' })).status).toBe(403);
  expect((await planning.post(assignment)).status).toBe(201);
});

test('Le profil et sa navigation exigent une permission de gestion effective', async () => {
  const denied = teacherFixture(securityContext(ROLES.ENS));
  expect((await denied.get()).status).toBe(403);
  expect((await denied.post(assignment)).status).toBe(403);
  expect(denied.transactions).toEqual([]);
  for (const role of [ROLES.IT, ROLES.LOG, ROLES.DG, ROLES.RAF]) expect(getAvailableTabs(role).flatMap(tab => tab.subTabs || []).some(tab => tab.id === 'staff_teachers')).toBe(true);
  expect(getAvailableTabs(ROLES.IT, ['academic.view']).flatMap(tab => tab.subTabs || []).some(tab => tab.id === 'staff_teachers')).toBe(false);
});

test('Un gestionnaire limité à un groupe ne peut pas modifier les profils globaux', async () => {
  const route = teacherFixture(securityContext(ROLES.IT, { grants: [{ role_code: 'IT', role_name: ROLES.IT, site_id: id.site, group_id: id.group, academic_year_id: id.year }] }));
  expect((await route.post({ action: 'set_active', teacherId: id.teacher, active: false })).status).toBe(403);
  expect(route.transactions).toEqual([]);
  const directory = await (await route.get()).json();
  expect(directory.staff).toEqual([]);
  expect(directory.canManageProfiles).toBe(false);
  expect(directory.teachers[0]).not.toHaveProperty('email');
});

test('Les affectations respectent année, groupe, site et maquette sans combiner les habilitations', async () => {
  const context = securityContext(ROLES.LOG, { grants: [{ role_code: 'LOG', role_name: ROLES.LOG, site_id: id.site, group_id: id.group, academic_year_id: id.year }] });
  const route = teacherFixture(context);
  for (const body of [
    { ...assignment, groupId: id.otherGroup }, { ...assignment, offeringId: uuid(41) },
    { ...assignment, offeringId: uuid(42), groupId: id.otherSiteGroup },
  ]) expect((await route.post(body)).status).toBe(404);
  expect((await route.post({ ...assignment, componentId: uuid(61) })).status).toBe(400);
  expect((await route.post({ action: 'end_assignment', assignmentId: id.assignment(1), endOn: '2027-06-30' })).status).toBe(404);
  expect((await route.post(assignment, 'all')).status).toBe(409);
  expect(route.transactions).toEqual([]);
  expect((await route.post(assignment)).status).toBe(201);
  const mixed = teacherFixture(securityContext(ROLES.LOG, { grants: [
    { role_code: 'LOG', role_name: ROLES.LOG, site_id: id.site, group_id: id.otherGroup, academic_year_id: id.year },
    { role_code: 'LOG', role_name: ROLES.LOG, site_id: id.otherSite, group_id: id.group, academic_year_id: id.year },
  ] }));
  expect((await mixed.post(assignment)).status).toBe(404);
  expect(mixed.transactions).toEqual([]);
});

test('Motif, dates, version et champs injectés sont contrôlés avant toute écriture', async () => {
  const route = teacherFixture();
  for (const body of [
    { ...assignment, reason: '' }, { ...assignment, reason: 'x'.repeat(1001) },
    { ...assignment, validFrom: '2026-02-30' }, { ...assignment, actorId: uuid(1) },
  ]) expect((await route.post(body)).status).toBe(400);
  expect((await route.post({ ...assignment, validUntil: '2025-01-01' })).status).toBe(400);
  expect((await route.post({ ...assignment, revision: 0 })).status).toBe(409);
  expect(route.transactions).toEqual([]);
});

test('Un enseignant inactif ou un dossier archivé ne reçoit pas de nouvelle affectation', async () => {
  for (const table of ['teachers', 'staff', 'people']) {
    const route = teacherFixture();
    if (table === 'teachers') route.snapshot.tables.teachers[0].active = false;
    else route.snapshot.tables[table][0].archived_at = '2026-01-01T00:00:00Z';
    expect((await route.post(assignment)).status).toBe(409);
    expect(route.transactions).toEqual([]);
  }
});

test('Les composants, UE, semestres et rattachements archivés sont exclus', async () => {
  for (const table of ['curriculum_components', 'teaching_units', 'curriculum_semesters', 'group_offerings']) {
    const route = teacherFixture(); route.snapshot.tables[table][0].archived_at = '2026-01-01T00:00:00Z';
    expect((await route.post(assignment)).status).toBe(400);
    expect(route.transactions).toEqual([]);
  }
});

test('Une séance future ou en cours bloque la désactivation du titulaire ou du remplaçant effectif', async () => {
  for (const status of ['PLANIFIE', 'EN_COURS']) {
    const route = teacherFixture();
    route.snapshot.tables.sessions = [{ id: uuid(950), teacher_id: id.teacher, ends_at: '2999-01-01T10:00:00Z', status }];
    expect((await route.post({ action: 'set_active', teacherId: id.teacher, active: false })).status).toBe(409);
    expect(route.transactions).toEqual([]);
    route.snapshot.tables.sessions[0].replacement_teacher_id = uuid(21);
    expect((await route.post({ action: 'set_active', teacherId: uuid(21), active: false })).status).toBe(409);
    expect((await route.post({ action: 'set_active', teacherId: id.teacher, active: false })).status).toBe(200);
  }
});

test('Une fin d’affectation respecte les séances, leur jour de fin et la plage existante', async () => {
  const route = teacherFixture();
  route.snapshot.tables.sessions = [{ id: uuid(950), assignment_id: id.assignment(0), starts_at: '2027-05-03T08:00:00Z', ends_at: '2027-05-03T10:00:00Z', status: 'TERMINE' }];
  const end = { action: 'end_assignment', assignmentId: id.assignment(0) };
  expect((await route.post({ ...end, endOn: '2027-05-02' })).status).toBe(409);
  expect((await route.post({ ...end, endOn: '2025-12-31' })).status).toBe(400);
  expect((await route.post({ ...end, endOn: '2028-01-01' })).status).toBe(400);
  expect(route.transactions).toEqual([]);
  expect((await route.post({ ...end, endOn: '2027-05-03' })).status).toBe(200);
  route.snapshot.tables.sessions[0].status = 'ANNULE';
  expect((await route.post({ ...end, endOn: '2027-05-02' })).status).toBe(200);
});

test('Une année close bloque les mutations annuelles ; les profils restent indépendants', async () => {
  const route = teacherFixture(); route.snapshot.tables.academic_years[0].status = 'CLOTUREE';
  expect((await route.post(assignment)).status).toBe(409);
  expect((await route.post({ action: 'end_assignment', assignmentId: id.assignment(0), endOn: '2027-05-03' })).status).toBe(409);
  expect(route.transactions).toEqual([]);
  expect((await route.post({ action: 'update_profile', teacherId: id.teacher, specialty: 'Analyse avancée' }, 'all')).status).toBe(200);
});
