import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAIN_WORKSPACES } from '@/data/domainWorkspaces';
import { MODULE_JOURNEYS } from '@/data/moduleJourneys';
import { CRUD_SECTIONS } from '@/data/crudCatalog';
import { PORTAL_ROUTES } from '@/constants/portalRoutes';

const routeSections = new Set(PORTAL_ROUTES.map(route => route.section));
const connected = new Set([...Object.keys(DOMAIN_WORKSPACES), ...Object.keys(CRUD_SECTIONS), 'espace_dashboard', 'dashboard_kpis', 'dashboard_reports', 'acad_settings', 'acad_subjects', 'acad_exams', 'acad_resits', 'acad_assessments', 'stud_list', 'stud_accounts', 'staff_records', 'staff_list', 'staff_roles', 'staff_permissions', 'sys_data']);
for (const route of PORTAL_ROUTES) assert.ok(connected.has(route.section), `${route.href} doit disposer d’un écran connecté explicite.`);
for (const stages of Object.values(MODULE_JOURNEYS)) for (const stage of stages) for (const section of stage.sections) assert.ok(routeSections.has(section), `Destination de parcours inconnue : ${section}`);
const columns = new Map<string, Set<string>>();
const migrations = join(process.cwd(), 'supabase', 'migrations');
for (const file of readdirSync(migrations)) {
  const sql = readFileSync(join(migrations, file), 'utf8');
  for (const match of sql.matchAll(/create table escen\.(\w+)\s*\(([\s\S]*?)\n\);/gi)) columns.set(match[1], new Set([...match[2].matchAll(/^  ([a-z_]+)\s+(?:uuid|text|escen\.|date|timestamptz|boolean|integer|numeric|jsonb)/gm)].map(field => field[1])));
}
for (const definition of Object.values(DOMAIN_WORKSPACES)) {
  for (const next of definition.next) assert.ok(routeSections.has(next));
  for (const collection of definition.collections) for (const column of collection.columns) assert.ok(columns.get(collection.table)?.has(column), `Attribut inexistant : ${collection.table}.${column}`);
}
