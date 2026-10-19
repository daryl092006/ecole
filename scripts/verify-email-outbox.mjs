import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function verifyEmailOutbox({ db, check, insert, year, nextYear, assignment, account }) {
  const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;
  const enqueue = (version, overrides = {}) => {
    const p = { year: year.id, source: assignment.id, email: 'recipient@example.test', subject: 'Affectation confirmée', ...overrides };
    return scalar("select public.escen_email_enqueue($1,'teaching_assignment_created','teaching_assignments',$2,$3,$4,'Destinataire',$5,'Texte privé','<p>Texte privé</p>') as value", [p.year, p.source, version, p.email, p.subject]);
  };
  const makeAdmin = async (role, scoped = false) => {
    const auth = randomUUID(); await db.query('insert into auth.users values($1)', [auth]);
    const person = await insert('people', { firstname: 'Mails', lastname: role });
    const actor = await insert('accounts', { person_id: person.id, auth_user_id: auth, active: true });
    await db.query('insert into escen.role_grants(account_id,role_id,academic_year_id,granted_by,valid_from,reason) select $1,id,$2,$3,now(),$4 from escen.roles where code=$5', [actor.id, scoped ? year.id : null, account.id, 'Contrôle des accès mails', role]);
    return actor.id;
  };
  const it = await makeAdmin('IT'), dg = await makeAdmin('DG'), scoped = await makeAdmin('IT', true);
  let id, lock, failedVersion;
  await check('Mails : source annuelle vérifiée, idempotence et contenu immuable', async () => {
    id = await enqueue('email-test-1');
    assert.equal(await enqueue('email-test-1'), id);
    await assert.rejects(enqueue('email-test-1', { subject: 'Autre contenu' }), /autre message/i);
    await assert.rejects(enqueue('wrong-year', { year: nextYear.id }), /autre année/i);
    await assert.rejects(enqueue('absent', { source: randomUUID() }), /Source absente/i);
    await assert.rejects(enqueue('invalid', { email: 'pas un mail' }), /check/i);
    await assert.rejects(db.query('update escen.email_outbox set subject=$1 where id=$2', ['Altération', id]), /immuables/i);
    assert.equal(await scalar('select recipient_email as value from escen.email_outbox where id=$1', [id]), 'recipient@example.test');
  });
  await check('Mails : accès global DG/IT, permission dédiée et exclusion du snapshot', async () => {
    for (const [actor, role] of [[scoped, 'IT'], [it, 'DG'], [account.id, 'ENS']]) {
      await assert.rejects(db.query('select public.escen_email_page($1,$2,$3)', [actor, role, year.id]), /refusé/i);
    }
    const page = await scalar("select public.escen_email_page($1,'DG',$2) as value", [dg, year.id]);
    assert.ok(page.records.some(row => row.id === id));
    assert.equal('html_body' in page.records[0], false);
    assert.equal('text_body' in page.records[0], false);
    assert.equal('email_outbox' in (await scalar('select public.escen_backend_snapshot() as value')).tables, false);
    assert.equal((await scalar("select public.escen_email_page($1,'IT',$2) as value", [it, nextYear.id])).total, 0);
    await db.exec('set role database_test_reader');
    try {
      assert.equal(await scalar('select count(*)::int as value from escen.email_outbox'), 0);
      await assert.rejects(db.query('select public.escen_email_claim($1)', [randomUUID()]), /permission/i);
    } finally { await db.exec('reset role'); }
  });
  await check('Mails : prise de lot exclusive, refus des jetons et échec confirmé', async () => {
    lock = randomUUID();
    const rows = await scalar('select public.escen_email_claim($1,25) as value', [lock]);
    assert.ok(rows.some(row => row.id === id && row.attempts === 1));
    assert.deepEqual(await scalar('select public.escen_email_claim($1,25) as value', [randomUUID()]), []);
    await assert.rejects(db.query("select public.escen_email_complete($1,$2,'ACCEPTED','provider-id')", [id, randomUUID()]), /absent|expiré/i);
    await assert.rejects(db.query("select public.escen_email_complete($1,$2,'FAILED',null,'NETWORK_AMBIGUOUS')", [id, lock]), /invalide/i);
    failedVersion = Number(await scalar("select public.escen_email_complete($1,$2,'FAILED',null,'PROVIDER_REJECTED') as value", [id, lock]));
  });
  await check('Mails : reprise motivée réservée à IT, année et version contrôlées', async () => {
    const retry = (actor, role, selectedYear, version, reason = 'Expéditeur corrigé') => db.query('select public.escen_email_retry($1,$2,$3,$4,$5,$6)', [actor, role, selectedYear, id, version, reason]);
    await assert.rejects(retry(dg, 'DG', year.id, failedVersion), /refusé/i);
    await assert.rejects(retry(it, 'IT', nextYear.id, failedVersion), /hors année/i);
    await assert.rejects(retry(it, 'IT', year.id, failedVersion, '  '), /motif/i);
    await retry(it, 'IT', year.id, failedVersion);
    await assert.rejects(retry(it, 'IT', year.id, failedVersion), /modifié/i);
    const claimed = await scalar('select public.escen_email_claim($1,25) as value', [lock]);
    assert.equal(claimed.find(row => row.id === id).attempts, 2);
    await scalar("select public.escen_email_complete($1,$2,'ACCEPTED','provider-reference') as value", [id, lock]);
    assert.equal(await scalar('select status as value from escen.email_outbox where id=$1', [id]), 'ACCEPTED');
    await assert.rejects(retry(it, 'IT', year.id, failedVersion + 3), /non reprenable/i);
  });
  await check('Mails : expiration ou réponse incertaine sans renvoi automatique', async () => {
    const expired = await enqueue('email-expired'), ambiguous = await enqueue('email-ambiguous');
    await scalar('select public.escen_email_claim($1,25) as value', [lock]);
    await db.query("update escen.email_outbox set locked_until=clock_timestamp()-interval '1 second' where id=$1", [expired]);
    await scalar("select public.escen_email_complete($1,$2,'UNKNOWN',null,'NETWORK_AMBIGUOUS') as value", [ambiguous, lock]);
    assert.deepEqual(await scalar('select public.escen_email_claim($1,25) as value', [randomUUID()]), []);
    assert.equal(await scalar('select last_error_code as value from escen.email_outbox where id=$1', [expired]), 'LEASE_EXPIRED');
    for (const row of [expired, ambiguous]) {
      const version = await scalar('select version as value from escen.email_outbox where id=$1', [row]);
      await assert.rejects(db.query("select public.escen_email_retry($1,'IT',$2,$3,$4,'Reprise interdite')", [it, year.id, row, version]), /non reprenable/i);
    }
  });
  await check('Mails : rollback transactionnel, audit et révision métier préservée', async () => {
    const before = await scalar('select revision as value from escen_private.portal_revision');
    const audits = await scalar("select count(*)::int as value from escen_private.audit_events where table_name='email_outbox'");
    await db.exec('begin');
    const rolledBack = await enqueue('email-rollback');
    await db.exec('rollback');
    assert.equal(await scalar('select count(*)::int as value from escen.email_outbox where id=$1', [rolledBack]), 0);
    await enqueue('email-audited');
    assert.equal(await scalar('select revision as value from escen_private.portal_revision'), before);
    assert.equal(await scalar("select count(*)::int as value from escen_private.audit_events where table_name='email_outbox'"), audits + 1);
  });
}
