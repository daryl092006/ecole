import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { z } from 'zod';
import { ROLES, type RoleName } from '../../src/types/permissions';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';
import type { PersistentContext, RelationalSnapshot } from '../../src/types/persistence';

const uuid = (number: number) => `10000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const yearId = uuid(1);
const otherYearId = uuid(2);
const evaluationId = uuid(10);
const otherGroupEvaluationId = uuid(11);
const otherYearEvaluationId = uuid(12);
const otherSiteEvaluationId = uuid(13);

function transitionRoute(role: RoleName = ROLES.IT, overrides: Partial<PersistentContext> = {}) {
  const context: PersistentContext = {
    accountId: uuid(100), personId: uuid(101), authUserId: uuid(102), roleCode: 'IT', role,
    permissions: ROLE_ACCESS[role].permissions, studentId: null, teacherId: 'teacher1',
    grants: [{ role_code: 'IT', role_name: role, site_id: null, academic_year_id: null, group_id: null }],
    ...overrides,
  };
  const snapshot: RelationalSnapshot = { revision: 4, tables: {
    academic_years: [yearId, otherYearId].map((id, index) => ({ id, name: `Année ${index}`, status: 'OUVERTE', starts_on: `${2025 + index}-10-01`, ends_on: `${2026 + index}-07-01` })),
    academic_offerings: [
      { id: 'offering1', academic_year_id: yearId, site_id: 'site1' },
      { id: 'offering2', academic_year_id: otherYearId, site_id: 'site1' },
      { id: 'offering3', academic_year_id: yearId, site_id: 'site2' },
    ],
    groups: [
      { id: 'group1', academic_year_id: yearId, site_id: 'site1' },
      { id: 'group2', academic_year_id: yearId, site_id: 'site1' },
      { id: 'group3', academic_year_id: otherYearId, site_id: 'site1' },
      { id: 'group4', academic_year_id: yearId, site_id: 'site2' },
    ],
    group_offerings: [
      { id: 'link1', group_id: 'group1', offering_id: 'offering1' },
      { id: 'link2', group_id: 'group2', offering_id: 'offering1' },
      { id: 'link3', group_id: 'group3', offering_id: 'offering2' },
      { id: 'link4', group_id: 'group4', offering_id: 'offering3' },
    ],
    teaching_assignments: [
      { id: 'assignment1', teacher_id: 'teacher1', offering_id: 'offering1', group_id: 'group1' },
      { id: 'assignment2', teacher_id: 'teacher2', offering_id: 'offering1', group_id: 'group2' },
      { id: 'assignment3', teacher_id: 'teacher1', offering_id: 'offering2', group_id: 'group3' },
      { id: 'assignment4', teacher_id: 'teacher1', offering_id: 'offering3', group_id: 'group4' },
    ],
    evaluations: [evaluationId, otherGroupEvaluationId, otherYearEvaluationId, otherSiteEvaluationId].map((id, index) => ({ id, assignment_id: `assignment${index + 1}`, status: 'SOUMISES' })),
  } };
  const transactions: Record<string, unknown>[] = [];
  class RequestError extends Error {
    constructor(public status: number, message: string) { super(message); }
  }
  const serverAuth = {
    RequestError,
    requireAccount: async () => ({ context, client: { rpc: async (name: string, args: Record<string, unknown>) => {
      if (name === 'escen_backend_snapshot') return { data: snapshot, error: null };
      if (name === 'escen_academic_year_context') return { data: { currentYearId: yearId }, error: null };
      if (name !== 'escen_backend_transaction') throw new Error(`RPC inattendue : ${name}`);
      transactions.push(args);
      return { data: 5, error: null };
    } } }),
    requirePermission: (actor: PersistentContext, permission: PersistentContext['permissions'][number]) => {
      if (!actor.permissions.includes(permission)) throw new RequestError(403, 'Permission refusée.');
    },
    errorResponse: (error: unknown) => Response.json({ error: error instanceof RequestError ? error.message : 'Demande refusée.' }, {
      status: error instanceof RequestError ? error.status : error instanceof z.ZodError ? 400 : 500,
    }),
  };
  const cache = new Map<string, Record<string, unknown>>();
  function load(filename: string): Record<string, unknown> {
    if (cache.has(filename)) return cache.get(filename)!;
    const exports: Record<string, unknown> = {};
    cache.set(filename, exports);
    const localRequire = createRequire(filename);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
    runInNewContext(compiled.outputText, {
      exports, Request, Response, crypto: webcrypto,
      require: (name: string) => {
        if (name === 'server-only') return {};
        if (name === '@/server/auth') return serverAuth;
        if (name.startsWith('@/') && !name.endsWith('.json')) return load(resolve('src', `${name.slice(2)}.ts`));
        return name.startsWith('@/') ? localRequire(resolve('src', name.slice(2))) : localRequire(name);
      },
    });
    return exports;
  }
  const post = load(resolve('src/app/api/evaluations/route.ts')).POST as (request: Request) => Promise<Response>;
  const transition = (id: string, toStatus = 'A_CONTROLER', selectedYear = yearId, fromStatus = 'SOUMISES') => post(new Request('http://localhost/api/evaluations', {
    method: 'POST', headers: { 'x-escen-year': selectedYear },
    body: JSON.stringify({ action: 'transition_workflow', evaluationId: id, fromStatus, toStatus, revision: 4, reason: 'Contrôle du périmètre' }),
  }));
  return { transition, snapshot, transactions };
}

test('Toutes les transitions refusent une évaluation hors de l’année sélectionnée, même pour IT global', async () => {
  const route = transitionRoute();
  for (const status of ['BROUILLON', 'SAISIES', 'SOUMISES', 'A_CONTROLER', 'VALIDEES', 'PUBLIEES']) {
    const response = await route.transition(otherYearEvaluationId, status);
    expect(response.status).toBe(404);
  }
  expect(route.transactions).toEqual([]);
});

test('Une permission de contrôle ne permet pas de sortir du groupe ou du site attribué', async () => {
  const route = transitionRoute(ROLES.DA, { grants: [{ role_code: 'DA', role_name: ROLES.DA, site_id: 'site1', academic_year_id: yearId, group_id: 'group1' }] });
  for (const id of [otherGroupEvaluationId, otherSiteEvaluationId]) expect((await route.transition(id)).status).toBe(404);
  expect(route.transactions).toEqual([]);
  expect((await route.transition(evaluationId)).status).toBe(200);
  expect(route.transactions).toHaveLength(1);
});

test('Un enseignant ne peut pas soumettre une évaluation affectée à un autre enseignant', async () => {
  const route = transitionRoute(ROLES.ENS);
  expect((await route.transition(otherGroupEvaluationId, 'SOUMISES', yearId, 'SAISIES')).status).toBe(404);
  expect(route.transactions).toEqual([]);
});

test('La transition autorisée conserve révision, auteur et évaluation ciblée', async () => {
  const route = transitionRoute();
  expect((await route.transition(evaluationId)).status).toBe(200);
  expect(route.transactions).toHaveLength(1);
  expect(route.transactions[0]).toMatchObject({ p_actor_id: uuid(100), p_expected_revision: 4, p_changes: [{
    table: 'evaluation_transitions', operation: 'insert', record: { evaluation_id: evaluationId, from_status: 'SOUMISES', to_status: 'A_CONTROLER', actor_id: uuid(100) },
  }] });
});

test('Le filtrage conserve les refus de permission et de consultation toutes années', async () => {
  const denied = transitionRoute(ROLES.DA, { permissions: ['academic.view', 'schedule.view', 'grade.view'] });
  expect((await denied.transition(evaluationId)).status).toBe(403);
  expect(denied.transactions).toEqual([]);
  const allYears = transitionRoute();
  expect((await allYears.transition(evaluationId, 'A_CONTROLER', 'all')).status).toBe(409);
  expect(allYears.transactions).toEqual([]);
});
