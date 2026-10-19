import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadLocalApiModule } from './local-api-fixture.mjs';

export async function verifyNetFinances(db, check, { year, offering }) {
  const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;
  const insert = async (table, record) => {
    assert.match(table, /^[a-z_]+$/);
    const keys = Object.keys(record); keys.forEach(key => assert.match(key, /^[a-z_]+$/));
    return (await db.query(`insert into escen.${table} (${keys.join(',')}) values (${keys.map((_, index) => `$${index + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
  };
  const authId = randomUUID(); await db.query('insert into auth.users(id) values ($1)', [authId]);
  const person = await insert('people', { firstname: 'Recette', lastname: 'Projections financières' });
  const account = await insert('accounts', { person_id: person.id, auth_user_id: authId, active: true });
  const role = await scalar("select id as value from escen.roles where code='IT'");
  await insert('role_grants', { account_id: account.id, role_id: role, granted_by: account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Recette locale des projections' });
  const context = { accountId: account.id, personId: person.id, authUserId: authId, roleCode: 'IT', role: 'Informaticien', permissions: ['student.view', 'finance.view', 'finance.report.view'], studentId: null, teacherId: null, grants: [{ role_code: 'IT', role_name: 'Informaticien', site_id: null, academic_year_id: null, group_id: null }] };
  const client = { async rpc(name) {
    if (name === 'escen_backend_snapshot') return { data: await scalar('select public.escen_backend_snapshot() as value'), error: null };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: year.id }, error: null };
    assert.fail(`RPC inattendue : ${name}`);
  } };
  const api = loadLocalApiModule('app/api/students/[matricule]/operations/route.ts', client, context);
  const { projectRelationalCampus } = loadLocalApiModule('services/relationalCampusAdapter.ts', client, context);
  const { netPaymentTotal } = loadLocalApiModule('services/financialProjectionService.ts', client, context);
  const { getFinancialReport } = loadLocalApiModule('services/financialReportService.ts', client, context);
  const fee = await insert('fee_types', { code: `NET-${randomUUID()}`, name: 'Frais de recette nette', category: 'SCOLARITE' });
  async function seed() {
    const person = await insert('people', { firstname: 'Net', lastname: 'Étudiant' });
    const student = await insert('students', { person_id: person.id, matricule: `NET-${randomUUID()}` });
    const enrollment = await insert('enrollments', { student_id: student.id, offering_id: offering.id, status: 'INSCRIT' });
    const contract = await insert('financial_contracts', { enrollment_id: enrollment.id, reference: `CON-${randomUUID()}` });
    const version = await insert('contract_versions', { contract_id: contract.id, version: 1, reason: 'Contrat de recette nette' });
    const line = await insert('contract_lines', { contract_id: contract.id, version_id: version.id, fee_type_id: fee.id, description: 'Frais annuels', amount: 1200 });
    await insert('contract_discounts', { version_id: version.id, line_id: line.id, amount: 100, reason: 'Remise contractuelle' });
    const installment = await insert('installments', { version_id: version.id, position: 1, due_on: '2026-10-01', amount: 1100, description: 'Échéance initiale' });
    await db.query("update escen.contract_versions set status='APPROVED',approved_by=$1,approved_at=now() where id=$2", [account.id, version.id]);
    await insert('credit_notes', { line_id: line.id, amount: 200, actor_id: account.id, reason: 'Avoir de recette nette' });
    return { student, enrollment, contract, version, line, installment };
  }
  async function payment(fixture, amount, pending = false) {
    let source;
    if (pending) {
      const fingerprint = randomUUID().replaceAll('-', '').repeat(2);
      const batch = (await db.query("insert into escen_private.import_batches(source_name,archive_sha256,sql_sha256,source_rows) values('PENDING projections',$1,$1,1) returning id", [fingerprint])).rows[0];
      source = (await db.query("insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload) values($1,'paiements',$2,$3::jsonb) returning id", [batch.id, randomUUID(), JSON.stringify({ status: 'PENDING', montant: amount })])).rows[0].id;
    }
    return insert('payments', { enrollment_id: fixture.enrollment.id, payer_name: 'Payeur de recette', amount, method: 'ESPECES', provider: 'Caisse nette', reference: `PAY-${randomUUID()}`, paid_on: '2026-10-18', recorded_by: account.id, ...(pending ? { status: 'PENDING', legacy_source_row_id: source } : {}) });
  }
  const allocate = (fixture, payment, amount) => insert('payment_allocations', { payment_id: payment.id, enrollment_id: fixture.enrollment.id, contract_id: fixture.contract.id, version_id: fixture.version.id, line_id: fixture.line.id, installment_id: fixture.installment.id, amount, allocated_by: account.id });
  const get = fixture => api.GET(new Request('http://local.test/api/students/NET/operations', { headers: { 'x-escen-year': year.id } }), { params: Promise.resolve({ matricule: fixture.student.matricule }) });
  const balance = fixture => db.query('select * from escen.contract_balances where contract_id=$1', [fixture.contract.id]).then(result => result.rows[0]);
  const fixture = await seed();
  const posted = await payment(fixture, 400);
  await insert('refunds', { payment_id: posted.id, amount: 100, reference: `REF-${randomUUID()}`, actor_id: account.id, reason: 'Remboursement partiel' });
  const effective = await allocate(fixture, posted, 250);
  const reversed = await allocate(fixture, posted, 50);
  await insert('allocation_reversals', { allocation_id: reversed.id, actor_id: account.id, reason: 'Affectation contrepassée' });
  const pending = await payment(fixture, 500, true); await allocate(fixture, pending, 200);
  const cancelled = await payment(fixture, 700); await allocate(fixture, cancelled, 100);
  await insert('payment_reversals', { payment_id: cancelled.id, actor_id: account.id, reason: 'Paiement annulé' });

  await check('Projections nettes : vues avec security_invoker et affectations PENDING ou annulées exclues', async () => {
    for (const view of ['active_payment_allocations', 'contract_balances']) {
      assert.ok((await scalar('select reloptions as value from pg_class where oid=$1::regclass', [`escen.${view}`])).includes('security_invoker=true'));
    }
    const active = (await db.query('select id from escen.active_payment_allocations where enrollment_id=$1', [fixture.enrollment.id])).rows;
    assert.deepEqual(active.map(row => row.id), [effective.id]);
  });
  await check('Projections nettes : parité SQL, dossier API, étudiant, inscription et calcul de secours', async () => {
    const sql = await balance(fixture); assert.equal(Number(sql.expected), 900); assert.equal(Number(sql.paid), 300);
    const response = await get(fixture); assert.equal(response.status, 200);
    const directory = await response.json(); assert.equal(directory.paid, 300); assert.equal(directory.contracts[0].amount, 900);
    const snapshot = await scalar('select public.escen_backend_snapshot() as value');
    const data = projectRelationalCampus(snapshot).data;
    const student = data.students.find(student => student.matricule === fixture.student.matricule);
    assert.deepEqual(student.financials, data.enrollments.find(row => row.id === fixture.enrollment.id).financials);
    assert.equal(student.financials.expected, Number(sql.expected)); assert.equal(student.financials.paid, Number(sql.paid));
    assert.equal(student.financials.paid, netPaymentTotal(snapshot, new Set([fixture.enrollment.id])));
    const report = getFinancialReport([student], context.role, '2026-12-31')[0];
    assert.equal(report.overdue, 600); assert.equal(report.situation, 'EN_RETARD');
  });
  await check('Projections nettes : avoir intégral soldé sans réécrire les échéances', async () => {
    const full = await seed(); await insert('credit_notes', { line_id: full.line.id, amount: 900, actor_id: account.id, reason: 'Avoir intégral motivé' });
    const sql = await balance(full); assert.equal(Number(sql.expected), 0); assert.equal(Number(sql.paid), 0);
    const snapshot = await scalar('select public.escen_backend_snapshot() as value');
    const student = projectRelationalCampus(snapshot).data.students.find(row => row.matricule === full.student.matricule);
    const report = getFinancialReport([student], context.role, '2026-12-31')[0];
    assert.equal(report.situation, 'SCOLARITE_SOLDEE'); assert.equal(report.overdue, 0);
    assert.equal(student.financials.installments[0].amount, 1100);
  });
  await check('Projections nettes : trop-perçu soldé, remboursement propre au paiement et contrat étranger isolé', async () => {
    const other = await seed(); const otherPayment = await payment(other, 1500);
    await insert('refunds', { payment_id: otherPayment.id, amount: 200, reference: `REF-${randomUUID()}`, actor_id: account.id, reason: 'Remboursement du trop-perçu' });
    const response = await get(other); assert.equal((await response.json()).paid, 1300);
    const original = await balance(fixture); assert.equal(Number(original.paid), 300); assert.equal(Number(original.expected), 900);
    const snapshot = await scalar('select public.escen_backend_snapshot() as value');
    const student = projectRelationalCampus(snapshot).data.students.find(row => row.matricule === other.student.matricule);
    const report = getFinancialReport([student], context.role, '2026-12-31')[0];
    assert.equal(student.financials.remaining, -400); assert.equal(report.situation, 'SCOLARITE_SOLDEE'); assert.equal(report.overdue, 0);
  });
}
