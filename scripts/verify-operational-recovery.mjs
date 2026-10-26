import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createDatabase, applyMigrations } from './database-engine.mjs';
import { buildOperationalReferences, operationalReferenceSql, operationalTables } from './lib/operational-recovery.mjs';

/** Replays the actual additive lot on its actual reference rows, using all current SQL guards. */
export async function rehearseOperationalReferences({ plan, snapshot, index, baseline }) {
  const db = createDatabase();
  let checks = 0;
  const check = async work => { await work(); checks++; };
  try {
    await applyMigrations(db);
    const t = snapshot.tables;
    const insert = async (table, records) => {
      for (const row of records) {
        const columns = Object.keys(row);
        assert.ok(columns.every(column => /^[a-z_]+$/.test(column)));
        await db.query(`insert into escen.${table}(${columns.join(',')}) select ${columns.join(',')} from jsonb_populate_record(null::escen.${table},$1)`, [JSON.stringify(row)]);
      }
    };
    await insert('people', t.people);
    await insert('accounts', t.accounts.map(row => { const copy = { ...row }; delete copy.account_type; return copy; }));
    const localRoles = (await db.query('select id,code from escen.roles')).rows;
    const actorGrant = t.role_grants.find(grant => grant.id === plan.actorGrantId);
    await insert('role_grants', [{ ...actorGrant, role_id: localRoles.find(role => role.code === 'IT').id,
      legacy_source_row_id: null, granted_by: plan.actorId, reason: 'Auteur IT de la recette locale' }]);
    const batch = index.batches.find(row => row.sql_sha256 === baseline.sql_sha256);
    await db.query('insert into escen_private.import_batches(id,source_name,archive_sha256,sql_sha256,source_rows) values($1,$2,$3,$4,$5)', [batch.id, batch.source_name, batch.archive_sha256, batch.sql_sha256, batch.source_rows]);
    for (const level of t.levels) {
      if (!level.legacy_source_row_id) continue;
      const mapping = index.mappings.find(row => row.row_id === level.legacy_source_row_id);
      const source = baseline.tables[mapping.source_table].find(row => String(row.id) === mapping.source_id);
      await db.query('insert into escen_private.legacy_rows(id,batch_id,source_table,source_id,payload) values($1,$2,$3,$4,$5)', [mapping.row_id, batch.id, mapping.source_table, mapping.source_id, JSON.stringify(source)]);
    }
    for (const table of ['academic_years', 'levels', 'programs', 'students', 'staff', 'teachers', 'subjects', 'annual_fee_schedules']) await insert(table, t[table]);
    await db.query('update escen_private.portal_revision set revision=$1 where singleton', [plan.expectedRevision]);
    const state = async () => {
      const result = {};
      for (const table of [...operationalTables, 'accounts']) result[table] = (await db.query(`select * from escen.${table} order by id`)).rows;
      for (const table of ['portal_revision', 'audit_events', 'import_batches', 'legacy_rows', 'source_mappings', 'import_runs']) result[table] = (await db.query(`select * from escen_private.${table} order by 1`)).rows;
      return result;
    };
    const before = await state();
    await check(async () => {
      await assert.rejects(db.exec(operationalReferenceSql({ ...plan, expectedRevision: plan.expectedRevision + 1 })), /CONCURRENT_UPDATE/);
      assert.deepEqual(await state(), before);
    });
    await check(async () => {
      await assert.rejects(db.exec(operationalReferenceSql({ ...plan, actorGrantId: plan.actorId })), /Auteur IT global non autorisé/);
      assert.deepEqual(await state(), before);
    });
    await check(async () => {
      const bad = structuredClone(plan);
      bad.changes.push({ table: 'teachers', operation: 'insert', record: { id: plan.batchId, staff_id: plan.batchId, reason: 'Échec tardif de recette' } });
      await assert.rejects(db.exec(operationalReferenceSql(bad)), /foreign key|clé étrangère/i);
      assert.deepEqual(await state(), before);
    });
    await check(async () => {
      await db.exec(operationalReferenceSql(plan));
      for (const table of operationalTables) assert.equal(Number((await db.query(`select count(*) as n from escen.${table}`)).rows[0].n), before[table].length + plan.counts[table]);
      assert.equal(Number((await db.query('select revision from escen_private.portal_revision where singleton')).rows[0].revision), plan.expectedRevision + 1);
      assert.deepEqual((await db.query('select * from escen.accounts order by id')).rows, before.accounts);
      const audits = (await db.query('select * from escen_private.audit_events where entity_id=any($1::uuid[])', [plan.changes.map(change => change.record.id)])).rows;
      assert.equal(audits.length, plan.changes.length);
      assert.ok(audits.every(row => row.actor_id === plan.actorId && row.action === 'INSERT'));
      assert.equal(Number((await db.query('select count(*) as n from escen_private.legacy_rows where batch_id=$1', [plan.batchId])).rows[0].n), plan.sourceRows.length);
      assert.equal(Number((await db.query('select count(*) as n from escen_private.legacy_rows where batch_id=$1 and status=\'ARCHIVE_ONLY\'', [plan.batchId])).rows[0].n), 0);
    });
    await check(async () => {
      const applied = await state();
      await assert.rejects(db.exec(operationalReferenceSql(plan)), /CONCURRENT_UPDATE|déjà reprise/);
      assert.deepEqual(await state(), applied);
      await assert.rejects(db.exec(operationalReferenceSql({ ...plan, expectedRevision: plan.expectedRevision + 1 })), /déjà reprise/);
      assert.deepEqual(await state(), applied);
    });
    return { checks, businessRows: plan.changes.length, auditEvents: plan.changes.length, accountsCreated: 0, enrollmentsCreated: 0 };
  } finally { await db.close(); }
}

async function selfTest() {
  const db = createDatabase();
  let fixture;
  try {
    await applyMigrations(db);
    const tables = {};
    for (const name of ['roles', 'permissions', 'role_permissions']) tables[name] = (await db.query(`select * from escen.${name}`)).rows;
    const actor = randomUUID(); const person = randomUUID(); const grant = randomUUID();
    const year = randomUUID(); const level = randomUUID(); const program = randomUUID(); const oldRow = randomUUID(); const oldBatch = randomUUID();
    for (const name of operationalTables) tables[name] = [];
    tables.people = [{ id: person, firstname: 'Auteur', lastname: 'Local', email: 'actor@example.test' }];
    tables.accounts = [{ id: actor, person_id: person, auth_user_id: randomUUID(), active: true, archived_at: null }];
    tables.role_grants = [{ id: grant, account_id: actor, role_id: tables.roles.find(role => role.code === 'IT').id,
      site_id: null, group_id: null, academic_year_id: null, valid_from: '2020-01-01T00:00:00Z', valid_until: null }];
    tables.academic_years = [{ id: year, code: '2026-2027', name: '2026-2027', starts_on: '2026-10-19', ends_on: '2027-06-30', status: 'BROUILLON' }];
    tables.levels = [{ id: level, code: 'L1', name: 'Licence 1', position: 1, cycle_id: null, legacy_source_row_id: oldRow }];
    tables.programs = [{ id: program, code: 'TEST', name: 'Formation locale', active: true }];
    const baseline = { sql_sha256: '1'.repeat(64), tables: { etudiants: [], users: [], frais_scolarites: [], matieres: [], niveaux: [{ id: '1', code: 'L1' }] } };
    const source = { sql_sha256: '2'.repeat(64), tables: {
      ...baseline.tables,
      etudiants: [{ id: '2', nom: 'Étudiant', prenom: 'Local', matricule: 'LOCAL-002', email: 'student@example.test', date_naissance: '2004-04-16 00:00:00', password: 'never-export-this' }],
      users: [{ id: '3', nom: 'Enseignant', prenom: 'Local', email: 'teacher@example.test' }],
      role_user: [{ id: '7', user_id: '3', role_id: '2', user_type: 'App\\Models\\User' }],
      roles: [{ id: '2', slug: 'enseignant' }],
      frais_scolarites: [{ id: '10', annee_scolaire_id: '4', niveau_id: '1', filiere_id: '5', montant: '480000', genre: null, mode_formation: 'Présentiel' }],
      matieres: [{ id: '20', code: 'MAT', nom: 'Matière locale' }],
      unite_valeurs: [{ id: '30', matiere_id: '20', annee_scolaire_id: '4', filiere_id: '5' }],
      configurations: [{ id: '1', key: 'smtp', value: 'never-export-this' }],
    } };
    const index = { batches: [{ id: oldBatch, source_name: 'baseline.zip', archive_sha256: '3'.repeat(64), sql_sha256: baseline.sql_sha256, source_rows: 1 }], mappings: [
      { row_id: oldRow, source_table: 'niveaux', source_id: '1', target_table: 'levels', target_id: level },
      { source_table: 'annee_scolaires', source_id: '4', target_table: 'academic_years', target_id: year },
      { source_table: 'filieres', source_id: '5', target_table: 'programs', target_id: program },
    ] };
    fixture = { source, baseline, index, snapshot: { revision: 17, tables }, archiveSha256: '4'.repeat(64), sourceName: 'source.zip' };
  } finally { await db.close(); }
  const plan = buildOperationalReferences(fixture);
  assert.equal(plan.counts.people, 2);
  assert.equal(plan.counts.students, 1);
  assert.equal(plan.counts.teachers, 1);
  assert.equal(plan.counts.annual_fee_schedules, 1);
  assert.ok(!JSON.stringify(plan).includes('never-export-this'));
  assert.deepEqual(buildOperationalReferences(fixture), plan);
  const duplicate = structuredClone(fixture);
  duplicate.snapshot.tables.people[0].email = ' STUDENT@example.test ';
  assert.throws(() => buildOperationalReferences(duplicate), /Email déjà présent/);
  const ambiguous = structuredClone(fixture);
  ambiguous.index.mappings.push({ source_table: 'annee_scolaires', source_id: '4', target_table: 'academic_years', target_id: randomUUID() });
  assert.throws(() => buildOperationalReferences(ambiguous), /ambiguë/);
  const collision = structuredClone(fixture);
  collision.snapshot.tables.annual_fee_schedules.push({ ...plan.changes.find(change => change.table === 'annual_fee_schedules').record, id: randomUUID() });
  assert.throws(() => buildOperationalReferences(collision), /déjà présente/);
  const already = structuredClone(fixture);
  already.index.batches.push({ sql_sha256: fixture.source.sql_sha256 });
  assert.throws(() => buildOperationalReferences(already), /déjà préparée/);
  const validation = await rehearseOperationalReferences({ ...fixture, plan });
  console.log('Reprise opérationnelle :', JSON.stringify({ ...validation, preparationChecks: 6, remoteWrites: 0 }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv.includes('--self-test')) throw new Error('Utiliser --self-test ; ce module ne possède aucune commande distante.');
  await selfTest();
}
