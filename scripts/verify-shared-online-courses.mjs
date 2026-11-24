import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { localBusinessFixture } from '../tests/ui/local-business-fixture.mjs';
import { verifyScheduleManagement } from './verify-schedule-management.mjs';
import { loadLocalApiModule } from './local-api-fixture.mjs';

const local = await localBusinessFixture({ before: '202611230122_shared_online_courses.sql', uncachedFixtureSnapshots: true });
const { db, value, insert, account, year, level } = local;
let checks = 0;
const check = async (name, run) => { await run(); checks++; console.log(`✓ ${name}`); };
const revision = () => value('select revision as value from escen_private.portal_revision where singleton');
const audits = () => value('select count(*)::int as value from escen_private.audit_events');
const originalFetch = globalThis.fetch;
const envNames = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'];
const previousEnv = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
globalThis.fetch = async () => { throw new Error('Réseau interdit dans cette recette locale'); };
try {
  const site = await insert('sites', { code: 'SHARED-ONLINE', name: 'Recette cours commun en ligne' });
  await verifyScheduleManagement(db, check, { site, year, level, verifyExams: false });
  const beforeSessions = (await db.query('select * from escen.sessions order by id')).rows;
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(await readFile(new URL('../supabase/migrations/202611230122_shared_online_courses.sql', import.meta.url), 'utf8'));
  await check('Migration : séances historiques préservées, nouvelles RPC interdites au navigateur', async () => {
    assert.deepEqual((await db.query('select * from escen.sessions order by id')).rows, beforeSessions);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      for (const schema of ['public', 'escen']) {
        const name = schema === 'public' ? 'escen_shared_course_create' : 'create_shared_course';
        assert.equal(await value('select has_function_privilege($1,$2,\'EXECUTE\') as value',
          [role, `${schema}.${name}(uuid,text,bigint,uuid,uuid[],uuid,timestamptz,timestamptz,text,text,text,text,text)`]), schema === 'public' && role === 'service_role');
      }
    }
  });
  const anchor = (await db.query('select a.* from escen.teaching_assignments a join escen.academic_offerings o on o.id=a.offering_id where o.site_id=$1 limit 1', [site.id])).rows[0];
  const group = await insert('groups', { academic_year_id: year.id, level_id: level.id, site_id: site.id, name: 'Autre groupe en ligne' });
  await insert('group_offerings', { group_id: group.id, offering_id: anchor.offering_id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  const assignment = await insert('teaching_assignments', { teacher_id: anchor.teacher_id, group_id: group.id, offering_id: anchor.offering_id,
    curriculum_id: anchor.curriculum_id, component_id: anchor.component_id, valid_from: '2026-01-01', valid_until: '2027-12-31' });
  const context = { accountId: account.id, personId: account.person_id, authUserId: account.auth_user_id, roleCode: 'IT', role: 'Informaticien',
    permissions: (await db.query("select p.code from escen.permissions p join escen.role_permissions rp on rp.permission_id=p.id join escen.roles r on r.id=rp.role_id where r.code='IT'")).rows.map(row => row.code), studentId: null, teacherId: null,
    grants: [{ role_code: 'IT', role_name: 'Informaticien', site_id: null, group_id: null, academic_year_id: null }] };
  const api = loadLocalApiModule('app/api/schedule/route.ts', local.client, context);
  const post = async body => api.POST(new Request('http://local.test/api/schedule', { method: 'POST', headers: { 'x-escen-year': year.id },
    body: JSON.stringify({ revision: await revision(), reason: 'Cours commun en ligne confirmé', ...body }) }));
  const command = { action: 'create_shared_course', assignmentIds: [anchor.id, assignment.id], roomId: null, mode: 'EN_LIGNE',
    meetingUrl: 'https://teams.microsoft.com/l/meetup-join/shared-online', startsAt: '2027-06-10T08:00:00Z', endsAt: '2027-06-10T10:00:00Z' };
  let sessionId;
  await check('API et SQL : une séance en ligne sans salle, deux participants, lien et auteur audités', async () => {
    const before = await revision();
    const response = await post(command), result = await response.json();
    assert.equal(response.status, 201, JSON.stringify(result)); sessionId = result.id;
    assert.equal(result.revision, before + 1);
    const session = (await db.query('select * from escen.sessions where id=$1', [sessionId])).rows[0];
    assert.equal(session.mode, 'EN_LIGNE'); assert.equal(session.room_id, null); assert.equal(session.meeting_url, command.meetingUrl);
    assert.equal(await value('select count(*)::int as value from escen.session_participants where session_id=$1', [sessionId]), 2);
    assert.equal(await value("select actor_id as value from escen_private.audit_events where entity_id=$1 and table_name='sessions'", [sessionId]), account.id);
    const directory = await (await api.GET(new Request('http://local.test/api/schedule', { headers: { 'x-escen-year': year.id } }))).json();
    const shared = directory.sessions.find(row => row.id === sessionId);
    assert.equal(shared.shared, true); assert.equal(shared.participants.length, 2); assert.equal(shared.meetingUrl, command.meetingUrl);
  });
  await check('Conflit et paramètres contradictoires : aucun succès ni audit partiel', async () => {
    const before = await revision(), count = await audits();
    const room = await value('select id as value from escen.rooms where site_id=$1 limit 1', [site.id]);
    for (const patch of [{ roomId: room }, { mode: 'COURS' }, { mode: 'PAPIER' }]) assert.equal((await post({ ...command, ...patch })).status, 400);
    assert.equal((await post(command)).status, 409);
    assert.equal(await revision(), before); assert.equal(await audits(), count);
  });
  await check('Cours commun en ligne : mise à jour du lien, enregistrement, déplacement et remplacement conservés', async () => {
    for (const body of [
      { action: 'generate_online_link', sessionId, customMeetingUrl: `${command.meetingUrl}-updated` },
      { action: 'sync_recording', sessionId, recordingUrl: 'https://example.test/recording.mp4' },
      { action: 'move_session', sessionId, startsAt: '2027-06-11T08:00:00Z', endsAt: '2027-06-11T10:00:00Z' },
      { action: 'replace_teacher', sessionId, teacherId: null },
    ]) {
      const response = await post(body); assert.equal(response.status, 200, JSON.stringify(await response.json()));
    }
    const participants = (await db.query('select * from escen.session_participants where session_id=$1', [sessionId])).rows;
    assert.equal(participants.length, 2);
    assert.ok(participants.every(row => new Date(row.starts_at).toISOString() === '2027-06-11T08:00:00.000Z' && row.active));
    await assert.rejects(db.query("update escen.sessions set mode='COURS',room_id=(select id from escen.rooms limit 1) where id=$1", [sessionId]), /Conserver les affectations/);
  });
  await check('Annulation : les deux groupes sont libérés ensemble', async () => {
    const response = await post({ action: 'cancel_session', sessionId });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    assert.equal(await value('select count(*)::int as value from escen.session_participants where session_id=$1 and active', [sessionId]), 0);
  });
  await check('RPC en ligne : droits et cohérence salle/mode vérifiés aussi sans l’API', async () => {
    const before = await revision(), count = await audits();
    const room = await value('select id as value from escen.rooms where site_id=$1 limit 1', [site.id]);
    for (const [role, mode, roomId] of [['MKT', 'EN_LIGNE', null], ['IT', 'COURS', null], ['IT', 'EN_LIGNE', room], ['IT', 'PAPIER', room]]) {
      await assert.rejects(value('select public.escen_shared_course_create($1,$2,$3,$4,$5::uuid[],$6,$7,$8,$9,$10,$11,$12,$13) as value',
        [account.id, role, before, randomUUID(), [anchor.id, assignment.id], roomId, command.startsAt, command.endsAt,
          'Recette des contrôles RPC', mode, command.meetingUrl, null, 'TEAMS']));
    }
    assert.equal(await revision(), before); assert.equal(await audits(), count);
  });
  await check('Création automatique : une seule réunion pour tous les groupes, enseignant coorganisateur', async () => {
    const teacherPerson = await value('select s.person_id as value from escen.staff s join escen.teachers t on t.staff_id=s.id where t.id=$1', [anchor.teacher_id]);
    const teacherAuthId = randomUUID(); await db.query('insert into auth.users(id) values($1)', [teacherAuthId]);
    await insert('accounts', { person_id: teacherPerson, auth_user_id: teacherAuthId, active: true });
    const client = { ...local.client, auth: { ...local.client.auth, admin: { getUserById: async () => ({ data: { user: { email: 'teacher@escen.university', app_metadata: {} } }, error: null }) } } };
    const automaticApi = loadLocalApiModule('app/api/schedule/route.ts', client, context);
    const automaticPost = async () => automaticApi.POST(new Request('http://local.test/api/schedule', { method: 'POST', headers: { 'x-escen-year': year.id },
      body: JSON.stringify({ ...command, meetingUrl: null, groupIds: [anchor.group_id, group.id], componentId: anchor.component_id,
        teacherId: anchor.teacher_id, revision: await revision(), reason: 'Génération automatique commune' }) }));
    let meetings = 0;
    for (const name of envNames) process.env[name] = 'local-fixture';
    globalThis.fetch = async (input, options = {}) => {
      const url = String(input);
      if (url.startsWith('https://login.microsoftonline.com/')) return Response.json({ access_token: 'local-token' });
      assert.ok(url.startsWith('https://graph.microsoft.com/'), 'Aucun appel réseau externe permis');
      if (url.includes('/users/class5%40')) return Response.json({ id: 'class5-id' });
      if (url.includes('/users/teacher%40')) return Response.json({ id: 'teacher-id' });
      if (url.endsWith('/onlineMeetings/createOrGet')) {
        meetings++; const body = JSON.parse(options.body);
        assert.equal(body.participants.attendees[0].role, 'coorganizer');
        assert.equal(body.participants.attendees[0].upn, 'teacher@escen.university');
        return Response.json({ id: 'shared-meeting-id', joinWebUrl: `${command.meetingUrl}-automatic` });
      }
      if (options.method === 'PATCH') return Response.json(JSON.parse(options.body));
      assert.fail(`Appel Graph inattendu : ${url}`);
    };
    const response = await automaticPost(), result = await response.json();
    assert.equal(response.status, 201, JSON.stringify(result)); assert.equal(meetings, 1);
    assert.equal(await value('select meeting_id as value from escen.sessions where id=$1', [result.id]), 'shared-meeting-id');
    assert.equal(await value('select count(*)::int as value from escen.session_participants where session_id=$1', [result.id]), 2);
    for (const name of envNames) delete process.env[name];
    const before = await revision(), count = await audits();
    const unavailable = await automaticPost();
    assert.equal(unavailable.status, 503, JSON.stringify(await unavailable.json()));
    assert.equal(await revision(), before); assert.equal(await audits(), count); assert.equal(meetings, 1);
  });
  await check('Cours commun inter-maquettes (DRAFT) : création automatique de la matière sans colonne coefficient obsolète', async () => {
    const draftProgram = await insert('programs', { code: 'SHARED-DRAFT-2', name: 'Formation brouillon cours commun' });
    const draftCurr = await insert('curricula', { program_id: draftProgram.id, level_id: level.id, version: 1, status: 'DRAFT' });
    const draftOffering = await insert('academic_offerings', { curriculum_id: draftCurr.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
    const draftGroup = await insert('groups', { academic_year_id: year.id, level_id: level.id, site_id: site.id, name: 'Groupe maquette brouillon' });
    await insert('group_offerings', { group_id: draftGroup.id, offering_id: draftOffering.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
    const res = await post({
      action: 'create_shared_course',
      groupIds: [anchor.group_id, draftGroup.id],
      componentId: anchor.component_id,
      teacherId: anchor.teacher_id,
      roomId: null,
      mode: 'EN_LIGNE',
      meetingUrl: 'https://teams.microsoft.com/l/meetup-join/shared-draft-curriculum',
      startsAt: '2027-06-15T08:00:00Z',
      endsAt: '2027-06-15T10:00:00Z',
    });
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));
    assert.equal(await value('select count(*)::int as value from escen.session_participants where session_id=$1', [body.id]), 2);
  });
  console.log(`${checks} contrôles planning et cours communs en ligne réussis (PGlite local).`);
} finally {
  globalThis.fetch = originalFetch;
  for (const name of envNames) {
    if (previousEnv[name] === undefined) delete process.env[name]; else process.env[name] = previousEnv[name];
  }
  await local.close();
}
