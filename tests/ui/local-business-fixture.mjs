import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import { createDatabase, applyMigrations } from '../../scripts/database-engine.mjs';
import { prepareTestYear } from '../../scripts/academic-year-test-helpers.mjs';

// Only the Auth provider and transport are substituted. Routes, permissions,
// annual scopes, validation, transactions and reads execute production code.
export async function localBusinessFixture() {
  const db = createDatabase();
  await db.exec('create schema auth; create table auth.users(id uuid primary key);');
  await applyMigrations(db);
  const insert = async (table, record) => {
    if (!/^[a-z_]+$/.test(table) || Object.keys(record).some(key => !/^[a-z_]+$/.test(key))) throw new Error('Invalid fixture identifier');
    const keys = Object.keys(record);
    return (await db.query(`insert into escen.${table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
  };
  const value = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
  const authId = randomUUID();
  await db.query('insert into auth.users(id) values ($1)', [authId]);
  const person = await insert('people', { firstname: 'Recette', lastname: 'Locale', email: 'recette@example.test' });
  const account = await insert('accounts', { person_id: person.id, auth_user_id: authId, active: true });
  for (const code of ['IT', 'MKT']) {
    const roleId = await value('select id as value from escen.roles where code=$1', [code]);
    await insert('role_grants', { account_id: account.id, role_id: roleId, granted_by: account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Recette navigateur locale' });
  }
  const year = await insert('academic_years', { code: 'REC-2026', name: '2026-2027', starts_on: '2026-01-01', ends_on: '2027-12-31', status: 'OUVERTE' });
  const nextYear = await insert('academic_years', { code: 'REC-2028', name: '2028-2029', starts_on: '2028-01-01', ends_on: '2029-12-31', status: 'BROUILLON' });
  const cycle = await insert('cycles', { code: 'MASTER', name: 'Master' });
  const level = await insert('levels', { code: 'M1', name: 'Master 1', cycle_id: cycle.id, position: 1 });
  const programs = [];
  const curricula = [];
  for (const [code, name] of [['FIN', 'Finance Digitale'], ['MKT', 'Marketing Digital']]) {
    const program = await insert('programs', { code, name });
    programs.push(program);
    const curriculum = await insert('curricula', { program_id: program.id, level_id: level.id, version: 1 });
    curricula.push(curriculum);
    await insert('curriculum_semesters', { curriculum_id: curriculum.id, name: 'Semestre 1', position: 1, target_credits: 30 });
    if (programs.length === 1) await prepareTestYear({ db, insert, yearId: year.id, curriculum, level });
    else await insert('academic_offerings', { academic_year_id: year.id, curriculum_id: curriculum.id, level_id: level.id });
  }
  await value("select public.escen_academic_year_command($1,'IT','current',$2,(select revision from escen_private.portal_revision where singleton),'Année de recette navigateur') as value", [account.id, year.id]);
  const studentPerson = await insert('people', { firstname: 'Alice', lastname: 'Recette', email: 'alice@example.test' });
  const student = await insert('students', { person_id: studentPerson.id, matricule: 'RECETTE-LOCAL-001' });
  const offering = (await db.query('select * from escen.academic_offerings where curriculum_id=$1', [curricula[0].id])).rows[0];
  const semester = (await db.query('select * from escen.curriculum_semesters where curriculum_id=$1', [curricula[0].id])).rows[0];
  const offeringSemester = await insert('offering_semesters', { offering_id: offering.id, curriculum_id: curricula[0].id, curriculum_semester_id: semester.id, starts_on: '2026-01-01', ends_on: '2027-12-31' });
  const enrollment = await insert('enrollments', { student_id: student.id, offering_id: offering.id, status: 'INSCRIT', created_by: account.id });
  const rules = await insert('academic_rule_versions', { version: 1, rules: { passMark: 10, compensation: false }, approved_by: account.id, approved_at: new Date().toISOString(), reason: 'Règlement de recette locale' });
  const jury = await insert('juries', { offering_semester_id: offeringSemester.id, rules_id: rules.id, held_at: new Date().toISOString(), chaired_by: account.id });
  const decision = await insert('jury_decisions', { jury_id: jury.id, offering_semester_id: offeringSemester.id, offering_id: offering.id, enrollment_id: enrollment.id, decision: 'ADMIS', average: 14, earned_credits: 3, required_credits: 6, reason: 'Décision de recette locale', decided_by: account.id });
  const transcriptContent = { institution: { name: 'ESCEN', footer: 'Coordonnées figées de recette' }, student: { name: 'Alice Recette', matricule: student.matricule }, academicYear: year.name, level: level.name, program: programs[0].name, city: 'Lomé', director: 'Signataire de recette', semesters: [{ name: 'Semestre 1', rows: [{ code: 'TEST2101', name: 'Note absente de recette', credits: 3, average: null, validated: null }, { code: 'TEST2102', name: 'Note zéro de recette', credits: 3, average: 0, validated: false }], totalCredits: 6, earnedCredits: 0 }], totalCredits: 6, earnedCredits: 0, average: null, mention: null };
  const documents = [];
  for (const [reference, content] of [['REL-LOCAL-COMPLET', transcriptContent], ['REL-LOCAL-INCOMPLET', { average: 14 }]]) documents.push(await insert('generated_documents', { student_id: student.id, enrollment_id: enrollment.id, decision_id: decision.id, kind: 'RELEVE', reference, version: 1, content_snapshot: content, issued_by: account.id, issued_at: '2026-10-20T12:00:00Z' }));
  const files = new Map();
  const client = {
    storage: { from: bucket => ({
      upload: async (path, bytes) => { files.set(`${bucket}/${path}`, bytes); return { data: { path }, error: null }; },
      remove: async paths => { for (const path of paths) files.delete(`${bucket}/${path}`); return { data: [], error: null }; },
    }) },
    auth: { getUser: async token => ({ data: { user: token === 'fixture-auth-token' ? { id: authId, email: person.email, app_metadata: {} } : null }, error: null }) },
    async rpc(name, args = {}) {
      if (!/^[a-z_]+$/.test(name) || Object.keys(args).some(key => !/^[a-z_]+$/.test(key))) throw new Error('Invalid RPC identifier');
      try {
        const data = await value(`select public.${name}(${Object.keys(args).map((key, i) => `${key} => $${i + 1}`).join(',')}) as value`, Object.values(args).map(item => item !== null && typeof item === 'object' ? JSON.stringify(item) : item));
        return { data, error: null };
      } catch (error) { return { data: null, error: { code: error.code, message: error.message } }; }
    },
  };
  const cache = new Map();
  const root = new URL('../../src/', import.meta.url);
  function load(url) {
    const filename = fileURLToPath(url);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} };
    cache.set(filename, loaded);
    const localRequire = createRequire(url);
    const requireModule = name => {
      if (name === 'server-only') return {};
      if (name === '@/lib/supabase/server') return { getSupabaseServerClient: () => client };
      if (name.startsWith('@/') || name.startsWith('.')) {
        const target = new URL(name.startsWith('@/') ? name.slice(2) : name, name.startsWith('@/') ? root : url);
        if (target.pathname.endsWith('.json')) return localRequire(fileURLToPath(target));
        return load(new URL(target.href.endsWith('.ts') ? target.href : `${target.href}.ts`));
      }
      return localRequire(name);
    };
    const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
    runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(requireModule, loaded, loaded.exports);
    return loaded.exports;
  }
  const routes = {
    '/api/session': load(new URL('app/api/session/route.ts', root)),
    '/api/campus': load(new URL('app/api/campus/route.ts', root)),
    '/api/support': load(new URL('app/api/support/route.ts', root)),
    '/api/website-management': load(new URL('app/api/website-management/route.ts', root)),
    '/api/year-preparation': load(new URL('app/api/year-preparation/route.ts', root)),
    '/api/students': load(new URL('app/api/students/route.ts', root)),
  };
  const students = load(new URL('app/api/students/[matricule]/route.ts', root));
  const studentOperations = load(new URL('app/api/students/[matricule]/operations/route.ts', root));
  const catalog = load(new URL('app/api/catalog/[collection]/route.ts', root));
  const catalogItem = load(new URL('app/api/catalog/[collection]/[id]/route.ts', root));
  const transcripts = load(new URL('app/api/transcripts/[id]/route.ts', root));
  const publicWebsite = load(new URL('app/api/website/[...path]/route.ts', root));
  const requests = [];
  async function dispatch(request) {
    const path = new URL(request.url).pathname;
    const segments = path.split('/');
    const handlers = routes[path] || (segments[2] === 'catalog' ? segments[4] ? catalogItem : catalog : segments[2] === 'students' ? segments[4] === 'operations' ? studentOperations : students : segments[2] === 'transcripts' ? transcripts : segments[2] === 'website' ? publicWebsite : null);
    if (!handlers?.[request.method]) return Response.json({ error: 'Route non prévue dans la recette locale.' }, { status: 501 });
    const response = await handlers[request.method](request, { params: Promise.resolve({ collection: segments[3], id: segments[4] || segments[3], matricule: decodeURIComponent(segments[3] || ''), path: segments.slice(3) }) });
    requests.push({ path, method: request.method, status: response.status });
    return response;
  }
  return { db, insert, value, client, dispatch, requests, account, year, nextYear, level, programs, curricula, documents, files, close: () => db.close() };
}
