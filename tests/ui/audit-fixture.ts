import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import type { Page } from '@playwright/test';
import { ROLES, type RoleName } from '../../src/types/permissions';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';
import type { PersistentContext, RelationalSnapshot } from '../../src/types/persistence';
import { authenticateFixture, fixtureCapabilities } from './persistent-fixture';

export const auditYearId = '10000000-0000-4000-8000-000000000001';
export const auditAccountId = '10000000-0000-4000-8000-000000000010';
export interface JournalRecord {
  id: string; date: string | null; actorId: string | null; actorName: string | null; roles: string[];
  table: string | null; entityId: string | null; action: string | null; reason: string | null;
  oldValue: Record<string, unknown> | null; newValue: Record<string, unknown> | null; batchId: string | null; sourceId: string | null;
}
export interface JournalPage { source: string; yearId: string | null; total: number; offset: number; limit: number; records: JournalRecord[]; }
export const journalRecords: JournalRecord[] = Array.from({ length: 51 }, (_, index) => ({
  id: `audit-${index}`, date: '2026-10-16T12:00:00Z', actorId: auditAccountId, actorName: 'Jean Technique', roles: ['IT'],
  table: 'payments', entityId: `payment-${index}`, action: 'UPDATE', reason: `Contrôle du versement ${index}`,
  oldValue: { amount: 100, status: 'PENDING' }, newValue: { amount: 150, status: 'POSTED' }, batchId: null, sourceId: null,
}));
export const archiveRecord: JournalRecord = {
  id: 'archive-row', date: '2025-06-12 08:00:00', actorId: '42', actorName: null, roles: [], table: 'App\\Models\\Etudiant',
  entityId: '123', action: 'updated', reason: null, oldValue: null, newValue: null, batchId: 'archive-batch', sourceId: '77',
};

export function auditRouteFixture(options: { role?: RoleName; global?: boolean; permission?: boolean; exportPermission?: boolean; authenticated?: boolean; unavailable?: boolean } = {}) {
  const role = options.role || ROLES.IT;
  const context: PersistentContext = {
    accountId: auditAccountId, personId: 'P1', authUserId: 'AUTH', role,
    roleCode: Object.entries(ROLES).find(([, name]) => name === role)![0],
    permissions: options.permission === false ? [] : ROLE_ACCESS[role].permissions.filter(permission => options.exportPermission !== false || permission !== 'system.backup.manage'),
    studentId: null, teacherId: null,
    grants: [{ role_code: 'TEST', role_name: role, site_id: null, group_id: null, academic_year_id: options.global === false ? auditYearId : null }],
  };
  const snapshot: RelationalSnapshot = { revision: 1, tables: {
    academic_years: [{ id: auditYearId, code: '2026', name: '2026-2027', status: 'OUVERTE', starts_on: '2026-10-01', ends_on: '2027-07-01' }],
    academic_offerings: [{ id: 'O1', academic_year_id: auditYearId }],
    enrollments: [{ id: 'N1', offering_id: 'O1', student_id: 'S1' }],
    payments: [{ id: 'PAY1', enrollment_id: 'N1', amount: 150 }],
  } };
  const calls: { name: string; args: Record<string, unknown> | undefined }[] = [];
  class RequestError extends Error { constructor(public status: number, message: string) { super(message); } }
  const serverAuth = {
    RequestError,
    requireAccount: async () => {
      if (options.authenticated === false) throw new RequestError(401, 'Connexion requise.');
      return { context, client: { rpc: async (name: string, args?: Record<string, unknown>) => {
        calls.push({ name, args });
        if (name === 'escen_backend_snapshot') return { data: snapshot, error: null };
        if (name === 'escen_academic_year_context') return { data: { currentYearId: auditYearId }, error: null };
        if (name !== 'escen_audit_journal_page') throw new Error('RPC inattendue');
        if (options.unavailable) return { data: null, error: { code: 'PGRST202' } };
        return { data: { source: args!.p_source, yearId: args!.p_year_id, total: 0, offset: args!.p_offset, limit: 50, records: [] }, error: null };
      } } };
    },
    requirePermission: (actor: PersistentContext, permission: PersistentContext['permissions'][number]) => { if (!actor.permissions.includes(permission)) throw new RequestError(403, 'Permission refusée.'); },
    errorResponse: (error: unknown) => Response.json({ error: error instanceof RequestError ? error.message : 'Filtres invalides.' }, { status: error instanceof RequestError ? error.status : error instanceof z.ZodError ? 400 : 500 }),
  };
  const cache = new Map<string, Record<string, unknown>>();
  function load(filename: string): Record<string, unknown> {
    if (cache.has(filename)) return cache.get(filename)!;
    const exports: Record<string, unknown> = {};
    cache.set(filename, exports);
    const localRequire = createRequire(filename);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
    runInNewContext(compiled.outputText, { exports, Request, Response, URL, require: (name: string) => {
      if (name === 'server-only') return {};
      if (name === '@/server/auth') return serverAuth;
      if (name.startsWith('@/') && !name.endsWith('.json')) return load(resolve('src', `${name.slice(2)}.ts`));
      return name.startsWith('@/') ? localRequire(resolve('src', name.slice(2))) : localRequire(name);
    } });
    return exports;
  }
  const get = load(resolve('src/app/api/audit/route.ts')).GET as (request: Request) => Promise<Response>;
  return { calls, get: (query = '', year = 'current') => get(new Request(`http://localhost/api/audit${query}`, { headers: { 'x-escen-year': year } })) };
}

export async function installJournalFixture(page: Page, role: RoleName = ROLES.IT, globalAccess = true, exportPermission = true) {
  await authenticateFixture(page);
  await page.route('**/api/session', route => route.fulfill({ json: {
    capabilities: { ...fixtureCapabilities, [role]: { permissions: ROLE_ACCESS[role].permissions.filter(permission => exportPermission || permission !== 'system.backup.manage'), globalAccess } },
    accountId: auditAccountId, name: 'Jean Technique', email: 'it@example.test', role, availableRoles: [role],
    studentId: null, teacherId: null, matricule: null, mustChangePassword: false,
  } }));
  await page.route('**/api/campus', route => route.fulfill({ json: { revision: 1, tables: {}, academicContext: {
    currentYearId: auditYearId, selectedYearId: route.request().headers()['x-escen-year'] === 'all' ? null : auditYearId, selection: 'current',
    years: [{ id: auditYearId, name: '2026-2027', status: 'OUVERTE', starts_on: '2026-10-01', ends_on: '2027-07-01' }],
  } } }));
}
