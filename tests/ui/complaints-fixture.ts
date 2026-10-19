import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { z } from 'zod';
import type { Page } from '@playwright/test';
import { authenticateFixture, fixtureCapabilities } from './persistent-fixture';
import { ROLES, type RoleName } from '../../src/types/permissions';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';
import { filterRelationalSnapshot } from '../../src/services/persistentPermissionsService';
import { filterSnapshotForAcademicYear } from '../../src/services/academicYearScopeService';
import type { PersistentChange, PersistentContext, RelationalSnapshot } from '../../src/types/persistence';

export const complaintId = '10000000-0000-4000-8000-000000000010';
export const yearId = '10000000-0000-4000-8000-000000000001';
export const oldYearId = '10000000-0000-4000-8000-000000000002';
export const gradeIds = [20, 21, 22].map(id => `10000000-0000-4000-8000-${String(id).padStart(12, '0')}`);

export function complaintsFixture(role: RoleName = ROLES.IT, overrides: Partial<PersistentContext> = {}) {
  const context: PersistentContext = {
    accountId: 'ACTOR', personId: 'P1', authUserId: 'AUTH', roleCode: Object.entries(ROLES).find(([, name]) => name === role)![0], role,
    permissions: ROLE_ACCESS[role].permissions, studentId: role === ROLES.STUD || role === ROLES.DEL ? 'S1' : null, teacherId: role === ROLES.ENS ? 'T1' : null,
    grants: [{ role_code: 'TEST', role_name: role, site_id: null, group_id: null, academic_year_id: null }], ...overrides,
  };
  const years = [yearId, oldYearId].map((id, index) => ({ id, code: `YEAR${index}`, name: index ? '2025-2026' : '2026-2027', status: 'OUVERTE' as const, starts_on: index ? '2025-10-01' : '2026-10-01', ends_on: index ? '2026-07-01' : '2027-07-01' }));
  const snapshot: RelationalSnapshot = { revision: 1, academicContext: { currentYearId: yearId, selectedYearId: yearId, selection: 'current', years }, tables: {
    academic_years: years,
    people: [{ id: 'P1', firstname: 'Alice', lastname: 'Test' }, { id: 'P2', firstname: 'Autre', lastname: 'Étudiant' }],
    students: [{ id: 'S1', person_id: 'P1', matricule: 'ETU-1' }, { id: 'S2', person_id: 'P2', matricule: 'ETU-2' }],
    academic_offerings: [{ id: 'O1', academic_year_id: yearId }, { id: 'O2', academic_year_id: oldYearId }],
    groups: [{ id: 'G1', name: 'Groupe A', academic_year_id: yearId }, { id: 'G2', name: 'Groupe B', academic_year_id: yearId }, { id: 'G3', name: 'Ancien groupe', academic_year_id: oldYearId }],
    group_offerings: [{ id: 'GO1', group_id: 'G1', offering_id: 'O1' }, { id: 'GO2', group_id: 'G2', offering_id: 'O1' }, { id: 'GO3', group_id: 'G3', offering_id: 'O2' }],
    teaching_assignments: [{ id: 'A1', teacher_id: 'T1', group_id: 'G1', offering_id: 'O1' }, { id: 'A2', teacher_id: 'T2', group_id: 'G2', offering_id: 'O1' }, { id: 'A3', teacher_id: 'T1', group_id: 'G3', offering_id: 'O2' }],
    enrollments: [{ id: 'N1', student_id: 'S1', offering_id: 'O1', status: 'INSCRIT' }, { id: 'N2', student_id: 'S2', offering_id: 'O1', status: 'INSCRIT' }, { id: 'N3', student_id: 'S1', offering_id: 'O2', status: 'INSCRIT' }],
    enrollment_groups: [{ id: 'NG1', enrollment_id: 'N1', offering_id: 'O1', group_id: 'G1', valid_from: '2026-10-01' }, { id: 'NG2', enrollment_id: 'N2', offering_id: 'O1', group_id: 'G2', valid_from: '2026-10-01' }, { id: 'NG3', enrollment_id: 'N3', offering_id: 'O2', group_id: 'G3', valid_from: '2025-10-01' }],
    evaluations: [0, 1, 2].map(index => ({ id: `E${index + 1}`, assignment_id: `A${index + 1}`, name: `Épreuve ${index + 1}`, kind: 'DEVOIR', status: 'PUBLIEES' })),
    evaluation_candidates: [0, 1, 2].map(index => ({ id: `C${index + 1}`, evaluation_id: `E${index + 1}`, enrollment_id: `N${index + 1}`, offering_id: index === 2 ? 'O2' : 'O1' })),
    grades: gradeIds.map((id, index) => ({ id, candidate_id: `C${index + 1}`, value: 12 })),
    complaints: [], complaint_events: [], grade_revisions: [],
  } };
  const transactions: { p_expected_revision: number; p_changes: PersistentChange[] }[] = [];
  let failNext = false;
  class RequestError extends Error { constructor(public status: number, message: string) { super(message); } }
  const serverAuth = {
    RequestError,
    requireAccount: async (request: Request) => {
      if (request.headers.get('authorization') !== 'Bearer fixture-auth-token') throw new RequestError(401, 'Connexion requise.');
      return { context, client: { rpc: async (name: string, args: { p_expected_revision: number; p_changes: PersistentChange[] }) => {
        if (name === 'escen_backend_snapshot') return { data: snapshot, error: null };
        if (name === 'escen_academic_year_context') return { data: { currentYearId: yearId }, error: null };
        if (name !== 'escen_backend_transaction') throw new Error(`RPC inattendue : ${name}`);
        transactions.push(args);
        if (failNext || args.p_expected_revision !== snapshot.revision) { failNext = false; return { error: new Error('CONCURRENT_UPDATE'), data: null }; }
        const tables = structuredClone(snapshot.tables);
        for (const change of args.p_changes) {
          if (change.operation !== 'insert') throw new Error('Seules les insertions sont attendues.');
          const row = { ...change.record, id: String(change.record.id), happened_at: '2026-10-17T12:00:00Z' };
          tables[change.table].push(row);
          if (change.table === 'complaint_events') tables.complaints.find(item => item.id === change.record.complaint_id)!.status = change.record.to_status;
          if (change.table === 'grade_revisions') tables.grades.find(item => item.id === change.record.grade_id)!.value = change.record.new_value;
        }
        snapshot.tables = tables;
        snapshot.revision++;
        return { data: snapshot.revision, error: null };
      } } };
    },
    requirePermission: (actor: PersistentContext, permission: PersistentContext['permissions'][number]) => { if (!actor.permissions.includes(permission)) throw new RequestError(403, 'Permission refusée.'); },
    errorResponse: (error: unknown) => Response.json({ error: error instanceof RequestError ? error.message : 'Demande invalide.' }, { status: error instanceof RequestError ? error.status : error instanceof z.ZodError ? 400 : 500 }),
  };
  const cache = new Map<string, Record<string, unknown>>();
  function load(filename: string): Record<string, unknown> {
    if (cache.has(filename)) return cache.get(filename)!;
    const exports: Record<string, unknown> = {};
    cache.set(filename, exports);
    const localRequire = createRequire(filename);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
    runInNewContext(compiled.outputText, { exports, Request, Response, crypto: webcrypto, require: (name: string) => {
      if (name === 'server-only') return {};
      if (name === '@/server/auth') return serverAuth;
      if (name.startsWith('@/') && !name.endsWith('.json')) return load(resolve('src', `${name.slice(2)}.ts`));
      return name.startsWith('@/') ? localRequire(resolve('src', name.slice(2))) : localRequire(name);
    } });
    return exports;
  }
  const route = load(resolve('src/app/api/complaints/route.ts')) as { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };
  const request = (body?: Record<string, unknown>, year = yearId) => new Request('http://localhost/api/complaints', {
    method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer fixture-auth-token', 'x-escen-year': year },
    ...(body ? { body: JSON.stringify({ revision: snapshot.revision, ...body }) } : {}),
  });
  return {
    context, snapshot, transactions, route,
    post: (body: Record<string, unknown>, year?: string) => route.POST(request(body, year)),
    get: (year?: string) => route.GET(request(undefined, year)),
    failNext: () => { failNext = true; },
    addComplaint: (status = 'NOUVELLE', candidate = 1, id = complaintId) => snapshot.tables.complaints.push({ id, candidate_id: `C${candidate}`, grade_id: gradeIds[candidate - 1], status, reason: 'Vérifier ma note publiée' }),
    install: async (page: Page) => {
      await authenticateFixture(page);
      await page.route('**/api/session', request => request.fulfill({ json: { capabilities: fixtureCapabilities, accountId: context.accountId, name: 'Alice Test', email: 'alice@example.test', role, availableRoles: [role], studentId: context.studentId, matricule: context.studentId ? 'ETU-1' : null, teacherId: context.teacherId, mustChangePassword: false } }));
      await page.route('**/api/campus', request => {
        const selection = request.request().headers()['x-escen-year'];
        const selectedYearId = selection === 'all' ? null : selection && selection !== 'current' ? selection : yearId;
        return request.fulfill({ json: { ...filterSnapshotForAcademicYear(filterRelationalSnapshot(snapshot, context), selectedYearId), academicContext: { ...snapshot.academicContext, selectedYearId, selection: selection || 'current' } } });
      });
      await page.route('**/api/complaints', async intercepted => {
        const method = intercepted.request().method();
        const response = await route[method === 'GET' ? 'GET' : 'POST'](new Request('http://localhost/api/complaints', {
          method, headers: intercepted.request().headers(), ...(method === 'POST' ? { body: intercepted.request().postData() || '' } : {}),
        }));
        await intercepted.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' });
      });
    },
  };
}
