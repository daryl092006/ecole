import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createDatabase, applyMigrations } from './database-engine.mjs';

const db = createDatabase();
const migration = '202611160110_teacher_digital_access.sql';
const scalar = async (sql, values = []) => (await db.query(sql, values)).rows[0].value;
try {
  await db.exec('create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role;');
  await applyMigrations(db, { before: migration });
  const legacyPerson = await scalar("insert into escen.people(firstname,lastname) values('Ancien','Enseignant') returning id as value");
  const legacyStaff = await scalar("insert into escen.staff(person_id,employee_number) values($1,'LEGACY-TEACHER') returning id as value", [legacyPerson]);
  const legacyTeacher = await scalar('insert into escen.teachers(staff_id) values($1) returning id as value', [legacyStaff]);
  // Reproduce Supabase defaults rather than assuming a PostgreSQL installation without browser grants.
  await db.exec('alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema escen grant execute on functions to anon, authenticated; alter default privileges in schema escen_private grant execute on functions to anon, authenticated; alter default privileges in schema escen grant all on tables to anon, authenticated;');
  await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
  assert.equal(await scalar("select has_function_privilege('anon','public.escen_backend_snapshot()','EXECUTE') as value"), true);
  const hardening = await readFile(new URL('../supabase/migrations/202611160111_teacher_access_rpc_privileges.sql', import.meta.url), 'utf8');
  await db.exec(hardening);
  await db.exec(hardening); // An already hardened deployment remains safe on a repeated application.
  assert.equal(await scalar('select email as value from escen.people where id=$1', [legacyPerson]), null);
  assert.equal(await scalar('select count(*)::int as value from escen.teachers where id=$1', [legacyTeacher]), 1);
  const person = await scalar("insert into escen.people(firstname,lastname) values('Nouveau','Enseignant') returning id as value");
  const staff = await scalar("insert into escen.staff(person_id,employee_number) values($1,'NEW-TEACHER') returning id as value", [person]);
  for (const email of [null, '', 'invalide', 'prof@escen.university']) {
    await db.query('update escen.people set email=$1 where id=$2', [email, person]);
    await assert.rejects(db.query('insert into escen.teachers(staff_id) values($1)', [staff]), /e-mail personnel/i);
  }
  await db.query('update escen.people set email=$1 where id=$2', ['prof@example.test', person]);
  const teacher = await scalar('insert into escen.teachers(staff_id) values($1) returning id as value', [staff]);
  const auth = randomUUID();
  await db.query('insert into auth.users values($1)', [auth]);
  const actor = await scalar('insert into escen.accounts(person_id,auth_user_id,active) values($1,$2,true) returning id as value', [legacyPerson, auth]);
  await db.query("insert into escen.role_grants(account_id,role_id,granted_by,valid_from,reason) select $1,id,$1,now(),'Recette accès enseignants' from escen.roles where code='IT'", [actor]);
  const request = await scalar('select public.escen_teacher_digital_access_request($1,$2,$3) as value', [actor, teacher, 'Création des accès demandée']);
  assert.equal(await scalar('select public.escen_teacher_digital_access_request($1,$2,$3) as value', [actor, teacher, 'Nouvelle tentative identique']), request);
  await assert.rejects(db.query('select public.escen_teacher_digital_access_request($1,$2,$3)', [randomUUID(), teacher, 'Auteur non autorisé']), /accès global/i);
  assert.equal(await scalar("select relrowsecurity as value from pg_class where oid='escen.teacher_digital_access'::regclass"), true);
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar("select has_function_privilege($1,'public.escen_backend_snapshot()','EXECUTE') as value", [role]), false);
    assert.equal(await scalar("select has_function_privilege($1,'public.escen_teacher_digital_access_request(uuid,uuid,text)','EXECUTE') as value", [role]), false);
    assert.equal(await scalar("select has_function_privilege($1,'public.escen_backend_snapshot_before_teacher_access()','EXECUTE') as value", [role]), false);
    assert.equal(await scalar("select has_function_privilege($1,'escen.request_teacher_digital_access(uuid,uuid,text)','EXECUTE') as value", [role]), false);
    assert.equal(await scalar("select has_table_privilege($1,'escen.teacher_digital_access','SELECT') as value", [role]), false);
  }
  assert.equal(await scalar("select has_function_privilege('service_role','public.escen_teacher_digital_access_request(uuid,uuid,text)','EXECUTE') as value"), true);
  const snapshot = await scalar('select public.escen_backend_snapshot() as value');
  assert.equal(snapshot.tables.teacher_digital_access, undefined);
  const audit = (await db.query("select actor_id,new_value from escen_private.audit_events where table_name='teacher_digital_access' and entity_id=$1", [request])).rows;
  assert.equal(audit.length, 1);
  assert.equal(audit[0].actor_id, actor);
  assert.equal(audit[0].new_value.personal_email, 'prof@example.test');
  assert.equal(JSON.stringify(audit).includes('password'), false);
  console.log('Accès enseignants SQL : e-mail personnel obligatoire, historique préservé, demande unique, permissions, RLS, audit et snapshot privé vérifiés.');
} finally { await db.close(); }
