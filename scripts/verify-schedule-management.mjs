import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadLocalApiModule } from './local-api-fixture.mjs';
import { verifyExamReschedule } from './verify-exam-reschedule.mjs';

export async function verifyScheduleManagement(db, check, { year, site, level }) {
  const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;
  const insert = async (table, record) => {
    assert.match(table, /^[a-z_]+$/);
    const keys = Object.keys(record);
    keys.forEach(key => assert.match(key, /^[a-z_]+$/));
    return (await db.query(`insert into escen.${table} (${keys.join(',')}) values (${keys.map((_, index) => `$${index + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
  };
  const token = randomUUID();
  await db.query('insert into auth.users(id) values ($1)', [token]);
  const person = await insert('people', { firstname: 'Gestion', lastname: 'Planning' });
  const actor = await insert('accounts', { person_id: person.id, auth_user_id: token, active: true });
  const role = await scalar("select id as value from escen.roles where code='IT'");
  await insert('role_grants', { account_id: actor.id, role_id: role, granted_by: actor.id, reason: 'Recette du planning', valid_from: new Date().toISOString() });
  const context = { accountId: actor.id, personId: person.id, authUserId: token, roleCode: 'IT', role: 'Informaticien',
    permissions: (await db.query('select p.code from escen.permissions p join escen.role_permissions rp on rp.permission_id=p.id where rp.role_id=$1', [role])).rows.map(row => row.code),
    studentId: null, teacherId: null, grants: [{ role_code: 'IT', role_name: 'Informaticien', site_id: null, group_id: null, academic_year_id: null }] };
  const client = { async rpc(name, args) {
    try {
      const data = name === 'escen_backend_snapshot' ? await scalar('select public.escen_backend_snapshot() as value')
        : name === 'escen_academic_year_context' ? await scalar('select public.escen_academic_year_context() as value')
          : name === 'escen_backend_transaction' ? await scalar('select public.escen_backend_transaction($1,$2,$3::jsonb) as value', [args.p_actor_id, args.p_expected_revision, JSON.stringify(args.p_changes)])
            : assert.fail(`RPC inattendue : ${name}`);
      return { data, error: null };
    } catch (error) { return { data: null, error }; }
  } };
  const api = loadLocalApiModule('app/api/schedule/route.ts', client, context);
  const revision = () => scalar('select revision as value from escen_private.portal_revision where singleton');
  const audits = () => scalar('select count(*)::integer as value from escen_private.audit_events');
  const post = async body => api.POST(new Request('http://local.test/api/schedule', { method: 'POST', headers: { 'x-escen-year': year.id }, body: JSON.stringify({ revision: await revision(), reason: 'Planning confirmé par le responsable', ...body }) }));
  const code = `PLN-${randomUUID()}`;
  const program = await insert('programs', { code, name: 'Programme planning' });
  const curriculum = await insert('curricula', { program_id: program.id, level_id: level.id, version: 1 });
  const subject = await insert('subjects', { academic_year_id: year.id, code, name: 'Matière du planning' });
  const semester = await insert('curriculum_semesters', { curriculum_id: curriculum.id, position: 1, name: 'Semestre', target_credits: 30 });
  const unit = await insert('teaching_units', { curriculum_id: curriculum.id, semester_id: semester.id, code, name: 'UE', credits: 30 });
  const component = await insert('curriculum_components', { curriculum_id: curriculum.id, unit_id: unit.id, subject_id: subject.id, code, coefficient: 1, credits: 30 });
  await insert('assessment_weights', { curriculum_id: curriculum.id, component_id: component.id, evaluation_kind: 'DEVOIR', percent: 100 });
  await db.query("update escen.curricula set status='APPROVED', approved_by=$1, approved_at=now() where id=$2", [actor.id, curriculum.id]);
  const offering = await insert('academic_offerings', { curriculum_id: curriculum.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  await insert('offering_semesters', { offering_id: offering.id, curriculum_id: curriculum.id, curriculum_semester_id: semester.id, starts_on: '2026-02-01', ends_on: '2027-11-30' });
  const teachers = [];
  for (let index = 0; index < 2; index++) {
    const person = await insert('people', { firstname: 'Professeur', lastname: `${index}` });
    const staff = await insert('staff', { person_id: person.id, employee_number: `${code}-${index}` });
    teachers.push(await insert('teachers', { staff_id: staff.id }));
  }
  const group = await insert('groups', { academic_year_id: year.id, level_id: level.id, site_id: site.id, name: code });
  await insert('group_offerings', { group_id: group.id, offering_id: offering.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  const assignment = await insert('teaching_assignments', { teacher_id: teachers[0].id, group_id: group.id, offering_id: offering.id, curriculum_id: curriculum.id, component_id: component.id, valid_from: '2026-01-01', valid_until: '2027-12-31' });
  const rooms = [];
  for (let index = 0; index < 2; index++) rooms.push(await insert('rooms', { site_id: site.id, code: `${code}-${index}`, name: `Salle recette ${index}`, capacity: 30 }));
  const create = { action: 'create_session', assignmentId: assignment.id, roomId: rooms[0].id, mode: 'COURS', startsAt: '2027-02-10T08:00:00Z', endsAt: '2027-02-10T10:00:00Z' };
  let sessionId;
  await check('Planning : création de séance via API et transaction réelle, auteur et motif audités', async () => {
    const before = await revision();
    const response = await post(create); const result = await response.json();
    assert.equal(response.status, 201, JSON.stringify(result)); sessionId = result.id;
    assert.equal(result.revision, before + 1);
    const row = (await db.query('select * from escen.sessions where id=$1', [sessionId])).rows[0];
    assert.equal(row.assignment_id, assignment.id); assert.equal(row.group_id, group.id);
    const audit = (await db.query("select * from escen_private.audit_events where table_name='sessions' and entity_id=$1", [sessionId])).rows[0];
    assert.equal(audit.actor_id, actor.id); assert.equal(audit.reason, 'Planning confirmé par le responsable');
  });
  await check('Planning : modification de salle conserve le contexte et l’historique avant/après', async () => {
    const response = await post({ ...create, action: 'update_session', sessionId, roomId: rooms[1].id });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    const audit = (await db.query("select * from escen_private.audit_events where entity_id=$1 and action='UPDATE' order by happened_at desc", [sessionId])).rows[0];
    assert.equal(audit.old_value.room_id, rooms[0].id); assert.equal(audit.new_value.room_id, rooms[1].id);
  });
  await check('Planning : déplacement horaire persistant, autre séance inchangée', async () => {
    const response = await post({ action: 'move_session', sessionId, startsAt: '2027-02-11T10:00:00Z', endsAt: '2027-02-11T12:00:00Z' });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    assert.equal(new Date(await scalar('select starts_at as value from escen.sessions where id=$1', [sessionId])).toISOString(), '2027-02-11T10:00:00.000Z');
  });
  await check('Planning : remplacement ponctuel et retour à l’enseignant d’origine', async () => {
    for (const teacherId of [teachers[1].id, null]) {
      const response = await post({ action: 'replace_teacher', sessionId, teacherId });
      assert.equal(response.status, 200, JSON.stringify(await response.json()));
      assert.equal(await scalar('select effective_teacher_id as value from escen.sessions where id=$1', [sessionId]), teacherId || teachers[0].id);
    }
    assert.equal(await scalar('select teacher_id as value from escen.teaching_assignments where id=$1', [assignment.id]), teachers[0].id);
  });
  await check('Planning : conflit de groupe refusé sans révision ni audit partiel', async () => {
    const before = await revision(), auditCount = await audits();
    const response = await post({ ...create, startsAt: '2027-02-11T11:00:00Z', endsAt: '2027-02-11T13:00:00Z' });
    assert.equal(response.status, 409); assert.match((await response.json()).error, /groupe/);
    assert.equal(await revision(), before); assert.equal(await audits(), auditCount);
  });
  await check('Planning : semestre SQL refuse un créneau hors période sans succès fictif', async () => {
    const before = await revision(), auditCount = await audits();
    const response = await post({ ...create, startsAt: '2027-12-10T08:00:00Z', endsAt: '2027-12-10T10:00:00Z' });
    assert.equal(response.status, 409); assert.match((await response.json()).error, /semestre/);
    assert.equal(await revision(), before); assert.equal(await audits(), auditCount);
  });
  await check('Planning : une période contenant une séance active ne peut être bloquée', async () => {
    const response = await post({ action: 'block_period', name: 'Fermeture impossible', kind: 'FERMETURE', siteId: site.id, startsAt: '2027-02-11T00:00:00Z', endsAt: '2027-02-12T00:00:00Z' });
    assert.equal(response.status, 409); assert.match((await response.json()).error, /séances existantes/);
  });
  await check('Planning : annulation motivée conserve la séance et libère le créneau', async () => {
    const response = await post({ action: 'cancel_session', sessionId, reason: 'Indisponibilité exceptionnelle confirmée' });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    assert.equal(await scalar('select status as value from escen.sessions where id=$1', [sessionId]), 'ANNULE');
    const replacement = await post({ ...create, startsAt: '2027-02-11T10:00:00Z', endsAt: '2027-02-11T12:00:00Z' });
    assert.equal(replacement.status, 201, JSON.stringify(await replacement.json()));
  });
  await check('Planning : blocage motivé, audité, puis création de séance dans la période refusée', async () => {
    const response = await post({ action: 'block_period', name: 'Fermeture autorisée', kind: 'FERMETURE', siteId: site.id, startsAt: '2027-02-15T00:00:00Z', endsAt: '2027-02-16T00:00:00Z' });
    const result = await response.json(); assert.equal(response.status, 201, JSON.stringify(result));
    const audit = (await db.query("select * from escen_private.audit_events where table_name='blocked_periods' and entity_id=$1", [result.id])).rows[0];
    assert.equal(audit.reason, 'Planning confirmé par le responsable'); assert.equal(audit.actor_id, actor.id);
    const before = await revision(), count = await audits();
    const refused = await post({ ...create, startsAt: '2027-02-15T08:00:00Z', endsAt: '2027-02-15T10:00:00Z' });
    assert.equal(refused.status, 409); assert.match((await refused.json()).error, /période bloquée/);
    assert.equal(await revision(), before); assert.equal(await audits(), count);
  });
  await verifyExamReschedule(db, check, { insert, scalar, post, client, actor, year, site, level, offering, component, group, assignment, teachers, rooms });
}
