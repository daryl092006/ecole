import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAIN_WORKSPACES } from '@/data/domainWorkspaces';
import { MODULE_JOURNEYS } from '@/data/moduleJourneys';
import { CRUD_SECTIONS } from '@/data/crudCatalog';
import { PORTAL_ROUTES } from '@/constants/portalRoutes';
import { WORKSPACE_NAVIGATION, getWorkspaceNavigation } from '@/constants/workspaceNavigation';
import { getAvailableTabs } from '@/permissions/navigation';
import { ROLES } from '@/types/permissions';

const navigationSections = WORKSPACE_NAVIGATION.flatMap(group => group.sections);
assert.deepEqual([...navigationSections].sort(), PORTAL_ROUTES.filter(route => !['acad_resits', 'acad_assessments'].includes(route.section)).map(route => route.section).sort(), 'Chaque page hors ancienne redirection doit apparaître exactement une fois dans les menus.');
for (const role of Object.values(ROLES)) {
  const tabs = getAvailableTabs(role);
  const expected = tabs.flatMap(tab => tab.subTabs.map(page => page.id)).sort();
  assert.deepEqual(getWorkspaceNavigation(tabs).flatMap(group => group.pages.map(page => page.id)).sort(), expected, `Conserver exactement les pages autorisées pour ${role}.`);
}
assert.deepEqual(getWorkspaceNavigation(getAvailableTabs(ROLES.IT, [])).flatMap(group => group.pages.map(page => page.id)).sort(), getAvailableTabs(ROLES.IT, []).flatMap(tab => tab.subTabs.map(page => page.id)).sort());

const routeSections = new Set(PORTAL_ROUTES.map(route => route.section));
const connected = new Set(['espace_exams', 'espace_profile', ...Object.keys(DOMAIN_WORKSPACES), ...Object.keys(CRUD_SECTIONS), 'web_applications', 'web_documents', 'web_brochures', 'espace_dashboard', 'dashboard_kpis', 'dashboard_reports', 'acad_settings', 'acad_subjects', 'acad_exams', 'acad_resits', 'acad_assessments', 'stud_list', 'stud_accounts', 'staff_records', 'staff_list', 'staff_roles', 'staff_permissions', 'sys_data']);
connected.add('sys_emails');
for (const route of PORTAL_ROUTES) assert.ok(connected.has(route.section), `${route.href} doit disposer d’un écran connecté explicite.`);
for (const stages of Object.values(MODULE_JOURNEYS)) for (const stage of stages) for (const section of stage.sections) assert.ok(routeSections.has(section), `Destination de parcours inconnue : ${section}`);
for (const [tab, stages] of Object.entries(MODULE_JOURNEYS)) {
  const sections = stages.flatMap(stage => stage.sections);
  for (const route of PORTAL_ROUTES.filter(item => item.tab === tab)) assert.equal(sections.filter(section => section === route.section).length, 1, `${route.href} doit apparaître une fois dans le parcours de navigation.`);
}
const columns = new Map<string, Set<string>>();
const migrations = join(process.cwd(), 'supabase', 'migrations');
for (const file of readdirSync(migrations)) {
  const sql = readFileSync(join(migrations, file), 'utf8');
  for (const match of sql.matchAll(/create table escen\.(\w+)\s*\(([\s\S]*?)\n\);/gi)) columns.set(match[1], new Set([...match[2].matchAll(/^  ([a-z_]+)\s+(?:uuid|text|escen\.|date|timestamptz|boolean|integer|numeric|jsonb)/gm)].map(field => field[1])));
  for (const match of sql.matchAll(/alter table escen\.(\w+)\s+add column(?: if not exists)?\s+(\w+)\s+/gi)) {
    const fields = columns.get(match[1]);
    assert.ok(fields, `Table inconnue dans une évolution : ${match[1]}`);
    fields.add(match[2]);
  }
}
for (const definition of Object.values(DOMAIN_WORKSPACES)) {
  for (const next of definition.next) assert.ok(routeSections.has(next));
  for (const collection of definition.collections) for (const column of collection.columns) assert.ok(columns.get(collection.table)?.has(column), `Attribut inexistant : ${collection.table}.${column}`);
}

assert.equal(getAvailableTabs(ROLES.IT, undefined, false).some(tab => tab.id === 'website'), false);
assert.equal(getAvailableTabs(ROLES.STUD).some(tab => tab.id === 'website'), false);
assert.ok(getAvailableTabs(ROLES.IT).find(tab => tab.id === 'website')?.subTabs.some(page => page.id === 'web_documents'));
