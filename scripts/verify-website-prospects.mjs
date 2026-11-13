import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDatabase, applyMigrations } from './database-engine.mjs';

const db = createDatabase();
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
try {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await applyMigrations(db);
  const year = await scalar("insert into escen.academic_years(code,name,starts_on,ends_on,status) values('PROSPECTS-TEST','Année des prospects','2030-09-01','2031-08-31','OUVERTE') returning id as value");
  await db.exec("select set_config('escen.year_lifecycle','yes',false);");
  await db.query('update escen.academic_working_year set academic_year_id=$1 where singleton', [year]);
  await db.exec("select set_config('escen.year_lifecycle','',false);");
  const person = await scalar("insert into escen.people(firstname,lastname) values('Recette','Prospects') returning id as value");
  const account = await scalar('insert into escen.accounts(person_id,auth_user_id,active) values($1,$2,true) returning id as value', [person, randomUUID()]);
  await db.query("insert into escen.role_grants(account_id,role_id,granted_by,valid_from,reason) select $1,id,$1,'2020-01-01','Recette locale prospects' from escen.roles where code in ('IT','CC','STUD')", [account]);
  const create = id => scalar('select public.escen_website_prospect_create($1,$2,$3,$4) as value', [id, ' Visiteur ESCEN ', 'VISITEUR@example.test', '+228 90 00 00 00']);
  const id = randomUUID();
  assert.deepEqual(await create(id), { received: true });
  assert.deepEqual(await create(id), { received: true });
  assert.equal(await scalar('select count(*)::int as value from escen.website_prospects'), 1);
  const stored = await scalar('select to_jsonb(p) as value from escen.website_prospects p where id=$1', [id]);
  assert.equal(stored.full_name, 'Visiteur ESCEN'); assert.equal(stored.email, 'visiteur@example.test');
  assert.equal(stored.academic_year_id, year); assert.equal('formation' in stored, false);
  assert.equal(await scalar("select count(*)::int as value from escen_private.audit_events where table_name='website_prospects' and entity_id=$1", [id]), 1);
  assert.equal(await scalar("select public.escen_backend_snapshot() #> '{tables,website_prospects}' as value"), null);
  const page = (role, before, limit = 2, selectedYear = year) => scalar('select public.escen_website_prospects_page($1,$2,$3,$4,$5,$6) as value', [account, role, selectedYear, before?.created_at || null, before?.id || null, limit]);
  assert.equal((await page('CC')).length, 1);
  await assert.rejects(page('STUD'), error => error.code === '42501');
  await assert.rejects(page('IT', null, 101), error => error.code === '23514');
  await assert.rejects(db.query('select public.escen_website_prospect_create($1,$2,$3,$4)', [randomUUID(), 'V', 'bad', 'a']), error => error.code === '23514');
  await create(randomUUID()); await create(randomUUID());
  const first = await page('IT'); const second = await page('IT', first.at(-1));
  assert.equal(first.length, 2); assert.equal(second.length, 1);
  assert.equal(new Set([...first, ...second].map(row => row.id)).size, 3);
  assert.deepEqual(await page('IT', null, 2, randomUUID()), []);
  assert.deepEqual((await scalar("select array_agg(r.code::text order by r.code) as value from escen.role_permissions rp join escen.roles r on r.id=rp.role_id join escen.permissions p on p.id=rp.permission_id where p.code='website.prospect.view'")), ['CC','DG','DGA','IT','MKT']);
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar('select has_table_privilege($1,\'escen.website_prospects\',\'SELECT\') as value', [role]), false);
    assert.equal(await scalar('select has_function_privilege($1,\'public.escen_website_prospect_create(uuid,text,text,text)\',\'EXECUTE\') as value', [role]), false);
    assert.equal(await scalar('select has_function_privilege($1,\'public.escen_website_prospects_page(uuid,text,uuid,timestamptz,uuid,integer)\',\'EXECUTE\') as value', [role]), false);
  }
  assert.equal(await scalar("select has_function_privilege('service_role','public.escen_backend_snapshot_before_website_prospects()','EXECUTE') as value"), false);
  await db.exec('set role service_role;');
  assert.deepEqual(await create(randomUUID()), { received: true });
  assert.equal((await page('IT')).length, 2);
  await db.exec('reset role;');
  console.log('✓ Prospects : persistance, validation, audit, déduplication, pagination, année, permissions et isolation du snapshot');
} finally { await db.close(); }
