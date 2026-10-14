import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { remoteQuery } from './supabase-cli.mjs';

process.loadEnvFile('.env.local');
const report = remoteQuery(`select
  (select count(*) from supabase_migrations.schema_migrations) as migrations,
  (select count(*) from pg_tables where schemaname='escen') as business_tables,
  (select count(*) from pg_tables where schemaname='escen_private') as private_tables,
  (select count(*) from pg_tables where schemaname in ('escen','escen_private') and not rowsecurity) as tables_without_rls,
  (select count(*) from escen_private.legacy_rows) as source_rows,
  (select count(*) from escen_private.import_issues) as diagnostics,
  (select count(*) from escen_private.recovery_candidates) as recovery_candidates,
  (select count(*) from escen.accounts) as accounts,
  (select count(*) from escen.accounts where archived_at is not null and not active) as retired_accounts,
  (select count(*) from escen.roles) as roles,
  (select count(*) from escen.permissions) as permissions,
  (select count(*) from escen.role_permissions rp join escen.roles r on r.id=rp.role_id where r.code='IT') as it_permissions,
  (select count(*) from escen.students s where exists(select 1 from escen_private.source_mappings m where m.target_table='students' and m.target_id=s.id and m.mapping_method='SOURCE_EXACT')) as imported_students,
  (select count(*) from escen.accounts where not active and auth_user_id is null) as inactive_unlinked_accounts,
  (select count(*) from escen.role_grants where legacy_source_row_id is not null) as imported_legacy_role_grants,
  (select count(*) from escen_private.source_mappings where mapping_method='SOURCE_EXACT') as exact_source_mappings,
  (select count(*) from escen_private.import_runs where run_code='LEGACY_IDENTITIES_V1') as identity_import_runs,
  (select count(*) from escen_private.legacy_rows where status='MAPPED') as mapped_source_rows;`)[0];
if (Number(report.migrations) !== 21 || Number(report.it_permissions) !== 42 || Number(report.business_tables) !== 104 || Number(report.private_tables) !== 11
  || Number(report.tables_without_rls) !== 0 || Number(report.source_rows) !== 15566
  || Number(report.diagnostics) !== 264 || Number(report.recovery_candidates) !== 3
  || Number(report.accounts) !== 175 || Number(report.imported_students) !== 145
  || Number(report.imported_legacy_role_grants) !== 176 || Number(report.exact_source_mappings) !== 682
  || Number(report.identity_import_runs) !== 1 || Number(report.mapped_source_rows) !== 362) throw new Error('État distant différent des contrôles attendus.');
const anonymous = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{ auth:{ persistSession:false,autoRefreshToken:false } });
for (const [name,args] of [
  ['escen_catalog_resume',{p_actor_id:'00000000-0000-4000-8000-000000000001',p_expected_revision:0,p_table:'subjects',p_record:{},p_source_id:'00000000-0000-4000-8000-000000000002'}],
  ['escen_subject_transaction',{p_actor_id:'00000000-0000-4000-8000-000000000001',p_expected_revision:0,p_changes:[]}],
  ['escen_catalog_history_links',{p_table:'programs'}],
  ['escen_backend_snapshot',{}],['escen_history_catalog',{}],['escen_history_page',{p_table:'notes'}],['escen_history_document',{p_row_id:'00000000-0000-0000-0000-000000000001',p_field:'file_path'}],
  ['escen_manage_account',{p_actor_id:'00000000-0000-0000-0000-000000000001',p_target_id:'00000000-0000-0000-0000-000000000002',p_action:'archive',p_reason:'Unauthorized'}],['escen_import_overview',{}],
  ['escen_account_session',{ p_auth_user_id:'00000000-0000-0000-0000-000000000001' }],
  ['escen_backend_transaction',{ p_actor_id:'00000000-0000-0000-0000-000000000001',p_expected_revision:0,p_changes:[] }],
]) {
  const response = await anonymous.rpc(name,args);
  if (!response.error || response.error.code !== '42501') throw new Error('Refus explicite des RPC sans authentification non confirmé.');
}
const output = { project:'zmxapemyktxhppdxenzb',...report,anonymousRpcDenied:true,checkedAt:new Date().toISOString() };
await writeFile('.tmp/legacy-database/remote-verification.json',JSON.stringify(output,null,2)+'\n',{ mode:0o600 });
console.log(JSON.stringify(output));
