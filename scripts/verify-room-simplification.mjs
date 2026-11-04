import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { localBusinessFixture } from '../tests/ui/local-business-fixture.mjs';
import { verifyScheduleManagement } from './verify-schedule-management.mjs';

// Rehearse the proposed SQL in disposable PGlite, never against Supabase.
const local = await localBusinessFixture();
let checks = 0;
const check = async (name, run) => { await run(); checks++; console.log(`✓ ${name}`); };
try {
  await local.db.exec(await readFile(new URL('../docs/sql-proposals/20261104_rooms_without_capacity.sql', import.meta.url), 'utf8'));
  await check('Salle créée par API sans bâtiment ni capacité, avec audit', async () => {
    const revision = await local.value('select revision as value from escen_private.portal_revision where singleton');
    const response = await local.dispatch(new Request('http://local.test/api/catalog/rooms', {
      method: 'POST', headers: { Authorization: 'Bearer fixture-auth-token', 'x-escen-role': 'Informaticien',
        'x-escen-year': local.year.id, 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision, values: { code: 'L1', name: 'Salle des L1' }, reason: 'Salle sans capacité' }),
    }));
    const result = await response.json();
    assert.equal(response.status, 201, JSON.stringify(result));
    const room = (await local.db.query("select * from escen.rooms where code='L1'")).rows[0];
    assert.equal(room.capacity, null);
    assert.equal(room.building_id, null);
    assert.equal(room.site_id, null);
    assert.equal(await local.value("select count(*)::int as value from escen_private.audit_events where table_name='rooms' and entity_id=$1 and actor_id is not null", [room.id]), 1);
    await assert.rejects(local.insert('rooms', { code: 'L1', name: 'Doublon' }), /unique/i);
  });
  const site = await local.insert('sites', { code: 'TEST-ROOMS', name: 'Périmètre historique de recette' });
  const year = (await local.db.query("update escen.academic_years set starts_on='2026-01-01', ends_on='2027-12-31' where id=$1 returning *", [local.year.id])).rows[0];
  await verifyScheduleManagement(local.db, check, { site, year, level: local.level, verifyExams: false });
  await check('Examens : création sans capacité et ancienne capacité non bloquante', async () => {
    const assignment = (await local.db.query('select a.* from escen.teaching_assignments a join escen.academic_offerings o on o.id=a.offering_id where o.site_id=$1 limit 1', [site.id])).rows[0];
    const rooms = (await local.db.query('select * from escen.rooms where site_id=$1', [site.id])).rows;
    await local.db.query('update escen.rooms set capacity=1 where site_id=$1', [site.id]);
    const session = await local.insert('sessions', { assignment_id: assignment.id, offering_id: assignment.offering_id,
      group_id: assignment.group_id, teacher_id: assignment.teacher_id, room_id: rooms[0].id,
      starts_at: '2027-03-01T08:00:00Z', ends_at: '2027-03-01T10:00:00Z', mode: 'PAPIER' });
    const evaluation = await local.insert('evaluations', { assignment_id: assignment.id, offering_id: assignment.offering_id,
      component_id: assignment.component_id, name: 'Examen sans capacité', kind: 'EXAMEN', created_by: local.account.id });
    const delivery = await local.insert('exam_deliveries', { evaluation_id: evaluation.id, session_id: session.id,
      access_opens_at: session.starts_at, access_closes_at: session.ends_at });
    const room = await local.insert('exam_rooms', { evaluation_id: evaluation.id, delivery_id: delivery.id, room_id: rooms[0].id });
    assert.equal(room.assigned_capacity, null);
    await local.insert('exam_rooms', { evaluation_id: evaluation.id, delivery_id: delivery.id, room_id: rooms[1].id, assigned_capacity: 100 });
  });
  console.log(JSON.stringify({ checks, remoteWrites: 0 }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await local.close(); }
