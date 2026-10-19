import { verifyOnlineExams } from './verify-online-exams.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadLocalApiModule } from './local-api-fixture.mjs';

export async function verifyEvaluationWorkflow(db, check, { year, assignment, level, site }) {
  const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;
  const insert = async (table, record) => {
    assert.match(table, /^[a-z_]+$/);
    const keys = Object.keys(record);
    keys.forEach(key => assert.match(key, /^[a-z_]+$/));
    return (await db.query(`insert into escen.${table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
  };
  const token = randomUUID();
  await db.query('insert into auth.users(id) values ($1)', [token]);
  const person = await insert('people', { firstname: 'Notes', lastname: 'Recette' });
  const actor = await insert('accounts', { person_id: person.id, auth_user_id: token, active: true });
  const role = await scalar("select id as value from escen.roles where code='IT'");
  await insert('role_grants', { account_id: actor.id, role_id: role, granted_by: actor.id, valid_from: new Date().toISOString(), reason: 'Recette locale du circuit des notes' });
  const code = `NOTES-${randomUUID().slice(0, 8)}`;
  const program = await insert('programs', { code, name: 'Filière de recette des notes' });
  const curriculum = await insert('curricula', { program_id: program.id, level_id: level.id, version: 1 });
  const subject = await insert('subjects', { academic_year_id: year.id, code, name: 'Matière annuelle de recette' });
  const semester = await insert('curriculum_semesters', { curriculum_id: curriculum.id, position: 1, name: 'Semestre', target_credits: 30 });
  const unit = await insert('teaching_units', { curriculum_id: curriculum.id, semester_id: semester.id, code, name: 'UE', credits: 30 });
  const component = await insert('curriculum_components', { curriculum_id: curriculum.id, unit_id: unit.id, subject_id: subject.id, code, coefficient: 1, credits: 30 });
  await insert('assessment_weights', { curriculum_id: curriculum.id, component_id: component.id, evaluation_kind: 'DEVOIR', percent: 100 });
  await db.query("update escen.curricula set status='APPROVED', approved_by=$1, approved_at=now() where id=$2", [actor.id, curriculum.id]);
  const offering = await insert('academic_offerings', { curriculum_id: curriculum.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  const context = {
    accountId: actor.id, personId: person.id, authUserId: token, roleCode: 'IT', role: 'Informaticien',
    permissions: (await db.query('select p.code from escen.permissions p join escen.role_permissions rp on rp.permission_id=p.id where rp.role_id=$1', [role])).rows.map(row => row.code),
    studentId: null, teacherId: null,
    grants: [{ role_code: 'IT', role_name: 'Informaticien', site_id: null, group_id: null, academic_year_id: null }],
  };
  let failLastCandidate = false;
  let failLastGrade = false;
  let lastChanges = [];
  const client = {
    async rpc(name, args) {
      try {
        let data;
        if (name === 'escen_backend_snapshot') data = await scalar('select public.escen_backend_snapshot() as value');
        else if (name === 'escen_academic_year_context') data = await scalar('select public.escen_academic_year_context() as value');
        else if (['escen_backend_transaction', 'escen_evaluation_transaction'].includes(name)) {
          const changes = structuredClone(args.p_changes);
          lastChanges = changes;
          if (failLastCandidate) changes.at(-1).record.enrollment_id = outsideGroup.id;
          if (failLastGrade) changes.at(-1).record.value = 21;
          data = await scalar(`select public.${name}($1,$2,$3::jsonb) as value`, [args.p_actor_id, args.p_expected_revision, JSON.stringify(changes)]);
        }
        else assert.fail(`RPC inattendue : ${name}`);
        return { data, error: null };
      } catch (error) { return { data: null, error: { code: error.code, message: error.message } }; }
    },
  };
  const { POST } = loadLocalApiModule('app/api/evaluations/route.ts', client, context);
  const revision = () => scalar('select revision as value from escen_private.portal_revision where singleton');
  const post = async (body) => POST(new Request('http://local.test/api/evaluations', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-escen-year': year.id },
    body: JSON.stringify({ revision: await revision(), ...body }),
  }));
  const group = await insert('groups', { academic_year_id: year.id, level_id: level.id, site_id: site.id, name: `Notes-${randomUUID().slice(0, 8)}` });
  await insert('group_offerings', { group_id: group.id, offering_id: offering.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  const teaching = await insert('teaching_assignments', {
    group_id: group.id, offering_id: offering.id, curriculum_id: curriculum.id, component_id: component.id,
    teacher_id: assignment.teacher_id, valid_from: assignment.valid_from, valid_until: assignment.valid_until,
  });
  const addStudent = async (status, groupId = group.id) => {
    const person = await insert('people', { firstname: 'Candidat', lastname: status });
    const student = await insert('students', { person_id: person.id, matricule: `NOTES-${randomUUID()}` });
    const enrollment = await insert('enrollments', { student_id: student.id, offering_id: offering.id, status });
    await insert('enrollment_groups', { enrollment_id: enrollment.id, offering_id: offering.id, group_id: groupId, valid_from: '2026-01-01', changed_by: actor.id, reason: 'Rattachement de recette' });
    return enrollment;
  };
  const enrolled = await addStudent('INSCRIT');
  const reenrolled = await addStudent('REINSCRIT');
  for (const status of ['SUSPENDU', 'ABANDON', 'DIPLOME']) await addStudent(status);
  const otherGroup = await insert('groups', { academic_year_id: year.id, level_id: level.id, site_id: site.id, name: `Autre-${code}` });
  await insert('group_offerings', { group_id: otherGroup.id, offering_id: offering.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  const outsideGroup = await addStudent('REINSCRIT', otherGroup.id);

  await check('Évaluation : inscrits et réinscrits inclus, autres statuts et autre groupe exclus via API + SQL', async () => {
    const response = await post({ action: 'create', assignmentId: teaching.id, name: 'Liste des candidats', kind: 'DEVOIR' });
    const body = await response.json();
    assert.equal(response.status, 201, JSON.stringify(body));
    const candidates = (await db.query('select enrollment_id from escen.evaluation_candidates where evaluation_id=$1', [body.id])).rows;
    assert.deepEqual(candidates.map(c => c.enrollment_id).sort(), [enrolled.id, reenrolled.id].sort());
    assert.equal(body.revision, await revision());
  });

  let size = 2;
  let largeEvaluation;
  for (const count of [49, 50, 99, 100, 101, 201]) {
    while (size < count) { await addStudent(size % 2 ? 'INSCRIT' : 'REINSCRIT'); size += 1; }
    await check(`Évaluation : ${count} candidats créés atomiquement par lots de 50`, async () => {
      const before = await revision();
      const response = await post({ action: 'create', assignmentId: teaching.id, name: `Promotion de ${count}`, kind: 'DEVOIR' });
      const body = await response.json();
      assert.equal(response.status, 201, JSON.stringify(body));
      assert.equal(await scalar('select count(*)::integer as value from escen.evaluation_candidates where evaluation_id=$1', [body.id]), count);
      assert.equal(body.revision, before + Math.ceil((count + 1) / 50));
      assert.equal(body.revision, await revision());
      assert.equal(await scalar("select count(*)::integer as value from escen_private.audit_events where table_name='evaluation_candidates' and new_value->>'evaluation_id'=$1 and actor_id=$2", [body.id, actor.id]), count);
      largeEvaluation = body.id;
    });
  }

  const auditCount = () => scalar('select count(*)::integer as value from escen_private.audit_events');
  await check('Évaluation : échec du dernier lot annule évaluation, candidats, audits et révisions', async () => {
    const before = await revision();
    const audits = await auditCount();
    failLastCandidate = true;
    const response = await post({ action: 'create', assignmentId: teaching.id, name: 'Création à annuler', kind: 'DEVOIR' });
    failLastCandidate = false;
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /Aucun lot partiel.*évaluation et tous ses candidats/);
    assert.equal(lastChanges.length, 202);
    const failedId = lastChanges[0].record.id;
    assert.equal(await scalar('select count(*)::integer as value from escen.evaluations where id=$1', [failedId]), 0);
    assert.equal(await scalar('select count(*)::integer as value from escen.evaluation_candidates where evaluation_id=$1', [failedId]), 0);
    assert.equal(await revision(), before);
    assert.equal(await auditCount(), audits);
  });

  const candidates = (await db.query('select id from escen.evaluation_candidates where evaluation_id=$1 order by id', [largeEvaluation])).rows;
  const grades = candidates.map((c, i) => ({ candidateId: c.id, value: i % 21, absenceStatus: null }));
  await check('Notes : 201 notes et passage en saisie atomiques, dernière révision renvoyée', async () => {
    const before = await revision();
    const response = await post({ action: 'enter_grades', evaluationId: largeEvaluation, advanceToSaisies: true, grades });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.revision, before + 5);
    assert.equal(body.revision, await revision());
    assert.equal(await scalar('select status as value from escen.evaluations where id=$1', [largeEvaluation]), 'SAISIES');
    assert.equal(await scalar('select count(*)::integer as value from escen.grades g join escen.evaluation_candidates c on c.id=g.candidate_id where c.evaluation_id=$1', [largeEvaluation]), 201);
  });

  await check('Notes : erreur SQL tardive annule toutes les modifications des lots précédents', async () => {
    const before = await revision();
    const audits = await auditCount();
    const beforeGrades = (await db.query('select g.* from escen.grades g join escen.evaluation_candidates c on c.id=g.candidate_id where c.evaluation_id=$1 order by g.id', [largeEvaluation])).rows;
    failLastGrade = true;
    const response = await post({ action: 'enter_grades', evaluationId: largeEvaluation, grades: grades.map(g => ({ ...g, value: 19 })) });
    failLastGrade = false;
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /Aucun lot partiel.*toutes les notes/);
    assert.equal(await revision(), before);
    assert.equal(await auditCount(), audits);
    assert.deepEqual((await db.query('select g.* from escen.grades g join escen.evaluation_candidates c on c.id=g.candidate_id where c.evaluation_id=$1 order by g.id', [largeEvaluation])).rows, beforeGrades);
  });

  await check('Notes : mise à jour de 201 notes et contrôle de concurrence conservés', async () => {
    const before = await revision();
    const response = await post({ action: 'enter_grades', evaluationId: largeEvaluation, grades: grades.map(g => ({ ...g, value: 20 })) });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.revision, before + 5);
    const stale = await post({ action: 'enter_grades', evaluationId: largeEvaluation, grades, revision: before });
    assert.equal(stale.status, 409);
    assert.equal(await revision(), body.revision);
    assert.equal(await scalar('select count(*)::integer as value from escen.grades g join escen.evaluation_candidates c on c.id=g.candidate_id where c.evaluation_id=$1 and g.value=20', [largeEvaluation]), 201);
  });

  await check('Lots de notes : droits API, auteur actif, tables bornées et limite générique conservés', async () => {
    const before = await revision();
    const permissions = context.permissions;
    context.permissions = ['academic.view'];
    const denied = await post({ action: 'create', assignmentId: teaching.id, name: 'Sans droit', kind: 'DEVOIR' });
    context.permissions = permissions;
    assert.equal(denied.status, 403);
    const call = (changes, actorId = actor.id, expectedRevision = before) => db.query('select public.escen_evaluation_transaction($1,$2,$3::jsonb)', [actorId, expectedRevision, JSON.stringify(changes)]);
    for (const changes of [null, {}, []]) await assert.rejects(call(changes), /Lot d’évaluation/);
    await assert.rejects(call([{ table: 'people', operation: 'insert', record: {} }]), /hors du circuit/);
    await assert.rejects(call([{ table: 'grades', operation: 'delete', record: {} }]), /hors du circuit/);
    await assert.rejects(call([{ table: 'grades', record: {} }]), /hors du circuit/);
    await assert.rejects(call([lastChanges[0]], randomUUID()), /Compte applicatif actif/);
    await assert.rejects(call([lastChanges[0]], actor.id, null), /Lot d’évaluation invalide/);
    await assert.rejects(db.query('select public.escen_backend_transaction($1,$2,$3::jsonb)', [actor.id, before, JSON.stringify(Array(101).fill(lastChanges[0]))]), /Lot de modifications invalide/);
    assert.equal(await revision(), before);
    await db.exec('create role evaluation_test_reader; set role evaluation_test_reader');
    try { await assert.rejects(call([lastChanges[0]]), /permission denied/); }
    finally { await db.exec('reset role'); }
  });

  const fixture = async (count = 1, eligibility = 'ELIGIBLE') => {
    const evaluation = await insert('evaluations', {
      assignment_id: teaching.id, offering_id: offering.id, component_id: teaching.component_id,
      name: 'Politique des copies', kind: 'DEVOIR', created_by: actor.id,
    });
    const population = (await db.query("select e.id from escen.enrollments e join escen.enrollment_groups eg on eg.enrollment_id=e.id where eg.group_id=$1 and e.status in ('INSCRIT','REINSCRIT') order by e.id limit $2", [group.id, count])).rows;
    const candidates = [];
    for (const enrollment of population) candidates.push(await insert('evaluation_candidates', {
      evaluation_id: evaluation.id, enrollment_id: enrollment.id, offering_id: offering.id, eligibility,
      ...(eligibility === 'EXCLUDED' ? { eligibility_reason: 'Exclusion motivée de recette' } : {}),
    }));
    return { evaluation, candidates };
  };
  const transition = async (id, fromStatus, toStatus) => {
    const response = await post({ action: 'transition_workflow', evaluationId: id, fromStatus, toStatus });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
  };
  const sqlTransition = async (id, fromStatus, toStatus) => client.rpc('escen_backend_transaction', {
    p_actor_id: actor.id, p_expected_revision: await revision(), p_changes: [{ table: 'evaluation_transitions', operation: 'insert', record: {
      id: randomUUID(), evaluation_id: id, from_status: fromStatus, to_status: toStatus, actor_id: actor.id,
    } }],
  });
  let unprocessed;
  for (const [absenceStatus, value] of [['NON_TRAITE', null], ['NON_TRAITE', 0], ['ABSENT', null], ['JUSTIFIE', null], [null, 0], [null, 20]]) {
    await check(`Copies : ${absenceStatus || 'note'} / ${value} enregistrée, ${absenceStatus === 'NON_TRAITE' ? 'soumission bloquée' : 'soumission autorisée'} via API + SQL`, async () => {
      const { evaluation, candidates } = await fixture();
      const response = await post({ action: 'enter_grades', evaluationId: evaluation.id, advanceToSaisies: true,
        grades: [{ candidateId: candidates[0].id, value, absenceStatus }] });
      assert.equal(response.status, 200, JSON.stringify(await response.json()));
      const grade = (await db.query('select * from escen.grades where candidate_id=$1', [candidates[0].id])).rows[0];
      assert.equal(grade.value == null ? null : Number(grade.value), absenceStatus === 'NON_TRAITE' ? 0 : value);
      assert.equal(grade.absence_status, absenceStatus);
      if (absenceStatus === 'NON_TRAITE') {
        const before = await revision();
        const audits = await auditCount();
        const denied = await post({ action: 'transition_workflow', evaluationId: evaluation.id, fromStatus: 'SAISIES', toStatus: 'SOUMISES' });
        assert.equal(denied.status, 409);
        assert.match((await denied.json()).error, /NON_TRAITE/);
        assert.match((await sqlTransition(evaluation.id, 'SAISIES', 'SOUMISES')).error?.message || '', /NON_TRAITE/);
        assert.equal(await revision(), before);
        assert.equal(await auditCount(), audits);
        assert.equal(await scalar('select status as value from escen.evaluations where id=$1', [evaluation.id]), 'SAISIES');
        unprocessed = { evaluation, grade };
      } else await transition(evaluation.id, 'SAISIES', 'SOUMISES');
    });
  }

  await check('Copies : ABSENT, JUSTIFIE et un vrai zéro soumis ensemble', async () => {
    const { evaluation, candidates } = await fixture(3);
    const response = await post({ action: 'enter_grades', evaluationId: evaluation.id, advanceToSaisies: true, grades: candidates.map((candidate, index) => ({ candidateId: candidate.id, value: index === 2 ? 0 : null, absenceStatus: ['ABSENT', 'JUSTIFIE', null][index] })) });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    await transition(evaluation.id, 'SAISIES', 'SOUMISES');
  });

  await check('Copies : une saisie manquante, un candidat exclu et une évaluation vide bloquent API et SQL', async () => {
    for (const kind of ['sans-note', 'note-vide', 'exclu', 'sans-candidat']) {
      const { evaluation, candidates } = await fixture(kind === 'sans-candidat' ? 0 : 1, kind === 'exclu' ? 'EXCLUDED' : 'ELIGIBLE');
      if (kind === 'note-vide' || kind === 'exclu') await insert('grades', {
        candidate_id: candidates[0].id, value: kind === 'exclu' ? 12 : null, entered_by: actor.id,
      });
      assert.equal((await sqlTransition(evaluation.id, 'BROUILLON', 'SAISIES')).error, null);
      const before = await revision();
      const audits = await auditCount();
      assert.equal((await post({ action: 'transition_workflow', evaluationId: evaluation.id, fromStatus: 'SAISIES', toStatus: 'SOUMISES' })).status, 409, kind);
      const refused = await sqlTransition(evaluation.id, 'SAISIES', 'SOUMISES');
      assert.match(refused.error?.message || '', /incomplets/, kind);
      assert.equal(await revision(), before);
      assert.equal(await auditCount(), audits);
      assert.equal(await scalar('select status as value from escen.evaluations where id=$1', [evaluation.id]), 'SAISIES');
    }
  });

  await check('Copies : note non nulle avec absence, NON_TRAITE non zéro et hors barème refusés', async () => {
    const { evaluation, candidates } = await fixture();
    for (const [absenceStatus, value] of [['NON_TRAITE', 12], ['ABSENT', 0], ['JUSTIFIE', 5], [null, -1], [null, 21]]) {
      const before = await revision();
      const response = await post({ action: 'enter_grades', evaluationId: evaluation.id, grades: [{ candidateId: candidates[0].id, value, absenceStatus }] });
      assert.equal(response.status, 400);
      assert.equal(await revision(), before);
      await assert.rejects(insert('grades', { candidate_id: candidates[0].id, value, absence_status: absenceStatus, entered_by: actor.id }), /0\/20|check|domain/i);
    }
  });

  const legacyGrade = async candidate => {
    // Reproduce a pre-037 row; retain the state, audit and year guards.
    await db.exec('alter table escen.grades disable trigger grade_unprocessed_zero');
    try { return await insert('grades', { candidate_id: candidate.id, value: null, absence_status: 'NON_TRAITE', entered_by: actor.id }); }
    finally { await db.exec('alter table escen.grades enable trigger grade_unprocessed_zero'); }
  };
  await check('Copies : ancien NON_TRAITE sans valeur bloqué sans normalisation ni audit parasite', async () => {
    const { evaluation, candidates } = await fixture();
    const grade = await legacyGrade(candidates[0]);
    assert.equal(grade.value, null);
    assert.equal((await sqlTransition(evaluation.id, 'BROUILLON', 'SAISIES')).error, null);
    const before = await revision();
    const audits = await auditCount();
    const denied = await post({ action: 'transition_workflow', evaluationId: evaluation.id, fromStatus: 'SAISIES', toStatus: 'SOUMISES' });
    assert.equal(denied.status, 409);
    assert.match((await denied.json()).error, /NON_TRAITE/);
    assert.match((await sqlTransition(evaluation.id, 'SAISIES', 'SOUMISES')).error?.message || '', /NON_TRAITE/);
    const saved = (await db.query('select * from escen.grades where id=$1', [grade.id])).rows[0];
    assert.equal(saved.value, null);
    assert.equal(saved.absence_status, 'NON_TRAITE');
    assert.equal(saved.revision, grade.revision);
    assert.equal(await revision(), before);
    assert.equal(await auditCount(), audits);
  });

  await check('Copies : mélange NON_TRAITE et note manquante refusé sans mutation', async () => {
    const { evaluation, candidates } = await fixture(2);
    const grade = await legacyGrade(candidates[0]);
    assert.equal((await sqlTransition(evaluation.id, 'BROUILLON', 'SAISIES')).error, null);
    const before = await revision();
    const audits = await auditCount();
    assert.match((await sqlTransition(evaluation.id, 'SAISIES', 'SOUMISES')).error.message, /NON_TRAITE/);
    assert.equal(await revision(), before);
    assert.equal(await auditCount(), audits);
    assert.equal(await scalar('select value as value from escen.grades where id=$1', [grade.id]), null);
  });

  await check('Copies : ancien zéro NON_TRAITE publié reste lisible et corrigeable avec audit', async () => {
    const { evaluation, grade } = unprocessed;
    // Fixture d’une publication antérieure à 039, uniquement dans la base de test.
    // Le nouveau verrou reste actif pour toutes les actions métier testées ensuite.
    await db.exec('alter table escen.evaluation_transitions disable trigger evaluation_processed_grades');
    try { assert.equal((await sqlTransition(evaluation.id, 'SAISIES', 'SOUMISES')).error, null); }
    finally { await db.exec('alter table escen.evaluation_transitions enable trigger evaluation_processed_grades'); }
    const refused = await post({ action: 'enter_grades', evaluationId: evaluation.id, grades: [{ candidateId: grade.candidate_id, value: 0, absenceStatus: 'NON_TRAITE' }] });
    assert.equal(refused.status, 409);
    for (const [from, to] of [['SOUMISES', 'A_CONTROLER'], ['A_CONTROLER', 'VALIDEES'], ['VALIDEES', 'PUBLIEES']]) await transition(evaluation.id, from, to);
    assert.equal(await scalar('select absence_status as value from escen.grades where id=$1', [grade.id]), 'NON_TRAITE');
    await assert.rejects(db.query('update escen.grades set value=0 where id=$1', [grade.id]), /verrouillée/);
    for (const newValue of ['', ' ', null, -1, 21]) {
      const before = await revision();
      const invalid = await post({ action: 'correct_grade', gradeId: grade.id, newValue, reason: 'Correction invalide de recette' });
      assert.equal(invalid.status, 400);
      assert.equal(await revision(), before);
      assert.equal(Number(await scalar('select value as value from escen.grades where id=$1', [grade.id])), 0);
    }
    const corrected = await post({ action: 'correct_grade', gradeId: grade.id, newValue: 12, reason: 'Copie finalement corrigée et décision académique tracée' });
    assert.equal(corrected.status, 200, JSON.stringify(await corrected.json()));
    const saved = (await db.query('select * from escen.grades where id=$1', [grade.id])).rows[0];
    assert.equal(Number(saved.value), 12);
    assert.equal(saved.absence_status, null);
    const history = (await db.query('select * from escen.grade_revisions where grade_id=$1', [grade.id])).rows[0];
    assert.equal(Number(history.old_value), 0);
    assert.equal(Number(history.new_value), 12);
    assert.equal(history.actor_id, actor.id);
    const audit = (await db.query("select * from escen_private.audit_events where table_name='grades' and entity_id=$1 and action='UPDATE'", [grade.id])).rows[0];
    assert.equal(audit.old_value.absence_status, 'NON_TRAITE');
    assert.equal(audit.new_value.absence_status, null);
  });
  await verifyOnlineExams(db, check, { year, actor, teaching, offering, addStudent, insert, post });
}
