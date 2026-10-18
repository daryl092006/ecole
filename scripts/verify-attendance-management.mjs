import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadLocalApiModule } from './local-api-fixture.mjs';

export async function verifyAttendanceManagement(db, check, { year, offering, group, enrollment, session, teacher }) {
  const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;
  const insert = async (table, record) => {
    assert.match(table, /^[a-z_]+$/);
    const keys = Object.keys(record);
    keys.forEach(key => assert.match(key, /^[a-z_]+$/));
    return (await db.query(`insert into escen.${table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
  };
  const authId = randomUUID();
  await db.query('insert into auth.users(id) values ($1)', [authId]);
  const person = await insert('people', { firstname: 'Gestion', lastname: 'Présences' });
  const actor = await insert('accounts', { person_id: person.id, active: true, auth_user_id: authId });
  const role = await scalar("select id as value from escen.roles where code='IT'");
  await insert('role_grants', { account_id: actor.id, role_id: role, granted_by: actor.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Recette locale des présences' });
  const context = { accountId: actor.id, personId: person.id, authUserId: authId, roleCode: 'IT', role: 'Informaticien',
    permissions: ['attendance.view', 'attendance.record', 'attendance.review'], teacherId: null, studentId: null,
    grants: [{ role_code: 'IT', role_name: 'Informaticien', site_id: null, group_id: null, academic_year_id: null }] };
  const revision = () => scalar('select revision as value from escen_private.portal_revision where singleton');
  const auditCount = () => scalar('select count(*)::integer as value from escen_private.audit_events');
  const row = async (table, id) => (await db.query(`select * from escen.${table} where id=$1`, [id])).rows[0];
  const audit = async (table, id) => (await db.query('select * from escen_private.audit_events where table_name=$1 and entity_id=$2 order by happened_at desc', [table, id])).rows[0];
  const transactions = [];
  let corruptLast = false;
  const client = { async rpc(name, args = {}) {
    try {
      let data;
      if (name === 'escen_backend_snapshot') data = await scalar('select public.escen_backend_snapshot() as value');
      else if (name === 'escen_academic_year_context') data = await scalar('select public.escen_academic_year_context() as value');
      else if (name === 'escen_attendance_transaction') {
        const changes = structuredClone(args.p_changes);
        transactions.push(changes);
        if (corruptLast) changes.at(-1).record.enrollment_id = randomUUID();
        data = await scalar('select public.escen_attendance_transaction($1,$2,$3::jsonb) as value', [args.p_actor_id, args.p_expected_revision, JSON.stringify(changes)]);
      } else assert.fail(`RPC inattendue : ${name}`);
      return { data, error: null };
    } catch (error) { return { data: null, error }; }
  } };
  const api = loadLocalApiModule('app/api/attendances/route.ts', client, context);
  const post = async body => api.POST(new Request('http://local.test/api/attendances', { method: 'POST', headers: { 'x-escen-year': year.id }, body: JSON.stringify({ revision: await revision(), ...body }) }));
  const entry = (enrollmentId, status) => ({ enrollmentId, status, arrivedAt: null, leftAt: null, lateMinutes: null, comment: '' });
  const correct = async (status, reason = 'Correction motivée de présence') => post({ action: 'record_students', sessionId: session.id, entries: [entry(enrollment.id, status)], reason });
  const review = async (id, decision) => post({ action: 'review_justification', justificationId: id, decision, reason: 'Pièce vérifiée par la direction' });
  const rpc = async (changes, actorId = actor.id) => scalar('select public.escen_attendance_transaction($1,$2,$3::jsonb) as value', [actorId, await revision(), JSON.stringify(changes)]);
  await check('Présences : permission de décision réservée à DA et IT, RLS et audits conservés', async () => {
    assert.deepEqual((await db.query("select r.code from escen.role_permissions rp join escen.roles r on r.id=rp.role_id join escen.permissions p on p.id=rp.permission_id where p.code='attendance.review' order by r.code")).rows.map(row => row.code), ['DA', 'IT']);
    assert.equal(await scalar("select relrowsecurity as value from pg_class where oid='escen.attendances'::regclass"), true);
    assert.ok(await scalar("select exists(select 1 from pg_trigger where tgrelid='escen.attendances'::regclass and tgname='audit_event') as value"));
    assert.equal((await db.query('select reason from escen.attendances where session_id=$1 limit 1', [session.id])).rows[0].reason, null);
  });
  await check('Présences : une correction exige un motif par API et SQL, sans audit partiel', async () => {
    const before = await auditCount();
    assert.equal((await post({ action: 'record_students', sessionId: session.id, entries: [entry(enrollment.id, 'ABSENT')] })).status, 400);
    const attendance = (await db.query('select * from escen.attendances where session_id=$1 and enrollment_id=$2', [session.id, enrollment.id])).rows[0];
    await assert.rejects(rpc([{ table: 'attendances', operation: 'update', record: { id: attendance.id, status: 'ABSENT' } }]), /motif/i);
    assert.equal(await auditCount(), before);
  });
  await check('Présences : correction persistée, auteur initial conservé et avant/après audités', async () => {
    const response = await correct('ABSENT');
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    const attendance = (await db.query('select * from escen.attendances where session_id=$1 and enrollment_id=$2', [session.id, enrollment.id])).rows[0];
    const event = await audit('attendances', attendance.id);
    assert.equal(event.old_value.status, 'PRESENT'); assert.equal(event.new_value.status, 'ABSENT');
    assert.equal(event.actor_id, actor.id); assert.equal(event.reason, 'Correction motivée de présence');
    assert.notEqual(attendance.recorded_by, actor.id);
  });
  const file = await insert('file_objects', { bucket: 'attendance-test', object_path: `proof/${randomUUID()}`, original_name: 'certificat.pdf', mime_type: 'application/pdf', byte_size: 20, uploaded_by: actor.id });
  const attendance = (await db.query('select * from escen.attendances where session_id=$1 and enrollment_id=$2', [session.id, enrollment.id])).rows[0];
  const proof = await insert('absence_justifications', { attendance_id: attendance.id, file_id: file.id, reason: 'Motif original de l’étudiant' });
  await check('Justificatifs : acceptation et statut justifié atomiques, motif original conservé', async () => {
    const before = await revision();
    const response = await review(proof.id, 'VALIDE');
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    const saved = await row('absence_justifications', proof.id);
    assert.equal(saved.status, 'VALIDE'); assert.equal(saved.reason, proof.reason);
    assert.equal(saved.reviewed_by, actor.id); assert.ok(saved.reviewed_at);
    assert.equal((await row('attendances', attendance.id)).status, 'ABSENT_JUSTIFIE');
    assert.equal((await audit('attendances', attendance.id)).reason, saved.review_reason);
    assert.equal((await audit('absence_justifications', proof.id)).new_value.review_reason, saved.review_reason);
    assert.equal(await revision(), before + 1);
    assert.deepEqual(transactions.at(-1).map(change => change.table), ['absence_justifications']);
  });
  await check('Justificatifs : décision rendue non révisable par API et SQL', async () => {
    const before = await auditCount(); const beforeRevision = await revision();
    assert.equal((await review(proof.id, 'REFUSE')).status, 409);
    await assert.rejects(rpc([{ table: 'absence_justifications', operation: 'update', record: { id: proof.id, status: 'REFUSE', review_reason: 'Révision interdite' } }]), /déjà.*décision/);
    assert.equal(await auditCount(), before); assert.equal(await revision(), beforeRevision);
  });
  await correct('RETARD');
  const refused = await insert('absence_justifications', { attendance_id: attendance.id, file_id: file.id, reason: 'Pièce non recevable' });
  await check('Justificatifs : refus motivé conserve le retard existant', async () => {
    assert.equal((await review(refused.id, 'REFUSE')).status, 200);
    assert.equal((await row('attendances', attendance.id)).status, 'RETARD');
    assert.equal((await row('absence_justifications', refused.id)).status, 'REFUSE');
  });
  const lateProof = await insert('absence_justifications', { attendance_id: attendance.id, file_id: file.id, reason: 'Retard justifié' });
  await check('Justificatifs : acceptation du retard et auteur de décision imposé par le serveur', async () => {
    await rpc([{ table: 'absence_justifications', operation: 'update', record: { id: lateProof.id, status: 'VALIDE', reviewed_by: randomUUID(), review_reason: 'Contrôle du retard' } }]);
    assert.equal((await row('attendances', attendance.id)).status, 'RETARD_JUSTIFIE');
    assert.equal((await row('absence_justifications', lateProof.id)).reviewed_by, actor.id);
  });
  await check('Justificatifs : refus d’un acteur sans droit DA/IT et d’un motif invalide en SQL', async () => {
    const pending = await insert('absence_justifications', { attendance_id: attendance.id, file_id: file.id, reason: 'En attente de contrôle' });
    const unprivilegedAuth = randomUUID(); await db.query('insert into auth.users(id) values ($1)', [unprivilegedAuth]);
    const unprivilegedPerson = await insert('people', { firstname: 'Sans', lastname: 'Décision' });
    const unprivileged = await insert('accounts', { person_id: unprivilegedPerson.id, active: true, auth_user_id: unprivilegedAuth });
    const changes = [{ table: 'absence_justifications', operation: 'update', record: { id: pending.id, status: 'VALIDE', review_reason: 'Demande non autorisée' } }];
    await assert.rejects(rpc(changes, unprivileged.id), /autorisation DA ou IT/);
    changes[0].record.review_reason = ' ';
    await assert.rejects(rpc(changes), /motif de décision/i);
    assert.equal((await row('absence_justifications', pending.id)).status, 'EN_ATTENTE');
  });
  await check('Présence enseignante : horaires persistés et correction avec audit', async () => {
    const starts = new Date(session.starts_at).toISOString(); const ends = new Date(session.ends_at).toISOString();
    assert.equal((await post({ action: 'record_teacher', sessionId: session.id, arrivedAt: starts, leftAt: ends, comment: 'Émargement vérifié' })).status, 200);
    const saved = (await db.query('select * from escen.teacher_attendances where session_id=$1 and teacher_id=$2', [session.id, teacher.id])).rows[0];
    assert.equal(saved.recorded_by, actor.id);
    assert.equal((await post({ action: 'record_teacher', sessionId: session.id, arrivedAt: starts, leftAt: ends, comment: 'Correction du commentaire' })).status, 200);
    const event = await audit('teacher_attendances', saved.id);
    assert.equal(event.actor_id, actor.id); assert.equal(event.old_value.comment, 'Émargement vérifié');
    assert.equal(event.new_value.comment, 'Correction du commentaire');
  });
  await check('Présence enseignante : auto-émargement refusé par la RPC', async () => {
    const ownAccount = await scalar('select a.id as value from escen.teachers t join escen.staff s on s.id=t.staff_id join escen.accounts a on a.person_id=s.person_id where t.id=$1', [teacher.id]);
    const saved = (await db.query('select * from escen.teacher_attendances where session_id=$1 and teacher_id=$2', [session.id, teacher.id])).rows[0];
    await assert.rejects(rpc([{ table: 'teacher_attendances', operation: 'update', record: { id: saved.id, comment: 'Auto-émargement' } }], ownAccount), /auto-émargement/);
  });
  const population = [];
  for (let index = 0; index < 201; index++) {
    const person = await insert('people', { firstname: `Présence ${index}`, lastname: 'Lot' });
    const student = await insert('students', { person_id: person.id, matricule: `PRES-${randomUUID()}` });
    const member = await insert('enrollments', { student_id: student.id, offering_id: offering.id, status: 'INSCRIT' });
    await insert('enrollment_groups', { enrollment_id: member.id, offering_id: offering.id, group_id: group.id, valid_from: new Date(year.starts_on).toISOString().slice(0, 10), changed_by: actor.id, reason: 'Population de recette' });
    population.push(entry(member.id, 'PRESENT'));
  }
  await check('Présences : 201 créations par lots de 50, une seule commande atomique', async () => {
    const response = await post({ action: 'record_students', sessionId: session.id, entries: population });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    assert.equal(transactions.at(-1).length, 201);
    assert.equal(await scalar('select count(*)::integer as value from escen.attendances where session_id=$1', [session.id]), 202);
  });
  await check('Présences : erreur SQL du dernier lot annule 201 corrections, audits et révisions', async () => {
    const before = await auditCount(); const beforeRevision = await revision();
    corruptLast = true;
    const response = await post({ action: 'record_students', sessionId: session.id, entries: population.map(entry => ({ ...entry, status: 'ABSENT' })), reason: 'Lot volontairement invalide' });
    corruptLast = false;
    assert.equal(response.status, 409); assert.match((await response.json()).error, /Aucune modification partielle/);
    assert.equal(await auditCount(), before); assert.equal(await revision(), beforeRevision);
    assert.equal(await scalar("select count(*)::integer as value from escen.attendances where session_id=$1 and status='PRESENT'", [session.id]), 201);
  });
  await check('Présences : RPC bornée aux tables de présence, lot vide et version périmée refusés', async () => {
    await assert.rejects(rpc([]), /vide/);
    await assert.rejects(rpc([{ table: 'people', operation: 'update', record: { id: person.id, firstname: 'Interdit' } }]), /hors du circuit/);
    await assert.rejects(scalar('select public.escen_attendance_transaction($1,$2,$3::jsonb) as value', [actor.id, (await revision()) - 1, JSON.stringify([{ table: 'attendances', operation: 'update', record: { id: attendance.id, reason: 'Version périmée' } }])]), /CONCURRENT_UPDATE/);
  });
}
