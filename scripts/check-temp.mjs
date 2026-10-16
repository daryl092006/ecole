import { remoteQuery } from './supabase-cli.mjs';

// Read-only inspection of the remote state for brochures and articles.
const show = (label, sql) => { console.log(`\n## ${label}`); try { console.log(JSON.stringify(remoteQuery(sql))); } catch (e) { console.log('ERR', e.message); } };
show('legacy files blogs', `select name, metadata->>'size' size from storage.objects where bucket_id='escen-legacy-files' and name ilike '%blogs/%' limit 20`);
show('legacy files sample', `select name from storage.objects where bucket_id='escen-legacy-files' limit 8`);
show('authors', `select l.source_id, (select string_agg(k||'='||coalesce(l.payload->>k,''),' | ') from jsonb_object_keys(l.payload) k where k ~ 'nom|name|prenom') names, m.target_id from escen_private.legacy_rows l left join escen_private.source_mappings m on m.row_id=l.id and m.target_table='accounts' where l.source_table='users' and l.source_id in ('1','310','334')`);
show('mapping cols', `select column_name, is_nullable from information_schema.columns where table_schema='escen_private' and table_name='source_mappings'`);
show('guard fn', `select pg_get_functiondef('escen_private.guard_business_year'::regproc)`);
