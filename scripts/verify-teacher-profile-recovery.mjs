import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import { createDatabase, applyMigrations } from './database-engine.mjs';
import { buildRecoveryPlan, recoverySql, validateRecoveryPlan } from './teacher-profile-recovery.mjs';

// Use the real requireAccount, replacing only Auth transport and PostgreSQL transport.
function localAuth(db) {
  const cache = new Map();
  const root = new URL('../src/', import.meta.url);
  const client = {
    auth: { getUser: async id => ({ data: { user: { id, app_metadata: {} } }, error: null }) },
    rpc: async (name, args) => {
      assert.equal(name, 'escen_account_session');
      return { data: (await db.query('select public.escen_account_session($1) as value', [args.p_auth_user_id])).rows[0].value, error: null };
    },
  };
  function load(url) {
    if (cache.has(url.href)) return cache.get(url.href).exports;
    const loaded = { exports: {} }; cache.set(url.href, loaded);
    const localRequire = createRequire(url);
    const requireModule = name => name === 'server-only' ? {}
      : name === '@/lib/supabase/server' ? { getSupabaseServerClient: () => client }
        : name.startsWith('@/') ? load(new URL(`${name.slice(2)}.ts`, root)) : localRequire(name);
    const code = ts.transpileModule(readFileSync(url, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: fileURLToPath(url) })(requireModule, loaded, loaded.exports);
    return loaded.exports;
  }
  return load(new URL('server/auth.ts', root));
}

async function seed(db, snapshot, plan) {
  await db.exec('create schema auth; create table auth.users(id uuid primary key);');
  await applyMigrations(db);
  const insert = async (table, rows, columns) => {
    if (!rows.length) return;
    // All identifiers come from the fixed lists below, never from the snapshot.
    await db.query(`insert into escen.${table} (${columns.join(',')}) select ${columns.join(',')} from jsonb_populate_recordset(null::escen.${table},$1)`, [JSON.stringify(rows)]);
  };
  const t = snapshot.tables;
  await insert('people', t.people.map((row, index) => ({ id: row.id, firstname: 'Identité locale', lastname: String(index), archived_at: row.archived_at ?? null })), ['id', 'firstname', 'lastname', 'archived_at']);
  for (const account of t.accounts) if (account.auth_user_id) await db.query('insert into auth.users values($1) on conflict do nothing', [account.auth_user_id]);
  await insert('accounts', t.accounts, ['id', 'person_id', 'auth_user_id', 'active', 'archived_at']);
  const roles = (await db.query('select id,code from escen.roles')).rows;
  const grants = t.role_grants.filter(row => t.accounts.some(account => account.id === row.account_id)).map(row => {
    if (row.site_id || row.group_id || row.academic_year_id) throw new Error('Cette recette exige un examen supplémentaire des périmètres non globaux.');
    return { ...row, role_id: roles.find(role => role.code === t.roles.find(source => source.id === row.role_id)?.code)?.id,
      granted_by: plan.actor.accountId, reason: 'Attribution de recette locale' };
  });
  await insert('role_grants', grants, ['id', 'account_id', 'role_id', 'granted_by', 'valid_from', 'valid_until', 'reason']);
  await insert('students', t.students.map((row, index) => ({ ...row, matricule: `LOCAL-${index}` })), ['id', 'person_id', 'matricule', 'archived_at']);
  await insert('staff', t.staff, ['id', 'person_id', 'employee_number', 'archived_at', 'reason']);
  await insert('teachers', t.teachers, ['id', 'staff_id', 'specialty', 'active', 'reason']);
  await db.query('update escen_private.portal_revision set revision=$1 where singleton', [plan.expectedRevision]);
}

export async function rehearseTeacherRecovery(snapshot, value) {
  const plan = validateRecoveryPlan(value);
  const db = createDatabase();
  let checks = 0;
  const check = async run => { await run(); checks++; };
  const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
  const state = async () => {
    const result = {};
    for (const table of ['people', 'accounts', 'role_grants', 'students', 'roles', 'role_permissions', 'permissions', 'staff_contracts', 'teaching_assignments']) {
      result[table] = (await db.query(`select * from escen.${table} order by id`)).rows;
    }
    return result;
  };
  try {
    await seed(db, snapshot, plan);
    const auth = localAuth(db);
    const session = account => auth.requireAccount(new Request('http://local.test/api/session', { headers: { authorization: `Bearer ${account.auth_user_id}` } }));
    const targets = snapshot.tables.accounts.filter(account => plan.targets.some(target => target.accountId === account.id));
    await check(async () => {
      for (const account of targets) await assert.rejects(session(account), /profil métier/);
    });
    const unchanged = await state();
    const beforeStaff = await scalar('select count(*)::integer as value from escen.staff');
    const beforeTeachers = await scalar('select count(*)::integer as value from escen.teachers');
    const counts = async () => (await db.query(`select
      (select count(*) from escen.staff) as staff, (select count(*) from escen.teachers) as teachers,
      (select count(*) from escen_private.audit_events) as audits,
      (select revision from escen_private.portal_revision where singleton) as revision`)).rows;
    const originalCounts = await counts();
    await check(async () => {
      await assert.rejects(db.exec(recoverySql({ ...plan, expectedRevision: plan.expectedRevision + 1 })), /CONCURRENT_UPDATE/);
      assert.deepEqual(await counts(), originalCounts);
    });
    await check(async () => {
      const corrupted = structuredClone(plan); corrupted.targets[18].personId = randomUUID();
      await assert.rejects(db.exec(recoverySql(corrupted)), /Identité ou attribution ENS modifiée/);
      assert.deepEqual(await counts(), originalCounts);
    });
    await check(async () => {
      const corrupted = structuredClone(plan); corrupted.actor = { ...plan.targets[0] };
      delete corrupted.actor.staffId; delete corrupted.actor.teacherId;
      // Keep a distinct account to test the SQL authorization rather than the plan validator.
      corrupted.actor.accountId = randomUUID();
      await assert.rejects(db.exec(recoverySql(corrupted)), /Auteur IT global non autorisé/);
      assert.deepEqual(await counts(), originalCounts);
    });
    await check(async () => {
      const member = { ...plan.targets[18] };
      await db.exec('begin');
      try {
        await db.query('insert into escen.staff(id,person_id,employee_number) values($1,$2,$3)', [member.staffId, member.personId, `INT-${member.staffId}`]);
        const withStaff = await counts();
        await db.exec('savepoint rejected_recovery');
        await assert.rejects(db.exec(recoverySql(plan)), /Dossier déjà présent/);
        await db.exec('rollback to rejected_recovery');
        assert.deepEqual(await counts(), withStaff);
      } finally { await db.exec('rollback'); }
      assert.deepEqual(await counts(), originalCounts);
    });
    return await finishRehearsal(db, snapshot, plan, { checks, beforeStaff, beforeTeachers, unchanged });
  } finally { await db.close(); }
}

async function finishRehearsal(db, snapshot, plan, initial) {
    const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
    const auditBefore = await scalar('select count(*)::integer as value from escen_private.audit_events');
    // A duplicate key on the final teacher insert must roll back all previous inserts and their audits.
    const failingSql = recoverySql(plan).replaceAll(plan.targets[18].teacherId, plan.targets[0].teacherId);
    await assert.rejects(db.exec(failingSql), /duplicate|unique/i);
    assert.equal(await scalar('select count(*)::integer as value from escen.staff'), initial.beforeStaff);
    assert.equal(await scalar('select count(*)::integer as value from escen.teachers'), initial.beforeTeachers);
    assert.equal(await scalar('select count(*)::integer as value from escen_private.audit_events'), auditBefore);
    assert.equal(Number(await scalar('select revision as value from escen_private.portal_revision where singleton')), plan.expectedRevision);
    await db.exec(recoverySql(plan));
    assert.equal(await scalar('select count(*)::integer as value from escen.staff'), initial.beforeStaff + 19);
    assert.equal(await scalar('select count(*)::integer as value from escen.teachers'), initial.beforeTeachers + 19);
    assert.equal(await scalar('select count(*)::integer as value from escen_private.audit_events'), auditBefore + 38);
    assert.equal(Number(await scalar('select revision as value from escen_private.portal_revision where singleton')), plan.expectedRevision + 1);
    for (const [table, rows] of Object.entries(initial.unchanged)) {
      assert.deepEqual((await db.query(`select * from escen.${table} order by id`)).rows, rows);
    }
    const auth = localAuth(db);
    let ready = 0;
    for (const account of snapshot.tables.accounts.filter(row => row.active)) {
      const result = await auth.requireAccount(new Request('http://local.test/api/session', { headers: { authorization: `Bearer ${account.auth_user_id}` } }));
      const target = plan.targets.find(row => row.accountId === account.id);
      if (target) assert.equal(result.context.teacherId, target.teacherId);
      ready++;
    }
    const afterAudit = await scalar('select count(*)::integer as value from escen_private.audit_events');
    await assert.rejects(db.exec(recoverySql(plan)), /CONCURRENT_UPDATE/);
    await assert.rejects(db.exec(recoverySql({ ...plan, expectedRevision: plan.expectedRevision + 1 })), /Dossier déjà présent/);
    assert.equal(await scalar('select count(*)::integer as value from escen_private.audit_events'), afterAudit);
    return { checks: initial.checks + 5, targets: 19, insertedStaff: 19, insertedTeachers: 19, auditEvents: 38, activeSessionsReady: ready, remoteWrites: 0 };
}

function fixture() {
  const role = code => ({ id: randomUUID(), code, name: { IT: 'Informaticien', ENS: 'Enseignant', STUD: 'Étudiant' }[code], active: true });
  const roles = ['IT', 'ENS', 'STUD'].map(role);
  const t = { people: [], accounts: [], roles, role_grants: [], staff: [], teachers: [], students: [],
    permissions: [{ id: randomUUID(), code: 'staff.manage' }], role_permissions: [] };
  t.role_permissions.push({ id: randomUUID(), role_id: roles[0].id, permission_id: t.permissions[0].id });
  for (let index = 0; index < 21; index++) {
    const person = { id: randomUUID(), firstname: 'Test', lastname: String(index), archived_at: null };
    const account = { id: randomUUID(), person_id: person.id, auth_user_id: randomUUID(), active: true, archived_at: null };
    t.people.push(person); t.accounts.push(account);
    t.role_grants.push({ id: randomUUID(), account_id: account.id, role_id: roles[index === 0 ? 0 : index === 20 ? 2 : 1].id,
      valid_from: '2020-01-01T00:00:00Z', valid_until: null, legacy_source_row_id: randomUUID() });
    if (index === 20) t.students.push({ id: randomUUID(), person_id: person.id, matricule: 'TEST', archived_at: null });
  }
  return { checkedAt: new Date().toISOString(), revision: 7, tables: t };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const snapshot = fixture();
  const plan = buildRecoveryPlan(snapshot, snapshot);
  const changed = structuredClone(snapshot); changed.tables.accounts[1].active = false;
  assert.throws(() => buildRecoveryPlan(changed, snapshot), /19 comptes/);
  const duplicate = structuredClone(plan); duplicate.targets[1] = duplicate.targets[0];
  assert.throws(() => validateRecoveryPlan(duplicate), /Doublon/);
  console.log('Régularisation enseignants :', JSON.stringify(await rehearseTeacherRecovery(snapshot, plan)));
}
