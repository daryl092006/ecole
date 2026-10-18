import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function verifyBlockedPeriodReasons(db, check) {
  const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;
  const revision = () => scalar('select revision as value from escen_private.portal_revision where singleton');
  const audits = () => scalar('select count(*)::integer as value from escen_private.audit_events');
  const token = randomUUID();
  await db.query('insert into auth.users(id) values ($1)', [token]);
  const person = await scalar("insert into escen.people(firstname,lastname) values('Audit','Planning') returning id as value");
  const actor = await scalar('insert into escen.accounts(person_id,auth_user_id,active) values($1,$2,true) returning id as value', [person, token]);
  const command = async (operation, record) => scalar('select public.escen_backend_transaction($1,$2,$3::jsonb) as value', [actor, await revision(), JSON.stringify([{ table: 'blocked_periods', operation, record }])]);
  const period = reason => ({ id: randomUUID(), name: 'Période de recette locale', kind: 'FERMETURE', starts_at: '2999-12-24T00:00:00Z', ends_at: '2999-12-25T00:00:00Z', reason });
  let id;

  await check('Périodes bloquées : motif nullable pour les lignes historiques, sans motif inventé', async () => {
    const record = period(null);
    await command('insert', record);
    assert.equal(await scalar('select reason as value from escen.blocked_periods where id=$1', [record.id]), null);
    assert.equal(await scalar("select data_type as value from information_schema.columns where table_schema='escen' and table_name='blocked_periods' and column_name='reason'"), 'text');
  });
  await check('Périodes bloquées : création motivée, auteur et révision conservés par la transaction existante', async () => {
    const record = period('Fermeture validée pour entretien');
    id = record.id;
    const before = await revision();
    assert.equal(await command('insert', record), before + 1);
    const audit = (await db.query("select * from escen_private.audit_events where table_name='blocked_periods' and entity_id=$1", [id])).rows[0];
    assert.equal(audit.actor_id, actor);
    assert.equal(audit.reason, record.reason);
    assert.equal(audit.new_value.reason, record.reason);
    assert.equal(audit.old_value, null);
  });
  await check('Périodes bloquées : modification avec motif et avant/après audités', async () => {
    await command('update', { id, reason: 'Motif précisé après vérification' });
    const audit = (await db.query("select * from escen_private.audit_events where table_name='blocked_periods' and entity_id=$1 and action='UPDATE'", [id])).rows[0];
    assert.equal(audit.actor_id, actor);
    assert.equal(audit.old_value.reason, 'Fermeture validée pour entretien');
    assert.equal(audit.new_value.reason, 'Motif précisé après vérification');
    assert.equal(audit.reason, audit.new_value.reason);
  });
  await check('Périodes bloquées : motifs invalides refusés sans ligne, audit ni révision partiels', async () => {
    const before = await revision(); const auditCount = await audits();
    for (const reason of ['', '  ab  ', 'x'.repeat(1001)]) {
      const record = period(reason);
      await assert.rejects(command('insert', record), /blocked_period_reason_length/);
      await assert.rejects(command('update', { id, reason }), /blocked_period_reason_length/);
      assert.equal(await scalar('select count(*)::integer as value from escen.blocked_periods where id=$1', [record.id]), 0);
    }
    assert.equal(await revision(), before);
    assert.equal(await audits(), auditCount);
    assert.equal(await scalar('select reason as value from escen.blocked_periods where id=$1', [id]), 'Motif précisé après vérification');
  });
}
