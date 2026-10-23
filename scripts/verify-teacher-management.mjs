import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadLocalApiModule } from './local-api-fixture.mjs';

export async function verifyTeacherManagement(db, check, { year, site, level }) {
  const day = value => new Date(value).toISOString().slice(0, 10);
  const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;
  const insert = async (table, record) => {
    assert.match(table, /^[a-z_]+$/);
    const keys = Object.keys(record);
    keys.forEach(key => assert.match(key, /^[a-z_]+$/));
    return (await db.query(`insert into escen.${table} (${keys.join(',')}) values (${keys.map((_, index) => `$${index + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
  };
  const token = randomUUID();
  await db.query('insert into auth.users(id) values ($1)', [token]);
  const person = await insert('people', { firstname: 'Gestion', lastname: 'Enseignants' });
  const actor = await insert('accounts', { person_id: person.id, auth_user_id: token, active: true });
  const role = await scalar("select id as value from escen.roles where code='IT'");
  await insert('role_grants', { account_id: actor.id, role_id: role, granted_by: actor.id, valid_from: new Date().toISOString(), reason: 'Recette enseignants locale' });
  const context = {
    accountId: actor.id, personId: person.id, authUserId: token, roleCode: 'IT', role: 'Informaticien',
    permissions: (await db.query('select p.code from escen.permissions p join escen.role_permissions rp on rp.permission_id=p.id where rp.role_id=$1', [role])).rows.map(row => row.code),
    studentId: null, teacherId: null,
    grants: [{ role_code: 'IT', role_name: 'Informaticien', site_id: null, group_id: null, academic_year_id: null }],
  };
  let corruptTeacher = false;
  const transactions = [];
  const client = { async rpc(name, args) {
    try {
      let data;
      if (name === 'escen_backend_snapshot') data = await scalar('select public.escen_backend_snapshot() as value');
      else if (name === 'escen_academic_year_context') data = await scalar('select public.escen_academic_year_context() as value');
      else if (name === 'escen_backend_transaction') {
        const changes = structuredClone(args.p_changes);
        transactions.push(changes);
        if (corruptTeacher) changes.find(change => change.table === 'teachers').record.staff_id = randomUUID();
        data = await scalar('select public.escen_backend_transaction($1,$2,$3::jsonb) as value', [args.p_actor_id, args.p_expected_revision, JSON.stringify(changes)]);
      } else assert.fail(`RPC inattendue : ${name}`);
      return { data, error: null };
    } catch (error) { return { data: null, error }; }
  } };
  const staffApi = loadLocalApiModule('app/api/staff/route.ts', client, context);
  const staffDetailApi = loadLocalApiModule('app/api/staff/[personId]/route.ts', client, context);
  const api = loadLocalApiModule('app/api/teachers/route.ts', client, context);
  const revision = () => scalar('select revision as value from escen_private.portal_revision where singleton');
  const audits = () => scalar('select count(*)::integer as value from escen_private.audit_events');
  const post = async body => api.POST(new Request('http://local.test/api/teachers', { method: 'POST', headers: { 'x-escen-year': year.id }, body: JSON.stringify({ revision: await revision(), reason: 'Gestion pédagogique validée', ...body }) }));
  const addStaff = body => staffApi.POST(new Request('http://local.test/api/staff', { method: 'POST', body: JSON.stringify({ firstname: 'Nouveau', lastname: 'Professeur', email: '', phone: '', employeeNumber: `ENS-${randomUUID()}`, ...body }) }));
  const profileAudit = async id => (await db.query("select * from escen_private.audit_events where table_name='teachers' and entity_id=$1 order by happened_at desc", [id])).rows;
  let teacherId;
  let ordinaryStaffId;

  await check('Personnel enseignant : identité, dossier et profil créés dans une transaction auditée, sans compte', async () => {
    const before = await revision();
    const accounts = await scalar('select count(*)::integer as value from escen.accounts');
    const response = await addStaff({ isTeacher: true, teacherSpecialty: 'Analyse décimale' });
    const saved = await response.json();
    assert.equal(response.status, 201, JSON.stringify(saved));
    const teacher = (await db.query('select * from escen.teachers where staff_id=$1', [saved.id])).rows[0];
    teacherId = teacher.id;
    assert.equal(teacher.specialty, 'Analyse décimale');
    assert.equal(teacher.active, true);
    assert.equal(saved.revision, before + 1);
    assert.deepEqual(transactions.at(-1).map(change => change.table), ['people', 'staff', 'teachers']);
    assert.equal((await profileAudit(teacher.id))[0].actor_id, actor.id);
    assert.equal(await scalar('select count(*)::integer as value from escen.accounts'), accounts);
  });
  await check('Personnel sans option enseignant : aucun profil pédagogique inventé', async () => {
    const before = await scalar('select count(*)::integer as value from escen.teachers');
    const response = await addStaff({ isTeacher: false, employeeNumber: '', position: 'Comptable', startsOn: '2026-10-01' });
    ordinaryStaffId = (await response.json()).id;
    assert.equal(response.status, 201);
    assert.equal(await scalar('select count(*)::integer as value from escen.teachers'), before);
  });
  await check('Personnel administratif : fonction persistée sans matricule affiché ni compte créé', async () => {
    const member = (await db.query('select * from escen.staff where id=$1', [ordinaryStaffId])).rows[0];
    assert.match(member.employee_number, /^INT-[0-9a-f-]{36}$/);
    const contract = (await db.query('select * from escen.staff_contracts where staff_id=$1', [ordinaryStaffId])).rows[0];
    assert.equal(contract.position, 'Comptable');
    assert.equal(contract.contract_type, 'PERMANENT');
    assert.equal(day(contract.starts_on), '2026-10-01');
    assert.equal(contract.site_id, null);
    assert.equal(await scalar('select count(*)::integer as value from escen.accounts where person_id=$1', [member.person_id]), 0);
    const directory = await (await staffApi.GET(new Request('http://local.test/api/staff'))).json();
    assert.equal(directory.records.find(row => row.staffId === ordinaryStaffId).employeeNumber, '');
  });
  await check('Personnel : modification motivée, référence stable et historique des fonctions conservé', async () => {
    const member = (await db.query('select * from escen.staff where id=$1', [ordinaryStaffId])).rows[0];
    const patch = async values => staffDetailApi.PATCH(new Request('http://local.test/api/staff', {
      method: 'PATCH', body: JSON.stringify({ revision: await revision(), firstname: 'Nouveau', lastname: 'Professeur', email: '', phone: '90112233', employeeNumber: '', position: 'Comptable', contractType: 'PERMANENT', reason: 'Contact du personnel vérifié', ...values }),
    }), { params: Promise.resolve({ personId: member.person_id }) });
    assert.equal((await patch({})).status, 200);
    assert.equal(await scalar('select employee_number as value from escen.staff where id=$1', [member.id]), member.employee_number);
    assert.equal(await scalar("select count(*)::integer as value from escen_private.audit_events where table_name='staff' and entity_id=$1 and reason='Contact du personnel vérifié' and actor_id=$2", [member.id, actor.id]), 1);
    assert.equal(await scalar('select count(*)::integer as value from escen.staff_contracts where staff_id=$1', [member.id]), 1);
    assert.equal((await patch({ position: 'Secrétaire', contractType: 'VACATAIRE', reason: 'Nouvelle fonction validée' })).status, 200);
    const contracts = (await db.query('select * from escen.staff_contracts where staff_id=$1 order by starts_on, position', [member.id])).rows;
    assert.equal(contracts.length, 2);
    assert.equal(day(contracts.find(row => row.position === 'Comptable').ends_on), day(new Date()));
    assert.equal(contracts.find(row => !row.ends_on).position, 'Secrétaire');
    assert.equal(contracts.find(row => !row.ends_on).contract_type, 'VACATAIRE');
    const before = await revision();
    const auditCount = await audits();
    assert.equal((await patch({ position: '' })).status, 400);
    assert.equal((await patch({ revision: 0 })).status, 409);
    assert.equal(await revision(), before);
    assert.equal(await audits(), auditCount);
  });
  await check('Personnel enseignant : échec du profil annule identité, dossier, audit et révision', async () => {
    const before = await revision();
    const auditCount = await audits();
    const counts = await db.query('select (select count(*) from escen.people) as people, (select count(*) from escen.staff) as staff');
    corruptTeacher = true;
    const response = await addStaff({ isTeacher: true });
    corruptTeacher = false;
    assert.equal(response.status, 409);
    assert.deepEqual((await db.query('select (select count(*) from escen.people) as people, (select count(*) from escen.staff) as staff')).rows, counts.rows);
    assert.equal(await revision(), before);
    assert.equal(await audits(), auditCount);
  });
  await check('Profil enseignant : création sur dossier existant, doublon refusé', async () => {
    const response = await post({ action: 'create_profile', staffId: ordinaryStaffId, specialty: 'Réseaux' });
    assert.equal(response.status, 201, JSON.stringify(await response.json()));
    const before = await audits();
    assert.equal((await post({ action: 'create_profile', staffId: ordinaryStaffId, specialty: 'Autre' })).status, 409);
    assert.equal(await audits(), before);
  });
  await check('Profil enseignant : spécialité modifiée avec auteur, motif et avant/après', async () => {
    assert.equal((await post({ action: 'update_profile', teacherId, specialty: 'Mathématiques appliquées', reason: 'Spécialité vérifiée sur le dossier' })).status, 200);
    const audit = (await profileAudit(teacherId))[0];
    assert.equal(audit.actor_id, actor.id);
    assert.equal(audit.reason, 'Spécialité vérifiée sur le dossier');
    assert.equal(audit.old_value.specialty, 'Analyse décimale');
    assert.equal(audit.new_value.specialty, 'Mathématiques appliquées');
  });
  await check('Profil enseignant : désactivation et réactivation motivées, historique conservé', async () => {
    for (const active of [false, true]) {
      const response = await post({ action: 'set_active', teacherId, active, reason: active ? 'Retour en activité' : 'Indisponibilité déclarée' });
      assert.equal(response.status, 200, JSON.stringify(await response.json()));
      assert.equal(await scalar('select active as value from escen.teachers where id=$1', [teacherId]), active);
      assert.equal((await profileAudit(teacherId))[0].new_value.active, active);
    }
  });
  await check('Enseignants : motifs absents, trop courts ou trop longs refusés par API et SQL', async () => {
    const before = await audits();
    for (const reason of ['', 'ab', 'x'.repeat(1001)]) {
      assert.equal((await post({ action: 'set_active', teacherId, active: false, reason })).status, 400);
      await assert.rejects(db.query('update escen.teachers set active=false, reason=$1 where id=$2', [reason || null, teacherId]));
    }
    assert.equal(await audits(), before);
    assert.equal(await scalar('select active as value from escen.teachers where id=$1', [teacherId]), true);
  });

  const code = `ENS-${randomUUID().slice(0, 8)}`;
  const program = await insert('programs', { code, name: 'Formation enseignants de recette' });
  const curriculum = await insert('curricula', { program_id: program.id, level_id: level.id, version: 1 });
  const subject = await insert('subjects', { academic_year_id: year.id, code, name: 'Matière annuelle enseignants' });
  const semester = await insert('curriculum_semesters', { curriculum_id: curriculum.id, position: 1, name: 'Semestre', target_credits: 30 });
  const unit = await insert('teaching_units', { curriculum_id: curriculum.id, semester_id: semester.id, code, name: 'UE', credits: 30 });
  const component = await insert('curriculum_components', { curriculum_id: curriculum.id, unit_id: unit.id, subject_id: subject.id, code, coefficient: 1, credits: 30 });
  await insert('assessment_weights', { curriculum_id: curriculum.id, component_id: component.id, evaluation_kind: 'DEVOIR', percent: 100 });
  await db.query("update escen.curricula set status='APPROVED', approved_by=$1, approved_at=now() where id=$2", [actor.id, curriculum.id]);
  const offering = await insert('academic_offerings', { curriculum_id: curriculum.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  await insert('offering_semesters', { offering_id: offering.id, curriculum_id: curriculum.id, curriculum_semester_id: semester.id, starts_on: year.starts_on, ends_on: year.ends_on });
  const group = await insert('groups', { academic_year_id: year.id, level_id: level.id, site_id: site.id, name: code });
  await insert('group_offerings', { group_id: group.id, offering_id: offering.id, academic_year_id: year.id, level_id: level.id, site_id: site.id });
  let assignmentId;
  const createAssignment = () => post({ action: 'create_assignment', teacherId, groupId: group.id, offeringId: offering.id, componentId: component.id, validFrom: day(year.starts_on), validUntil: day(year.ends_on) });
  await check('Affectation : enseignant, groupe, formation, maquette et dates persistés avec motif', async () => {
    const response = await createAssignment();
    const result = await response.json();
    assert.equal(response.status, 201, JSON.stringify(result));
    assignmentId = result.id;
    const saved = (await db.query('select * from escen.teaching_assignments where id=$1', [assignmentId])).rows[0];
    assert.equal(saved.curriculum_id, curriculum.id);
    assert.equal(saved.teacher_id, teacherId);
    assert.equal(saved.reason, 'Gestion pédagogique validée');
  });
  await check('Affectation : doublon refusé sans audit ni changement de révision', async () => {
    const before = await revision(); const auditCount = await audits();
    assert.equal((await createAssignment()).status, 409);
    assert.equal(await revision(), before); assert.equal(await audits(), auditCount);
  });
  const session = await insert('sessions', { assignment_id: assignmentId, offering_id: offering.id, group_id: group.id, teacher_id: teacherId,
    mode: 'EN_LIGNE', status: 'PLANIFIE', starts_at: '2027-05-03T08:00:00Z', ends_at: '2027-05-03T10:00:00Z' });
  await check('Enseignant : séance future bloque la désactivation, aucune séance ni audit modifié', async () => {
    const before = await audits();
    const response = await post({ action: 'set_active', teacherId, active: false });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /séances futures/);
    assert.equal(await audits(), before);
    assert.equal(await scalar('select status as value from escen.sessions where id=$1', [session.id]), 'PLANIFIE');
  });
  await check('Affectation : fin précédant une séance non annulée refusée sans mutation', async () => {
    const before = await audits();
    const response = await post({ action: 'end_assignment', assignmentId, endOn: '2027-05-02' });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /séances non annulées/);
    assert.equal(await audits(), before);
  });
  await check('Affectation : fin le jour de la dernière séance acceptée, avant/après et motif audités', async () => {
    await assert.rejects(db.query('update escen.teaching_assignments set valid_until=$1, reason=null where id=$2', ['2027-05-03', assignmentId]), /motif/i);
    const response = await post({ action: 'end_assignment', assignmentId, endOn: '2027-05-03', reason: 'Fin de la mission pédagogique' });
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    const audit = (await db.query("select * from escen_private.audit_events where entity_id=$1 and action='UPDATE' order by happened_at desc", [assignmentId])).rows[0];
    assert.equal(audit.old_value.valid_until, day(year.ends_on));
    assert.equal(audit.new_value.valid_until, '2027-05-03');
    assert.equal(audit.reason, 'Fin de la mission pédagogique');
    assert.equal(await scalar('select count(*)::integer as value from escen.sessions where id=$1', [session.id]), 1);
  });
  await db.query("update escen.sessions set status='ANNULE', reason='Annulation explicite dans la recette locale' where id=$1", [session.id]);
  await check('Enseignant : séance annulée ne bloque plus le retrait ; enseignant inactif non affectable', async () => {
    assert.equal((await post({ action: 'set_active', teacherId, active: false })).status, 200);
    const response = await createAssignment();
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /enseignant actif/);
  });
  await check('Annuaire enseignants : profils liés aux dossiers et lecture sans contacts privés', async () => {
    const response = await api.GET(new Request('http://local.test/api/teachers', { headers: { 'x-escen-year': year.id } }));
    const directory = await response.json();
    assert.equal(response.status, 200);
    assert.equal(directory.teachers.find(row => row.id === teacherId).active, false);
    assert.equal(directory.assignments.find(row => row.id === assignmentId).validUntil, '2027-05-03');
    assert.ok(directory.components.some(row => row.id === component.id));
    assert.equal('email' in directory.teachers.find(row => row.id === teacherId), false);
  });
}
