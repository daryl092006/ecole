import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDatabase,applyMigrations} from '../../scripts/database-engine.mjs';
const db=createDatabase();
try{
 await db.exec('create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role;');
 await applyMigrations(db);
 await db.exec(await readFile(new URL('../../docs/sql-proposals/20261119_exam_strict_mode.sql',import.meta.url),'utf8'));
 assert.equal((await db.query("select activated_at::text value from escen_private.exam_integrity_activation where singleton")).rows[0].value,'infinity');
 const snapshot=(await db.query('select public.escen_backend_snapshot() value')).rows[0].value;
 assert.equal('exam_integrity_events' in snapshot.tables,false);
 const column=(await db.query("select column_default,is_nullable from information_schema.columns where table_schema='escen' and table_name='exam_attempts' and column_name='strict_mode'")).rows[0];
 assert.equal(column.is_nullable,'NO');assert.equal(column.column_default,'false');
 for(const role of ['anon','authenticated']){
  await db.exec(`set role ${role}`);
  await assert.rejects(db.query('select * from escen.exam_integrity_events'),e=>e.code==='42501');
  await assert.rejects(db.query("select public.escen_start_online_exam_checked(gen_random_uuid(),'STUD',gen_random_uuid(),true)"),e=>e.code==='42501');
  await assert.rejects(db.query("select public.escen_record_exam_integrity_events(gen_random_uuid(),'STUD',gen_random_uuid(),'[]')"),e=>e.code==='42501');
  await db.exec('reset role');
 }
 await db.exec('set role service_role');
 await assert.rejects(db.query("select public.escen_start_online_exam_checked(gen_random_uuid(),'IT',gen_random_uuid(),true)"),e=>e.code==='42501');
 await assert.rejects(db.query("select public.escen_record_exam_integrity_events(gen_random_uuid(),'STUD',gen_random_uuid(),'[]')"),e=>e.code==='42501');
 await db.exec('reset role');
 const activation=await readFile(new URL('../../docs/sql-proposals/20261119_activate_exam_strict_mode.sql',import.meta.url),'utf8');
 await db.exec(activation);
 const activated=(await db.query('select activated_at from escen_private.exam_integrity_activation where singleton')).rows[0].activated_at;
 await db.exec(activation);
 assert.deepEqual((await db.query('select activated_at from escen_private.exam_integrity_activation where singleton')).rows[0].activated_at,activated);
 console.log('SQL appliqué localement ; journal exclu du snapshot ; colonnes et droits navigateur/serveur vérifiés ; IT refusé sur le parcours personnel.');
}finally{await db.close();}
