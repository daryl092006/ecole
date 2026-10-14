import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createDatabase, applyMigrations } from './database-engine.mjs';

const db = createDatabase();
try {
  await applyMigrations(db);
  const tables = (await db.query(`select n.nspname as schema, c.relname as name, c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('escen','escen_private') and c.relkind = 'r' order by n.nspname,c.relname`)).rows;
  const columns = (await db.query(`select table_schema as schema, table_name as table, column_name as name,
    coalesce(domain_schema || '.' || domain_name,udt_name) as type, is_nullable as nullable,
    column_default as default, is_generated as generated from information_schema.columns
    where table_schema in ('escen','escen_private') order by table_schema,table_name,ordinal_position`)).rows;
  const constraints = (await db.query(`select n.nspname as schema,t.relname as table,c.conname as name,c.contype as type,
    pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace where n.nspname in ('escen','escen_private') order by n.nspname,t.relname,c.conname`)).rows;
  const indexes = (await db.query("select schemaname as schema,tablename as table,indexname as name,indexdef as definition from pg_indexes where schemaname in ('escen','escen_private') order by schemaname,tablename,indexname")).rows;
  const views = (await db.query("select schemaname as schema,viewname as name,definition from pg_views where schemaname = 'escen' order by viewname")).rows;
  const stats = { businessTables: tables.filter(table => table.schema === 'escen').length,
    privateTables: tables.filter(table => table.schema === 'escen_private').length, columns: columns.length,
    foreignKeys: constraints.filter(item => item.type === 'f').length,
    checks: constraints.filter(item => item.type === 'c').length, exclusions: constraints.filter(item => item.type === 'x').length };
  const lines = ['# Dictionnaire de la base relationnelle corrigée', '',
    'Généré avec `npm run db:describe` en exécutant les migrations dans PostgreSQL local (PGlite). Aucun accès à Supabase ou aux données de la sauvegarde.', '',
    `${stats.businessTables} tables métier, ${stats.privateTables} tables privées, ${stats.columns} colonnes, ${stats.foreignKeys} clés étrangères, ${stats.checks} CHECK de tables et ${stats.exclusions} exclusions. Les domaines ajoutent les bornes des notes, des montants FCFA et des textes obligatoires.`, '',
    'Toutes les tables ont RLS activée, sans accès applicatif permis à ce stade. Les noms techniques ne sont pas des libellés à afficher dans l’interface.', '',
    '| Schéma | Table | Colonnes | FK | RLS |', '|---|---|---:|---:|---|'];
  const cell = value => String(value ?? '—').replaceAll('|','&#124;').replaceAll('\n',' ');
  for (const table of tables) lines.push(`| ${table.schema} | ${table.name} | ${columns.filter(item => item.schema === table.schema && item.table === table.name).length} | ${constraints.filter(item => item.schema === table.schema && item.table === table.name && item.type === 'f').length} | ${table.rls ? 'Oui' : 'Non'} |`);
  for (const table of tables) {
    lines.push('', `## ${table.schema}.${table.name}`, '', '| Attribut | Type | Nullable | Défaut | Généré |', '|---|---|---|---|---|');
    for (const column of columns.filter(item => item.schema === table.schema && item.table === table.name)) {
      lines.push(`| ${column.name} | ${cell(column.type)} | ${column.nullable} | ${cell(column.default)} | ${column.generated} |`);
    }
    lines.push('', 'Contraintes :', '', '```sql');
    for (const constraint of constraints.filter(item => item.schema === table.schema && item.table === table.name)) lines.push(`${constraint.name}: ${constraint.definition}`);
    lines.push('```', '', 'Index :', '', '```sql');
    for (const index of indexes.filter(item => item.schema === table.schema && item.table === table.name)) lines.push(index.definition);
    lines.push('```');
  }
  lines.push('', '## Vues calculées', '');
  for (const view of views) lines.push(`### ${view.schema}.${view.name}`, '', '```sql', view.definition, '```', '');
  await writeFile(fileURLToPath(new URL('../docs/DICTIONNAIRE_BASE_RELATIONNELLE.md', import.meta.url)), lines.join('\n') + '\n');
  await writeFile(fileURLToPath(new URL('../docs/SCHEMA_BASE_RELATIONNELLE.json', import.meta.url)), JSON.stringify({ stats,tables,columns,constraints,indexes,views },null,2) + '\n');
  console.log(JSON.stringify(stats));
} catch (error) {
  console.error('Dictionnaire interrompu :',error.message);
  process.exitCode = 1;
} finally { await db.close(); }
