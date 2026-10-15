import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { remoteQuery, quoteSql } from './supabase-cli.mjs';
import { createDatabase, applyMigrations } from './database-engine.mjs';
import { buildCanonicalRecovery } from './lib/canonical-recovery.mjs';
import assert from 'node:assert/strict';
const directory = '.tmp/legacy-database';
const json = value => `${quoteSql(JSON.stringify(value))}::jsonb`;
const manifest = JSON.parse(await readFile(`${directory}/manifest.json`, 'utf8'));
const text = await readFile(`${directory}/legacy-rows.jsonl`, 'utf8');
assert.equal(createHash('sha256').update(text).digest('hex'), manifest.file_sha256['legacy-rows.jsonl']);
const sources = text.split('\n').filter(Boolean).map(line => JSON.parse(line));
const apply = process.argv.includes('--apply');
const refresh = process.argv.includes('--refresh-index');
let index; let actorId; let existingPrograms;
if (refresh) {
  index = remoteQuery(`select l.id,l.batch_id,l.source_table,l.source_id,coalesce((select jsonb_agg(jsonb_build_object('target_table',m.target_table,'target_id',m.target_id)) from escen_private.source_mappings m where m.row_id=l.id),'[]') as mappings from escen_private.legacy_rows l join escen_private.import_batches b on b.id=l.batch_id where b.sql_sha256=${quoteSql(manifest.sql_sha256)} order by l.source_table,l.source_id`);
  actorId = remoteQuery(`select a.id from escen.accounts a join escen.people p on p.id=a.person_id where a.active and a.auth_user_id is not null and lower(p.email)='denisgangnito9@gmail.com' and exists(select 1 from escen.role_grants g join escen.roles r on r.id=g.role_id where g.account_id=a.id and r.code='IT' and g.site_id is null and g.group_id is null and g.academic_year_id is null and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()))`)[0]?.id;
  assert.ok(actorId, 'Compte autorisé de l’auteur introuvable.');
  existingPrograms = remoteQuery('select * from escen.programs');
  await writeFile(`${directory}/canonical-index.json`, JSON.stringify({ index, actorId, existingPrograms }), { mode: 0o600 });
} else ({ index, actorId, existingPrograms } = JSON.parse(await readFile(`${directory}/canonical-index.json`, 'utf8')));
assert.equal(index.length, manifest.source_rows);
const plan = buildCanonicalRecovery({ sources, index, actorId, sqlHash: manifest.sql_sha256, existingPrograms });
const batchId = index[0].batch_id;
assert.ok(index.every(row => row.batch_id === batchId));
const runId = randomUUID();
const inserts = [];
for (const [table, records] of Object.entries(plan.tables)) {
  const columns = [...new Set(records.flatMap(row => Object.keys(row)))];
  assert.ok(columns.every(name => /^[a-z_]+$/.test(name)));
  for (let offset = 0; offset < records.length; offset += 100) {
    inserts.push(`insert into escen.${table}(${columns.join(',')}) select ${columns.join(',')} from jsonb_populate_recordset(null::escen.${table},${json(records.slice(offset,offset+100))});`);
  }
}
const query = `begin;
select pg_advisory_xact_lock(hashtext('CANONICAL_2025_V1'));
select set_config('escen.actor_id',${quoteSql(actorId)},true);
do $$ begin
 if exists(select 1 from escen_private.import_runs where batch_id=${quoteSql(batchId)}::uuid and run_code='CANONICAL_2025_V1') then raise exception 'Reprise déjà effectuée ; aucune seconde insertion'; end if;
 if (select count(*) from escen_private.legacy_rows where batch_id=${quoteSql(batchId)}::uuid)<>${manifest.source_rows} then raise exception 'Lot source incomplet'; end if;
end $$;
insert into escen_private.import_runs(id,batch_id,run_code,actor_account_id,counts) values(${quoteSql(runId)}::uuid,${quoteSql(batchId)}::uuid,'CANONICAL_2025_V1',${quoteSql(actorId)}::uuid,${json(plan.counts)});
${inserts.join('\n')}
update escen.contract_versions set status='EN_COURS' where id in (select value::uuid from jsonb_array_elements_text(${json(plan.activeVersions)}));
insert into escen_private.source_mappings(row_id,target_table,target_id,mapping_method,import_run_id,reason)
select row_id,target_table,target_id,'SOURCE_EXACT',${quoteSql(runId)}::uuid,'Reprise opérationnelle 2025-2026 : relations exactes, décomposition par formation des évaluations de groupe.' from jsonb_to_recordset(${json(plan.mappings)}) r(row_id uuid,target_table text,target_id uuid);
insert into escen_private.import_issues(row_id,code,details)
select row_id,code,details from jsonb_to_recordset(${json(plan.issues)}) r(row_id uuid,code text,details jsonb) on conflict(row_id,code) do nothing;
update escen_private.legacy_rows l set status='MAPPED' where l.batch_id=${quoteSql(batchId)}::uuid and l.status='PENDING' and exists(select 1 from escen_private.source_mappings m where m.row_id=l.id and m.import_run_id=${quoteSql(runId)}::uuid) and not exists(select 1 from escen_private.import_issues i where i.row_id=l.id and i.resolved_at is null);
update escen_private.portal_revision set revision=revision+1,actor_id=${quoteSql(actorId)}::uuid,changed_at=now() where singleton;
commit;
select counts from escen_private.import_runs where id=${quoteSql(runId)}::uuid;`;
await writeFile(`${directory}/canonical-plan.sql`, query, { mode: 0o600 });
await writeFile(`${directory}/canonical-plan-report.json`, JSON.stringify({ yearId: plan.yearId, counts: plan.counts, issues: Object.fromEntries([...new Set(plan.issues.map(row=>row.code))].map(code=>[code,plan.issues.filter(row=>row.code===code).length])), postedPayments: plan.tables.payments.filter(row=>row.status==='POSTED').reduce((sum,row)=>sum+row.amount,0), pendingPayments:plan.tables.payments.filter(row=>row.status==='PENDING').reduce((sum,row)=>sum+row.amount,0) },null,2)+'\n', { mode: 0o600 });
// Always replay the complete transaction against PostgreSQL locally first.
const db = createDatabase();
try {
  await applyMigrations(db);
  await db.query('insert into escen_private.import_batches(id,source_name,archive_sha256,sql_sha256,source_rows) values($1,$2,$3,$4,$5)',[batchId,manifest.source_name,manifest.archive_sha256,manifest.sql_sha256,manifest.source_rows]);
  const lookup = new Map(index.map(row=>[`${row.source_table}:${row.source_id}`,row]));
  for(let start=0;start<sources.length;start+=200){
    const records=sources.slice(start,start+200).map(row=>({...row,id:lookup.get(`${row.source_table}:${row.source_id}`).id,batch_id:batchId}));
    await db.query('insert into escen_private.legacy_rows(id,batch_id,source_table,source_id,payload,status) select id,batch_id,source_table,source_id,payload,status from jsonb_populate_recordset(null::escen_private.legacy_rows,$1::jsonb)',[JSON.stringify(records)]);
  }
  const read = async file=>(await readFile(`${directory}/${file}`,'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line));
  await db.query('insert into escen.people(id,firstname,lastname,maiden_name,birth_date,birth_place,nationality,gender,email,phone) select id,firstname,lastname,maiden_name,birth_date,birth_place,nationality,gender,email,phone from jsonb_populate_recordset(null::escen.people,$1::jsonb)',[JSON.stringify(await read('identity-profiles.jsonl'))]);
  await db.query('insert into escen.accounts(id,person_id,active) select id,person_id,false from jsonb_populate_recordset(null::escen.accounts,$1::jsonb)',[JSON.stringify(await read('identity-accounts.jsonl'))]);
  await db.query('insert into escen.students(id,person_id,matricule) select id,person_id,matricule from jsonb_populate_recordset(null::escen.students,$1::jsonb)',[JSON.stringify(await read('identity-students.jsonl'))]);
  const anchorRun = randomUUID();
  await db.query("insert into escen_private.import_runs(id,batch_id,run_code,counts) values($1,$2,'LOCAL_ANCHORS','{}')",[anchorRun,batchId]);
  for(const row of index)for(const mapping of row.mappings){
    if(!['people','accounts','students','academic_years'].includes(mapping.target_table))continue;
    if(mapping.target_table==='academic_years'){
      const p=sources.find(source=>source.source_table===row.source_table && source.source_id===row.source_id).payload;
      await db.query('insert into escen.academic_years(id,code,name,starts_on,ends_on,status) values($1,$2,$2,$3,$4,$5)',[mapping.target_id,p.nom,p.date_debut,p.date_fin,p.active==='1'?'OUVERTE':'BROUILLON']);
    }
    await db.query("insert into escen_private.source_mappings(row_id,target_table,target_id,mapping_method,import_run_id,reason) values($1,$2,$3,'SOURCE_EXACT',$4,'Ancrage local exact des identités et années déjà reprises')",[row.id,mapping.target_table,mapping.target_id,anchorRun]);
  }
  if (existingPrograms?.length) await db.query('insert into escen.programs select * from jsonb_populate_recordset(null::escen.programs,$1::jsonb)', [JSON.stringify(existingPrograms)]);
  await db.exec(query);
  assert.equal((await db.query('select count(*)::int as n from escen.enrollments')).rows[0].n,143);
  assert.equal((await db.query("select sum(amount)::int as n from escen.payments where status='POSTED'")).rows[0].n,49300000);
  assert.equal((await db.query("select sum(amount)::int as n from escen.payments where status='PENDING'")).rows[0].n,325000);
  const published=(await db.query("select count(*)::int as n from escen.evaluations where status='PUBLIEES'")).rows[0].n;
  assert.equal(published, plan.tables.evaluations.length);
  const sourceHashes=(await db.query('select count(*)::int as n from escen_private.legacy_rows')).rows[0].n;
  assert.equal(sourceHashes,manifest.source_rows);
  await assert.rejects(db.exec(query), /déjà effectuée/);
  console.log('Reprise PostgreSQL locale validée :',JSON.stringify(plan.counts));
} catch(error) { console.error('Reprise refusée :',error.message);process.exitCode=1; }
finally { await db.close(); }
if(process.exitCode)process.exit(process.exitCode);
if(apply){
  const result=remoteQuery(query);
  assert.deepEqual(result.at(-1)?.counts,plan.counts);
  await writeFile(`${directory}/canonical-import-report.json`,JSON.stringify({appliedAt:new Date().toISOString(),runId,counts:plan.counts},null,2)+'\n',{mode:0o600});
  console.log('Reprise distante enregistrée dans les tables opérationnelles.');
}else console.log('Aucune écriture distante ; utiliser --apply après vérification du plan.');
