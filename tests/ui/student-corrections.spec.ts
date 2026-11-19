import { expect, test } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { localBusinessFixture as LocalFixture } from './local-business-fixture.mjs';
import { authenticateFixture } from './persistent-fixture';
import { ROLES } from '../../src/types/permissions';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';
import { filterRelationalSnapshot } from '../../src/services/persistentPermissionsService';
import { filterSnapshotForAcademicYear } from '../../src/services/academicYearScopeService';

async function fixture() {
  const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<{ localBusinessFixture: typeof LocalFixture }>;
  const f = await (await nativeImport(pathToFileURL(resolve('tests/ui/local-business-fixture.mjs')).href)).localBusinessFixture();
  for (const code of ['DA', 'LOG']) {
    const roleId = await f.value('select id as value from escen.roles where code=$1', [code]);
    await f.insert('role_grants', { account_id: f.account.id, role_id: roleId, granted_by: f.account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Test corrections scolaires' });
  }
  const authId = randomUUID();
  await f.db.query('insert into auth.users(id) values ($1)', [authId]);
  const person = await f.insert('people', { firstname: 'Élève', lastname: 'Signalement' });
  const account = await f.insert('accounts', { person_id: person.id, auth_user_id: authId, active: true });
  const student = await f.insert('students', { person_id: person.id, matricule: 'CORRECTION-001' });
  const source = await f.value('select to_jsonb(o) as value from escen.academic_offerings o where curriculum_id=$1', [f.curricula[0].id]);
  const target = await f.value('select to_jsonb(o) as value from escen.academic_offerings o where curriculum_id=$1', [f.curricula[1].id]);
  const sourceGroup = await f.value('select group_id as value from escen.group_offerings where offering_id=$1 limit 1', [source.id]);
  const targetGroup = await f.insert('groups', { academic_year_id: f.year.id, level_id: f.level.id, name: 'Groupe corrigé', site_id: target.site_id });
  await f.insert('group_offerings', { group_id: targetGroup.id, offering_id: target.id, academic_year_id: f.year.id, level_id: f.level.id, site_id: target.site_id });
  const enrollment = await f.insert('enrollments', { student_id: student.id, offering_id: source.id, status: 'INSCRIT', enrolled_on: '2026-01-01', created_by: f.account.id });
  await f.insert('enrollment_groups', { enrollment_id: enrollment.id, offering_id: source.id, group_id: sourceGroup, valid_from: '2026-01-01', changed_by: f.account.id, reason: 'Affectation initiale' });
  const roleId = await f.value("select id as value from escen.roles where code='STUD'");
  await f.insert('role_grants', { account_id: account.id, role_id: roleId, granted_by: f.account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Test suivi étudiant' });
  f.authUsers.set('student-correction-token', { id: authId, email: 'student@example.test', app_metadata: {} });
  const digest = createHash('sha256').update(`first-login:v1:${authId}`).digest('hex');
  const id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  const title = 'Première connexion · Filière, niveau ou dossier scolaire à corriger';
  const report = await f.insert('support_tickets', { id, author_id: account.id, reference: `SUP-${id}`, title, description: 'Je suis en L2 Marketing.', priority: 'MEDIUM', academic_year_id: f.year.id });
  const fake = await f.insert('support_tickets', { author_id: account.id, reference: randomUUID(), title, description: 'Titre identique sans origine vérifiée.', priority: 'MEDIUM', academic_year_id: f.year.id });
  const sql = await readFile(resolve('supabase/migrations/202611190115_student_correction_routing.sql'), 'utf8');
  await f.db.exec(sql);
  const categoryId = await f.value("select id as value from escen.support_categories where code='STUDENT_PROGRAM_CORRECTION'");
  const old = await f.insert('support_tickets', { author_id: account.id, reference: randomUUID(), title: 'Autre année scolaire', priority: 'MEDIUM', academic_year_id: f.nextYear.id, category_id: categoryId });
  return { ...f, report, fake, old, sql, categoryId, enrollment, source, target, sourceGroup, targetGroup, student };
}

test('Corrections : reprise vérifiée, rôles dédiés, confidentialité, suivi et absence de fausse résolution', async () => {
  const f = await fixture();
  try {
    const request = (role: string, body?: Record<string, unknown>, query = '?kind=school', token = 'fixture-auth-token') => f.dispatch(new Request(`http://localhost/api/support${query}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'x-escen-role': role, 'x-escen-year': f.year.id }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    expect(await f.value('select category_id as value from escen.support_tickets where id=$1', [f.report.id])).toBe(f.categoryId);
    expect(await f.value('select category_id as value from escen.support_tickets where id=$1', [f.fake.id])).toBeNull();
    await f.db.exec(f.sql);
    expect(await f.value("select count(*) as value from escen.role_permissions rp join escen.permissions p on p.id=rp.permission_id where p.code='student.correction.manage'")).toBe(3);
    for (const role of [ROLES.DA, ROLES.LOG, ROLES.IT]) {
      const response = await request(role);
      expect(response.status).toBe(200);
      const directory = await response.json();
      expect(directory.tickets.map((ticket: { id: string }) => ticket.id)).toEqual([f.report.id]);
      expect(directory.canManageCorrections).toBe(true);
      expect(directory.students).toEqual([{ ticketId: f.report.id, matricule: 'CORRECTION-001', name: 'Élève Signalement' }]);
    }
    expect((await request(ROLES.MKT)).status).toBe(403);
    let directory = await (await request(ROLES.LOG)).json();
    const command = { action: 'transition', revision: directory.revision, ticketId: f.report.id, fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', reason: 'Vérification par la scolarité' };
    expect((await request(ROLES.LOG, command)).status).toBe(200);
    expect((await request(ROLES.DA, command)).status).toBe(409);
    directory = await (await request(ROLES.DA)).json();
    expect((await request(ROLES.DA, { action: 'reply', revision: directory.revision, ticketId: f.report.id, body: 'Votre demande est en cours de vérification.' })).status).toBe(200);
    directory = await (await request(ROLES.DA)).json();
    expect((await request(ROLES.DA, { ...command, revision: directory.revision, fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED' })).status).toBe(409);
    expect((await request(ROLES.DA, { ...command, revision: directory.revision, ticketId: f.fake.id })).status).toBe(404);
    expect((await request(ROLES.DA, { action: 'reply', revision: directory.revision, ticketId: f.old.id, body: 'Autre année interdite' })).status).toBe(404);
    const own = await (await request(ROLES.STUD, undefined, '', 'student-correction-token')).json();
    expect(own.tickets.find((ticket: { id: string }) => ticket.id === f.report.id).status).toBe('IN_PROGRESS');
    expect(own.messages).toHaveLength(2);
    expect(own.canManageCorrections).toBe(false);
  } finally { await f.close(); }
});

test('Correction réelle : inscription corrigée et données financières, jury et documents conservés', async () => {
  const f = await fixture();
  try {
    const enrollmentId = f.documents[0].enrollment_id;
    const personId = await f.value('select s.person_id as value from escen.enrollments e join escen.students s on s.id=e.student_id where e.id=$1', [enrollmentId]);
    const studentAuthId = randomUUID();
    await f.db.query('insert into auth.users(id) values ($1)', [studentAuthId]);
    const account = await f.insert('accounts', { person_id: personId, auth_user_id: studentAuthId, active: true });
    const studentRole = await f.value("select id as value from escen.roles where code='STUD'");
    await f.insert('role_grants', { account_id: account.id, role_id: studentRole, granted_by: f.account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Lecture après correction' });
    f.authUsers.set('preserved-student-token', { id: studentAuthId, email: 'preserved@example.test', app_metadata: {} });
    const ticket = await f.insert('support_tickets', { author_id: account.id, reference: randomUUID(), title: 'Formation à corriger', priority: 'MEDIUM', academic_year_id: f.year.id, category_id: f.categoryId });
    await f.insert('enrollment_groups', { enrollment_id: enrollmentId, offering_id: f.source.id, group_id: f.sourceGroup, valid_from: '2026-01-01', changed_by: f.account.id, reason: 'Groupe initial avec historique' });
    const semesterId = await f.value('select id as value from escen.curriculum_semesters where curriculum_id=$1 limit 1', [f.curricula[0].id]);
    const subject = await f.insert('subjects', { academic_year_id: f.year.id, code: randomUUID(), name: 'Matière historique' });
    const unit = await f.insert('teaching_units', { curriculum_id: f.curricula[0].id, semester_id: semesterId, code: randomUUID(), name: 'UE historique', credits: 30 });
    const component = await f.insert('curriculum_components', { curriculum_id: f.curricula[0].id, unit_id: unit.id, subject_id: subject.id, code: randomUUID(), credits: 30 });
    const teacherPerson = await f.insert('people', { firstname: 'Enseignant', lastname: 'Historique', email: 'teacher-history@example.test' });
    const staff = await f.insert('staff', { person_id: teacherPerson.id, employee_number: randomUUID() });
    const teacher = await f.insert('teachers', { staff_id: staff.id });
    const assignment = await f.insert('teaching_assignments', { teacher_id: teacher.id, offering_id: f.source.id, group_id: f.sourceGroup, curriculum_id: f.curricula[0].id, component_id: component.id, valid_from: '2026-01-01', valid_until: '2027-12-31' });
    const evaluation = await f.insert('evaluations', { assignment_id: assignment.id, offering_id: f.source.id, component_id: component.id, name: 'Note publiée historique', kind: 'DEVOIR', created_by: f.account.id });
    const candidate = await f.insert('evaluation_candidates', { evaluation_id: evaluation.id, enrollment_id: enrollmentId, offering_id: f.source.id, eligibility: 'ELIGIBLE' });
    const grade = await f.insert('grades', { candidate_id: candidate.id, value: 14, entered_by: f.account.id, last_modified_by: f.account.id });
    let fromStatus = 'BROUILLON';
    for (const status of ['SAISIES', 'SOUMISES', 'A_CONTROLER', 'VALIDEES', 'PUBLIEES']) {
      await f.insert('evaluation_transitions', { evaluation_id: evaluation.id, from_status: fromStatus, to_status: status, actor_id: f.account.id, reason: 'Publication avant correction scolaire' });
      fromStatus = status;
    }
    const session = await f.insert('sessions', { assignment_id: assignment.id, offering_id: f.source.id, group_id: f.sourceGroup, teacher_id: teacher.id, starts_at: '2026-11-01T09:00:00Z', ends_at: '2026-11-01T10:00:00Z', mode: 'EN_LIGNE', status: 'TERMINE' });
    const futureSession = await f.insert('sessions', { assignment_id: assignment.id, offering_id: f.source.id, group_id: f.sourceGroup, teacher_id: teacher.id, starts_at: '2027-11-01T09:00:00Z', ends_at: '2027-11-01T10:00:00Z', mode: 'EN_LIGNE', status: 'PLANIFIE' });
    const attendance = await f.insert('attendances', { session_id: session.id, enrollment_id: enrollmentId, offering_id: f.source.id, status: 'PRESENT', recorded_by: f.account.id });
    const contract = await f.insert('financial_contracts', { enrollment_id: enrollmentId, reference: randomUUID() });
    const version = await f.insert('contract_versions', { contract_id: contract.id, version: 1, status: 'DRAFT', reason: 'Contrat initial conservé' });
    const fee = await f.insert('fee_types', { code: randomUUID(), name: 'Scolarité de test', category: 'SCOLARITE' });
    const line = await f.insert('contract_lines', { contract_id: contract.id, version_id: version.id, fee_type_id: fee.id, amount: 1000, description: 'Frais initiaux' });
    const installment = await f.insert('installments', { version_id: version.id, position: 1, amount: 1000, due_on: '2026-12-01', description: 'Échéance initiale' });
    await f.db.query("update escen.contract_versions set status='APPROVED',approved_by=$1,approved_at=now() where id=$2", [f.account.id, version.id]);
    const payment = await f.insert('payments', { enrollment_id: enrollmentId, payer_name: 'Recette', amount: 250, method: 'ESPECES', provider: 'Caisse de recette', reference: randomUUID(), paid_on: '2026-11-01', recorded_by: f.account.id });
    await f.insert('payment_allocations', { payment_id: payment.id, enrollment_id: enrollmentId, contract_id: contract.id, installment_id: installment.id, version_id: version.id, line_id: line.id, amount: 250, allocated_by: f.account.id });
    const tables = ['financial_contracts', 'contract_versions', 'contract_lines', 'installments', 'payments', 'payment_allocations', 'jury_decisions', 'generated_documents', 'grades', 'evaluation_candidates', 'attendances'];
    const contents = async () => Object.fromEntries(await Promise.all(tables.map(async table => [table, await f.value(`select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') as value from escen.${table} t`)])));
    const before = await contents();
    const revision = await f.value('select revision as value from escen_private.portal_revision where singleton');
    const request = (body: Record<string, unknown>) => f.dispatch(new Request('http://localhost/api/support', { method: 'POST', headers: { authorization: 'Bearer fixture-auth-token', 'x-escen-role': ROLES.LOG, 'x-escen-year': f.year.id }, body: JSON.stringify(body) }));
    const command = { action: 'correct_program', revision, ticketId: ticket.id, enrollmentId, offeringId: f.target.id, groupId: f.targetGroup.id, reason: 'Correction du rattachement erroné' };
    const response = await request(command);
    expect(await response.json()).not.toHaveProperty('error');
    expect(response.status).toBe(200);
    expect(await f.value('select offering_id as value from escen.enrollments where id=$1', [enrollmentId])).toBe(f.target.id);
    expect(await f.value('select historical_only as value from escen.enrollment_groups where enrollment_id=$1 and offering_id=$2', [enrollmentId, f.source.id])).toBe(true);
    expect(await f.value('select status as value from escen.support_tickets where id=$1', [ticket.id])).toBe('RESOLVED');
    expect(await contents()).toEqual(before);
    const campusResponse = await f.dispatch(new Request('http://localhost/api/campus', { headers: { authorization: 'Bearer preserved-student-token', 'x-escen-role': ROLES.STUD, 'x-escen-year': f.year.id } }));
    expect(campusResponse.status).toBe(200);
    const campus = await campusResponse.json();
    expect(campus.tables.grades.map((row: { id: string }) => row.id)).toContain(grade.id);
    expect(campus.tables.attendances.map((row: { id: string }) => row.id)).toContain(attendance.id);
    expect(campus.tables.payments.map((row: { id: string }) => row.id)).toContain(payment.id);
    expect(campus.tables.sessions.map((row: { id: string }) => row.id)).toContain(session.id);
    expect(campus.tables.sessions.map((row: { id: string }) => row.id)).not.toContain(futureSession.id);
    const raw = await f.client.rpc('escen_backend_snapshot');
    const teacherCampus = filterSnapshotForAcademicYear(filterRelationalSnapshot(raw.data, {
      accountId: 'teacher-read', personId: teacherPerson.id, authUserId: 'teacher-auth', roleCode: 'ENS', role: ROLES.ENS,
      permissions: [...ROLE_ACCESS[ROLES.ENS].permissions, 'student.view'], studentId: null, teacherId: teacher.id,
      grants: [{ role_code: 'ENS', role_name: ROLES.ENS, site_id: null, group_id: null, academic_year_id: null }],
    }), f.year.id);
    expect(teacherCampus.tables.grades.map(row => row.id)).toContain(grade.id);
    expect(teacherCampus.tables.groups.map(row => row.id)).not.toContain(f.targetGroup.id);
    expect(teacherCampus.tables.payments || []).toHaveLength(0);
    expect((await request(command)).status).toBe(409);
    expect(await f.value('select count(*) as value from escen.student_program_corrections where ticket_id=$1', [ticket.id])).toBe(1);
    const nextTicket = await f.insert('support_tickets', { author_id: account.id, reference: randomUUID(), title: 'Retour de formation', priority: 'MEDIUM', academic_year_id: f.year.id, category_id: f.categoryId });
    const beforeFailure = await f.value('select revision as value from escen_private.portal_revision where singleton');
    const membershipsBeforeFailure = await f.value("select jsonb_agg(to_jsonb(g) order by id) as value from escen.enrollment_groups g where enrollment_id=$1", [enrollmentId]);
    await f.db.exec("create function escen_private.fail_correction_message_test() returns trigger language plpgsql as $$ begin if new.body like 'Correction de formation enregistrée%' then raise exception 'Échec tardif simulé'; end if; return new; end $$; create trigger fail_correction_message_test before insert on escen.support_messages for each row execute function escen_private.fail_correction_message_test();");
    expect((await request({ ...command, ticketId: nextTicket.id, revision: beforeFailure, offeringId: f.source.id, groupId: f.sourceGroup })).status).toBe(409);
    expect(await f.value('select offering_id as value from escen.enrollments where id=$1', [enrollmentId])).toBe(f.target.id);
    expect(await f.value('select revision as value from escen_private.portal_revision where singleton')).toBe(beforeFailure);
    expect(await f.value('select status as value from escen.support_tickets where id=$1', [nextTicket.id])).toBe('OPEN');
    expect(await f.value("select jsonb_agg(to_jsonb(g) order by id) as value from escen.enrollment_groups g where enrollment_id=$1", [enrollmentId])).toEqual(membershipsBeforeFailure);
    expect(await f.value('select count(*) as value from escen.student_program_corrections where ticket_id=$1', [nextTicket.id])).toBe(0);
    await f.db.exec('drop trigger fail_correction_message_test on escen.support_messages');
    expect((await request({ ...command, ticketId: nextTicket.id, revision: beforeFailure, offeringId: f.source.id, groupId: f.sourceGroup })).status).toBe(200);
    expect(await f.value('select offering_id as value from escen.enrollments where id=$1', [enrollmentId])).toBe(f.source.id);
    expect(await f.value('select count(*) as value from escen.enrollment_groups where enrollment_id=$1 and not historical_only and valid_until is null', [enrollmentId])).toBe(1);
    expect(await contents()).toEqual(before);
  } finally { await f.close(); }
});

for (const width of [390, 1440]) test(`Corrections scolaires : prise en charge et réponse à ${width}px`, async ({ page }) => {
  const f = await fixture();
  try {
    await page.setViewportSize({ width, height: 960 });
    await authenticateFixture(page);
    await page.route('**/api/**', async route => {
      const original = route.request();
      const response = await f.dispatch(new Request(original.url(), { method: original.method(), headers: original.headers(), ...(original.method() === 'GET' ? {} : { body: original.postData() }) }));
      await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
    });
    await page.goto('/etudiants/corrections');
    await page.getByLabel('Mon compte et mon rôle').click();
    await page.getByRole('combobox', { name: 'Changer de rôle actif', exact: true }).selectOption(ROLES.LOG);
    if (await page.locator('.account-control').getAttribute('open') !== null) await page.getByLabel('Mon compte et mon rôle').click();
    await expect(page.getByRole('heading', { name: 'Corrections scolaires', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ouvrir le suivi' }).click();
    await expect(page.getByRole('dialog').getByText('CORRECTION-001', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Consulter le dossier étudiant' })).toHaveAttribute('href', '/etudiants/CORRECTION-001');
    await page.getByRole('button', { name: 'Prendre en charge', exact: true }).click();
    await page.getByLabel('Compte rendu', { exact: true }).fill('Vérification du niveau auprès de la scolarité.');
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    await page.getByRole('dialog').last().getByRole('button', { name: 'Prendre en charge', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Résoudre la demande', exact: true })).toHaveCount(0);
    await expect(page.getByText('Prise en charge : Vérification du niveau auprès de la scolarité.')).toBeVisible();
    await page.getByRole('button', { name: 'Corriger la formation', exact: true }).click();
    await page.getByRole('combobox', { name: 'Filière et niveau corrects', exact: true }).selectOption(f.target.id);
    await page.getByRole('combobox', { name: 'Groupe correct', exact: true }).selectOption(f.targetGroup.id);
    await page.getByLabel('Motif de la correction', { exact: true }).fill('Filière erronée à la création du dossier.');
    const correctionWrites = f.requests.filter((entry: { method: string }) => entry.method === 'POST').length;
    await page.getByRole('button', { name: 'Vérifier la correction', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Vérification avant enregistrement' })).toContainText('Marketing Digital');
    expect(f.requests.filter((entry: { method: string }) => entry.method === 'POST').length).toBe(correctionWrites);
    await page.getByRole('button', { name: 'Confirmer la correction', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'La formation et le groupe ont été corrigés.' })).toBeVisible();
    expect(await f.value('select offering_id as value from escen.enrollments where id=$1', [f.enrollment.id])).toBe(f.target.id);
    await expect(page.getByRole('button', { name: 'Corriger la formation', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await f.close(); }
});
