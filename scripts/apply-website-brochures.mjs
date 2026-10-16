import { readFile } from 'node:fs/promises';
import { remoteQuery, quoteSql } from './supabase-cli.mjs';

// Apply only this reviewed migration, never other outstanding work in this checkout.
const version = '202610160031';
const sql = await readFile(new URL('../supabase/migrations/202610160031_website_brochures.sql', import.meta.url), 'utf8');
const state = remoteQuery(`select exists(select 1 from supabase_migrations.schema_migrations where version='202610160030') as prerequisite,
  exists(select 1 from supabase_migrations.schema_migrations where version='${version}') as applied,
  to_regclass('escen.website_brochures') is not null as table_exists;`)[0];
if (state.applied) {
  if (!state.table_exists) throw new Error('Migration enregistrée mais table absente.');
  console.log('Migration brochures déjà appliquée.');
} else {
  if (!state.prerequisite || state.table_exists) throw new Error('État distant inattendu : arrêt sans modification.');
  if (!process.argv.includes('--apply')) {
    console.log('Migration 31 prête. Ajouter --apply pour créer uniquement la gestion des brochures.');
  } else {
    const tracked = sql.replace(/commit;\s*$/, () => `insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','website_brochures',array[${quoteSql(sql)}]);\ncommit;\nselect true as applied;`);
    const result = remoteQuery(tracked);
    if (!result[0]?.applied) throw new Error('Application non confirmée.');
    console.log('Migration 31 appliquée et enregistrée ; aucun contenu publié.');
  }
}
