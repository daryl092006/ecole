import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function verifyExamReschedule(db, check, { insert, scalar, post, client, actor, year, site, level, offering, component, group, assignment, teachers, rooms }) {
  const revision = () => scalar('select revision as value from escen_private.portal_revision where singleton');
  const audits = () => scalar('select count(*)::integer as value from escen_private.audit_events');
  const person = await insert('people', { firstname: 'Candidate', lastname: 'Planning' });
  const student = await insert('students', { person_id: person.id, matricule: `EX-${randomUUID()}` });
  const enrollment = await insert('enrollments', { student_id: student.id, offering_id: offering.id, status: 'INSCRIT' });
  await insert('enrollment_groups', { enrollment_id: enrollment.id, offering_id: offering.id, group_id: group.id, valid_from: '2026-01-01', changed_by: actor.id, reason: 'Inscription recette épreuve' });
  let sequence = 0;
  const iso = value => new Date(value).toISOString();
  const fixture = async (options = {}) => {
    const startsAt = options.startsAt || new Date(Date.UTC(2027, 2, 1 + sequence++ * 3, 8)).toISOString();
    const endsAt = options.endsAt || new Date(Date.parse(startsAt) + 2 * 3600000).toISOString();
    const evaluation = await insert('evaluations', { assignment_id: assignment.id, offering_id: offering.id, component_id: component.id, kind: 'DEVOIR', name: `Épreuve à déplacer ${sequence}`, created_by: actor.id });
    const session = await insert('sessions', { assignment_id: assignment.id, offering_id: offering.id, group_id: group.id, teacher_id: teachers[0].id, mode: 'PAPIER', room_id: rooms[0].id, starts_at: startsAt, ends_at: endsAt });
    const delivery = await insert('exam_deliveries', { evaluation_id: evaluation.id, session_id: session.id, access_opens_at: new Date(Date.parse(startsAt) + 15 * 60000).toISOString(), access_closes_at: new Date(Date.parse(startsAt) + 105 * 60000).toISOString(), duration_minutes: 60 });
    const candidate = await insert('evaluation_candidates', { evaluation_id: evaluation.id, enrollment_id: enrollment.id, offering_id: offering.id, eligibility: 'ELIGIBLE' });
    return { evaluation, session, delivery, candidate, startsAt, endsAt, nextStart: new Date(Date.parse(startsAt) + 86400000).toISOString(), nextEnd: new Date(Date.parse(endsAt) + 86400000).toISOString() };
  };
  const state = async exam => ({
    session: await scalar('select to_jsonb(s) as value from escen.sessions s where id=$1', [exam.session.id]),
    delivery: await scalar('select to_jsonb(d) as value from escen.exam_deliveries d where id=$1', [exam.delivery.id]),
    revision: await revision(), auditCount: await audits(),
  });
  const move = (exam, patch = {}) => post({ action: 'move_session', sessionId: exam.session.id, startsAt: exam.nextStart, endsAt: exam.nextEnd, ...patch });
  const rawMove = async (exam, patch = {}) => client.rpc('escen_backend_transaction', { p_actor_id: actor.id, p_expected_revision: await revision(), p_changes: [{ table: 'sessions', operation: 'update', record: {
    id: exam.session.id, starts_at: exam.nextStart, ends_at: exam.nextEnd, reason: 'Déplacement coordonné validé', ...patch,
  } }] });
  const refuse = async (exam, pattern, patch = {}) => {
    const before = await state(exam);
    const result = await rawMove(exam, patch);
    assert.ok(result.error); assert.match(result.error.message, pattern);
    assert.deepEqual(await state(exam), before);
  };

  await check('Épreuve déplacée : accès décalés ensemble, durée et deux audits conservés, une révision', async () => {
    const exam = await fixture();
    // A blank grade is not a result.
    await insert('grades', { candidate_id: exam.candidate.id, value: null, entered_by: actor.id, last_modified_by: actor.id });
    const before = await state(exam);
    const response = await move(exam); const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    const after = await state(exam);
    assert.equal(iso(after.session.starts_at), exam.nextStart);
    assert.equal(Date.parse(after.delivery.access_opens_at) - Date.parse(before.delivery.access_opens_at), 86400000);
    assert.equal(Date.parse(after.delivery.access_closes_at) - Date.parse(before.delivery.access_closes_at), 86400000);
    assert.equal(after.delivery.duration_minutes, 60);
    assert.equal(after.delivery.reason, 'Planning confirmé par le responsable');
    assert.equal(after.revision, before.revision + 1); assert.equal(after.auditCount, before.auditCount + 2);
    const events = (await db.query("select * from escen_private.audit_events where entity_id in ($1,$2) and action='UPDATE' order by happened_at desc limit 2", [exam.session.id, exam.delivery.id])).rows;
    assert.deepEqual(new Set(events.map(event => event.table_name)), new Set(['sessions', 'exam_deliveries']));
    assert.ok(events.every(event => event.actor_id === actor.id && event.reason === 'Planning confirmé par le responsable'));
  });
  await check('Épreuve déplacée : Modifier la séance passe par la même transaction', async () => {
    const exam = await fixture();
    const response = await post({ action: 'update_session', sessionId: exam.session.id, assignmentId: assignment.id, mode: 'PAPIER', roomId: rooms[0].id, startsAt: exam.nextStart, endsAt: exam.nextEnd });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    assert.equal(Date.parse((await state(exam)).delivery.access_opens_at) - new Date(exam.delivery.access_opens_at).getTime(), 86400000);
  });
  await check('Épreuve déplacée : créneau trop court, motif absent et motif trop court refusés sans effets partiels', async () => {
    const exam = await fixture();
    assert.equal(exam.delivery.reason, null);
    await refuse(exam, /toute la fenêtre/, { ends_at: new Date(Date.parse(exam.nextStart) + 3600000).toISOString() });
    await refuse(exam, /motif/, { reason: null });
    await refuse(exam, /motif/, { reason: 'ab' });
  });
  await check('Épreuve déplacée : zéro réel et absence bloquent API et SQL', async () => {
    for (const grade of [{ value: 0 }, { value: null, absence_status: 'ABSENT' }]) {
      const exam = await fixture();
      await insert('grades', { candidate_id: exam.candidate.id, entered_by: actor.id, last_modified_by: actor.id, ...grade });
      await refuse(exam, /copie ou résultat/);
      const response = await move(exam);
      assert.equal(response.status, 409); assert.match((await response.json()).error, /copie ou résultat/);
    }
  });
  await check('Épreuve déplacée : copie existante refusée indépendamment de la comparaison horaire', async () => {
    const existing = (await db.query('select evaluation_id from escen.exam_attempts limit 1')).rows[0];
    assert.ok(existing, 'La recette des copies doit avoir créé une tentative réelle.');
    await assert.rejects(db.query("select escen_private.assert_exam_reschedule($1, clock_timestamp()+interval '1 day', clock_timestamp()+interval '2 days', 'Déplacement interdit avec copie')", [existing.evaluation_id]), /copie ou résultat/);
  });
  await check('Épreuve déplacée : ouverture passée ou atteinte, y compris pour une fin seule', async () => {
    const now = new Date(await scalar('select clock_timestamp() as value')).getTime();
    const exam = await fixture({ startsAt: new Date(now - 3600000).toISOString(), endsAt: new Date(now + 3600000).toISOString() });
    await refuse(exam, /déjà ouverte/);
    await refuse(exam, /déjà ouverte/, { starts_at: exam.startsAt, ends_at: new Date(now + 2 * 3600000).toISOString() });
    await assert.rejects(db.query("select escen_private.assert_exam_reschedule($1, clock_timestamp(), clock_timestamp()+interval '1 day', 'Ouverture atteinte interdite')", [exam.evaluation.id]), /déjà ouverte/);
  });
  await check('Épreuve déplacée : nouvelle ouverture passée et modification directe sans motif refusées', async () => {
    const exam = await fixture();
    const now = new Date(await scalar('select clock_timestamp() as value')).getTime();
    await refuse(exam, /doit rester dans le futur/, { starts_at: new Date(now - 5 * 3600000).toISOString(), ends_at: new Date(now - 3 * 3600000).toISOString() });
    const before = await state(exam);
    const result = await client.rpc('escen_backend_transaction', { p_actor_id: actor.id, p_expected_revision: before.revision, p_changes: [{ table: 'exam_deliveries', operation: 'update', record: {
      id: exam.delivery.id, access_opens_at: new Date(Date.parse(exam.startsAt) + 20 * 60000).toISOString(), reason: null,
    } }] });
    assert.match(result.error?.message || '', /motif/); assert.deepEqual(await state(exam), before);
  });

  const otherGroup = await insert('groups', { academic_year_id: year.id, level_id: level.id, site_id: site.id, name: `SECOND-${randomUUID()}` });
  await insert('group_offerings', { group_id: otherGroup.id, offering_id: offering.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  const otherAssignment = await insert('teaching_assignments', { teacher_id: teachers[1].id, group_id: otherGroup.id, offering_id: offering.id, curriculum_id: offering.curriculum_id, component_id: component.id, valid_from: '2026-01-01', valid_until: '2027-12-31' });
  const otherSession = (exam, extra = {}) => insert('sessions', { assignment_id: otherAssignment.id, offering_id: offering.id, group_id: otherGroup.id, teacher_id: teachers[1].id, room_id: rooms[1].id, mode: 'COURS', starts_at: exam.nextStart, ends_at: exam.nextEnd, ...extra });
  await check('Épreuve déplacée : conflit tardif de salle secondaire annule accès, séance, audit et révision', async () => {
    const exam = await fixture();
    await insert('exam_rooms', { delivery_id: exam.delivery.id, evaluation_id: exam.evaluation.id, room_id: rooms[1].id, assigned_capacity: 10 });
    await otherSession(exam);
    await refuse(exam, /salle secondaire/);
    const response = await move(exam);
    assert.equal(response.status, 409); assert.match((await response.json()).error, /salle secondaire/);
  });
  await check('Épreuve déplacée : conflit entre salles secondaires de deux épreuves refusé', async () => {
    const exam = await fixture();
    await insert('exam_rooms', { delivery_id: exam.delivery.id, evaluation_id: exam.evaluation.id, room_id: rooms[1].id, assigned_capacity: 10 });
    const session = await otherSession(exam, { mode: 'EN_LIGNE', room_id: null });
    const evaluation = await insert('evaluations', { assignment_id: otherAssignment.id, offering_id: offering.id, component_id: component.id, name: 'Autre épreuve', kind: 'DEVOIR', created_by: actor.id });
    const delivery = await insert('exam_deliveries', { evaluation_id: evaluation.id, session_id: session.id, access_opens_at: exam.nextStart, access_closes_at: exam.nextEnd, duration_minutes: 60 });
    await insert('exam_rooms', { delivery_id: delivery.id, evaluation_id: evaluation.id, room_id: rooms[1].id, assigned_capacity: 10 });
    await refuse(exam, /salle secondaire/);
  });
  for (const inRoom of [false, true]) await check(`Épreuve déplacée : conflit du surveillant ${inRoom ? 'de salle' : 'de séance'} refusé`, async () => {
    const exam = await fixture();
    if (inRoom) {
      const room = await insert('exam_rooms', { delivery_id: exam.delivery.id, evaluation_id: exam.evaluation.id, room_id: rooms[1].id, assigned_capacity: 10 });
      await insert('exam_room_supervisors', { exam_room_id: room.id, account_id: actor.id });
    } else await insert('session_supervisors', { session_id: exam.session.id, account_id: actor.id });
    const session = await otherSession(exam, { mode: 'EN_LIGNE', room_id: null });
    await insert('session_supervisors', { session_id: session.id, account_id: actor.id });
    await refuse(exam, /Surveillant déjà affecté/);
  });
}
