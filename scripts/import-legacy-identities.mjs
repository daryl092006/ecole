import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { quoteSql, remoteQuery } from './supabase-cli.mjs';
import { createDatabase, applyMigrations } from './database-engine.mjs';

const directory = '.tmp/legacy-database';
const manifest = JSON.parse(await readFile(`${directory}/manifest.json`,'utf8'));
const report = JSON.parse(await readFile(`${directory}/identity-preparation-report.json`,'utf8'));
if (report.archive_sha256 !== manifest.archive_sha256 || report.sql_sha256 !== manifest.sql_sha256 || report.accountsAuthActivated !== 0 || report.passwordsTransferred !== 0 || report.tokensTransferred !== 0) throw new Error('Préparation des comptes incohérente.');
const read = async (filename,expected) => {
  const value = await readFile(`${directory}/${filename}`,'utf8');
  if (value.split('\n').filter(Boolean).length !== expected) throw new Error('Effectif préparé différent du rapport ; import annulé.');
  return value.split('\n').filter(Boolean).map(line => JSON.parse(line));
};
const people = await read('identity-profiles.jsonl',report.profiles);
const accounts = await read('identity-accounts.jsonl',report.accounts);
const students = await read('identity-students.jsonl',report.students);
const memberships = await read('identity-role-grants.jsonl',report.activeSourceRoleAssignments);
const personMappings = people.map(row=>({source_table:row.source_table,source_id:row.source_id,id:row.id}));
const mappedRoles = await read('identity-roles.jsonl',report.mappedSourceRoles);
const localVerification = process.argv.includes('--verify-local');
const localDb = localVerification ? createDatabase() : null;
if (localDb) await applyMigrations(localDb);
const batch = localVerification ? '00000000-0000-4000-8000-000000000001' : remoteQuery(`select id from escen_private.import_batches where archive_sha256=${quoteSql(manifest.archive_sha256)};`)[0]?.id;
if (!batch) throw new Error('Lot de sauvegarde introuvable.');
if (localDb) {
  try {
    await localDb.query('insert into escen_private.import_batches(id,source_name,archive_sha256,sql_sha256,source_rows) values($1,$2,$3,$4,$5)',[batch,manifest.source_name,manifest.archive_sha256,manifest.sql_sha256,manifest.source_rows]);
    const sourceKeys = new Map();
    for (const row of [...people,...students,...memberships,...mappedRoles]) sourceKeys.set(`${row.source_table}:${row.source_id}`,{source_table:row.source_table,source_id:row.source_id,payload:JSON.stringify({ id:row.source_id }),status:'PENDING'});
    const sourceRows=[...sourceKeys.values()];
    await localDb.query('insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload,status) select $1,r.source_table,r.source_id,r.payload::jsonb,r.status from jsonb_to_recordset($2::jsonb) as r(source_table text,source_id text,payload text,status text)',[batch,JSON.stringify(sourceRows)]);
  } catch (error) { await localDb.close(); throw new Error(`Préparation locale des sources échouée (${error.code??error.name}:${error.table??''}.${error.column??''}:${error.constraint??''}).`); }
} else {
  const previous = remoteQuery(`select id from escen_private.import_runs where batch_id=${quoteSql(batch)}::uuid and run_code='LEGACY_IDENTITIES_V1';`);
  if (previous.length) throw new Error('Ces identités ont déjà été importées ; aucune seconde exécution autorisée.');
}
const counts = { people:people.length,accounts:accounts.length,students:students.length,sourceRoleGrants:memberships.length,mappedRoleDefinitions:mappedRoles.length };
const runId = (() => {
  const digest = createHash('sha256').update(`${manifest.sql_sha256}:import_runs:LEGACY_IDENTITIES_V1`).digest();
  digest[6] = (digest[6] & 0x0f) | 0x50; digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0,16).toString('hex'); return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
})();
const json = value => `${quoteSql(JSON.stringify(value))}::jsonb`;
const query = `begin;
insert into escen_private.import_runs(id,batch_id,run_code,counts)
values(${quoteSql(runId)}::uuid,${quoteSql(batch)}::uuid,'LEGACY_IDENTITIES_V1',${json(counts)});
insert into escen.people(id,firstname,lastname,maiden_name,birth_date,birth_place,nationality,gender,email,phone)
select id,firstname,lastname,maiden_name,birth_date,birth_place,nationality,gender,email,phone
from jsonb_to_recordset(${json(people)}) as p(id uuid,firstname text,lastname text,maiden_name text,birth_date date,birth_place text,nationality text,gender text,email text,phone text,source_table text,source_id text);
insert into escen.accounts(id,person_id,active)
select id,person_id,false from jsonb_to_recordset(${json(accounts)}) as a(id uuid,person_id uuid,active boolean,source_table text,source_id text);
insert into escen.students(id,person_id,matricule)
select id,person_id,matricule from jsonb_to_recordset(${json(students)}) as s(id uuid,person_id uuid,matricule text,source_id text);
insert into escen_private.source_mappings(row_id,target_table,target_id,mapping_method,import_run_id,reason)
select l.id,'people',m.id,'SOURCE_EXACT',${quoteSql(runId)}::uuid,'Correspondance exacte du profil historique.'
from jsonb_to_recordset(${json(personMappings)}) as m(source_table text,source_id text,id uuid,account_id uuid)
join escen_private.legacy_rows l on l.batch_id=${quoteSql(batch)}::uuid and l.source_table=m.source_table and l.source_id=m.source_id;
insert into escen_private.source_mappings(row_id,target_table,target_id,mapping_method,import_run_id,reason)
select l.id,'accounts',a.id,'SOURCE_EXACT',${quoteSql(runId)}::uuid,'Compte historique créé désactivé, sans mot de passe ni liaison Auth.'
from jsonb_to_recordset(${json(accounts)}) as a(id uuid,person_id uuid,active boolean,source_table text,source_id text)
join escen_private.legacy_rows l on l.batch_id=${quoteSql(batch)}::uuid and l.source_table=a.source_table and l.source_id=a.source_id;
insert into escen_private.source_mappings(row_id,target_table,target_id,mapping_method,import_run_id,reason)
select l.id,'students',s.id,'SOURCE_EXACT',${quoteSql(runId)}::uuid,'Identifiant polymorphe Etudiant relié exactement à la fiche étudiant.'
from jsonb_to_recordset(${json(students)}) as s(id uuid,person_id uuid,matricule text,source_id text)
join escen_private.legacy_rows l on l.batch_id=${quoteSql(batch)}::uuid and l.source_table='etudiants' and l.source_id=s.source_id;
insert into escen_private.source_mappings(row_id,target_table,target_id,mapping_method,import_run_id,reason)
select l.id,'roles',r.id,'SOURCE_EXACT',${quoteSql(runId)}::uuid,'Correspondance du slug historique vers le rôle métier exact.'
from jsonb_to_recordset(${json(mappedRoles)}) as m(source_id text,source_table text,target_role_code text)
join escen_private.legacy_rows l on l.batch_id=${quoteSql(batch)}::uuid and l.source_table='roles' and l.source_id=m.source_id
join escen.roles r on r.code=m.target_role_code;
insert into escen.role_grants(id,account_id,role_id,granted_by,site_id,academic_year_id,group_id,valid_from,valid_until,reason,legacy_source_row_id)
select g.id,g.account_id,r.id,null,null,null,null,run.started_at,null,g.reason,l.id
from jsonb_to_recordset(${json(memberships)}) as g(id uuid,account_id uuid,target_role_code text,source_table text,source_id text,reason text)
join escen.roles r on r.code=g.target_role_code
join escen_private.legacy_rows l on l.batch_id=${quoteSql(batch)}::uuid and l.source_table='role_user' and l.source_id=g.source_id
join escen_private.import_runs run on run.id=${quoteSql(runId)}::uuid;
insert into escen_private.source_mappings(row_id,target_table,target_id,mapping_method,import_run_id,reason)
select l.id,'role_grants',g.id,'SOURCE_EXACT',${quoteSql(runId)}::uuid,g.reason
from jsonb_to_recordset(${json(memberships)}) as g(id uuid,source_id text,reason text)
join escen_private.legacy_rows l on l.batch_id=${quoteSql(batch)}::uuid and l.source_table='role_user' and l.source_id=g.source_id;
update escen_private.legacy_rows l set status='MAPPED'
where l.batch_id=${quoteSql(batch)}::uuid and not exists(select 1 from escen_private.import_issues i where i.row_id=l.id and i.resolved_at is null)
  and exists(select 1 from escen_private.source_mappings m where m.row_id=l.id)
  and l.status='PENDING';
commit;
select jsonb_build_object(
 'people',(select count(*) from escen.people where id in (select id from jsonb_to_recordset(${json(people)}) as p(id uuid))),
 'accounts',(select count(*) from escen.accounts where id in (select id from jsonb_to_recordset(${json(accounts)}) as a(id uuid))),
 'students',(select count(*) from escen.students where id in (select id from jsonb_to_recordset(${json(students)}) as s(id uuid))),
 'role_grants',(select count(*) from escen.role_grants where legacy_source_row_id in (select l.id from escen_private.legacy_rows l where l.batch_id=${quoteSql(batch)}::uuid and l.source_table='role_user')),
 'mapped_sources',(select count(*) from escen_private.legacy_rows where batch_id=${quoteSql(batch)}::uuid and status='MAPPED'),
 'import_runs',(select count(*) from escen_private.import_runs where id=${quoteSql(runId)}::uuid)) as result;`;
let result;
if (localDb) { try { const results=await localDb.exec(query); result=results.at(-1)?.rows?.[0]?.result; } catch (error) { await localDb.close(); throw new Error(`Contrôle SQL local échoué : ${error.message}`); } await localDb.close(); }
else result=remoteQuery(query)[0]?.result;
if (!result || Number(result.people)!==people.length || Number(result.accounts)!==accounts.length || Number(result.students)!==students.length || Number(result.role_grants)!==memberships.length || Number(result.import_runs)!==1) throw new Error('Vérification finale des identités échouée.');
if (Number(result.mapped_sources)<people.length+mappedRoles.length+memberships.length) throw new Error('La provenance de certaines identités reste incomplète.');
const sanitized = { project:localDb?'local-pglite':'zmxapemyktxhppdxenzb',runId,...result,accountsAuthActivated:0,passwordsTransferred:0,tokensTransferred:0,sourceRoleAssignmentsUnresolved:report.sourceRoleAssignmentsUnresolved,status:'IMPORTED_INACTIVE' };
if (!localVerification) await writeFile(`${directory}/identity-import-report.json`,JSON.stringify(sanitized,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(sanitized));
