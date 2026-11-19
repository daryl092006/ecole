import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createDatabase,applyMigrations} from '../../scripts/database-engine.mjs';
const db=createDatabase();
try {
 await db.exec('create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role;');
 await applyMigrations(db,{before:'202611190118_optimize_campus_snapshot_assembly.sql'});
 const original=(await db.query("select pg_get_functiondef('public.escen_backend_snapshot_before_level_documents()'::regprocedure) definition")).rows[0].definition;
 const acl=async()=>(await db.query("select proacl,prosecdef,proconfig,proowner from pg_proc where oid='public.escen_backend_snapshot_before_level_documents()'::regprocedure")).rows[0];
 const beforeAcl=await acl();
 // Charge volumineuse isolée en mémoire, sans données personnelles.
 for(let i=0;i<35;i++) await db.exec(`create table escen.perf_fixture_${i}(id integer, value text); insert into escen.perf_fixture_${i} select n,repeat('x',3000) from generate_series(1,20) n;`);
 const read=async()=>{const start=performance.now();const snapshot=(await db.query('select public.escen_backend_snapshot() snapshot')).rows[0].snapshot;return{snapshot,ms:Math.round(performance.now()-start)};};
 const baseline=await read();
 await db.exec(await readFile(new URL('../../supabase/migrations/202611190118_optimize_campus_snapshot_assembly.sql',import.meta.url),'utf8'));
 const optimized=await read();
 assert.deepEqual(optimized.snapshot,baseline.snapshot);
 assert.deepEqual(await acl(),beforeAcl);
 for(const table of ['website_galleries','email_outbox','website_prospects','teacher_digital_access','application_events']) assert.equal(table in optimized.snapshot.tables,false,table);
 await db.exec('set role anon');await assert.rejects(db.query('select public.escen_backend_snapshot()'),e=>e.code==='42501');await db.exec('reset role');
 await db.exec('set role authenticated');await assert.rejects(db.query('select public.escen_backend_snapshot()'),e=>e.code==='42501');await db.exec('reset role');
 await db.exec('set role service_role');await db.query('select public.escen_backend_snapshot()');await db.exec('reset role');
 await db.exec(original);
 const restored=await read();assert.deepEqual(restored.snapshot,baseline.snapshot);
 const report={baselineMs:baseline.ms,optimizedMs:optimized.ms,restoredMs:restored.ms,bytes:JSON.stringify(baseline.snapshot).length,tables:Object.keys(baseline.snapshot.tables).length,checks:'Snapshots identiques ; ACL, propriétaire et SECURITY DEFINER préservés ; tables sensibles exclues ; accès navigateur refusé ; accès serveur autorisé ; restauration testée.'};
 await writeFile(new URL('./results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await db.close();}
