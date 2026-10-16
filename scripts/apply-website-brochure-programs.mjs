import { readFile } from 'node:fs/promises';
import { remoteQuery, quoteSql } from './supabase-cli.mjs';

// Apply only this reviewed migration, never other outstanding work in this checkout.
const version = '202610160033';
const sql = await readFile(new URL('../supabase/migrations/202610160033_website_brochure_programs.sql', import.meta.url), 'utf8');
const state = remoteQuery(`select exists(select 1 from supabase_migrations.schema_migrations where version='202610160032') as prerequisite,
  exists(select 1 from supabase_migrations.schema_migrations where version='${version}') as applied;`)[0];
if (!state.prerequisite) throw new Error('Migration 32 requise.');
if (state.applied) console.log('Rattachement des brochures aux filières déjà appliqué.');
else if (!process.argv.includes('--apply')) console.log('Migration 33 prête : rattacher chaque brochure à une filière et un cycle. Ajouter --apply.');
else {
  const tracked = sql.replace(/commit;\s*$/, () => `insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','website_brochure_programs',array[${quoteSql(sql)}]);\ncommit;\nselect true as applied;`);
  if (!remoteQuery(tracked)[0]?.applied) throw new Error('Application non confirmée.');
  console.log('Migration 33 appliquée : brochures rattachées aux filières.');
}
