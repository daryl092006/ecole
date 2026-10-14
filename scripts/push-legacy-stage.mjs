import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { quoteSql, remoteQuery } from './supabase-cli.mjs';

const directory = '.tmp/legacy-database';
const manifest = JSON.parse(await readFile(`${directory}/manifest.json`,'utf8'));
const load = async name => {
  const text = await readFile(`${directory}/${name}`,'utf8');
  if (createHash('sha256').update(text).digest('hex') !== manifest.file_sha256[name]) throw new Error('Fichier source de travail modifié : import refusé.');
  return text.split('\n').filter(Boolean).map(line => JSON.parse(line));
};
const records = await load('legacy-rows.jsonl');
const issues = await load('quarantine-issues.jsonl');
const candidates = await load('recovery-candidates.jsonl');
if (records.length !== manifest.source_rows) throw new Error('Effectif source incohérent.');
const batch = remoteQuery(`insert into escen_private.import_batches(source_name,archive_sha256,sql_sha256,source_rows)
  values(${quoteSql(manifest.source_name)},${quoteSql(manifest.archive_sha256)},${quoteSql(manifest.sql_sha256)},${records.length})
  on conflict(archive_sha256) do nothing;
  select id from escen_private.import_batches where archive_sha256=${quoteSql(manifest.archive_sha256)};`)[0]?.id;
if (!batch) throw new Error('Lot source non confirmé.');
let pending = []; let size = 0; let completed = 0;
const flush = () => {
  if (!pending.length) return;
  remoteQuery(`insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload,status)
    select ${quoteSql(batch)}::uuid,r.source_table,r.source_id,r.payload,r.status
    from jsonb_to_recordset(${quoteSql(JSON.stringify(pending))}::jsonb) as r(source_table text,source_id text,payload jsonb,status text)
    on conflict(batch_id,source_table,source_id) do nothing;
    select count(*)::integer as count from escen_private.legacy_rows where batch_id=${quoteSql(batch)}::uuid;`);
  completed += pending.length;
  console.log(`Sources conservées : ${completed}/${records.length}`);
  pending = []; size = 0;
};
for (const record of records) {
  const length = JSON.stringify(record).length;
  if (size + length > 700_000) flush();
  pending.push(record); size += length;
}
flush();
remoteQuery(`insert into escen_private.import_issues(row_id,code,details)
  select r.id,i.code,to_jsonb(i) from jsonb_to_recordset(${quoteSql(JSON.stringify(issues))}::jsonb)
    as i(source_table text,source_id text,code text,target_table text,target_id text,candidate_archives jsonb)
  join escen_private.legacy_rows r on r.source_table=i.source_table and r.source_id=i.source_id and r.batch_id=${quoteSql(batch)}::uuid
  on conflict(row_id,code) do nothing;
  select count(*)::integer as count from escen_private.import_issues i join escen_private.legacy_rows r on r.id=i.row_id where r.batch_id=${quoteSql(batch)}::uuid;`);
if (candidates.length) remoteQuery(`insert into escen_private.recovery_candidates(batch_id,source_archive,source_sql_sha256,source_table,source_id,payload)
  select ${quoteSql(batch)}::uuid,r.archive,r.sql_sha256,r.source_table,r.source_id,r.payload
  from jsonb_to_recordset(${quoteSql(JSON.stringify(candidates))}::jsonb) as r(archive text,sql_sha256 text,source_table text,source_id text,payload jsonb)
  on conflict(batch_id,source_archive,source_table,source_id) do nothing;
  select count(*)::integer as count from escen_private.recovery_candidates where batch_id=${quoteSql(batch)}::uuid;`);
const verification = remoteQuery(`select
  (select count(*)::integer from escen_private.legacy_rows where batch_id=${quoteSql(batch)}::uuid) as rows,
  (select count(*)::integer from escen_private.import_issues i join escen_private.legacy_rows r on r.id=i.row_id where r.batch_id=${quoteSql(batch)}::uuid) as issues,
  (select count(*)::integer from escen_private.recovery_candidates where batch_id=${quoteSql(batch)}::uuid) as recovery_candidates;`)[0];
if (verification.rows !== records.length || verification.issues !== issues.length || verification.recovery_candidates !== candidates.length) throw new Error('Contrôle de conservation distant échoué.');
await writeFile(`${directory}/remote-import-report.json`,JSON.stringify({ project:'zmxapemyktxhppdxenzb',batch,...verification,status:'STAGED_ONLY' },null,2)+'\n',{ mode:0o600 });
console.log(JSON.stringify({ sourceRows:verification.rows,issues:verification.issues,recoveryCandidates:verification.recovery_candidates,status:'STAGED_ONLY' }));
