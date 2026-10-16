import { readFile } from 'node:fs/promises';
import { remoteQuery, quoteSql } from './supabase-cli.mjs';
const version = '202610160032';
const sql = await readFile(new URL('../supabase/migrations/202610160032_website_annual_offerings.sql', import.meta.url), 'utf8');
const state = remoteQuery(`select exists(select 1 from supabase_migrations.schema_migrations where version='202610160031') as prerequisite,
  exists(select 1 from supabase_migrations.schema_migrations where version='${version}') as applied;`)[0];
if (!state.prerequisite) throw new Error('Migration 31 requise.');
if (state.applied) console.log('Synchronisation annuelle déjà appliquée.');
else if (!process.argv.includes('--apply')) console.log('Migration 32 : synchroniser les campagnes depuis les formations exactes de l’année active, sans remplacer les campagnes existantes.');
else {
  const tracked = sql.replace(/commit;\s*$/, () => `insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','website_annual_offerings',array[${quoteSql(sql)}]);\ncommit;\nselect true as applied;`);
  if (!remoteQuery(tracked)[0]?.applied) throw new Error('Application non confirmée.');
  console.log('Synchronisation des formations annuelles appliquée.');
}
