import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadLocalApiModule } from './local-api-fixture.mjs';

export async function verifyOnlineExams(db, check, { year, actor, teaching, offering, addStudent, insert, post }) {
  const scalar = async (sql, values = []) => (await db.query(sql, values)).rows[0].value;
  const profile = async () => {
    const enrollment = await addStudent('REINSCRIT');
    const student = (await db.query('select * from escen.students where id=$1', [enrollment.student_id])).rows[0];
    const authId = randomUUID();
    await db.query('insert into auth.users(id) values ($1)', [authId]);
    const account = await insert('accounts', { person_id: student.person_id, auth_user_id: authId, active: true });
    const roleId = await scalar("select id as value from escen.roles where code='STUD'");
    await insert('role_grants', { account_id: account.id, role_id: roleId, granted_by: actor.id, valid_from: new Date().toISOString(), reason: 'Passage de recette' });
    const context = { accountId: account.id, personId: student.person_id, authUserId: authId, roleCode: 'STUD', role: 'Étudiant', permissions: ['exam.take'], studentId: student.id, teacherId: null, grants: [] };
    const client = { async rpc(name, args) {
      assert.equal(name, 'escen_online_exam');
      try {
        const data = await scalar('select public.escen_online_exam($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) as value', [args.p_actor_id, args.p_role_code, args.p_action, args.p_year_id ?? null, args.p_evaluation_id ?? null, args.p_attempt_id ?? null, args.p_expected_revision ?? null, args.p_save_id ?? null, JSON.stringify(args.p_answers ?? [])]);
        return { data, error: null };
      } catch (error) { return { data: null, error: { code: error.code, message: error.message } }; }
    } };
    const route = loadLocalApiModule('app/api/exam-attempts/route.ts', client, context);
    const request = (body) => route.POST(new Request('http://local.test/api/exam-attempts', { method: 'POST', body: JSON.stringify(body) }));
    const read = id => route.GET(new Request(`http://local.test/api/exam-attempts${id ? `?attemptId=${id}` : ''}`, { headers: { 'x-escen-year': year.id } }));
    return { account, enrollment, context, request, read };
  };
  const semesterId = await scalar('select u.semester_id as value from escen.curriculum_components c join escen.teaching_units u on u.id=c.unit_id where c.id=$1', [teaching.component_id]);
  await insert('offering_semesters', { offering_id: offering.id, curriculum_id: teaching.curriculum_id, curriculum_semester_id: semesterId, starts_on: year.starts_on, ends_on: year.ends_on });
  const people = await Promise.all([profile(), profile(), profile()]);
  const now = new Date(await scalar('select clock_timestamp() as value')).getTime();
  const closes = new Date(now + 12000).toISOString();
  const session = await insert('sessions', { assignment_id: teaching.id, offering_id: offering.id, group_id: teaching.group_id, teacher_id: teaching.teacher_id, room_id: null, mode: 'EN_LIGNE', starts_at: new Date(now - 500).toISOString(), ends_at: closes });
  const evaluation = await insert('evaluations', { assignment_id: teaching.id, offering_id: offering.id, component_id: teaching.component_id, name: 'Remise persistante', kind: 'DEVOIR', created_by: actor.id });
  await insert('exam_deliveries', { evaluation_id: evaluation.id, session_id: session.id, access_opens_at: new Date(now - 500).toISOString(), access_closes_at: closes, duration_minutes: 30 });
  for (const person of people) await insert('evaluation_candidates', { evaluation_id: evaluation.id, enrollment_id: person.enrollment.id, offering_id: offering.id, eligibility: 'ELIGIBLE' });
  const paper = await insert('exam_papers', { evaluation_id: evaluation.id, version: 1 });
  const part = await insert('exam_parts', { paper_id: paper.id, title: 'Réponses', instructions: 'Conserver toutes les réponses reçues', position: 1 });
  const q1 = await insert('exam_questions', { paper_id: paper.id, part_id: part.id, kind: 'TEXTE', prompt: 'Expliquez', configuration: { correction: 'SECRET_CORRECTION' }, points: 10, position: 1 });
  const q2 = await insert('exam_questions', { paper_id: paper.id, part_id: part.id, kind: 'QCM_SIMPLE', prompt: 'Choisissez', points: 10, position: 2 });
  const option = await insert('exam_options', { question_id: q2.id, label: 'Réponse A', is_correct: true, position: 1 });
  await insert('exam_options', { question_id: q2.id, label: 'Réponse B', is_correct: false, position: 2 });
  await db.query("update escen.exam_papers set status='AUTORISE',authorized_by=$1,authorized_at=now() where id=$2", [actor.id, paper.id]);
  const get = async response => { const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); return body; };
  const views = [];
  await check('Épreuve persistante : candidats réinscrits, ouverture idempotente, horloge serveur et corrigé caché', async () => {
    const directory = await get(await people[0].read());
    assert.equal(directory.exams.length, 1);
    assert.ok(!JSON.stringify(directory).includes('Expliquez'));
    for (const person of people) views.push(await get(await person.request({ action: 'start', evaluationId: evaluation.id })));
    const first = views[0];
    assert.equal(Date.parse(first.attempt.deadlineAt), Date.parse(closes));
    assert.equal((await get(await people[0].request({ action: 'start', evaluationId: evaluation.id }))).attempt.id, first.attempt.id);
    assert.ok(!JSON.stringify(first).includes('SECRET_CORRECTION'));
    assert.ok(!JSON.stringify(first).includes('is_correct'));
    assert.equal(first.paper.parts[0].questions.length, 2);
    assert.equal((await people[0].request({ action: 'start', evaluationId: evaluation.id, deadlineAt: '2099-01-01' })).status, 400);
  });
  const answer = (id, text, option_ids = []) => ({ questionId: id, response: { text, option_ids } });
  const command = (view, answers, action = 'save') => ({ action, attemptId: view.attempt.id, revision: view.attempt.revision, saveId: randomUUID(), answers });
  await check('Épreuve persistante : accès personnel, permission API et périmètre SQL obligatoires', async () => {
    assert.equal((await people[1].read(views[0].attempt.id)).status, 403);
    people[0].context.permissions = [];
    assert.equal((await people[0].read()).status, 403);
    people[0].context.permissions = ['exam.take'];
    await assert.rejects(db.query("select public.escen_online_exam($1,'ENS','read',null,null,$2)", [people[0].account.id, views[0].attempt.id]), /Permission/);
    await db.query('update escen.role_grants set valid_until=now() where account_id=$1', [people[0].account.id]);
    assert.equal((await people[0].read()).status, 403);
    await db.query('update escen.role_grants set valid_until=null, academic_year_id=$2 where account_id=$1', [people[0].account.id, year.id]);
    const otherGroup = await scalar('select id as value from escen.groups where academic_year_id=$1 and id<>$2 limit 1', [year.id, teaching.group_id]);
    await db.query('update escen.role_grants set group_id=$2 where account_id=$1', [people[0].account.id, otherGroup]);
    assert.equal((await people[0].read(views[0].attempt.id)).status, 403);
    assert.deepEqual((await get(await people[0].read())).exams, []);
    await db.query('update escen.role_grants set group_id=null where account_id=$1', [people[0].account.id]);
  });
  await check('Épreuve persistante : sauvegarde atomique, reprise, répétition réseau et conflit entre onglets', async () => {
    const first = command(views[0], [answer(q1.id, 'Réponse partielle : accents éè et paragraphes\nDeuxième ligne')]);
    views[0] = await get(await people[0].request(first));
    const duplicate = await get(await people[0].request(first));
    assert.equal(duplicate.attempt.revision, 1);
    assert.deepEqual((await get(await people[0].read(views[0].attempt.id))).answers, views[0].answers);
    assert.equal((await people[0].request({ ...first, saveId: randomUUID() })).status, 409);
    const bad = command(views[0], [answer(q1.id, 'Cette modification doit être annulée'), answer(randomUUID(), 'Question étrangère')]);
    assert.equal((await people[0].request(bad)).status, 422);
    assert.deepEqual((await get(await people[0].read(views[0].attempt.id))).answers, views[0].answers);
    assert.equal((await people[0].request(command(views[0], [answer(q2.id, '', [randomUUID()])]))).status, 422);
    assert.equal((await people[0].request(command(views[0], [answer(q1.id, 'A'), answer(q1.id, 'B')]))).status, 400);
    views[1] = await get(await people[1].request(command(views[1], [answer(q1.id, ' \n\t')])));
  });
  await check('Épreuve persistante : remise manuelle enregistre les dernières réponses et verrouille la copie', async () => {
    const body = command(views[2], [answer(q1.id, 'Copie complète'), answer(q2.id, '', [option.id])], 'submit');
    views[2] = await get(await people[2].request(body));
    assert.equal(views[2].attempt.status, 'REMISE');
    assert.equal(views[2].attempt.completionStatus, 'COMPLETE');
    assert.equal(views[2].attempt.submissionKind, 'MANUAL');
    const duplicate = await get(await people[2].request(body));
    assert.deepEqual(duplicate.answers, views[2].answers);
    const late = await get(await people[2].request(command(views[2], [answer(q1.id, 'Écrasement interdit')])));
    assert.equal(late.accepted, false);
    assert.deepEqual(late.answers, views[2].answers);
    await assert.rejects(db.query('update escen.exam_answers set response=$1 where attempt_id=$2', [{ text: 'Trop tard' }, views[2].attempt.id]), /remise/i);
  });
  await check('Épreuve persistante : les notes ne peuvent être soumises tant que des copies sont en cours', async () => {
    await insert('evaluation_transitions', { evaluation_id: evaluation.id, from_status: 'BROUILLON', to_status: 'SAISIES', actor_id: actor.id });
    const refused = await post({ action: 'transition_workflow', evaluationId: evaluation.id, fromStatus: 'SAISIES', toStatus: 'SOUMISES' });
    assert.equal(refused.status, 409);
    assert.match((await refused.json()).error, /copies sont encore en cours/);
    await assert.rejects(insert('evaluation_transitions', { evaluation_id: evaluation.id, from_status: 'SAISIES', to_status: 'SOUMISES', actor_id: actor.id }), /copies sont encore en cours/);
  });
  await check('Épreuve persistante : navigateur fermé, échéance serveur, copie partielle préservée et copie vide non traitée', async () => {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, Date.parse(closes) - Date.now() + 30)));
    assert.equal(await scalar('select escen_private.expire_exam_attempts() as value'), 2);
    assert.equal(await scalar('select escen_private.expire_exam_attempts() as value'), 0);
    const partial = await get(await people[0].read(views[0].attempt.id));
    const blank = await get(await people[1].read(views[1].attempt.id));
    assert.equal(partial.attempt.status, 'EXPIREE');
    assert.equal(partial.attempt.submissionKind, 'AUTO_DEADLINE');
    assert.equal(Date.parse(partial.attempt.submittedAt), Date.parse(closes));
    assert.equal(partial.attempt.completionStatus, 'PARTIELLE');
    assert.equal(blank.attempt.completionStatus, 'NON_TRAITE');
    const blankLate = await get(await people[1].request(command(blank, [answer(q1.id, 'Réponse tardive')])));
    assert.equal(blankLate.accepted, false);
    assert.deepEqual(blankLate.answers, views[1].answers);
    assert.deepEqual(partial.answers, views[0].answers);
    const late = await get(await people[0].request(command(partial, [answer(q2.id, '', [option.id])], 'submit')));
    assert.equal(late.accepted, false);
    assert.deepEqual(late.answers, partial.answers);
    await assert.rejects(db.query("update escen.exam_attempts set status='EN_COURS' where id=$1", [partial.attempt.id]), /immuable/);
    assert.ok(await scalar("select count(*)::integer as value from escen_private.audit_events where table_name='exam_attempts' and new_value->>'submission_kind'='AUTO_DEADLINE'"));
  });
}
