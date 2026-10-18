import { verifyEvaluationWorkflow } from './verify-evaluation-workflow.mjs';
import { verifyCurriculumCatalog } from './verify-curriculum-catalog.mjs';
import { prepareTestYear } from './academic-year-test-helpers.mjs';
import assert from 'node:assert/strict';
import { verifyAcademicYears } from './verify-academic-years.mjs';
import { verifyWebsiteDatabase } from './verify-website-database.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createDatabase, applyMigrations } from './database-engine.mjs';

const db = createDatabase();
let checks = 0;
const check = async (name, run) => {
  await run();
  checks += 1;
  console.log(`✓ ${name}`);
};
const reject = async (sql, params = [], pattern = /./) => {
  await assert.rejects(db.query(sql, params), error => pattern.test(error.message));
};
const insert = async (table, values) => {
  assert.match(table, /^[a-z_]+$/);
  const columns = Object.keys(values);
  columns.forEach(column => assert.match(column, /^[a-z_]+$/));
  const result = await db.query(`insert into escen.${table} (${columns.join(',')}) values (${columns.map((_, index) => '$' + (index + 1)).join(',')}) returning *`, Object.values(values));
  return result.rows[0];
};
const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;

try {
  await db.exec('create schema auth; create table auth.users(id uuid primary key);');
  await applyMigrations(db);
  await check('Ancienne migration conservée et nouvelle base créée', async () => {
    assert.equal(await scalar('select count(*)::integer as value from public.academic_levels'), 5);
    assert.ok(await scalar("select count(*)::integer as value from pg_tables where schemaname = 'escen'") > 70);
  });
  await check('Correspondance des 140 tables source vers des cibles réellement présentes', async () => {
    const mapping = JSON.parse(await readFile(fileURLToPath(new URL('../supabase/legacy-table-map.json', import.meta.url)), 'utf8'));
    assert.equal(Object.keys(mapping).length, 140);
    for (const item of Object.values(mapping)) for (const target of item.targets) {
      assert.ok(await scalar('select to_regclass($1)::text as value', [target]), target);
    }
  });
  await check('Informaticien avec tous les droits, Stagiaire sans droit et aucune attribution automatique', async () => {
    assert.equal(await scalar('select count(*)::integer as value from escen.roles'), 14);
    assert.equal(await scalar('select count(*)::integer as value from escen.permissions'), 42);
    assert.equal(await scalar("select count(*)::integer as value from escen.role_permissions rp join escen.roles r on r.id = rp.role_id where r.code = 'IT'"), 42);
    assert.equal(await scalar("select count(*)::integer as value from escen.role_permissions rp join escen.roles r on r.id = rp.role_id where r.code = 'STG'"), 0);
    assert.equal(await scalar('select count(*)::integer as value from escen.role_grants'), 0);
  });

  const person = await insert('people', { firstname: 'Utilisateur', lastname: 'Test' });
  const account = await insert('accounts', { person_id: person.id, active: true });
  const site = await insert('sites', { code: 'TEST', name: 'Site Test' });
  const building = await insert('buildings', { site_id: site.id, code: 'A', name: 'Bâtiment A' });
  const room = await insert('rooms', { site_id: site.id, building_id: building.id, code: 'R1', name: 'Salle 1', capacity: 30 });
  const year = await insert('academic_years', { code: '2026-2027', name: '2026-2027', starts_on: '2026-01-01', ends_on: '2027-12-31', status: 'OUVERTE' });
  const nextYear = await insert('academic_years', { code: '2028-2029', name: '2028-2029', starts_on: '2028-01-01', ends_on: '2029-12-31', status: 'BROUILLON' });
  const cycle = await insert('cycles', { code: 'LICENCE', name: 'Licence' });
  const level = await insert('levels', { cycle_id: cycle.id, code: 'L1', name: 'Licence 1', position: 1 });
  const program = await insert('programs', { code: 'INF', name: 'Informatique' });
  const subject = await insert('subjects', { code: 'ALGO', name: 'Algorithmique' });
  const curriculum = await insert('curricula', { program_id: program.id, level_id: level.id, version: 1 });
  const semester = await insert('curriculum_semesters', { curriculum_id: curriculum.id, position: 1, name: 'Semestre 1', target_credits: 30 });
  const unit = await insert('teaching_units', { semester_id: semester.id, curriculum_id: curriculum.id, code: 'UE1', name: 'Fondamentaux', credits: 30 });
  const component = await insert('curriculum_components', { subject_id: subject.id, unit_id: unit.id, curriculum_id: curriculum.id, code: 'EC1', coefficient: 1, credits: 30 });
  await insert('assessment_weights', { curriculum_id: curriculum.id, component_id: component.id, evaluation_kind: 'DEVOIR', percent: 40 });
  await insert('assessment_weights', { curriculum_id: curriculum.id, component_id: component.id, evaluation_kind: 'EXAMEN', percent: 60 });
  await db.query("update escen.curricula set status = 'APPROVED', approved_by = $1, approved_at = now() where id = $2", [account.id, curriculum.id]);
  const offering = await insert('academic_offerings', { curriculum_id: curriculum.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  await insert('offering_semesters', { offering_id: offering.id, curriculum_id: curriculum.id, curriculum_semester_id: semester.id, starts_on: '2026-01-01', ends_on: '2027-12-31' });
  const group = await insert('groups', { academic_year_id: year.id, level_id: level.id, site_id: site.id, name: 'L1-A' });
  const group2 = await insert('groups', { academic_year_id: year.id, level_id: level.id, site_id: site.id, name: 'L1-B' });
  const oldYearGroup = await insert('groups', { academic_year_id: nextYear.id, level_id: level.id, site_id: site.id, name: 'L1-X' });
  for (const value of [group, group2]) await insert('group_offerings', { group_id: value.id, offering_id: offering.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  const studentPerson = await insert('people', { firstname: 'Étudiante', lastname: 'Test' });
  const student = await insert('students', { person_id: studentPerson.id, matricule: 'ETU-TEST' });
  const enrollment = await insert('enrollments', { student_id: student.id, offering_id: offering.id, status: 'INSCRIT' });
  const membership = await insert('enrollment_groups', { enrollment_id: enrollment.id, offering_id: offering.id, group_id: group.id, valid_from: '2026-01-01', changed_by: account.id, reason: 'Inscription' });
  const staff = await insert('staff', { person_id: person.id, employee_number: 'ENS-TEST' });
  const teacher = await insert('teachers', { staff_id: staff.id });
  const assignment = await insert('teaching_assignments', { teacher_id: teacher.id, group_id: group.id, offering_id: offering.id, curriculum_id: curriculum.id, component_id: component.id, valid_from: '2026-01-01', valid_until: '2027-12-31' });
  const sessionData = { assignment_id: assignment.id, offering_id: offering.id, group_id: group.id, teacher_id: teacher.id, room_id: room.id, mode: 'COURS' };
  const session = await insert('sessions', { ...sessionData, starts_at: '2026-11-01T08:00:00Z', ends_at: '2026-11-01T09:00:00Z' });
  const session2 = await insert('sessions', { ...sessionData, starts_at: '2026-11-02T08:00:00Z', ends_at: '2026-11-02T09:00:00Z' });

  await check('Même étudiant présent à plusieurs séances, sans doublon par séance', async () => {
    for (const value of [session, session2]) await insert('attendances', { session_id: value.id, enrollment_id: enrollment.id, offering_id: offering.id, status: 'PRESENT', recorded_by: account.id });
    await reject('insert into escen.attendances(session_id,enrollment_id,offering_id,status,recorded_by) values($1,$2,$3,\'PRESENT\',$4)', [session.id, enrollment.id, offering.id, account.id], /unique/i);
  });
  await check('Année contradictoire et rattachement à un groupe incompatible refusés', async () => {
    await assert.rejects(insert('group_offerings', { group_id: oldYearGroup.id, offering_id: offering.id, academic_year_id: year.id, level_id: level.id, site_id: site.id }), /foreign key/i);
    await reject('update escen.enrollment_groups set group_id = $1 where id = $2', [oldYearGroup.id, membership.id], /historique/i);
  });
  await check('Crédits et maquette approuvée protégés', async () => {
    await reject('update escen.curriculum_components set credits = 20 where id = $1', [component.id], /immuable/i);
    const draft = await insert('curricula', { program_id: program.id, level_id: level.id, version: 2 });
    await reject("update escen.curricula set status = 'APPROVED', approved_by = $1, approved_at = now() where id = $2", [account.id, draft.id], /crédits/i);
  });
  await check('Compte Auth, périmètre de rôle et identifiants stables contrôlés', async () => {
    await reject('update escen.accounts set auth_user_id = $1 where id = $2',[person.id,account.id],/foreign key/i);
    await reject('update escen.students set id = $1 where id = $2',[person.id,student.id],/Identifiant/i);
    const roleId = (await db.query("select id from escen.roles where code = 'SURV'")).rows[0].id;
    await assert.rejects(insert('role_grants', { account_id: account.id, role_id: roleId, site_id: site.id, academic_year_id: nextYear.id, group_id: group.id, granted_by: account.id, valid_from: new Date().toISOString(), reason: 'Périmètre contradictoire' }), /Périmètre/i);
  });
  await check('Conflits de planning, dates bloquées et annulations sans motif refusés', async () => {
    await assert.rejects(insert('sessions', { ...sessionData, starts_at: '2026-11-01T08:30:00Z', ends_at: '2026-11-01T09:30:00Z' }), /exclusion/i);
    await insert('blocked_periods', { site_id: site.id, name: 'Fermeture', kind: 'FERMETURE', starts_at: '2026-11-03T00:00:00Z', ends_at: '2026-11-04T00:00:00Z' });
    await assert.rejects(insert('sessions', { ...sessionData, starts_at: '2026-11-03T08:00:00Z', ends_at: '2026-11-03T09:00:00Z' }), /bloquée/i);
    await assert.rejects(insert('sessions', { ...sessionData, starts_at: '2026-11-04T08:00:00Z', ends_at: '2026-11-04T09:00:00Z', status: 'ANNULE' }), /check/i);
    await reject("update escen.sessions set status = 'ANNULE', reason = 'Motif' where id = $1", [session.id], /émargée/i);
  });

  const evaluation = await insert('evaluations', { assignment_id: assignment.id, offering_id: offering.id, component_id: component.id, name: 'Examen', kind: 'EXAMEN', created_by: account.id });
  const candidate = await insert('evaluation_candidates', { evaluation_id: evaluation.id, enrollment_id: enrollment.id, offering_id: offering.id, eligibility: 'ELIGIBLE' });
  const grade = await insert('grades', { candidate_id: candidate.id, value: 12, entered_by: account.id });
  await check('Une note vide sans statut reste distincte de zéro et bloque une soumission incomplète', async () => {
    const absentEvaluation = await insert('evaluations', { assignment_id: assignment.id, offering_id: offering.id, component_id: component.id, name: 'Absence', kind: 'DEVOIR', created_by: account.id });
    const absentCandidate = await insert('evaluation_candidates', { evaluation_id: absentEvaluation.id, enrollment_id: enrollment.id, offering_id: offering.id, eligibility: 'ELIGIBLE' });
    const absentGrade = await insert('grades', { candidate_id: absentCandidate.id, value: null, absence_status: null, entered_by: account.id });
    await insert('evaluation_transitions', { evaluation_id: absentEvaluation.id, from_status: 'BROUILLON', to_status: 'SAISIES', actor_id: account.id });
    await assert.rejects(insert('evaluation_transitions', { evaluation_id: absentEvaluation.id, from_status: 'SAISIES', to_status: 'SOUMISES', actor_id: account.id }), /incomplets/i);
    assert.equal(await scalar('select value as value from escen.grades where id = $1',[absentGrade.id]),null);
  });
  await check('Soumission complète et publication par transitions historisées', async () => {
    await assert.rejects(insert('evaluations', { assignment_id: assignment.id, offering_id: offering.id, component_id: component.id, name: 'Publication directe', kind: 'EXAMEN', status: 'PUBLIEES', created_by: account.id }), /brouillon/i);
    await reject("update escen.evaluations set status = 'PUBLIEES' where id = $1", [evaluation.id], /transition/i);
    await reject('update escen.grades set value = 21 where id = $1', [grade.id], /check/i);
    await reject('update escen.grades set value = 20.001 where id = $1', [grade.id], /check/i);
    for (const [from, to] of [['BROUILLON','SAISIES'],['SAISIES','SOUMISES'],['SOUMISES','A_CONTROLER'],['A_CONTROLER','VALIDEES'],['VALIDEES','PUBLIEES']]) {
      await insert('evaluation_transitions', { evaluation_id: evaluation.id, from_status: from, to_status: to, actor_id: account.id });
    }
    assert.equal(await scalar('select count(*)::integer as value from escen.evaluation_transitions where evaluation_id = $1', [evaluation.id]), 5);
    await reject('update escen.grades set value = 14 where id = $1', [grade.id], /verrouillée/i);
  });
  await check('Correction publiée conserve ancienne valeur, motif et version', async () => {
    await insert('grade_revisions', { grade_id: grade.id, old_value: 12, new_value: 14, actor_id: account.id, actor_role: 'DA', reason: 'Correction académique' });
    assert.equal(Number(await scalar('select value as value from escen.grades where id = $1', [grade.id])), 14);
    await assert.rejects(insert('grade_revisions', { grade_id: grade.id, old_value: 12, new_value: 15, actor_id: account.id, actor_role: 'DA', reason: 'Ancienne valeur périmée' }), /Ancienne note/i);
    await reject('update escen.grade_revisions set reason = $1', ['Effacement'], /immuable/i);
  });

  await check('Sujet figé, tentative sur horloge serveur, remise et correction bornées', async () => {
    const time = new Date(await scalar('select clock_timestamp() as value'));
    const opens = new Date(time.getTime() - 60000).toISOString();
    const closes = new Date(time.getTime() + 3000).toISOString();
    const onlineSession = await insert('sessions', { ...sessionData, room_id: null, mode: 'EN_LIGNE', starts_at: opens, ends_at: closes });
    const onlineEvaluation = await insert('evaluations', { assignment_id: assignment.id, offering_id: offering.id, component_id: component.id, name: 'En ligne', kind: 'EXAMEN', created_by: account.id });
    await insert('exam_deliveries', { evaluation_id: onlineEvaluation.id, session_id: onlineSession.id, access_opens_at: opens, access_closes_at: closes, duration_minutes: 30 });
    const onlineCandidate = await insert('evaluation_candidates', { evaluation_id: onlineEvaluation.id, enrollment_id: enrollment.id, offering_id: offering.id, eligibility: 'ELIGIBLE' });
    const paper = await insert('exam_papers', { evaluation_id: onlineEvaluation.id, version: 1 });
    const part = await insert('exam_parts', { paper_id: paper.id, title: 'Questions', position: 1 });
    const question = await insert('exam_questions', { paper_id: paper.id, part_id: part.id, kind: 'TEXTE', prompt: 'Expliquer', points: 20, position: 1 });
    await db.query("update escen.exam_papers set status = 'AUTORISE', authorized_by = $1, authorized_at = now() where id = $2", [account.id, paper.id]);
    await reject('update escen.exam_questions set points = 10 where id = $1', [question.id], /immuable/i);
    const attempt = await insert('exam_attempts', { candidate_id: onlineCandidate.id, evaluation_id: onlineEvaluation.id, paper_id: paper.id, attempt_number: 1, started_at: '2099-01-01T00:00:00Z', deadline_at: '2099-01-01T01:00:00Z', status: 'EN_COURS' });
    assert.ok(new Date(attempt.started_at).getTime() < new Date('2099-01-01').getTime());
    assert.equal(new Date(attempt.deadline_at).toISOString(), closes);
    const answer = await insert('exam_answers', { attempt_id: attempt.id, paper_id: paper.id, question_id: question.id, response: { text: 'Réponse' } });
    await db.query("update escen.exam_attempts set status = 'REMISE', submitted_at = now() where id = $1", [attempt.id]);
    await reject('update escen.exam_answers set response = $1 where id = $2', [{ text: 'Modification' }, answer.id], /remise/i);
    await reject("update escen.sessions set status = 'ANNULE', reason = 'Annulation' where id = $1", [onlineSession.id], /copies/i);
    await assert.rejects(insert('answer_corrections', { answer_id: answer.id, points: 10, corrected_by: account.id, reason: 'Avant fermeture' }), /barème/i);
    const waitMs = Math.max(0, new Date(closes).getTime() - Date.now() + 30);
    await new Promise(resolve => setTimeout(resolve, waitMs));
    await assert.rejects(insert('answer_corrections', { answer_id: answer.id, points: 21, corrected_by: account.id, reason: 'Hors barème' }), /barème/i);
    await insert('answer_corrections', { answer_id: answer.id, points: 15, corrected_by: account.id, reason: 'Correction après fermeture' });
    await assert.rejects(insert('exam_attempts', { candidate_id: onlineCandidate.id, evaluation_id: onlineEvaluation.id, paper_id: paper.id, attempt_number: 2, started_at: opens, deadline_at: closes, status: 'EN_COURS' }), /fenêtre/i);
  });

  const feeType = await insert('fee_types', { code: 'SCOL', name: 'Scolarité', category: 'SCOLARITE' });
  const contract = await insert('financial_contracts', { enrollment_id: enrollment.id, reference: 'CONTRAT-TEST' });
  const version = await insert('contract_versions', { contract_id: contract.id, version: 1, reason: 'Contrat initial' });
  const line = await insert('contract_lines', { contract_id: contract.id, version_id: version.id, fee_type_id: feeType.id, description: 'Scolarité annuelle', amount: 1000 });
  const installment = await insert('installments', { version_id: version.id, position: 1, due_on: '2026-11-01', amount: 1000, description: 'Échéance' });
  await db.query("update escen.contract_versions set status = 'APPROVED', approved_by = $1, approved_at = now() where id = $2", [account.id, version.id]);
  const payment = await insert('payments', { enrollment_id: enrollment.id, payer_name: 'Payeur Test', amount: 600, method: 'VIREMENT', provider: 'BANQUE', reference: 'PAY-TEST', paid_on: '2026-10-14', recorded_by: account.id });
  const allocation = await insert('payment_allocations', { payment_id: payment.id, enrollment_id: enrollment.id, contract_id: contract.id, version_id: version.id, line_id: line.id, installment_id: installment.id, amount: 600, allocated_by: account.id });
  await check('Montants FCFA entiers et allocation bornée par paiement/contrat/échéance', async () => {
    await assert.rejects(insert('payments', { enrollment_id: enrollment.id, payer_name: 'Test', amount: 0.001, method: 'ESPECES', provider: 'CAISSE', reference: 'FRACTION', paid_on: '2026-10-14', recorded_by: account.id }), /check/i);
    await assert.rejects(insert('payment_allocations', { payment_id: payment.id, enrollment_id: enrollment.id, contract_id: contract.id, version_id: version.id, line_id: line.id, amount: 1, allocated_by: account.id }), /disponible/i);
    await reject('update escen.payments set amount = 500 where id = $1', [payment.id], /immuable/i);
    await reject('update escen.contract_lines set amount = 900 where id = $1', [line.id], /immuable/i);
    await assert.rejects(insert('refunds', { payment_id: payment.id, amount: 1, reference: 'REF-1', actor_id: account.id, reason: 'Remboursement' }), /disponible/i);
  });
  await check('Contre-opération conserve paiement et allocation originaux', async () => {
    await insert('allocation_reversals', { allocation_id: allocation.id, actor_id: account.id, reason: 'Réaffectation' });
    await insert('payment_reversals', { payment_id: payment.id, actor_id: account.id, reason: 'Annulation motivée' });
    assert.equal(await scalar('select count(*)::integer as value from escen.payments where id = $1', [payment.id]), 1);
    assert.equal(await scalar('select count(*)::integer as value from escen.payment_allocations where id = $1', [allocation.id]), 1);
    assert.equal(Number(await scalar('select paid as value from escen.contract_balances where contract_id = $1', [contract.id])), 0);
    await reject('delete from escen.payments where id = $1', [payment.id], /Suppression/i);
  });
  await check('Révision de contrat conserve l’ancienne version et ses lignes', async () => {
    const revised = await insert('contract_versions', { contract_id: contract.id, version: 2, supersedes_id: version.id, reason: 'Révision du contrat' });
    await insert('contract_lines', { contract_id: contract.id, version_id: revised.id, fee_type_id: feeType.id, description: 'Scolarité révisée', amount: 1200 });
    await insert('installments', { version_id: revised.id, position: 1, due_on: '2026-12-01', amount: 1200, description: 'Échéance révisée' });
    await db.transaction(async tx => {
      await tx.query("update escen.contract_versions set status = 'SUPERSEDED' where id = $1", [version.id]);
      await tx.query("update escen.contract_versions set status = 'APPROVED', approved_by = $1, approved_at = now() where id = $2", [account.id,revised.id]);
    });
    assert.equal(Number(await scalar('select amount as value from escen.contract_lines where id = $1', [line.id])),1000);
    assert.equal(Number(await scalar('select expected as value from escen.contract_balances where contract_id = $1',[contract.id])),1200);
  });
  await check('Jury et relevé conservent le bon étudiant, semestre et version des notes', async () => {
    const offeringSemester = (await db.query('select id from escen.offering_semesters where offering_id = $1',[offering.id])).rows[0].id;
    const rules = await insert('academic_rule_versions', { version: 1, rules: { passMark: 10, compensation: false }, approved_by: account.id, approved_at: new Date().toISOString(), reason: 'Règlement explicite de test' });
    const jury = await insert('juries', { offering_semester_id: offeringSemester, rules_id: rules.id, held_at: new Date().toISOString(), chaired_by: account.id });
    const decision = await insert('jury_decisions', { jury_id: jury.id, offering_semester_id: offeringSemester, offering_id: offering.id, enrollment_id: enrollment.id, decision: 'ADMIS', average: 14, earned_credits: 30, required_credits: 30, reason: 'Décision de test', decided_by: account.id });
    const actualRevision = await scalar('select revision as value from escen.grades where id = $1',[grade.id]);
    await insert('jury_grade_inputs', { decision_id: decision.id, grade_id: grade.id, grade_revision: actualRevision, value: 14 });
    await insert('credit_awards', { decision_id: decision.id, component_id: component.id, credits: 30, award_kind: 'NORMALE' });
    await insert('generated_documents', { student_id: student.id, enrollment_id: enrollment.id, decision_id: decision.id, kind: 'RELEVE', reference: 'REL-TEST', version: 1, content_snapshot: { average: 14 }, issued_by: account.id });
    const otherPerson = await insert('people', { firstname: 'Autre', lastname: 'Étudiant' });
    const otherStudent = await insert('students', { person_id: otherPerson.id, matricule: 'AUTRE' });
    await assert.rejects(insert('generated_documents', { student_id: otherStudent.id, enrollment_id: enrollment.id, decision_id: decision.id, kind: 'RELEVE', reference: 'REL-INCOMPATIBLE', version: 1, content_snapshot: {}, issued_by: account.id }), /autre étudiant/i);
    await insert('grade_revisions', { grade_id: grade.id, old_value: 14, new_value: 15, actor_id: account.id, actor_role: 'DA', reason: 'Correction après jury' });
    assert.equal(await scalar('select count(*)::integer as value from escen.jury_decisions_needing_review where decision_id = $1',[decision.id]),1);
    assert.equal(Number(await scalar('select value as value from escen.jury_grade_inputs where decision_id = $1',[decision.id])),14);
    await reject('update escen.jury_decisions set average = 15 where id = $1',[decision.id],/immuable/i);
  });
  await check('Réclamation suit ses sept états et ne clôture la correction qu’après révision', async () => {
    const complaint = await insert('complaints', { candidate_id: candidate.id, grade_id: grade.id, reason: 'Vérification de la note' });
    await reject("update escen.complaints set status = 'EN_ANALYSE' where id = $1",[complaint.id],/événement/i);
    for (const [from,to] of [['NOUVELLE','EN_ANALYSE'],['EN_ANALYSE','TRANSMISE_ENSEIGNANT'],['TRANSMISE_ENSEIGNANT','AVIS_ENSEIGNANT'],['AVIS_ENSEIGNANT','DECISION_ACADEMIQUE'],['DECISION_ACADEMIQUE','CORRECTION_EVENTUELLE']]) {
      await insert('complaint_events', { complaint_id: complaint.id, from_status: from, to_status: to, actor_id: account.id, reason: 'Étape motivée' });
    }
    await assert.rejects(insert('complaint_events', { complaint_id: complaint.id, from_status: 'CORRECTION_EVENTUELLE', to_status: 'CLOTUREE', actor_id: account.id, reason: 'Clôture prématurée' }), /Correction attendue/i);
    await insert('grade_revisions', { grade_id: grade.id, complaint_id: complaint.id, old_value: 15, new_value: 16, actor_id: account.id, actor_role: 'DA', reason: 'Correction accordée' });
    await insert('complaint_events', { complaint_id: complaint.id, from_status: 'CORRECTION_EVENTUELLE', to_status: 'CLOTUREE', actor_id: account.id, reason: 'Correction appliquée' });
    assert.equal(await scalar('select status as value from escen.complaints where id = $1',[complaint.id]),'CLOTUREE');
  });
  await check('Réceptions partielles et mouvements de stock bornés et tracés', async () => {
    const purchase = await insert('purchases', { academic_year_id: year.id, site_id: site.id, reference: 'ACHAT-TEST', requested_by: account.id, status: 'APPROUVE', reason: 'Achat approuvé' });
    const purchaseLine = await insert('purchase_lines', { purchase_id: purchase.id, description: 'Chaises', quantity: 5, unit_amount: 1000 });
    const receipt = await insert('purchase_receipts', { purchase_id: purchase.id, line_id: purchaseLine.id, quantity: 3, received_by: account.id, reason: 'Livraison partielle' });
    await assert.rejects(insert('purchase_receipts', { purchase_id: purchase.id, line_id: purchaseLine.id, quantity: 3, received_by: account.id, reason: 'Dépassement' }), /quantité/i);
    const asset = await insert('assets', { site_id: site.id, code: 'CHAIS-TEST', name: 'Chaises', status: 'DISPONIBLE' });
    await insert('asset_movements', { academic_year_id: year.id, asset_id: asset.id, receipt_id: receipt.id, quantity: 3, actor_id: account.id, reason: 'Entrée de stock' });
    await assert.rejects(insert('asset_movements', { academic_year_id: year.id, asset_id: asset.id, receipt_id: receipt.id, quantity: 1, actor_id: account.id, reason: 'Double entrée' }), /réception/i);
    await assert.rejects(insert('asset_movements', { academic_year_id: year.id, asset_id: asset.id, quantity: -4, actor_id: account.id, reason: 'Sortie excessive' }), /Stock/i);
  });
  await check('Provenance des imports et payload source immuables', async () => {
    const batch = (await db.query("insert into escen_private.import_batches(source_name,archive_sha256,sql_sha256,source_rows) values('TEST',$1,$2,1) returning id",['a'.repeat(64),'b'.repeat(64)])).rows[0].id;
    const source = (await db.query("insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload) values($1,'etudiants','1',$2::jsonb) returning id",[batch,JSON.stringify({ id:1 })])).rows[0].id;
    await reject('update escen_private.legacy_rows set payload = $1::jsonb where id = $2',[JSON.stringify({ id:2 }),source],/immuable/i);
    await reject("update escen_private.legacy_rows set status = 'MAPPED' where id = $1",[source],/Correspondance/i);
    await reject("insert into escen_private.source_mappings(row_id,target_table,target_id,mapped_by,reason) values($1,'students',$2,$3,'Erreur')",[source,person.id,account.id],/absente/i);
    await db.query("insert into escen_private.source_mappings(row_id,target_table,target_id,mapped_by,reason) values($1,'students',$2,$3,'Correspondance validée')",[source,student.id,account.id]);
    await db.query("update escen_private.legacy_rows set status = 'MAPPED' where id = $1",[source]);
  });
  await check('Audit avant/après conservé et non modifiable', async () => {
    assert.ok(await scalar("select count(*)::integer as value from escen_private.audit_events where table_name = 'grades' and old_value is not null") > 0);
    await reject("update escen_private.audit_events set database_actor = 'autre'", [], /immuable/i);
  });
  await check('Passerelle serveur : transaction atomique, version concurrente et table bornée', async () => {
    await db.query('insert into auth.users(id) values($1)',[account.id]);
    await db.query('update escen.accounts set auth_user_id=$1 where id=$1',[account.id]);
    const proposalId = randomUUID();
    await reject('select public.escen_backend_transaction($1,0,$2::jsonb)',[account.id,JSON.stringify([
      { table:'people',operation:'insert',record:{ id:proposalId,firstname:'Rollback',lastname:'Test' } },
      { table:'students',operation:'insert',record:{ person_id:randomUUID(),matricule:'INVALIDE' } },
    ])],/foreign key/i);
    assert.equal(await scalar('select count(*)::integer as value from escen.people where id=$1',[proposalId]),0);
    assert.equal(Number(await scalar('select revision as value from escen_private.portal_revision')),0);
    await db.query('select public.escen_backend_transaction($1,0,$2::jsonb)',[account.id,JSON.stringify([
      { table:'people',operation:'insert',record:{ id:proposalId,firstname:'Sauvegardé',lastname:'Test' } },
    ])]);
    assert.equal(Number(await scalar('select revision as value from escen_private.portal_revision')),1);
    assert.equal(await scalar("select actor_id as value from escen_private.audit_events where table_name='people' and entity_id=$1",[proposalId]),account.id);
    assert.ok(!await scalar("select nullif(current_setting('escen.actor_id',true),'') as value"));
    await reject('select public.escen_backend_transaction($1,0,$2::jsonb)',[account.id,JSON.stringify([{ table:'people',operation:'update',record:{ id:proposalId,firstname:'Périmé' } }])],/CONCURRENT_UPDATE/);
    await reject('select public.escen_backend_transaction($1,1,$2::jsonb)',[account.id,JSON.stringify([{ table:'people',operation:'update',record:{ id:randomUUID(),firstname:'Absent' } }])],/absente/);
    await reject('select public.escen_backend_transaction($1,1,$2::jsonb)',[account.id,JSON.stringify([{ table:'people; drop table people',operation:'insert',record:{ firstname:'Injection' } }])],/interdite/);
  });
  await verifyEvaluationWorkflow(db, check, { year, offering, assignment, level, site });

  await check('Gestion persistante des comptes, profils séparés et retrait historisé', async () => {
    const itRole = await scalar("select id as value from escen.roles where code='IT'");
    const siteRole = await scalar("select id as value from escen.roles where code='SITE'");
    await insert('role_grants', { account_id: account.id, role_id: itRole, granted_by: account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Administration de test' });
    const targetPerson = await insert('people', { firstname: 'Compte', lastname: 'Personnel' });
    const target = await insert('accounts', { person_id: targetPerson.id });
    await insert('staff', { person_id: targetPerson.id, employee_number: 'STAFF-TARGET' });
    await insert('role_grants', { account_id: target.id, role_id: siteRole, granted_by: account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Site de test' });
    await reject("select public.escen_manage_account($1,$2,'activate','Activation test')", [account.id,target.id], /Auth/i);
    await reject("select public.escen_manage_account($1,$1,'archive','Retrait test')", [account.id], /propre accès/i);
    await db.query('insert into auth.users(id) values($1)',[target.id]);
    await db.query('update escen.accounts set auth_user_id=$1 where id=$1',[target.id]);
    await db.query("select public.escen_manage_account($1,$2,'activate','Activation test')",[account.id,target.id]);
    await reject("select public.escen_manage_account($1,$2,'deactivate','Non autorisé')",[target.id,account.id],/Administration globale/i);
    await reject("select public.escen_manage_account($1,$2,'role','Profil absent','STUD','SITE')",[account.id,target.id],/Profil étudiant/i);
    await db.query("select public.escen_manage_account($1,$2,'role','Attribution finance','RAF','SITE')",[account.id,target.id]);
    assert.equal(await scalar('select count(*)::integer as value from escen.role_grants where account_id=$1 and valid_until is not null',[target.id]),1);
    const studentAccount = await insert('accounts', { person_id: studentPerson.id });
    const snapshot = await scalar('select public.escen_backend_snapshot() as value');
    assert.equal(snapshot.tables.accounts.find(row=>row.id===target.id).account_type,'staff');
    assert.equal(snapshot.tables.accounts.find(row=>row.id===studentAccount.id).account_type,'student');
    await db.query("select public.escen_manage_account($1,$2,'archive','Retrait demandé')",[account.id,target.id]);
    assert.equal(await scalar('select active as value from escen.accounts where id=$1',[target.id]),false);
    assert.ok(await scalar('select archived_at as value from escen.accounts where id=$1',[target.id]));
    const after = await scalar('select public.escen_backend_snapshot() as value');
    assert.equal(after.tables.accounts.some(row=>row.id===target.id),false);
    assert.ok(await scalar("select count(*)::integer as value from escen_private.audit_events where table_name='accounts' and entity_id=$1 and actor_id=$2 and reason='Retrait demandé' and old_value->>'active'='true' and new_value->>'active'='false'",[target.id,account.id])>0);
    await reject("select public.escen_manage_account($1,$2,'activate','Réactivation interdite')",[account.id,target.id],/retiré/i);
  });
  await check('Lecture historique fidèle, secrets exclus, recherche et anomalies conservées', async () => {
    const batch = (await db.query("insert into escen_private.import_batches(source_name,archive_sha256,sql_sha256,source_rows) values('HISTORY',$1,$2,2) returning id",['c'.repeat(64),'d'.repeat(64)])).rows[0].id;
    const raw = { id:'source1',nom:'Exemple',prenom:'Étudiante',matricule:'HIST-1',password:'NEVER_EXPOSE',remember_token:'NEVER_EXPOSE_TOKEN' };
    const row = (await db.query("insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload) values($1,'etudiants','source1',$2::jsonb) returning id",[batch,JSON.stringify(raw)])).rows[0];
    await db.query("insert into escen_private.import_issues(row_id,code,details) values($1,'SOURCE_PARENT_MISSING','{}')",[row.id]);
    const page = await scalar("select public.escen_history_page('etudiants',0,50,'Exemple',true) as value");
    assert.equal(page.records.length,1);
    assert.equal(page.records[0].values.matricule,'HIST-1');
    assert.equal(page.records[0].values.password,undefined);
    assert.equal(page.records[0].values.remember_token,undefined);
    assert.deepEqual(page.records[0].issues,['SOURCE_PARENT_MISSING']);
    assert.equal(await scalar("select payload->>'password' as value from escen_private.legacy_rows where id=$1",[row.id]),'NEVER_EXPOSE');
    assert.equal((await scalar("select public.escen_history_page('etudiants',0,50,'NEVER_EXPOSE') as value")).total,0);
    await reject("select public.escen_history_page('personal_access_tokens')",[],/non publiée/i);
    await reject("select public.escen_history_page('notes',0,101)",[],/Pagination/i);
    const catalog = await scalar('select public.escen_history_catalog() as value');
    assert.ok(catalog.datasets.some(item=>item.table==='notes'));
    assert.equal(catalog.references.etudiants[0].values.password,undefined);
  });
  await check('Pièces historiques : chemin exact et absence de rapprochement par nom', async () => {
    const batch = (await db.query("insert into escen_private.import_batches(source_name,archive_sha256,sql_sha256,source_rows) values('FILES',$1,$2,2) returning id",['e'.repeat(64),'f'.repeat(64)])).rows[0].id;
    const document = (await db.query("insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload) values($1,'documents','D1',$2::jsonb) returning id",[batch,JSON.stringify({file_path:'documents/test.pdf',owner_type:'App\\Models\\Etudiant',owner_id:'S1'})])).rows[0];
    const other = (await db.query("insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload) values($1,'documents','D2',$2::jsonb) returning id",[batch,JSON.stringify({file_path:'other/test.pdf',owner_type:'App\\Models\\User',owner_id:'S1'})])).rows[0];
    await db.query("insert into escen_private.archive_objects(batch_id,source_name,kind,bucket,object_path,byte_size,sha256) values($1,'storage/documents/test.pdf','DOCUMENT','escen-legacy-files','hash/storage/documents/test.pdf',100,$2)",[batch,'a'.repeat(64)]);
    const exact = await scalar("select public.escen_history_document($1,'file_path') as value",[document.id]);
    assert.equal(exact.path,'hash/storage/documents/test.pdf');
    assert.equal(await scalar("select public.escen_history_document($1,'file_path') as value",[other.id]),null);
    assert.equal(await scalar("select public.escen_history_document($1,'password') as value",[document.id]),null);
    const owned = await scalar("select public.escen_history_page_scoped('documents',0,50,'',false,'S1',$1) as value",[batch]);
    assert.equal(owned.total,1); assert.equal(owned.records[0].sourceId,'D1');
  });
  await check('Copies : examen exact, sujet et réponses isolés par archive', async () => {
    const batches = [];
    for (const key of ['7','8']) batches.push((await db.query("insert into escen_private.import_batches(source_name,archive_sha256,sql_sha256,source_rows) values('EXAMS',$1,$2,6) returning id",[key.repeat(64),'9'.repeat(64)])).rows[0].id);
    let examId;
    for (const batch of batches) {
      for (const [table,id,payload] of [['evaluations','E1',{id:'E1'}],['exam_parts','P1',{evaluation_id:'E1'}],['exam_questions','Q1',{part_id:'P1',content:'Question exacte'}],['exam_submissions','A1',{evaluation_id:'E1',question_id:'Q1',etudiant_id:'S1',reponse:batch}],['exam_submissions','A2',{evaluation_id:'E2',question_id:'Q1',etudiant_id:'S1',reponse:'autre examen'}],['notes','N1',{evaluation_id:'E1',etudiant_id:'S1',note:'12'}]]) {
        const row = (await db.query("insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload) values($1,$2,$3,$4::jsonb) returning id",[batch,table,id,JSON.stringify(payload)])).rows[0];
        if (batch===batches[0] && table==='evaluations') examId=row.id;
      }
    }
    const copy = await scalar('select public.escen_history_exam($1) as value',[examId]);
    assert.equal(copy.tables.exam_submissions.length,1);
    assert.equal(copy.tables.exam_submissions[0].values.reponse,batches[0]);
    assert.equal(copy.tables.exam_questions[0].values.content,'Question exacte');
    assert.equal(copy.tables.notes[0].values.note,'12');
    assert.equal(await scalar('select public.escen_history_exam($1) as value',[randomUUID()]),null);
  });
  await check('Création du personnel : transaction atomique, matricule unique et audit auteur', async () => {
    const personId = randomUUID(); const staffId = randomUUID();
    const revision = await scalar('select revision as value from escen_private.portal_revision');
    const changes = [{table:'people',operation:'insert',record:{id:personId,firstname:'Nouveau',lastname:'Personnel'}},{table:'staff',operation:'insert',record:{id:staffId,person_id:personId,employee_number:'TEST-PERSONNEL'}}];
    await scalar('select public.escen_backend_transaction($1,$2,$3::jsonb) as value',[account.id,revision,JSON.stringify(changes)]);
    assert.equal(await scalar('select person_id as value from escen.staff where id=$1',[staffId]),personId);
    assert.equal(await scalar("select actor_id as value from escen_private.audit_events where table_name='staff' and entity_id=$1",[staffId]),account.id);
    const secondPerson = randomUUID();
    changes[0].record.id=secondPerson; changes[1].record.id=randomUUID(); changes[1].record.person_id=secondPerson;
    await reject('select public.escen_backend_transaction($1,$2,$3::jsonb)',[account.id,revision+1,JSON.stringify(changes)],/unique|duplicate/i);
    assert.equal(await scalar('select count(*)::integer as value from escen.people where id=$1',[secondPerson]),0);
  });
  await check('Référentiels : création, modification et archivage motivé avec audit', async () => {
    const id=randomUUID();let revision=await scalar('select revision as value from escen_private.portal_revision');
    const mutate=async record=>{revision=await scalar('select public.escen_backend_transaction($1,$2,$3::jsonb) as value',[account.id,revision,JSON.stringify([{table:'programs',operation:record.name==='Filière CRUD'?'insert':'update',record}])]);};
    await mutate({id,code:'CRUD-TEST',name:'Filière CRUD',reason:'Création demandée'});
    await mutate({id,name:'Filière corrigée',reason:'Correction officielle'});
    await reject("update escen.programs set archived_at=now(),reason=null where id=$1",[id],/check/i);
    await mutate({id,archived_at:new Date().toISOString(),reason:'Retrait demandé'});
    assert.equal(await scalar('select name as value from escen.programs where id=$1',[id]),'Filière corrigée');
    assert.equal(await scalar("select count(*)::integer as value from escen_private.audit_events where table_name='programs' and entity_id=$1 and actor_id=$2",[id,account.id]),3);
    assert.equal(await scalar("select reason as value from escen_private.audit_events where table_name='programs' and entity_id=$1 and new_value->>'archived_at' is not null",[id]),'Retrait demandé');
  });
  await check('Reprise vérifiée : provenance exacte, original inchangé et doublon refusé', async () => {
    const batch=(await db.query("insert into escen_private.import_batches(source_name,archive_sha256,sql_sha256,source_rows) values('CRUD',$1,$2,1) returning id",['1'.repeat(64),'2'.repeat(64)])).rows[0].id;
    const source=(await db.query("insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload) values($1,'matieres','SOURCE-CRUD',$2::jsonb) returning id",[batch,JSON.stringify({nom:'Matière historique',code:'OLD-CRUD'})])).rows[0].id;
    const revision=await scalar('select revision as value from escen_private.portal_revision');const id=randomUUID();
    const record={id,code:'NEW-CRUD',name:'Matière vérifiée',reason:'Code officiel confirmé'};
    await scalar('select public.escen_catalog_resume($1,$2,$3,$4::jsonb,$5) as value',[account.id,revision,'subjects',JSON.stringify(record),source]);
    assert.equal(await scalar('select target_id as value from escen_private.source_mappings where row_id=$1',[source]),id);
    const links=await scalar("select public.escen_catalog_history_links('subjects') as value");assert.ok(links.some(link=>link.sourceRowId===source && link.targetId===id));
    assert.equal(await scalar("select payload->>'nom' as value from escen_private.legacy_rows where id=$1",[source]),'Matière historique');
    await reject('select public.escen_catalog_resume($1,$2,$3,$4::jsonb,$5)',[account.id,revision+1,'subjects',JSON.stringify({...record,id:randomUUID(),code:'OTHER-CRUD'}),source],/déjà reprise/i);
    await reject('select public.escen_catalog_resume($1,$2,$3,$4::jsonb,$5)',[account.id,revision+1,'programs',JSON.stringify({...record,id:randomUUID()}),source],/introuvable/i);
  });
  await check('Sujet préparatoire : persistance, version et interdiction de diffusion sans évaluation',async()=>{
    const id=randomUUID();const partId=randomUUID();const questionId=randomUUID();const library=randomUUID();const revision=await scalar('select revision as value from escen_private.portal_revision');
    const changes=[{table:'exam_papers',operation:'insert',record:{id,academic_year_id:year.id,evaluation_id:null,library_id:library,author_id:account.id,title:'Sujet préparatoire',purpose:'EXAMEN',version:1,reason:'Composition du sujet'}},{table:'exam_parts',operation:'insert',record:{id:partId,paper_id:id,title:'Première partie',position:1}},{table:'exam_questions',operation:'insert',record:{id:questionId,paper_id:id,part_id:partId,kind:'TEXTE',prompt:'Expliquez',points:5,position:1,configuration:{correction:'Corrigé privé'}}}];
    const saved=await scalar('select public.escen_subject_transaction($1,$2,$3::jsonb) as value',[account.id,revision,JSON.stringify(changes)]);
    assert.equal(await scalar('select title as value from escen.exam_papers where id=$1',[id]),'Sujet préparatoire');
    assert.equal(await scalar("select actor_id as value from escen_private.audit_events where table_name='exam_questions' and entity_id=$1",[questionId]),account.id);
    await reject("update escen.exam_papers set status='AUTORISE',authorized_by=$1,authorized_at=now() where id=$2",[account.id,id],/check/i);
    await reject('select public.escen_subject_transaction($1,$2,$3::jsonb)',[account.id,saved,JSON.stringify([{table:'people',operation:'update',record:{id:account.person_id,firstname:'Interdit'}}])],/hors sujet/i);
    const second=randomUUID();
    await scalar('select public.escen_subject_transaction($1,$2,$3::jsonb) as value',[account.id,saved,JSON.stringify([{table:'exam_papers',operation:'insert',record:{id:second,academic_year_id:year.id,library_id:library,evaluation_id:null,author_id:account.id,title:'Sujet révisé',version:2,reason:'Nouvelle version'}},{table:'exam_papers',operation:'update',record:{id,archived_at:new Date().toISOString(),reason:'Version remplacée'}}])]);
    assert.equal(await scalar('select count(*)::integer as value from escen.exam_questions where paper_id=$1',[id]),1);
    assert.equal(await scalar('select count(*)::integer as value from escen.exam_papers where library_id=$1',[library]),2);
  });
  await verifyWebsiteDatabase({ db, check, account, level, program, year });
  await check('Gestion sans site ni bâtiment : salles, formations, groupes et équipements', async () => {
    const noLocationYear = await insert('academic_years', { code: 'NO-LOCATION', name: 'Année sans localisation', starts_on: '2031-01-01', ends_on: '2031-12-31', status: 'BROUILLON' });
    const room = await insert('rooms', { code: 'NO-LOCATION', name: 'Salle directe', capacity: 40 });
    assert.equal(room.site_id, null); assert.equal(room.building_id, null);
    await assert.rejects(insert('rooms', { code: 'NO-LOCATION', name: 'Doublon', capacity: 20 }), /unique/i);
    const offering = await insert('academic_offerings', { academic_year_id: noLocationYear.id, curriculum_id: curriculum.id, level_id: level.id });
    const group = await insert('groups', { academic_year_id: noLocationYear.id, level_id: level.id, name: 'Groupe direct' });
    await insert('group_offerings', { group_id: group.id, offering_id: offering.id, academic_year_id: noLocationYear.id, level_id: level.id });
    await assert.rejects(insert('academic_offerings', { academic_year_id: noLocationYear.id, curriculum_id: curriculum.id, level_id: level.id }), /unique/i);
    await assert.rejects(insert('groups', { academic_year_id: noLocationYear.id, level_id: level.id, name: 'Groupe direct' }), /unique/i);
    await insert('assets', { code: 'NO-LOCATION', name: 'Équipement direct', status: 'DISPONIBLE' });
  });
  await check('Reprise : aucune donnée manquante autorisée sans provenance exacte', async () => {
    await assert.rejects(insert('levels', { code: 'NO-PROOF', name: 'Sans preuve', position: 0 }), /check/i);
    await assert.rejects(insert('academic_offerings', { academic_year_id: year.id, level_id: level.id }), /check/i);
    await assert.rejects(insert('payments', { enrollment_id: enrollment.id, amount: 100, method: 'ESPECES', provider: 'Test', reference: 'NO-PROOF', paid_on: '2026-01-01', recorded_by: account.id, status: 'PENDING' }), /check/i);
  });
  await check('Aucune FK sensible en cascade, RLS activée partout et accès public refusé', async () => {
    assert.equal(await scalar("select count(*)::integer as value from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname in ('escen','escen_private') and c.contype = 'f' and c.confdeltype = 'c'"), 0);
    assert.equal(await scalar("select count(*)::integer as value from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('escen','escen_private') and c.relkind = 'r' and not c.relrowsecurity"), 0);
    assert.equal(await scalar("select count(*)::integer as value from pg_tables where schemaname='escen_private' and tablename='import_runs'"),1);
    assert.equal(await scalar("select count(*)::integer as value from pg_constraint where conname='role_grant_actor_provenance_check'"),1);
    assert.equal(await scalar("select count(*)::integer as value from pg_constraint where conname='source_mapping_actor_check'"),1);
    await db.exec('create role database_test_reader; grant usage on schema escen to database_test_reader; grant select on all tables in schema escen to database_test_reader; grant select on public.academic_cycles to database_test_reader; set role database_test_reader;');
    assert.equal(await scalar('select count(*)::integer as value from escen.students'), 0);
    assert.equal(await scalar('select count(*)::integer as value from public.academic_cycles'), 0);
    await reject('select count(*) from escen_private.audit_events',[],/permission/i);
    await reject('select public.escen_backend_snapshot()',[],/permission/i);
    await reject('select public.escen_import_overview()',[],/permission/i);
    await reject('select public.escen_history_catalog()',[],/permission/i);
    await reject("select public.escen_history_page('notes')",[],/permission/i);
    await reject("select public.escen_catalog_resume($1,0,'subjects',$2::jsonb,$3)",[account.id,JSON.stringify({}),randomUUID()],/permission/i);
    await reject("select public.escen_catalog_history_links('subjects')",[],/permission/i);
    await reject('select public.escen_subject_transaction($1,0,$2::jsonb)',[account.id,JSON.stringify([])],/permission/i);
    await reject('select public.escen_academic_year_context()',[],/permission/i);
    await reject("select public.escen_academic_year_command($1,'IT','current',null,0,'Interdit')",[account.id],/permission/i);
    await reject('select public.escen_history_catalog_year($1)',[year.id],/permission/i);
    await reject("select public.escen_website_public('articles')",[],/permission/i);
    await reject("select public.escen_website_manage($1,'IT','articles')",[account.id],/permission/i);
    await reject("select public.escen_website_rate($1,1)",['c'.repeat(64)],/permission/i);
    await reject('select public.escen_history_exam($1)',[randomUUID()],/permission/i);
    await reject('select count(*) from escen_private.history_catalog',[],/permission/i);
    await db.exec('reset role');
    await reject('delete from escen.academic_years where id = $1', [year.id], /Suppression/i);
  });
  await check('Groupe partagé : deux filières du même niveau, inscriptions distinctes et autre niveau refusé', async () => {
    const sharedYear = year;
    const sharedGroup = await insert('groups', { academic_year_id: sharedYear.id, level_id: level.id, name: 'Tronc commun L1' });
    for (const code of ['GESTION-SHARED', 'COMMERCE-SHARED']) {
      const p = await insert('programs', { code, name: code });
      const c = await insert('curricula', { program_id: p.id, level_id: level.id, version: 1 });
      const o = await insert('academic_offerings', { academic_year_id: sharedYear.id, curriculum_id: c.id, level_id: level.id });
      await insert('group_offerings', { group_id: sharedGroup.id, offering_id: o.id, academic_year_id: sharedYear.id, level_id: level.id });
      const person = await insert('people', { firstname: code, lastname: 'Test' });
      const pupil = await insert('students', { person_id: person.id, matricule: code });
      const registered = await insert('enrollments', { student_id: pupil.id, offering_id: o.id, status: 'INSCRIT' });
      await insert('enrollment_groups', { enrollment_id: registered.id, offering_id: o.id, group_id: sharedGroup.id, valid_from: '2026-09-01', changed_by: account.id, reason: 'Groupe commun à plusieurs filières' });
    }
    const result = await db.query('select count(distinct c.program_id)::int as n from escen.enrollment_groups eg join escen.enrollments e on e.id=eg.enrollment_id join escen.academic_offerings o on o.id=e.offering_id join escen.curricula c on c.id=o.curriculum_id where eg.group_id=$1', [sharedGroup.id]);
    assert.equal(result.rows[0].n, 2);
    const otherLevel = await insert('levels', { cycle_id: cycle.id, code: 'SHARED-L2', name: 'Licence 2', position: 2 });
    const otherCurriculum = await insert('curricula', { program_id: program.id, level_id: otherLevel.id, version: 1 });
    const otherOffering = await insert('academic_offerings', { academic_year_id: sharedYear.id, curriculum_id: otherCurriculum.id, level_id: otherLevel.id });
    await assert.rejects(insert('group_offerings', { group_id: sharedGroup.id, offering_id: otherOffering.id, academic_year_id: sharedYear.id, level_id: level.id }), /foreign key/i);
  });
  await verifyAcademicYears({ db, check, insert, account, year, level, site, curriculum, component, teacher, student });
  await check('Historique de groupe et de réinscription distinct des notes anciennes', async () => {
    await db.query('update escen.enrollment_groups set valid_until = $1 where id = $2', ['2027-01-01', membership.id]);
    await insert('enrollment_groups', { enrollment_id: enrollment.id, offering_id: offering.id, group_id: group2.id, valid_from: '2027-01-01', changed_by: account.id, reason: 'Changement de groupe' });
    const previousCount = await scalar('select count(*)::integer as value from escen.enrollments where student_id=$1', [student.id]);
    const nextOffering = await prepareTestYear({ db, insert, yearId: nextYear.id, curriculum, level });
    await scalar("select public.escen_academic_year_command($1,'IT','transition',$2,(select revision from escen_private.portal_revision where singleton),'Ouverture pour reinscription','OUVERTE') as value", [account.id, nextYear.id]);
    await insert('enrollments', { student_id: student.id, offering_id: nextOffering.id, status: 'REINSCRIT' });
    assert.equal(await scalar('select count(*)::integer as value from escen.enrollments where student_id = $1', [student.id]), previousCount + 1);
    assert.equal(Number(await scalar('select value as value from escen.grades where id = $1', [grade.id])), 16);
  });
  await verifyCurriculumCatalog(db, check);
  console.log(`Base relationnelle : ${checks} groupes de contrôles PostgreSQL réussis.`);
} catch (error) {
  console.error('Échec PostgreSQL :', error.message);
  if (error.where) console.error(error.where);
  process.exitCode = 1;
} finally {
  await db.close();
}
