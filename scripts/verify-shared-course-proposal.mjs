import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { localBusinessFixture } from '../tests/ui/local-business-fixture.mjs';
import { verifyScheduleManagement } from './verify-schedule-management.mjs';
import { loadLocalApiModule } from './local-api-fixture.mjs';

// Verify the approved migration against populated data, exclusively in local PGlite.
const local = await localBusinessFixture({ before: '202611040087_shared_course_participants.sql' });
const { db, value, insert, account, year, level } = local;
let checks = 0;
const check = async (name, run) => { await run(); checks++; console.log(`✓ ${name}`); };
const revision = () => value('select revision as value from escen_private.portal_revision where singleton');
const audits = () => value('select count(*)::int as value from escen_private.audit_events');
try {
  const legacySite = await insert('sites', { code: 'BEFORE-SHARED', name: 'Recette avant proposition' });
  await verifyScheduleManagement(db, check, { site: legacySite, year, level, verifyExams: false });
  const beforeSessions = (await db.query('select * from escen.sessions order by id')).rows;
  const oldSession = beforeSessions.find(row => row.status === 'PLANIFIE');
  const oldPerson = await insert('people', { firstname: 'Présence', lastname: 'Historique' });
  const oldStudent = await insert('students', { person_id: oldPerson.id, matricule: 'SHARED-HISTORY' });
  const oldEnrollment = await insert('enrollments', { student_id: oldStudent.id, offering_id: oldSession.offering_id, status: 'INSCRIT' });
  await insert('enrollment_groups', { enrollment_id: oldEnrollment.id, offering_id: oldSession.offering_id, group_id: oldSession.group_id,
    valid_from: '2026-01-01', changed_by: account.id, reason: 'Historique de recette' });
  const oldAttendance = await insert('attendances', { session_id: oldSession.id, enrollment_id: oldEnrollment.id,
    offering_id: oldSession.offering_id, status: 'ABSENT', recorded_by: account.id, reason: 'Motif historique conservé' });
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(await readFile(new URL('../supabase/migrations/202611040087_shared_course_participants.sql', import.meta.url), 'utf8'));
  await check('Reprise peuplée : séances, statuts et motifs historiques strictement conservés', async () => {
    assert.deepEqual((await db.query('select * from escen.sessions order by id')).rows, beforeSessions);
    const { session_participant_id, ...after } = (await db.query('select * from escen.attendances where id=$1', [oldAttendance.id])).rows[0];
    assert.equal(session_participant_id, null); assert.deepEqual(after, oldAttendance);
    assert.equal(await value('select count(*)::int as value from escen.session_participants'), beforeSessions.length);
  });
  await check('RLS et RPC : accès navigateur interdit, passerelle serveur seule autorisée', async () => {
    assert.equal(await value("select relrowsecurity as value from pg_class where oid='escen.session_participants'::regclass"), true);
    for (const role of ['anon', 'authenticated']) {
      assert.equal(await value("select has_function_privilege($1,'public.escen_shared_course_create(uuid,text,bigint,uuid,uuid[],uuid,timestamptz,timestamptz,text)','EXECUTE') as value", [role]), false);
      assert.equal(await value("select has_table_privilege($1,'escen.session_participants','SELECT') as value", [role]), false);
    }
    assert.equal(await value("select has_function_privilege('service_role','public.escen_shared_course_create(uuid,text,bigint,uuid,uuid[],uuid,timestamptz,timestamptz,text)','EXECUTE') as value"), true);
  });
  const site = await insert('sites', { code: 'SHARED', name: 'Site recette cours communs' });
  await verifyScheduleManagement(db, check, { site, year, level, verifyExams: false });
  const anchor = (await db.query('select a.* from escen.teaching_assignments a join escen.academic_offerings o on o.id=a.offering_id where o.site_id=$1 limit 1', [site.id])).rows[0];
  const room = (await db.query('select * from escen.rooms where site_id=$1 limit 1', [site.id])).rows[0];
  const subject = await value('select subject_id as value from escen.curriculum_components where id=$1', [anchor.component_id]);
  // A second formation proves that attendance is not silently tied to the anchor.
  const program = await insert('programs', { code: 'SHARED-2', name: 'Deuxième formation' });
  const curriculum = await insert('curricula', { program_id: program.id, level_id: level.id, version: 1 });
  const semester = await insert('curriculum_semesters', { curriculum_id: curriculum.id, position: 1, name: 'Semestre commun', target_credits: 30 });
  const unit = await insert('teaching_units', { curriculum_id: curriculum.id, semester_id: semester.id, code: 'SHARED', name: 'UE commune', credits: 30 });
  const component = await insert('curriculum_components', { curriculum_id: curriculum.id, unit_id: unit.id, subject_id: subject, code: 'SHARED', coefficient: 1, credits: 30 });
  await insert('assessment_weights', { curriculum_id: curriculum.id, component_id: component.id, evaluation_kind: 'DEVOIR', percent: 100 });
  await db.query("update escen.curricula set status='APPROVED', approved_by=$1, approved_at=now() where id=$2", [account.id, curriculum.id]);
  const offering = await insert('academic_offerings', { curriculum_id: curriculum.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  await insert('offering_semesters', { offering_id: offering.id, curriculum_id: curriculum.id, curriculum_semester_id: semester.id, starts_on: '2026-02-01', ends_on: '2027-10-31' });
  const group = await insert('groups', { academic_year_id: year.id, level_id: level.id, site_id: site.id, name: 'Deuxième groupe' });
  await insert('group_offerings', { group_id: group.id, offering_id: offering.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  const assignment = await insert('teaching_assignments', { teacher_id: anchor.teacher_id, group_id: group.id, offering_id: offering.id, curriculum_id: curriculum.id, component_id: component.id, valid_from: '2026-01-01', valid_until: '2027-12-31' });
  const create = async (patch = {}) => {
    const data = { actor: account.id, role: 'IT', revision: await revision(), id: randomUUID(), assignments: [anchor.id, assignment.id], room: room.id,
      start: '2027-03-10T08:00:00Z', end: '2027-03-10T10:00:00Z', reason: 'Cours commun confirmé', ...patch };
    const result = await value('select public.escen_shared_course_create($1,$2,$3,$4,$5::uuid[],$6,$7,$8,$9) as value',
      [data.actor, data.role, data.revision, data.id, data.assignments, data.room, data.start, data.end, data.reason]);
    return { ...data, result };
  };
  const change = async (id, action, patch = {}) => value('select public.escen_shared_course_change($1,$2,$3,$4,$5,$6,$7,$8,$9) as value',
    [patch.actor || account.id, 'IT', await revision(), id, action, 'Modification commune confirmée', patch.start || null, patch.end || null, patch.teacher || null]);
  let course;
  await check('Cours commun : une séance, deux formations et deux groupes audités', async () => {
    const before = await revision(); course = await create();
    assert.equal(course.result, before + 1);
    assert.equal(await value('select count(*)::int as value from escen.session_participants where session_id=$1', [course.id]), 2);
    assert.equal(await value("select count(*)::int as value from escen_private.audit_events where table_name='session_participants' and new_value->>'session_id'=$1 and actor_id=$2", [course.id, account.id]), 2);
  });
  await check('Création : révision périmée, doublons, rôle sans permission et lot hors borne refusés', async () => {
    const before = await revision(), count = await audits();
    for (const patch of [{ revision: before - 1 }, { assignments: [anchor.id, anchor.id] }, { role: 'MKT' }, { assignments: [anchor.id] }, { reason: 'x' }]) {
      await assert.rejects(create(patch));
    }
    assert.equal(await revision(), before); assert.equal(await audits(), count);
  });
  await check('Semestre du deuxième groupe : échec tardif annule séance, participations et audits', async () => {
    const before = await revision(), count = await audits();
    await assert.rejects(create({ start: '2027-11-02T08:00:00Z', end: '2027-11-02T10:00:00Z' }), /semestre/);
    assert.equal(await revision(), before); assert.equal(await audits(), count);
  });
  await check('Conflit du deuxième groupe même avec autre enseignant et autre salle', async () => {
    const teacher = (await db.query('select * from escen.teachers where id<>$1 limit 1', [anchor.teacher_id])).rows[0];
    const other = await insert('teaching_assignments', { teacher_id: teacher.id, group_id: group.id, offering_id: offering.id, curriculum_id: curriculum.id, component_id: component.id, valid_from: '2026-01-01', valid_until: '2027-12-31' });
    const otherRoom = await insert('rooms', { code: 'SHARED-OTHER', name: 'Autre salle' });
    await assert.rejects(insert('sessions', { assignment_id: other.id, offering_id: offering.id, group_id: group.id, teacher_id: teacher.id, room_id: otherRoom.id,
      starts_at: course.start, ends_at: course.end, mode: 'COURS' }), /session_participant_group_conflict/);
  });
  await check('Droits limités à un groupe : création et déplacement communs interdits', async () => {
    const authId = randomUUID(); await db.query('insert into auth.users(id) values($1)', [authId]);
    const person = await insert('people', { firstname: 'Gestionnaire', lastname: 'Un seul groupe' });
    const scoped = await insert('accounts', { person_id: person.id, auth_user_id: authId, active: true });
    const role = await value("select id as value from escen.roles where code='IT'");
    await insert('role_grants', { account_id: scoped.id, role_id: role, group_id: anchor.group_id,
      granted_by: account.id, valid_from: '2020-01-01', reason: 'Périmètre restreint de recette' });
    const before = await revision(), count = await audits();
    await assert.rejects(create({ actor: scoped.id, start: '2027-03-11T08:00:00Z', end: '2027-03-11T10:00:00Z' }), /périmètre/);
    await assert.rejects(change(course.id, 'move', { actor: scoped.id, start: '2027-03-11T08:00:00Z', end: '2027-03-11T10:00:00Z' }), /tous les groupes/);
    assert.equal(await revision(), before); assert.equal(await audits(), count);
  });
  await check('Déplacement et annulation : tous les groupes synchronisés, historique conservé', async () => {
    const other = await create({ start: '2027-04-10T08:00:00Z', end: '2027-04-10T10:00:00Z' });
    const before = await revision();
    await change(other.id, 'move', { start: '2027-04-11T08:00:00Z', end: '2027-04-11T10:00:00Z' });
    assert.equal(await revision(), before + 1);
    assert.equal(await value("select count(*)::int as value from escen.session_participants where session_id=$1 and starts_at='2027-04-11T08:00:00Z'", [other.id]), 2);
    await change(other.id, 'cancel');
    assert.equal(await value('select count(*)::int as value from escen.session_participants where session_id=$1 and not active', [other.id]), 2);
    await create({ start: '2027-04-11T08:00:00Z', end: '2027-04-11T10:00:00Z' });
  });
  await check('Modification refusée par le deuxième semestre : aucun déplacement partiel', async () => {
    const before = await revision(), count = await audits();
    await assert.rejects(change(course.id, 'move', { start: '2027-11-03T08:00:00Z', end: '2027-11-03T10:00:00Z' }), /semestre/);
    assert.equal(await revision(), before); assert.equal(await audits(), count);
    assert.equal(await value("select count(*)::int as value from escen.session_participants where session_id=$1 and starts_at=$2", [course.id, course.start]), 2);
  });
  await check('Réduction des dates de la deuxième affectation refusée si elle exclut un cours', async () => {
    await assert.rejects(db.query("update escen.teaching_assignments set valid_until='2027-03-01', reason='Réduction incompatible de recette' where id=$1", [assignment.id]), /séances participantes/);
  });
  await check('Remplacement commun : enseignant effectif unique, affectations originales conservées', async () => {
    const other = await create({ start: '2027-06-10T08:00:00Z', end: '2027-06-10T10:00:00Z' });
    const teacher = await value('select id as value from escen.teachers where id<>$1 limit 1', [anchor.teacher_id]);
    await change(other.id, 'replace_teacher', { teacher });
    assert.equal(await value('select effective_teacher_id as value from escen.sessions where id=$1', [other.id]), teacher);
    assert.equal(await value('select count(*)::int as value from escen.session_participants where session_id=$1 and teacher_id=$2', [other.id, anchor.teacher_id]), 2);
    await change(other.id, 'replace_teacher');
    assert.equal(await value('select effective_teacher_id as value from escen.sessions where id=$1', [other.id]), anchor.teacher_id);
  });
  await check('Même groupe dans deux formations : une réservation commune, rattachements conservés', async () => {
    await insert('group_offerings', { group_id: anchor.group_id, offering_id: offering.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
    const additional = await insert('teaching_assignments', { teacher_id: anchor.teacher_id, group_id: anchor.group_id, offering_id: offering.id,
      curriculum_id: curriculum.id, component_id: component.id, valid_from: '2026-01-01', valid_until: '2027-12-31' });
    const other = await create({ assignments: [anchor.id, assignment.id, additional.id], start: '2027-06-11T08:00:00Z', end: '2027-06-11T10:00:00Z' });
    assert.equal(await value('select count(*)::int as value from escen.session_participants where session_id=$1', [other.id]), 3);
  });
  await check('Séance simple non émargée : changement d’affectation encore possible et audité', async () => {
    const teacher = await value('select id as value from escen.teachers where id<>$1 limit 1', [anchor.teacher_id]);
    const replacement = await insert('teaching_assignments', { teacher_id: teacher, group_id: anchor.group_id, offering_id: anchor.offering_id,
      curriculum_id: anchor.curriculum_id, component_id: anchor.component_id, valid_from: '2026-01-01', valid_until: '2027-12-31' });
    const single = await insert('sessions', { assignment_id: anchor.id, offering_id: anchor.offering_id, group_id: anchor.group_id,
      teacher_id: anchor.teacher_id, room_id: room.id, starts_at: '2027-06-12T08:00:00Z', ends_at: '2027-06-12T10:00:00Z', mode: 'COURS' });
    await db.query("update escen.sessions set assignment_id=$1,teacher_id=$2,reason='Changement de recette avant émargement' where id=$3", [replacement.id, teacher, single.id]);
    assert.equal(await value('select assignment_id as value from escen.session_participants where session_id=$1', [single.id]), replacement.id);
  });
  let secondEnrollment, delegateActor;
  await check('Présence de la deuxième formation liée à sa participation et contexte immuable', async () => {
    const person = await insert('people', { firstname: 'Élève', lastname: 'Deuxième groupe' });
    const student = await insert('students', { person_id: person.id, matricule: 'SHARED-TEST' });
    const enrollment = await insert('enrollments', { student_id: student.id, offering_id: offering.id, status: 'INSCRIT', created_by: account.id });
    secondEnrollment = enrollment;
    await insert('enrollment_groups', { enrollment_id: enrollment.id, offering_id: offering.id, group_id: group.id, valid_from: '2026-01-01', changed_by: account.id, reason: 'Rattachement de recette' });
    const attendance = await insert('attendances', { session_id: course.id, enrollment_id: enrollment.id, offering_id: offering.id, status: 'PRESENT', recorded_by: account.id });
    assert.ok(attendance.session_participant_id);
    assert.equal(await value('select group_id as value from escen.session_participants where id=$1', [attendance.session_participant_id]), group.id);
    await assert.rejects(db.query("update escen.sessions set starts_at=starts_at+interval '1 hour',ends_at=ends_at+interval '1 hour' where id=$1", [course.id]), /émargée/);
  });
  await check('Délégué du deuxième groupe : sa présence accessible, autre groupe interdit', async () => {
    const authId = randomUUID(); await db.query('insert into auth.users(id) values($1)', [authId]);
    const personId = await value('select person_id as value from escen.students where id=$1', [secondEnrollment.student_id]);
    const delegate = await insert('accounts', { person_id: personId, auth_user_id: authId, active: true });
    delegateActor = delegate;
    const role = await value("select id as value from escen.roles where code='DEL'");
    await insert('role_grants', { account_id: delegate.id, role_id: role, group_id: group.id,
      granted_by: account.id, valid_from: '2020-01-01', reason: 'Mandat de recette' });
    const attendanceId = await value('select id as value from escen.attendances where session_id=$1', [course.id]);
    const transaction = async changes => value('select public.escen_delegate_attendance_transaction($1,$2,$3,$4,$5) as value',
      [delegate.id, await revision(), course.id, year.id, JSON.stringify(changes)]);
    await transaction([{ table: 'attendances', operation: 'update', record: { id: attendanceId, status: 'RETARD', reason: 'Retard constaté par le délégué' } }]);
    assert.equal(await value('select status as value from escen.attendances where id=$1', [attendanceId]), 'RETARD');
    const firstPerson = await insert('people', { firstname: 'Autre', lastname: 'Groupe' });
    const firstStudent = await insert('students', { person_id: firstPerson.id, matricule: 'SHARED-OTHER-STUDENT' });
    const firstEnrollment = await insert('enrollments', { student_id: firstStudent.id, offering_id: anchor.offering_id, status: 'INSCRIT' });
    await insert('enrollment_groups', { enrollment_id: firstEnrollment.id, offering_id: anchor.offering_id, group_id: anchor.group_id,
      valid_from: '2026-01-01', changed_by: account.id, reason: 'Groupe distinct de recette' });
    const before = await revision(), count = await audits();
    await assert.rejects(transaction([{ table: 'attendances', operation: 'insert', record: { id: randomUUID(), session_id: course.id,
      enrollment_id: firstEnrollment.id, offering_id: anchor.offering_id, status: 'PRESENT', recorded_by: delegate.id } }]), /hors du groupe/);
    assert.equal(await revision(), before); assert.equal(await audits(), count);
  });
  await check('Examen simple : déplacement coordonné conservé, ajout de groupe interdit', async () => {
    const session = await insert('sessions', { assignment_id: anchor.id, offering_id: anchor.offering_id, group_id: anchor.group_id,
      teacher_id: anchor.teacher_id, room_id: room.id, mode: 'PAPIER', starts_at: '2027-05-10T08:00:00Z', ends_at: '2027-05-10T10:00:00Z' });
    const evaluation = await insert('evaluations', { assignment_id: anchor.id, offering_id: anchor.offering_id,
      component_id: anchor.component_id, name: 'Examen individuel conservé', kind: 'EXAMEN', created_by: account.id });
    const delivery = await insert('exam_deliveries', { evaluation_id: evaluation.id, session_id: session.id,
      access_opens_at: '2027-05-10T08:15:00Z', access_closes_at: '2027-05-10T09:45:00Z' });
    await value('select public.escen_backend_transaction($1,$2,$3) as value', [account.id, await revision(), JSON.stringify([
      { table: 'sessions', operation: 'update', record: { id: session.id, starts_at: '2027-05-11T08:00:00Z', ends_at: '2027-05-11T10:00:00Z', reason: 'Déplacement coordonné de recette' } },
    ])]);
    assert.equal(new Date(await value('select access_opens_at as value from escen.exam_deliveries where id=$1', [delivery.id])).toISOString(), '2027-05-11T08:15:00.000Z');
    await assert.rejects(insert('session_participants', { session_id: session.id, assignment_id: assignment.id,
      offering_id: offering.id, group_id: group.id, teacher_id: anchor.teacher_id, starts_at: session.starts_at, ends_at: session.ends_at, active: true }), /incompatible/);
  });
  const contextFor = async (actor, code, extra = {}) => ({ accountId: actor.id, personId: actor.person_id, authUserId: actor.auth_user_id,
    roleCode: code, role: code === 'IT' ? 'Informaticien' : code === 'DEL' ? 'Délégué' : 'Étudiant',
    permissions: (await db.query('select p.code from escen.permissions p join escen.role_permissions rp on rp.permission_id=p.id join escen.roles r on r.id=rp.role_id where r.code=$1', [code])).rows.map(row => row.code),
    studentId: null, teacherId: null, grants: [{ role_code: code, role_name: code, site_id: null, group_id: null, academic_year_id: null }], ...extra });
  const manager = await contextFor(account, 'IT');
  const api = loadLocalApiModule('app/api/schedule/route.ts', local.client, manager);
  const request = async body => new Request('http://local.test/api/schedule', { method: 'POST', headers: { 'x-escen-year': year.id },
    body: JSON.stringify({ revision: await revision(), reason: 'Validation API du cours commun', ...body }) });
  let apiCourse;
  await check('API réelle : création, lecture et déplacement multi-groupes avec les RPC intégrées', async () => {
    const response = await api.POST(await request({ action: 'create_shared_course', assignmentIds: [anchor.id, assignment.id], roomId: room.id,
      startsAt: '2027-08-10T08:00:00Z', endsAt: '2027-08-10T10:00:00Z' }));
    const result = await response.json(); assert.equal(response.status, 201, JSON.stringify(result)); apiCourse = result.id;
    const directory = await (await api.GET(new Request('http://local.test/api/schedule', { headers: { 'x-escen-year': year.id } }))).json();
    const session = directory.sessions.find(row => row.id === apiCourse);
    assert.equal(session.shared, true); assert.equal(session.canUpdate, true); assert.equal(session.participants.length, 2);
    const moved = await api.POST(await request({ action: 'move_session', sessionId: apiCourse, startsAt: '2027-08-11T08:00:00Z', endsAt: '2027-08-11T10:00:00Z' }));
    assert.equal(moved.status, 200, JSON.stringify(await moved.json()));
  });
  await check('API et snapshot : gestionnaire du second groupe voit le cours sans pouvoir modifier tous les groupes', async () => {
    const scoped = { ...manager, grants: [{ role_code: 'IT', role_name: 'Informaticien', site_id: site.id, group_id: group.id, academic_year_id: year.id }] };
    const restricted = loadLocalApiModule('app/api/schedule/route.ts', local.client, scoped);
    const directory = await (await restricted.GET(new Request('http://local.test/api/schedule', { headers: { 'x-escen-year': year.id } }))).json();
    const session = directory.sessions.find(row => row.id === apiCourse);
    assert.equal(session.groupId, group.id); assert.equal(session.participants.length, 1); assert.equal(session.canUpdate, false);
    const denied = await restricted.POST(await request({ action: 'cancel_session', sessionId: apiCourse })); assert.equal(denied.status, 403);
    const snapshot = await value('select public.escen_backend_snapshot() as value');
    const { filterRelationalSnapshot } = loadLocalApiModule('services/persistentPermissionsService.ts', local.client, scoped);
    const { filterSnapshotForAcademicYear } = loadLocalApiModule('services/academicYearScopeService.ts', local.client, scoped);
    const filtered = filterSnapshotForAcademicYear(filterRelationalSnapshot(snapshot, scoped), year.id);
    assert.ok(filtered.tables.sessions.some(row => row.id === apiCourse));
    assert.equal(filtered.tables.session_participants.filter(row => row.session_id === apiCourse).length, 1);
    assert.ok(filtered.tables.attendances.every(row => row.offering_id === offering.id));
  });
  await check('API présences : délégué du second groupe écrit sa formation, étudiant lit seulement ses présences', async () => {
    const delegateContext = await contextFor(delegateActor, 'DEL', { studentId: secondEnrollment.student_id });
    const attendanceApi = loadLocalApiModule('app/api/attendances/route.ts', local.client, delegateContext);
    const getRequest = new Request('http://local.test/api/attendances', { headers: { 'x-escen-year': year.id } });
    const directory = await (await attendanceApi.GET(getRequest)).json();
    const session = directory.sessions.find(row => row.id === apiCourse);
    assert.deepEqual(session.students.map(row => row.enrollmentId), [secondEnrollment.id]);
    const response = await attendanceApi.POST(new Request('http://local.test/api/attendances', { method: 'POST', headers: { 'x-escen-year': year.id },
      body: JSON.stringify({ action: 'record_students', revision: await revision(), sessionId: apiCourse,
        entries: [{ enrollmentId: secondEnrollment.id, status: 'PRESENT', arrivedAt: null, leftAt: null, lateMinutes: null, comment: '' }] }) }));
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    assert.equal(await value('select offering_id as value from escen.attendances where session_id=$1', [apiCourse]), offering.id);
    const studentContext = await contextFor(delegateActor, 'STUD', { studentId: secondEnrollment.student_id });
    const studentApi = loadLocalApiModule('app/api/attendances/route.ts', local.client, studentContext);
    const studentDirectory = await (await studentApi.GET(getRequest)).json();
    assert.ok(studentDirectory.sessions.find(row => row.id === apiCourse));
    assert.ok(studentDirectory.sessions.every(row => row.students.every(student => student.enrollmentId === secondEnrollment.id)));
  });
  console.log(JSON.stringify({ checks, remoteWrites: 0, migration: 87 }));
} catch (error) {
  console.error(error.stack); process.exitCode = 1;
} finally { await local.close(); }
