import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadLocalApiModule } from './local-api-fixture.mjs';

export async function verifyPaymentAllocations(db, check, { year, offering }) {
  const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;
  const insert = async (table, record) => {
    assert.match(table, /^[a-z_]+$/);
    const keys = Object.keys(record);
    keys.forEach(key => assert.match(key, /^[a-z_]+$/));
    return (await db.query(`insert into escen.${table} (${keys.join(',')}) values (${keys.map((_, index) => `$${index + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
  };
  const auth = randomUUID();
  await db.query('insert into auth.users(id) values ($1)', [auth]);
  const person = await insert('people', { firstname: 'Gestion', lastname: 'Affectations' });
  const actor = await insert('accounts', { person_id: person.id, active: true, auth_user_id: auth });
  const role = await scalar("select id as value from escen.roles where code='RAF'");
  await insert('role_grants', { account_id: actor.id, role_id: role, granted_by: actor.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Recette locale des paiements' });
  const context = { accountId: actor.id, personId: person.id, authUserId: auth, roleCode: 'RAF', role: 'Responsable Administratif et Financier', permissions: ['student.view', 'finance.view', 'payment.record'], studentId: null, teacherId: null, grants: [{ role_code: 'RAF', role_name: 'Responsable Administratif et Financier', site_id: null, academic_year_id: null, group_id: null }] };
  const channel = await insert('annual_payment_channels', { academic_year_id: year.id, name: `Caisse allocation ${randomUUID()}`, method: 'ESPECES', reason: 'Recette locale des affectations' });
  const fee = await insert('fee_types', { code: `ALLOC-${randomUUID()}`, name: 'Frais de recette locale', category: 'SCOLARITE' });
  const revision = () => scalar('select revision as value from escen_private.portal_revision where singleton');
  const audits = () => scalar('select count(*)::integer as value from escen_private.audit_events');
  const count = table => scalar(`select count(*)::integer as value from escen.${table}`);
  let corruptLast = false;
  const transactions = [];
  const client = { async rpc(name, args = {}) {
    try {
      let data;
      if (name === 'escen_backend_snapshot') data = await scalar('select public.escen_backend_snapshot() as value');
      else if (name === 'escen_academic_year_context') data = { currentYearId: year.id };
      else if (name === 'escen_payment_transaction') {
        const changes = structuredClone(args.p_changes);
        transactions.push(changes);
        if (corruptLast) changes.at(-1).record.line_id = randomUUID();
        data = await scalar('select public.escen_payment_transaction($1,$2,$3,$4,$5::jsonb) as value', [args.p_actor_id, args.p_expected_revision, args.p_action, args.p_payment_id, JSON.stringify(changes)]);
      } else assert.fail(`RPC inattendue : ${name}`);
      return { data, error: null };
    } catch (error) { return { data: null, error }; }
  } };
  const api = loadLocalApiModule('app/api/students/[matricule]/operations/route.ts', client, context);
  async function seed(installmentAmounts = [600, 600], approved = true) {
    const person = await insert('people', { firstname: 'Recette', lastname: 'Allocation' });
    const student = await insert('students', { person_id: person.id, matricule: `ALLOC-${randomUUID()}` });
    const enrollment = await insert('enrollments', { student_id: student.id, offering_id: offering.id, status: 'REINSCRIT' });
    const contract = await insert('financial_contracts', { enrollment_id: enrollment.id, reference: `CON-${randomUUID()}` });
    const version = await insert('contract_versions', { contract_id: contract.id, version: 1, reason: 'Contrat de recette locale' });
    const lines = [];
    for (const amount of [900, 300]) lines.push(await insert('contract_lines', { contract_id: contract.id, version_id: version.id, fee_type_id: fee.id, description: 'Ligne de recette', amount }));
    const installments = [];
    for (let index = 0; index < installmentAmounts.length; index++) installments.push(await insert('installments', { version_id: version.id, position: index + 1, due_on: index ? '2026-11-01' : '2026-10-01', amount: installmentAmounts[index], description: `Échéance ${index + 1}` }));
    if (approved) await db.query("update escen.contract_versions set status='APPROVED', approved_by=$1, approved_at=now() where id=$2", [actor.id, version.id]);
    return { student, enrollment, contract, version, lines, installments };
  }
  const post = async (fixture, body) => api.POST(new Request('http://local.test/api/students/local/operations', { method: 'POST', headers: { 'x-escen-year': year.id }, body: JSON.stringify({ revision: Number(await revision()), enrollmentId: fixture.enrollment.id, reason: 'Encaissement et répartition vérifiés', ...body }) }), { params: Promise.resolve({ matricule: fixture.student.matricule }) });
  const payment = amount => ({ action: 'payment', amount, payer: 'Parent de recette', reference: `PAY-${randomUUID()}`, provider: channel.name, method: 'ESPECES', paidOn: '2026-10-18' });
  const active = paymentId => db.query('select * from escen.active_payment_allocations where payment_id=$1', [paymentId]).then(result => result.rows);
  const paymentId = () => transactions.at(-1).find(change => change.table === 'payments').record.id;
  const receipt = paymentId => scalar('select to_jsonb(r) as value from escen.receipts r where payment_id=$1', [paymentId]);

  await check('Affectations : RPC serveur uniquement, RLS et audits existants conservés', async () => {
    assert.equal(await scalar("select exists(select 1 from pg_proc p, lateral aclexplode(p.proacl) a where p.oid='public.escen_payment_transaction(uuid,bigint,text,uuid,jsonb)'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE') as value"), false);
    for (const table of ['payment_allocations', 'allocation_reversals']) {
      assert.equal(await scalar('select relrowsecurity as value from pg_class where oid=$1::regclass', [`escen.${table}`]), true);
      assert.equal(await scalar("select exists(select 1 from pg_trigger where tgrelid=$1::regclass and tgname='audit_event') as value", [`escen.${table}`]), true);
    }
  });
  const fixture = await seed();
  let initialPayment;
  await check('Affectations : encaissement, reçu, prorata et échéances persistés ensemble', async () => {
    const response = await post(fixture, payment(700));
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    assert.equal((await response.json()).allocated, 700);
    initialPayment = paymentId();
    const allocations = await active(initialPayment);
    const first = allocations.filter(row => row.installment_id === fixture.installments[0].id);
    assert.equal(first.reduce((sum, row) => sum + Number(row.amount), 0), 600);
    assert.equal(Number(first.find(row => row.line_id === fixture.lines[0].id).amount), 450);
    assert.equal(Number(first.find(row => row.line_id === fixture.lines[1].id).amount), 150);
    assert.ok(await receipt(initialPayment));
    assert.equal(await scalar("select actor_id as value from escen_private.audit_events where table_name='payment_allocations' and entity_id=$1", [allocations[0].id]), actor.id);
    assert.equal(Number(await scalar('select paid as value from escen.contract_balances where contract_id=$1', [fixture.contract.id])), 700);
  });
  await check('Affectations : réaffectation motivée, contrepassations auditées et reçu immuable', async () => {
    const originalReceipt = await receipt(initialPayment);
    const previous = await active(initialPayment);
    const response = await post(fixture, { action: 'reallocate_payment', paymentId: initialPayment, targets: [{ installmentId: fixture.installments[1].id, amount: 600 }] });
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    assert.equal((await response.json()).unallocated, 100);
    assert.deepEqual(await receipt(initialPayment), originalReceipt);
    assert.ok((await active(initialPayment)).every(row => row.installment_id === fixture.installments[1].id));
    for (const allocation of previous) {
      const reversal = (await db.query('select * from escen.allocation_reversals where allocation_id=$1', [allocation.id])).rows[0];
      assert.equal(reversal.reason, 'Encaissement et répartition vérifiés');
      assert.equal(await scalar("select actor_id as value from escen_private.audit_events where table_name='allocation_reversals' and entity_id=$1", [reversal.id]), actor.id);
    }
  });
  await check('Affectations : trop-perçu conservé sans dépasser les soldes contractuels', async () => {
    const response = await post(fixture, payment(1000));
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    assert.deepEqual(Object.fromEntries(Object.entries(await response.json()).filter(([key]) => key !== 'revision')), { allocated: 600, unallocated: 400 });
  });
  await check('Affectations : contrat brouillon, paiement et reçu conservés sans allocation', async () => {
    const draft = await seed([600, 600], false);
    const response = await post(draft, payment(500));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).unallocated, 500);
    assert.equal((await active(paymentId())).length, 0);
    assert.ok(await receipt(paymentId()));
  });
  const large = await seed(Array(120).fill(10));
  const command = payment(1100);
  await check('Affectations : erreur SQL après plus de 100 lignes annule paiement, reçu, audits et révisions', async () => {
    const before = { payments: await count('payments'), receipts: await count('receipts'), allocations: await count('payment_allocations'), audit: await audits(), revision: await revision() };
    corruptLast = true;
    const response = await post(large, command);
    corruptLast = false;
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /Aucune opération partielle/);
    assert.ok(transactions.at(-1).length > 100);
    assert.deepEqual({ payments: await count('payments'), receipts: await count('receipts'), allocations: await count('payment_allocations'), audit: await audits(), revision: await revision() }, before);
  });
  let largePayment;
  await check('Affectations : plus de 100 lignes réussissent dans une seule commande financière', async () => {
    const response = await post(large, command);
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    assert.equal((await response.json()).allocated, 1100);
    largePayment = paymentId();
    assert.ok((await active(largePayment)).length > 100);
  });
  await check('Affectations : réaffectation de plus de 100 lignes atomique en cas d’erreur tardive', async () => {
    const before = { active: await active(largePayment), reversed: await count('allocation_reversals'), audit: await audits(), revision: await revision() };
    corruptLast = true;
    const response = await post(large, { action: 'reallocate_payment', paymentId: largePayment, targets: large.installments.slice(10).map(row => ({ installmentId: row.id, amount: 10 })) });
    corruptLast = false;
    assert.equal(response.status, 409);
    assert.deepEqual({ active: await active(largePayment), reversed: await count('allocation_reversals'), audit: await audits(), revision: await revision() }, before);
  });
  await check('Affectations : révision périmée et rôle sans autorisation SQL refusés sans effets', async () => {
    const latest = transactions.at(-1);
    const before = await audits();
    await assert.rejects(scalar('select public.escen_payment_transaction($1,0,$2,$3,$4::jsonb) as value', [actor.id, 'reallocate', largePayment, JSON.stringify(latest)]), /CONCURRENT_UPDATE/);
    await assert.rejects(scalar('select public.escen_payment_transaction($1,$2,$3,$4,$5::jsonb) as value', [randomUUID(), await revision(), 'reallocate', largePayment, JSON.stringify(latest)]), /Autorisation/);
    assert.equal(await audits(), before);
  });
  await check('Affectations : tables étrangères et modification destructive refusées par la RPC', async () => {
    for (const change of [{ table: 'people', operation: 'insert', record: { id: randomUUID() } }, { table: 'payments', operation: 'update', record: { id: largePayment, amount: 1 } }]) {
      await assert.rejects(scalar('select public.escen_payment_transaction($1,$2,$3,$4,$5::jsonb) as value', [actor.id, await revision(), 'reallocate', largePayment, JSON.stringify([change])]), /hors|additives/);
    }
  });
}
