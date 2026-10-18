import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadLocalApiModule } from './local-api-fixture.mjs';

export async function verifyPaymentAdjustments(db, check, { year, offering }) {
  const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;
  const insert = async (table, record) => {
    assert.match(table, /^[a-z_]+$/);
    const keys = Object.keys(record); keys.forEach(key => assert.match(key, /^[a-z_]+$/));
    return (await db.query(`insert into escen.${table} (${keys.join(',')}) values (${keys.map((_, index) => `$${index + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
  };
  const revision = () => scalar('select revision as value from escen_private.portal_revision where singleton');
  const auditCount = () => scalar('select count(*)::integer as value from escen_private.audit_events');
  const actors = {};
  for (const [code, name] of [['IT', 'Informaticien'], ['DG', 'Directeur Général'], ['RAF', 'Responsable Administratif et Financier']]) {
    const authId = randomUUID(); await db.query('insert into auth.users(id) values ($1)', [authId]);
    const person = await insert('people', { firstname: 'Gestion', lastname: `Contre-opérations ${code}` });
    const account = await insert('accounts', { person_id: person.id, active: true, auth_user_id: authId });
    const role = await scalar('select id as value from escen.roles where code=$1', [code]);
    await insert('role_grants', { account_id: account.id, role_id: role, granted_by: account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Recette locale financière' });
    actors[code] = { accountId: account.id, personId: person.id, authUserId: authId, roleCode: code, role: name, permissions: ['student.view', 'finance.view', ...(code === 'RAF' ? ['payment.record'] : code === 'DG' ? ['payment.cancel'] : ['payment.cancel', 'payment.record'])], studentId: null, teacherId: null, grants: [{ role_code: code, role_name: name, site_id: null, group_id: null, academic_year_id: null }] };
  }
  const errors = [];
  const client = { async rpc(name, args = {}) {
    try {
      let data;
      if (name === 'escen_backend_snapshot') data = await scalar('select public.escen_backend_snapshot() as value');
      else if (name === 'escen_academic_year_context') data = { currentYearId: year.id };
      else if (name === 'escen_payment_adjustment') data = await scalar('select public.escen_payment_adjustment($1,$2,$3,$4,$5,$6,$7) as value', [args.p_actor_id, args.p_expected_revision, args.p_action, args.p_entity_id, args.p_amount, args.p_reference, args.p_reason]);
      else assert.fail(`RPC inattendue : ${name}`);
      return { data, error: null };
    } catch (error) { errors.push(error.message); return { data: null, error }; }
  } };
  const apis = Object.fromEntries(Object.entries(actors).map(([code, context]) => [code, loadLocalApiModule('app/api/students/[matricule]/operations/route.ts', client, context)]));
  const fee = await insert('fee_types', { code: `ADJUST-${randomUUID()}`, name: 'Frais de recette des contre-opérations', category: 'SCOLARITE' });
  async function seed({ amount = 900, installments = [600, 600], lineAmounts = [900, 300], pending = false, approved = true, allocate = true, discount = 0 } = {}) {
    const person = await insert('people', { firstname: 'Recette', lastname: 'Contre-opération' });
    const student = await insert('students', { person_id: person.id, matricule: `ADJUST-${randomUUID()}` });
    const enrollment = await insert('enrollments', { student_id: student.id, offering_id: offering.id, status: 'REINSCRIT' });
    const contract = await insert('financial_contracts', { enrollment_id: enrollment.id, reference: `CON-${randomUUID()}` });
    const version = await insert('contract_versions', { contract_id: contract.id, version: 1, reason: 'Contrat initial de recette' });
    const lines = [];
    for (const value of lineAmounts) lines.push(await insert('contract_lines', { contract_id: contract.id, version_id: version.id, fee_type_id: fee.id, description: `Ligne ${lines.length + 1}`, amount: value }));
    if (discount) await insert('contract_discounts', { version_id: version.id, line_id: lines[0].id, amount: discount, reason: 'Remise initiale de recette' });
    const due = [];
    for (let index = 0; index < installments.length; index++) due.push(await insert('installments', { version_id: version.id, position: index + 1, due_on: index ? '2026-12-01' : '2026-10-01', amount: installments[index], description: `Échéance ${index + 1}` }));
    if (approved) await db.query("update escen.contract_versions set status='APPROVED', approved_by=$1, approved_at=now() where id=$2", [actors.IT.accountId, version.id]);
    let pendingSource;
    if (pending) {
      const fingerprint = randomUUID().replaceAll('-', '').repeat(2);
      const batch = (await db.query("insert into escen_private.import_batches(source_name,archive_sha256,sql_sha256,source_rows) values('PENDING local',$1,$1,1) returning id", [fingerprint])).rows[0];
      pendingSource = (await db.query("insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload) values($1,'paiements',$2,$3::jsonb) returning id", [batch.id, randomUUID(), JSON.stringify({ status: 'PENDING', montant: amount })])).rows[0].id;
    }
    const payment = await insert('payments', { enrollment_id: enrollment.id, payer_name: 'Parent de recette', amount, method: 'ESPECES', provider: 'Caisse des contre-opérations', reference: `PAY-${randomUUID()}`, paid_on: '2026-10-18', recorded_by: actors.IT.accountId, ...(pending ? { status: 'PENDING', legacy_source_row_id: pendingSource } : {}) });
    const receipt = await insert('receipts', { payment_id: payment.id, reference: `REC-${randomUUID()}`, snapshot: { amount, reference: payment.reference }, issued_by: actors.IT.accountId });
    const allocations = [];
    if (allocate && approved && !pending) {
      let remaining = amount, consumed = 0;
      for (const installment of due) {
        const budget = Math.min(Number(installment.amount), remaining); if (!budget) break;
        const first = Math.floor((consumed + budget) * 0.75) - Math.floor(consumed * 0.75);
        consumed += budget;
        for (const [line, value] of [[lines[0], first], [lines[1], budget - first]]) if (value) allocations.push(await insert('payment_allocations', { payment_id: payment.id, enrollment_id: enrollment.id, contract_id: contract.id, version_id: version.id, line_id: line.id, installment_id: installment.id, amount: value, allocated_by: actors.IT.accountId }));
        remaining -= budget;
      }
    }
    return { student, enrollment, contract, version, lines, due, payment, receipt, allocations };
  }
  const post = async (fixture, body, role = 'IT') => apis[role].POST(new Request('http://local.test/api/students/local/operations', { method: 'POST', headers: { 'x-escen-year': year.id }, body: JSON.stringify({ revision: Number(await revision()), enrollmentId: fixture.enrollment.id, reason: 'Décision financière vérifiée', ...body }) }), { params: Promise.resolve({ matricule: fixture.student.matricule }) });
  const get = fixture => apis.IT.GET(new Request('http://local.test/api/students/local/operations', { headers: { 'x-escen-year': year.id } }), { params: Promise.resolve({ matricule: fixture.student.matricule }) });
  const rpc = async (fixture, action, amount, reference = null, actor = actors.IT.accountId, reason = 'Décision SQL vérifiée', expected) => scalar('select public.escen_payment_adjustment($1,$2,$3,$4,$5,$6,$7) as value', [actor, expected ?? await revision(), action, action === 'credit' ? fixture.lines[0].id : fixture.payment.id, amount, reference, reason]);
  const refund = (fixture, amount, reference = `REF-${randomUUID()}`) => ({ action: 'refund_payment', paymentId: fixture.payment.id, amount, reference });
  const active = fixture => db.query('select * from escen.active_payment_allocations where payment_id=$1 order by id', [fixture.payment.id]).then(result => result.rows);
  const receipt = fixture => scalar('select to_jsonb(r) as value from escen.receipts r where id=$1', [fixture.receipt.id]);
  const state = async fixture => ({ revision: await revision(), audit: await auditCount(), active: await active(fixture), receipt: await receipt(fixture), reversals: await scalar('select count(*)::integer as value from escen.allocation_reversals r join escen.payment_allocations a on a.id=r.allocation_id where a.payment_id=$1', [fixture.payment.id]), refunds: await scalar('select count(*)::integer as value from escen.refunds where payment_id=$1', [fixture.payment.id]) });
  const successful = async response => { assert.equal(response.status, 201, `${JSON.stringify(await response.clone().json())} ${errors.at(-1) || ''}`); return response.json(); };

  await check('Contre-opérations : RPC serveur uniquement et audits existants conservés', async () => {
    assert.equal(await scalar("select exists(select 1 from pg_proc p, lateral aclexplode(p.proacl) a where p.oid='public.escen_payment_adjustment(uuid,bigint,text,uuid,numeric,text,text)'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE') as value"), false);
    for (const table of ['payment_reversals', 'refunds', 'credit_notes']) {
      assert.equal(await scalar('select relrowsecurity as value from pg_class where oid=$1::regclass', [`escen.${table}`]), true);
      assert.equal(await scalar("select exists(select 1 from pg_trigger where tgrelid=$1::regclass and tgname='audit_event') as value", [`escen.${table}`]), true);
    }
  });
  await check('Annulation : DG autorisé, paiement et reçu originaux immuables, motif audité', async () => {
    const fixture = await seed(); const original = await receipt(fixture);
    await successful(await post(fixture, { action: 'cancel_payment', paymentId: fixture.payment.id }, 'DG'));
    assert.equal((await active(fixture)).length, 0); assert.deepEqual(await receipt(fixture), original);
    const reversal = (await db.query('select * from escen.payment_reversals where payment_id=$1', [fixture.payment.id])).rows[0];
    assert.equal(reversal.reason, 'Décision financière vérifiée');
    assert.equal(await scalar("select actor_id as value from escen_private.audit_events where table_name='payment_reversals' and entity_id=$1", [reversal.id]), actors.DG.accountId);
    assert.equal((await (await get(fixture)).json()).adjustmentDirectory.payments[0].receipt.status, 'ANNULE');
    const before = await state(fixture); assert.equal((await post(fixture, { action: 'cancel_payment', paymentId: fixture.payment.id }, 'DG')).status, 409); assert.deepEqual(await state(fixture), before);
  });
  await check('Annulation : paiement PENDING annulable, remboursement interdit', async () => {
    const fixture = await seed({ pending: true });
    await assert.rejects(rpc(fixture, 'refund', 1, 'REF-PENDING'), /attente/);
    await successful(await post(fixture, { action: 'cancel_payment', paymentId: fixture.payment.id }, 'DG'));
  });
  const partial = await seed();
  await check('Remboursement : RAF autorisé, échéance récente réduite au prorata, ancienne préservée', async () => {
    const original = await receipt(partial); const beforeRevision = Number(await revision());
    await successful(await post(partial, refund(partial, 200), 'RAF'));
    const allocations = await active(partial);
    assert.equal(allocations.filter(row => row.installment_id === partial.due[0].id).reduce((sum, row) => sum + Number(row.amount), 0), 600);
    const latest = allocations.filter(row => row.installment_id === partial.due[1].id);
    assert.equal(latest.reduce((sum, row) => sum + Number(row.amount), 0), 100);
    assert.equal(Number(latest.find(row => row.line_id === partial.lines[0].id).amount), 75);
    assert.equal(Number(latest.find(row => row.line_id === partial.lines[1].id).amount), 25);
    assert.deepEqual(await receipt(partial), original); assert.equal(Number(await revision()), beforeRevision + 1);
    const audit = (await db.query("select * from escen_private.audit_events where table_name='refunds' and new_value->>'payment_id'=$1 order by happened_at desc", [partial.payment.id])).rows[0];
    assert.equal(audit.actor_id, actors.RAF.accountId); assert.equal(audit.reason, 'Décision financière vérifiée');
    assert.ok(!await scalar("select nullif(current_setting('escen.actor_id',true),'') as value"));
    assert.ok(!await scalar("select nullif(current_setting('escen.refund_replacement',true),'') as value"));
  });
  await check('Remboursement : cumul plafonné, paiement remboursé non annulable, total possible', async () => {
    const before = await state(partial);
    assert.equal((await post(partial, refund(partial, 701), 'RAF')).status, 409);
    assert.equal((await post(partial, { action: 'cancel_payment', paymentId: partial.payment.id }, 'DG')).status, 409);
    await assert.rejects(rpc(partial, 'cancel', null, null, actors.DG.accountId), /remboursé/);
    assert.deepEqual(await state(partial), before);
    await successful(await post(partial, refund(partial, 700), 'RAF'));
    assert.equal((await active(partial)).length, 0);
    assert.equal(Number(await scalar('select sum(amount) as value from escen.refunds where payment_id=$1', [partial.payment.id])), 900);
  });
  await check('Remboursement : montant non affecté utilisé avant toute contrepassation', async () => {
    const fixture = await seed({ amount: 1500 }); const before = await active(fixture);
    await successful(await post(fixture, refund(fixture, 200), 'RAF'));
    assert.deepEqual(await active(fixture), before);
  });
  await check('Remboursement : erreur finale de référence annule contrepassations, reliquats, audit et révision', async () => {
    const fixture = await seed(); const duplicate = `DUP-${randomUUID()}`;
    const free = await seed({ allocate: false });
    await insert('refunds', { payment_id: free.payment.id, amount: 1, reference: duplicate, actor_id: actors.IT.accountId, reason: 'Référence occupée pour tester le rollback' });
    const before = await state(fixture);
    assert.equal((await post(fixture, refund(fixture, 200, duplicate), 'RAF')).status, 409);
    assert.deepEqual(await state(fixture), before);
  });
  await check('Remboursement : reliquat historique conservé après remplacement du contrat', async () => {
    const fixture = await seed();
    await db.query("update escen.contract_versions set status='SUPERSEDED' where id=$1", [fixture.version.id]);
    const cash = await insert('payments', { enrollment_id: fixture.enrollment.id, payer_name: 'Recette garde historique', amount: 1, method: 'ESPECES', provider: 'Caisse des contre-opérations', reference: `GUARD-${randomUUID()}`, paid_on: '2026-10-18', recorded_by: actors.IT.accountId });
    const forbiddenAllocation = { payment_id: cash.id, enrollment_id: fixture.enrollment.id, contract_id: fixture.contract.id, version_id: fixture.version.id, line_id: fixture.lines[0].id, installment_id: fixture.due[1].id, amount: 1, allocated_by: actors.IT.accountId };
    await assert.rejects(insert('payment_allocations', forbiddenAllocation), /courant/);
    await successful(await post(fixture, refund(fixture, 200), 'RAF'));
    const after = await active(fixture); assert.equal(after.reduce((sum, row) => sum + Number(row.amount), 0), 700);
    assert.ok(after.every(row => row.version_id === fixture.version.id));
    await assert.rejects(insert('payment_allocations', forbiddenAllocation), /courant/);
  });
  await check('Remboursement : plus de 100 affectations, rollback tardif puis succès avec une seule révision', async () => {
    const fixture = await seed({ amount: 1200, installments: Array(120).fill(10) });
    assert.ok((await active(fixture)).length > 100);
    const free = await seed({ allocate: false }), duplicate = `LARGE-DUP-${randomUUID()}`;
    await insert('refunds', { payment_id: free.payment.id, amount: 1, reference: duplicate, actor_id: actors.IT.accountId, reason: 'Référence occupée pour le dernier contrôle' });
    const original = await state(fixture);
    assert.equal((await post(fixture, refund(fixture, 1199, duplicate), 'RAF')).status, 409);
    assert.deepEqual(await state(fixture), original);
    assert.ok(!await scalar("select nullif(current_setting('escen.actor_id',true),'') as value"));
    assert.ok(!await scalar("select nullif(current_setting('escen.refund_replacement',true),'') as value"));
    const before = Number(await revision());
    await successful(await post(fixture, refund(fixture, 1199), 'RAF'));
    assert.equal((await active(fixture)).reduce((sum, row) => sum + Number(row.amount), 0), 1);
    assert.equal(Number(await revision()), before + 1);
  });
  await check('Avoir : remises, avoirs précédents et affectations actives déduits, motif audité', async () => {
    const fixture = await seed({ allocate: false, discount: 100, installments: [500, 600] });
    await successful(await post(fixture, { action: 'credit_note', lineId: fixture.lines[0].id, amount: 200 }, 'RAF'));
    assert.equal((await (await get(fixture)).json()).adjustmentDirectory.lines[0].available, 600);
    await successful(await post(fixture, { action: 'credit_note', lineId: fixture.lines[0].id, amount: 600 }, 'RAF'));
    const before = await auditCount();
    assert.equal((await post(fixture, { action: 'credit_note', lineId: fixture.lines[0].id, amount: 1 }, 'RAF')).status, 409);
    await assert.rejects(rpc(fixture, 'credit', 1, null, actors.RAF.accountId), /Avoir supérieur/);
    assert.equal(await auditCount(), before);
    assert.equal(await scalar("select actor_id as value from escen_private.audit_events where table_name='credit_notes' and new_value->>'line_id'=$1 limit 1", [fixture.lines[0].id]), actors.RAF.accountId);
  });
  await check('Avoir : contrat brouillon et montant encore affecté refusés sans effets', async () => {
    const draft = await seed({ approved: false });
    await assert.rejects(rpc(draft, 'credit', 1, null, actors.RAF.accountId), /approuvé/);
    const fixture = await seed({ amount: 1200 });
    await assert.rejects(rpc(fixture, 'credit', 1, null, actors.RAF.accountId), /Avoir supérieur/);
  });
  await check('Contre-opérations : autorisations SQL distinctes, motif et concurrence obligatoires', async () => {
    const fixture = await seed(); const before = await state(fixture);
    await assert.rejects(rpc(fixture, 'cancel', null, null, actors.RAF.accountId), /Autorisation/);
    await assert.rejects(rpc(fixture, 'refund', 1, 'REF-DG', actors.DG.accountId), /Autorisation/);
    await assert.rejects(rpc(fixture, 'credit', 1, null, actors.DG.accountId), /Autorisation/);
    await assert.rejects(rpc(fixture, 'refund', 1, 'REF-MOTIF', actors.RAF.accountId, 'a'), /motif/);
    await assert.rejects(rpc(fixture, 'refund', 0.5, 'REF-DECIMAL', actors.RAF.accountId), /entier/);
    await assert.rejects(rpc(fixture, 'refund', 1, 'REF-PERIME', actors.RAF.accountId, 'Décision vérifiée', 0), /CONCURRENT_UPDATE/);
    assert.deepEqual(await state(fixture), before);
  });
}
