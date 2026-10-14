import { readFile, mkdir, chmod, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createDatabase, applyMigrations } from './database-engine.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const argument = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const localPath = (value) => {
  const path = resolve(root, value);
  const rel = relative(resolve(root, '.tmp'), path);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Les données restent dans un sous-dossier de .tmp/.');
  return path;
};
const stageDir = localPath(argument('--stage-dir', '.tmp/legacy-database'));
const databaseDir = localPath(argument('--db-dir', '.tmp/relational-database'));
let db;
try {
  // Refuser une destination déjà utilisée : aucun reset ou remplacement.
  await mkdir(databaseDir, { recursive: false, mode: 0o700 });
  db = createDatabase({ dataDir: databaseDir });
  await applyMigrations(db);
  const manifest = JSON.parse(await readFile(`${stageDir}/manifest.json`, 'utf8'));
  const records = async (name) => {
    const content = await readFile(`${stageDir}/${name}`, 'utf8');
    if (createHash('sha256').update(content).digest('hex') !== manifest.file_sha256?.[name]) throw new Error('Intégrité du fichier de staging non vérifiée.');
    return content.split('\n').filter(Boolean).map(line => JSON.parse(line));
  };
  const rows = await records('legacy-rows.jsonl');
  const issues = await records('quarantine-issues.jsonl');
  const candidates = await records('recovery-candidates.jsonl');
  if (rows.length !== manifest.source_rows) throw new Error('Nombre de lignes source incompatible avec le manifeste.');
  const result = await db.transaction(async (tx) => {
    const batch = (await tx.query('insert into escen_private.import_batches(source_name,archive_sha256,sql_sha256,source_rows) values($1,$2,$3,$4) returning id', [manifest.source_name, manifest.archive_sha256, manifest.sql_sha256, rows.length])).rows[0].id;
    for (let offset = 0; offset < rows.length; offset += 250) {
      await tx.query(`insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload,status)
        select $1, r.source_table, r.source_id, r.payload, r.status from jsonb_to_recordset($2::jsonb)
        as r(source_table text,source_id text,payload jsonb,status text)`, [batch, JSON.stringify(rows.slice(offset, offset + 250))]);
    }
    for (const issue of issues) {
      await tx.query(`insert into escen_private.import_issues(row_id,code,details)
        select id,$4,$5::jsonb from escen_private.legacy_rows where batch_id = $1 and source_table = $2 and source_id = $3`, [batch, issue.source_table, issue.source_id, issue.code, JSON.stringify(issue)]);
    }
    for (const candidate of candidates) {
      await tx.query(`insert into escen_private.recovery_candidates(batch_id,source_archive,source_sql_sha256,source_table,source_id,payload)
        values($1,$2,$3,$4,$5,$6::jsonb)`, [batch,candidate.archive,candidate.sql_sha256,candidate.source_table,candidate.source_id,JSON.stringify(candidate.payload)]);
    }
    const count = (await tx.query('select count(*)::integer as count from escen_private.legacy_rows where batch_id = $1', [batch])).rows[0].count;
    if (count !== rows.length) throw new Error('Conservation des lignes source non vérifiée.');
    const issueCount = (await tx.query('select count(*)::integer as count from escen_private.import_issues i join escen_private.legacy_rows r on r.id = i.row_id where r.batch_id = $1',[batch])).rows[0].count;
    if (issueCount !== issues.length) throw new Error('Conservation des diagnostics non vérifiée.');
    return { sourceRows: count, importIssues: issues.length, recoveryCandidates: candidates.length,
      businessTables: (await tx.query("select count(*)::integer as count from pg_tables where schemaname = 'escen'")).rows[0].count,
      status: 'STAGED_ONLY', warning: 'Données historiques conservées en staging privé ; aucune association ambiguë transférée dans les tables métier.' };
  });
  await writeFile(`${databaseDir}/escen-import-report.json`, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
  await chmod(databaseDir, 0o700);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  // Ne pas publier les paramètres SQL ni les données personnelles en cas d'erreur.
  console.error('Préparation locale interrompue :', error.message);
  process.exitCode = 1;
} finally {
  if (db) await db.close();
}
