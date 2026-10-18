import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';
import { ROLES, type RoleName } from '../../src/types/permissions';
import type { PersistentContext, RelationalSnapshot } from '../../src/types/persistence';

export const uuid = (number: number) => `10000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
export const securityIds = {
  year: uuid(1), otherYear: uuid(2), site: uuid(3), otherSite: uuid(4), teacher: uuid(20),
  group: uuid(30), otherGroup: uuid(31), otherYearGroup: uuid(32), otherSiteGroup: uuid(33),
  assignment: (index: number) => uuid(100 + index), evaluation: (index: number) => uuid(200 + index),
  candidate: (index: number) => uuid(300 + index), grade: (index: number) => uuid(400 + index),
};

// Execute the real route, validation and permission checks; stub only Auth and RPC transport.
export function loadSecurityApi(path: string, client: unknown, context: PersistentContext) {
  const overrides = new Map<string, unknown>([
    ['server-only', {}],
    ['@/lib/supabase/server', { getSupabaseServerClient() { throw new Error('Connexion distante interdite dans ces tests.'); } }],
  ]);
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  function load(filename: string): Record<string, unknown> {
    if (cache.has(filename)) return cache.get(filename)!.exports;
    const loaded = { exports: {} };
    cache.set(filename, loaded);
    const localRequire = createRequire(filename);
    const requireModule = (name: string): unknown => {
      if (overrides.has(name)) return overrides.get(name);
      if (name.startsWith('@/')) return name.endsWith('.json') ? localRequire(resolve('src', name.slice(2))) : load(resolve('src', `${name.slice(2)}.ts`));
      return localRequire(name);
    };
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(requireModule, loaded, loaded.exports);
    return loaded.exports;
  }
  const auth = load(resolve('src/server/auth.ts'));
  overrides.set('@/server/auth', { ...auth, requireAccount: async () => ({ client, context }) });
  return load(resolve('src', path));
}

export function securityContext(role: RoleName = ROLES.IT, overrides: Partial<PersistentContext> = {}): PersistentContext {
  return {
    accountId: uuid(900), personId: uuid(901), authUserId: uuid(902), roleCode: 'IT', role,
    permissions: ROLE_ACCESS[role].permissions, studentId: null, teacherId: securityIds.teacher,
    grants: [{ role_code: 'IT', role_name: role, site_id: null, academic_year_id: null, group_id: null }],
    ...overrides,
  };
}

export function evaluationSecurityRoute(context = securityContext()) {
  const id = securityIds;
  const offerings = [
    { id: uuid(40), academic_year_id: id.year, site_id: id.site },
    { id: uuid(41), academic_year_id: id.otherYear, site_id: id.site },
    { id: uuid(42), academic_year_id: id.year, site_id: id.otherSite },
  ];
  const assignments = [
    { offering: 0, group: id.group, teacher: id.teacher, subject: 0 },
    { offering: 0, group: id.otherGroup, teacher: uuid(21), subject: 0 },
    { offering: 1, group: id.otherYearGroup, teacher: id.teacher, subject: 1 },
    { offering: 2, group: id.otherSiteGroup, teacher: id.teacher, subject: 0 },
    { offering: 0, group: id.otherGroup, teacher: id.teacher, subject: 0 },
    { offering: 0, group: id.group, teacher: id.teacher, subject: 1 },
  ];
  const snapshot: RelationalSnapshot = { revision: 4, tables: {
    academic_years: [id.year, id.otherYear].map((year, index) => ({ id: year, name: `Année ${index}`, status: 'OUVERTE', starts_on: `${2025 + index}-10-01`, ends_on: `${2026 + index}-07-01` })),
    academic_offerings: offerings,
    subjects: [id.year, id.otherYear].map((year, index) => ({ id: uuid(50 + index), academic_year_id: year })),
    curriculum_components: [0, 1].map(index => ({ id: uuid(60 + index), subject_id: uuid(50 + index) })),
    groups: [id.group, id.otherGroup, id.otherYearGroup, id.otherSiteGroup].map((group, index) => ({ id: group, academic_year_id: index === 2 ? id.otherYear : id.year, site_id: index === 3 ? id.otherSite : id.site })),
    group_offerings: [id.group, id.otherGroup, id.otherYearGroup, id.otherSiteGroup].map((group, index) => ({ id: uuid(70 + index), group_id: group, offering_id: offerings[index < 2 ? 0 : index - 1].id })),
    teaching_assignments: assignments.map((item, index) => ({ id: id.assignment(index), offering_id: offerings[item.offering].id, group_id: item.group, teacher_id: item.teacher, component_id: uuid(60 + item.subject) })),
    enrollments: assignments.map((item, index) => ({ id: uuid(500 + index), offering_id: offerings[item.offering].id, student_id: uuid(600 + index), status: index % 2 ? 'REINSCRIT' : 'INSCRIT' })),
    enrollment_groups: assignments.map((item, index) => ({ id: uuid(700 + index), enrollment_id: uuid(500 + index), offering_id: offerings[item.offering].id, group_id: item.group, valid_from: '2025-01-01', valid_until: null })),
    students: assignments.map((_, index) => ({ id: uuid(600 + index) })),
    evaluations: assignments.map((item, index) => ({ id: id.evaluation(index), assignment_id: id.assignment(index), offering_id: offerings[item.offering].id, component_id: uuid(60 + item.subject), status: 'BROUILLON' })),
    evaluation_candidates: assignments.map((item, index) => ({ id: id.candidate(index), evaluation_id: id.evaluation(index), enrollment_id: uuid(500 + index), offering_id: offerings[item.offering].id, eligibility: 'ELIGIBLE' })),
    grades: assignments.map((_, index) => ({ id: id.grade(index), candidate_id: id.candidate(index), value: 12, absence_status: null })),
  } };
  const transactions: { name: string; args: Record<string, unknown> }[] = [];
  const client = { rpc: async (name: string, args: Record<string, unknown>) => {
    if (name === 'escen_backend_snapshot') return { data: snapshot, error: null };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: id.year }, error: null };
    if (!['escen_backend_transaction', 'escen_evaluation_transaction'].includes(name)) throw new Error(`RPC inattendue : ${name}`);
    transactions.push({ name, args });
    return { data: 5, error: null };
  } };
  const route = loadSecurityApi('app/api/evaluations/route.ts', client, context) as { POST: (request: Request) => Promise<Response> };
  const post = (body: Record<string, unknown>, selectedYear = id.year) => route.POST(new Request('http://local.test/api/evaluations', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-escen-year': selectedYear }, body: JSON.stringify({ revision: 4, ...body }),
  }));
  return { snapshot, transactions, post };
}
