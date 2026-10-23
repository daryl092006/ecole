import { expect, test } from '@playwright/test';
import { ROLES } from '../../src/types/permissions';
import { internalStaffReference } from '../../src/utils/staffReference';
import { projectRelationalCampus } from '../../src/services/relationalCampusAdapter';
import { teacherFixture } from './teacher-management-fixture';
import { securityContext, securityIds, uuid } from './security-fixture';

const form = { firstname: 'Marie', lastname: 'Personnel', email: '', phone: '', employeeNumber: '', position: 'Comptable' };
const post = (fixture: ReturnType<typeof teacherFixture>, values: object) => fixture.staffApi.POST(new Request('http://local.test/api/staff', { method: 'POST', body: JSON.stringify(values) }));

test('Personnel : profil enseignant conservé pour le RAF et lorsque le profil est inactif', async () => {
  const fixture = teacherFixture(securityContext(ROLES.RAF));
  fixture.snapshot.tables.teachers[0].active = false;
  fixture.snapshot.tables.staff[0].employee_number = internalStaffReference();
  const response = await fixture.staffApi.GET(new Request('http://local.test/api/staff'));
  expect(response.status).toBe(200);
  const { records } = await response.json();
  expect(records.find((row: { personId: string }) => row.personId === uuid(920))).toMatchObject({ isTeacher: true, employeeNumber: '' });
  expect(records.find((row: { personId: string }) => row.personId === uuid(922))).toMatchObject({ isTeacher: false });
  const teachers = await (await fixture.get()).json();
  expect(teachers.teachers[0].employeeNumber).toBe('');
  expect(projectRelationalCampus(fixture.snapshot).data.teachers[0].employeeNumber).toBe('');
});

test('Personnel : création administrative validée et profil enseignant facultatif', async () => {
  const fixture = teacherFixture();
  for (const invalid of [{ ...form, position: ' ' }, { ...form, startsOn: '2026-02-30' }, { ...form, contractType: 'INCONNU' }, { ...form, actorId: uuid(1) }]) {
    expect((await post(fixture, invalid)).status).toBe(400);
  }
  expect(fixture.transactions).toEqual([]);
  expect((await post(fixture, { ...form, isTeacher: true, position: '', teacherSpecialty: 'Gestion' })).status).toBe(201);
  expect(fixture.transactions[0].map(change => change.table)).toEqual(['people', 'staff', 'teachers']);
  expect((await post(fixture, form)).status).toBe(201);
  expect(fixture.transactions[1].map(change => change.table)).toEqual(['people', 'staff', 'staff_contracts']);
  expect(fixture.transactions[0][1].record.employee_number).not.toBe(fixture.transactions[1][1].record.employee_number);
});

test('Personnel : absence de permission ou accès limité bloque les mutations', async () => {
  for (const context of [securityContext(ROLES.ENS), securityContext(ROLES.IT, { grants: [{ role_code: 'IT', role_name: ROLES.IT, site_id: securityIds.site, group_id: null, academic_year_id: null }] })]) {
    const fixture = teacherFixture(context);
    expect((await post(fixture, form)).status).toBe(403);
    const response = await fixture.staffDetailApi.PATCH(new Request('http://local.test/api/staff', { method: 'PATCH', body: JSON.stringify({ ...form, revision: 4, reason: 'Modification interdite' }) }), { params: Promise.resolve({ personId: uuid(920) }) });
    expect(response.status).toBe(403);
    expect(fixture.transactions).toEqual([]);
  }
});

test('Personnel : effacer la fonction administrative d’un enseignant ne produit pas un faux succès', async () => {
  const fixture = teacherFixture();
  fixture.snapshot.tables.staff_contracts = [{ id: uuid(980), staff_id: uuid(910), position: 'Comptable', contract_type: 'PERMANENT', starts_on: '2026-01-01', ends_on: null }];
  const response = await fixture.staffDetailApi.PATCH(new Request('http://local.test/api/staff', { method: 'PATCH', body: JSON.stringify({ ...form, position: '', revision: 4, reason: 'Effacement de la fonction' }) }), { params: Promise.resolve({ personId: uuid(920) }) });
  expect(response.status).toBe(400);
  expect(fixture.transactions).toEqual([]);
});
