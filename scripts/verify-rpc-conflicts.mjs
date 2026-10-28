import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createDatabase } from './database-engine.mjs';

// Database isolated in memory. No Supabase credentials or network access.
const db = createDatabase();
const directory = new URL('../supabase/migrations/', import.meta.url);
const migration = '202610280055_rpc_conflict_codes.sql';
const pattern = /\berrcode\s*=\s*'40001'/gi;
const functions = async () => (await db.query(`
  select p.oid, n.nspname, p.proname, p.prosrc,
    p.proowner, p.proacl, p.prosecdef, p.proconfig, p.provolatile,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  join pg_language l on l.oid=p.prolang
  where n.nspname in ('public','escen','escen_private')
    and l.lanname='plpgsql' and p.prokind='f'
  order by p.oid
`)).rows;
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
const state = async () => ({
  revision: await scalar('select revision as value from escen_private.portal_revision where singleton'),
  audit: await scalar('select count(*)::int as value from escen_private.audit_events'),
  workingYear: await scalar('select public.escen_academic_year_context() as value'),
  people: await scalar('select count(*)::int as value from escen.people'),
});

try {
  await db.exec('create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role;');
  const files = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  assert.ok(files.includes(migration));
  for (const name of files.filter(name => name < migration)) {
    await db.exec(await readFile(new URL(name, directory), 'utf8'));
  }
  const authId = randomUUID();
  await db.query('insert into auth.users(id) values($1)', [authId]);
  const person = await scalar("insert into escen.people(firstname,lastname) values('Recette','Conflits RPC') returning id as value");
  const actor = await scalar('insert into escen.accounts(person_id,auth_user_id,active) values($1,$2,true) returning id as value', [person, authId]);
  await db.query(`insert into escen.role_grants(account_id,role_id,granted_by,valid_from,reason)
    select $1,id,$1,'2020-01-01','Recette locale des conflits' from escen.roles where code='IT'`, [actor]);
  const before = await functions();
  const affected = before.filter(row => /\berrcode\s*=\s*'40001'/i.test(row.prosrc));
  assert.ok(affected.length >= 14, `Inventaire incomplet : ${affected.length}`);
  const beforeState = await state();
  const sql = await readFile(new URL(migration, directory), 'utf8');
  await db.exec(sql);
  assert.deepEqual(await state(), beforeState, 'La migration ne doit modifier aucune donnée métier ni révision');
  const after = await functions();
  assert.equal(after.length, before.length);
  for (let index = 0; index < before.length; index++) {
    const original = before[index];
    const updated = after[index];
    assert.equal(updated.definition, original.definition.replace(pattern, match => match.replace("'40001'", "'PT409'")), original.proname);
    for (const field of ['oid','proowner','proacl','prosecdef','proconfig','provolatile']) {
      assert.deepEqual(updated[field], original[field], `${original.proname} : ${field} doit rester identique`);
    }
    assert.doesNotMatch(updated.prosrc, /\berrcode\s*=\s*'40001'/i);
  }
  console.log(`✓ ${affected.length} fonctions corrigées ; définitions, droits, propriétaires et paramètres préservés`);

  const annualCommand = revision => db.query("select public.escen_academic_year_command($1,'IT','current',null,$2,'Conflit de révision de recette')", [actor, revision]);
  const rejectConflict = async (command, message) => {
    const previous = await state();
    await assert.rejects(command(), error => error.code === 'PT409' && message.test(error.message));
    assert.deepEqual(await state(), previous, 'Un conflit ne doit modifier ni données, ni audit, ni révision');
  };
  await rejectConflict(() => annualCommand(beforeState.revision - 1), /Modification concurrente/);
  await db.query('set role service_role');
  await assert.rejects(annualCommand(beforeState.revision - 1), error => error.code === 'PT409');
  await db.exec('reset role');
  const changes = JSON.stringify([{ table: 'people', operation: 'update', record: { id: person, firstname: 'Ne doit pas changer' } }]);
  await rejectConflict(() => db.query('select public.escen_backend_transaction($1,$2,$3::jsonb)', [actor, beforeState.revision - 1, changes]), /CONCURRENT_UPDATE/);
  assert.equal(await scalar('select firstname as value from escen.people where id=$1', [person]), 'Recette');
  console.log('✓ Révisions périmées : PT409 immédiat, message conservé, aucune mutation ni audit partiel');

  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(annualCommand(beforeState.revision), error => error.code === '42501');
    await db.exec('reset role');
  }
  const unauthorized = randomUUID();
  await assert.rejects(db.query("select public.escen_academic_year_command($1,'IT','current',null,$2,'Acteur non autorisé')", [unauthorized, beforeState.revision]), error => error.code === '42501');
  await annualCommand(beforeState.revision);
  assert.equal((await state()).revision, beforeState.revision + 1);
  console.log('✓ Autorisations conservées ; commande valide toujours acceptée avec une seule révision');

  const afterSuccess = await functions();
  const stateAfterSuccess = await state();
  await db.exec(sql);
  assert.deepEqual(await functions(), afterSuccess);
  assert.deepEqual(await state(), stateAfterSuccess);
  console.log('✓ Réexécution sans modification supplémentaire ; migration idempotente');
} finally {
  await db.close();
}
