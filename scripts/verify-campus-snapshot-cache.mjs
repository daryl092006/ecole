import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createDatabase,applyMigrations} from './database-engine.mjs';
const db=createDatabase();
const snapshot=async()=>(await db.query('select public.escen_backend_snapshot() value')).rows[0].value;
const cache=async()=>(await db.query('select revision,refreshed_at from escen_private.campus_snapshot_cache')).rows[0];
try{
 await db.exec('create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role;');
 await applyMigrations(db,{before:'202611190119_shared_campus_snapshot_cache.sql'});
 const auth=(await db.query('insert into auth.users(id) values(gen_random_uuid()) returning id')).rows[0];
 const person=(await db.query("insert into escen.people(firstname,lastname) values('Acteur cache','Recette') returning id")).rows[0];
 const actor=(await db.query('insert into escen.accounts(person_id,auth_user_id,active) values($1,$2,true) returning id',[person.id,auth.id])).rows[0];
 await db.query("insert into escen.role_grants(account_id,role_id,granted_by,valid_from,reason) select $1,id,$1,'2020-01-01','Recette du cache' from escen.roles where code='IT'",[actor.id]);
 const before=await snapshot();
 const previousRevision=before.revision;
 const auditCount=(await db.query('select count(*)::int n from escen_private.audit_events')).rows[0].n;
 const sql=await readFile(new URL('../supabase/migrations/202611190119_shared_campus_snapshot_cache.sql',import.meta.url),'utf8');
 await db.exec(sql);
 assert.deepEqual(await snapshot(),before);
 const first=await cache();await snapshot();assert.deepEqual(await cache(),first);
 assert.equal((await db.query('select count(*)::int n from escen_private.audit_events')).rows[0].n,auditCount);
 assert.equal((await snapshot()).revision,previousRevision);
 await db.query('select public.escen_backend_transaction($1,$2,$3::jsonb)',[
  actor.id,previousRevision,JSON.stringify([{table:'people',operation:'insert',record:{id:randomUUID(),firstname:'Recette cache',lastname:'Profil neuf'}}]),
 ]);
 const updated=await snapshot();assert.equal(updated.revision,previousRevision+1);
 assert.ok(updated.tables.people.some(p=>p.firstname==='Recette cache'));
 assert.deepEqual(updated,(await db.query('select public.escen_backend_snapshot_before_shared_cache() value')).rows[0].value);
 await db.exec("update escen_private.campus_snapshot_cache set refreshed_at=clock_timestamp()-interval '31 seconds'");
 const expired=await cache();await snapshot();assert.notEqual(String((await cache()).refreshed_at),String(expired.refreshed_at));
 await db.exec('truncate escen_private.campus_snapshot_cache');assert.deepEqual(await snapshot(),updated);
 for(const role of ['anon','authenticated','service_role']){
  await db.exec(`set role ${role}`);
  await assert.rejects(db.query('select snapshot from escen_private.campus_snapshot_cache'),e=>e.code==='42501');
  await assert.rejects(db.query('select public.escen_backend_snapshot_before_shared_cache()'),e=>e.code==='42501');
  if(role==='service_role')await snapshot();else await assert.rejects(snapshot(),e=>e.code==='42501');
  await db.exec('reset role');
 }
 const relation=(await db.query("select relpersistence,relrowsecurity from pg_class where oid='escen_private.campus_snapshot_cache'::regclass")).rows[0];
 assert.equal(relation.relpersistence,'u');assert.equal(relation.relrowsecurity,true);
 for(const table of ['teacher_digital_access','website_prospects','website_galleries','email_outbox'])assert.equal(table in updated.tables,false);
 const result={checks:'Résultat inchangé ; cache réutilisé ; nouvelle révision visible immédiatement ; expiration et reconstruction après vidage ; RLS et droits serveur/navigateur ; exclusions sensibles ; aucune mutation métier par installation.',remoteWrites:0};
 console.log(result);
}finally{await db.close();}
