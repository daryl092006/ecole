import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createDatabase } from './database-engine.mjs';

const migration = '202611180112_customer_finance_permissions.sql';
const db = createDatabase();
const required = ['finance.report.view', 'finance.view', 'payment.record'];
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
const rolePermissions = async code => (await db.query(`select p.code from escen.role_permissions rp
  join escen.roles r on r.id=rp.role_id join escen.permissions p on p.id=rp.permission_id
  where r.code=$1 order by p.code`, [code])).rows.map(row => row.code);
try {
  await db.exec('create schema auth; create table auth.users(id uuid primary key);');
  const directory = new URL('../supabase/migrations/', import.meta.url);
  // Reproduce the production drift without rewriting any historical migration.
  const omitted = '202611100100_grant_finance_permissions_to_charge_clientele.sql';
  const files = (await readdir(directory)).filter(name => name.endsWith('.sql') && name < migration).sort();
  assert(files.includes(omitted));
  for (const file of files.filter(name => name !== omitted)) await db.exec(await readFile(new URL(file, directory), 'utf8'));
  const auth = randomUUID();
  await db.query('insert into auth.users(id) values($1)', [auth]);
  const person = await scalar("insert into escen.people(firstname,lastname) values('Clientèle','Recette') returning id as value");
  const account = await scalar('insert into escen.accounts(person_id,auth_user_id,active) values($1,$2,true) returning id as value', [person, auth]);
  await db.query(`insert into escen.role_grants(account_id,role_id,granted_by,valid_from,reason)
    select $1,id,$1,'2020-01-01','Recette locale du rôle clientèle' from escen.roles where code='CC'`, [account]);
  const before = await rolePermissions('CC');
  assert(required.every(code => !before.includes(code)), 'La recette doit reproduire les trois droits manquants');
  const otherRoles = await db.query(`select rp.* from escen.role_permissions rp join escen.roles r on r.id=rp.role_id where r.code<>'CC' order by rp.id`);
  const grants = await db.query('select * from escen.role_grants order by id');
  const auditBefore = await scalar("select count(*)::int as value from escen_private.audit_events where table_name='role_permissions'");
  const sql = await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8');
  await db.exec(sql);
  assert.deepEqual(await rolePermissions('CC'), [...before, ...required].sort());
  assert.deepEqual(await db.query(`select rp.* from escen.role_permissions rp join escen.roles r on r.id=rp.role_id where r.code<>'CC' order by rp.id`), otherRoles);
  assert.deepEqual(await db.query('select * from escen.role_grants order by id'), grants);
  const session = await scalar('select public.escen_account_session($1) as value', [auth]);
  const effective = session.permissions.filter(p => p.role_code === 'CC').map(p => p.permission_code);
  assert(required.every(code => effective.includes(code)));
  assert(!effective.some(code => ['payment.cancel', 'payment.refund', 'user.manage'].includes(code)));
  assert.equal(await scalar("select count(*)::int as value from escen_private.audit_events where table_name='role_permissions'"), auditBefore + 3);
  await db.exec(sql);
  assert.deepEqual(await rolePermissions('CC'), [...before, ...required].sort());
  assert.equal(await scalar("select count(*)::int as value from escen_private.audit_events where table_name='role_permissions'"), auditBefore + 3);
  console.log('Clientèle : trois droits financiers effectifs, autres rôles et attributions conservés, audit et idempotence vérifiés.');
} catch (error) { console.error(error.message); process.exitCode = 1; } finally { await db.close(); }
