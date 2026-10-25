import type { Page } from '@playwright/test';
import { authenticateFixture, fixtureCapabilities, snapshot as identities } from './persistent-fixture';
import { attendanceFixture } from './attendance-management-fixture';
import { adjustmentFixture } from './payment-adjustments-fixture';
import { scheduleFixture } from './schedule-management-fixture';
import { loadSecurityApi, securityContext, securityIds as id, uuid } from './security-fixture';
import { filterRelationalSnapshot } from '../../src/services/persistentPermissionsService';
import { filterSnapshotForAcademicYear } from '../../src/services/academicYearScopeService';
import { ROLES } from '../../src/types/permissions';

const journalRecords = Array.from({ length: 51 }, (_, index) => ({
  id: uuid(7970 + index), date: '2026-10-19T08:00:00Z', actorId: uuid(900), actorName: 'Jean Technique', roles: ['IT'],
  table: 'payments', entityId: uuid(3010), action: 'UPDATE', reason: `Vérification financière du versement ${index + 1}`,
  oldValue: { status: 'PENDING', amount: 400 }, newValue: { status: 'POSTED', amount: 400 }, batchId: null, sourceId: null,
}));

export type AuditAccount = 'staff' | 'student' | 'anonymous' | 'password';
export async function installResponsiveAudit(page: Page, account: AuditAccount) {
  // Exercise real read handlers with isolated transport; never call a remote API or write data.
  const student = account === 'student';
  const context = securityContext(student ? ROLES.STUD : ROLES.IT, {
    roleCode: student ? 'STUD' : 'IT', studentId: student ? uuid(600) : null,
    teacherId: null,
    grants: [{ role_code: student ? 'STUD' : 'IT', role_name: student ? ROLES.STUD : ROLES.IT, site_id: null, group_id: null, academic_year_id: null }],
  });
  const campus = attendanceFixture().snapshot;
  const tables = campus.tables;
  const payments = adjustmentFixture().snapshot.tables;
  for (const table of ['financial_contracts', 'contract_versions', 'contract_lines', 'installments', 'payments', 'receipts', 'payment_allocations', 'annual_payment_channels']) tables[table] = payments[table];
  tables.people.push(...identities.tables.people);
  tables.accounts = identities.tables.accounts;
  tables.roles = identities.tables.roles;
  tables.role_grants = identities.tables.role_grants;
  tables.students[0].matricule = 'ESCEN-TEST-001';
  tables.people.find(row => row.id === uuid(700))!.lastname = 'Étudiante au nom composé';
  tables.academic_years[0].name = '2026-2027';
  tables.academic_years[0].code = '2026-2027';
  tables.academic_years[1].starts_on = '2025-01-01'; tables.academic_years[1].ends_on = '2025-12-31'; tables.academic_years[1].name = '2025-2026';
  tables.rooms = scheduleFixture().snapshot.tables.rooms;
  tables.sites = scheduleFixture().snapshot.tables.sites;
  tables.sessions.forEach((row, index) => Object.assign(row, { room_id: uuid(950), mode: 'COURS', starts_at: `2026-10-${19 + index}T08:00:00Z`, ends_at: `2026-10-${19 + index}T10:00:00Z` }));
  tables.programs[0].name = 'Ingénierie informatique et cybersécurité'; tables.programs[0].code = 'INFO'; tables.programs[0].active = true;
  tables.cycles = [{ id: uuid(7900), code: 'LICENCE', name: 'Licence professionnelle' }];
  Object.assign(tables.levels[0], { cycle_id: uuid(7900), code: 'L1', position: 1 });
  tables.curriculum_semesters.forEach(row => Object.assign(row, { name: 'Premier semestre', target_credits: 30 }));
  tables.teaching_units.forEach(row => Object.assign(row, { name: 'Méthodes quantitatives et systèmes', code: 'UE-ALGO', credits: 30 }));
  tables.curriculum_components.forEach(row => Object.assign(row, { credits: 30, coefficient: 1 }));
  tables.subjects.forEach((row, index) => Object.assign(row, { code: `MAT-${index + 1}`, active: true }));
  tables.evaluations.forEach((row, index) => Object.assign(row, { name: ['Examen de conception des systèmes distribués', 'Contrôle continu d’analyse', 'Rattrapage d’analyse'][index % 3], kind: ['EXAMEN', 'DEVOIR', 'RATTRAPAGE'][index % 3], max_grade: 20 }));
  tables.communications = [{ id: uuid(7920), title: 'Organisation et calendrier des délibérations de fin de semestre', content: 'Consultez les horaires communiqués par la direction académique.', academic_year_id: id.year, published_at: '2026-10-01T08:00:00Z' }];
  tables.communication_audiences = [{ id: uuid(7921), communication_id: uuid(7920), all_accounts: true }];
  tables.suppliers = [{ id: uuid(7930), name: 'Fournitures bureautiques et équipements pédagogiques', email: 'contact@example.test', phone: '+22890000000' }];
  tables.assets = [{ id: uuid(7931), code: 'SRV-01', name: 'Serveur de virtualisation et de sauvegarde', location: 'Salle technique', status: 'DISPONIBLE' }];
  tables.purchases = [{ id: uuid(7932), supplier_id: uuid(7930), reference: 'ACH-2026-001', status: 'BROUILLON', reason: 'Équipement pédagogique' }];
  tables.support_tickets = [{ id: uuid(7933), title: 'Accès aux ressources pédagogiques et aux copies', status: 'OUVERT', created_at: '2026-10-18T08:00:00Z' }];
  tables.complaints = [{ id: uuid(7940), candidate_id: tables.evaluation_candidates[0].id, grade_id: tables.grades[0].id, status: 'NOUVELLE', reason: 'Vérification du barème de la troisième question' }];

  const problems: string[] = [];
  const client = { async rpc(name: string) {
    if (name === 'escen_backend_snapshot') return { data: campus, error: null };
    if (name === 'escen_email_page') return { data: { yearId: id.year, records: [], total: 0, offset: 0, limit: 50 }, error: null };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: id.year }, error: null };
    if (['escen_catalog_history_links', 'escen_history_student_ids_year'].includes(name)) return { data: [], error: null };
    if (['escen_history_catalog', 'escen_history_catalog_year'].includes(name)) return { data: { totalSourceRows: 0, datasets: [], references: {} }, error: null };
    throw new Error(`RPC non prévue pendant la lecture : ${name}`);
  } };
  const cache = new Map<string, Record<string, unknown>>();
  type Handler = (request: Request, params?: { params: Promise<Record<string, string>> }) => Promise<Response>;
  const dispatch = async (request: Request) => {
    const path = new URL(request.url).pathname;
    const collection = path.match(/^\/api\/catalog\/([^/]+)$/)?.[1];
    const matricule = path.match(/^\/api\/students\/([^/]+)(\/operations)?$/)?.[1];
    const file = collection ? 'app/api/catalog/[collection]/route.ts' : matricule ? `app/api/students/[matricule]/${path.endsWith('/operations') ? 'operations/' : ''}route.ts` : `app${path}/route.ts`;
    if (!cache.has(file)) cache.set(file, loadSecurityApi(file, client, context));
    return (cache.get(file)!.GET as Handler)(request, { params: Promise.resolve({ ...(collection ? { collection } : {}), ...(matricule ? { matricule: decodeURIComponent(matricule) } : {}) }) });
  };
  if (account !== 'anonymous') await authenticateFixture(page);
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() !== 'GET') {
      problems.push(`Écriture inattendue : ${request.method()} ${url.pathname}`);
      return route.fulfill({ status: 405, json: { error: 'Audit en lecture seule.' } });
    }
    try {
      let json: unknown;
      if (url.pathname === '/api/session') json = account === 'anonymous' ? null : { capabilities: fixtureCapabilities, accountId: context.accountId, name: student ? 'Élise Étudiante' : 'Jean Technique', email: 'audit@example.test', role: context.role, availableRoles: [context.role], studentId: context.studentId, teacherId: null, matricule: student ? 'ESCEN-TEST-001' : null, mustChangePassword: account === 'password' };
      else if (url.pathname === '/api/campus') json = { ...filterSnapshotForAcademicYear(filterRelationalSnapshot(campus, context), id.year), academicContext: { currentYearId: id.year, currentYearConfigured: true, selectedYearId: id.year, selection: 'current', years: tables.academic_years } };
      else if (url.pathname === '/api/support') {
        const scoped = filterSnapshotForAcademicYear(filterRelationalSnapshot(campus, context), id.year);
        json = { revision: campus.revision, yearId: id.year, canManage: context.permissions.includes('system.support.manage'), tickets: scoped.tables.support_tickets || [], messages: scoped.tables.support_messages || [], categories: scoped.tables.support_categories || [] };
      }
      else if (url.pathname === '/api/communications') {
        const scoped = filterSnapshotForAcademicYear(filterRelationalSnapshot(campus, context), id.year);
        json = { revision: campus.revision, yearId: id.year, canManage: context.permissions.includes('communication.manage'), announcements: scoped.tables.communications || [], audiences: scoped.tables.communication_audiences || [], roles: scoped.tables.roles || [], groups: scoped.tables.groups || [] };
      }
      else if (url.pathname === '/api/purchases') {
        const scoped = filterSnapshotForAcademicYear(filterRelationalSnapshot(campus, context), id.year);
        json = { revision: campus.revision, yearId: id.year, canCreate: context.permissions.includes('purchase.create'), canApprove: context.permissions.includes('purchase.approve'), canReceive: context.permissions.includes('purchase.receive'), requiresSite: false, purchases: scoped.tables.purchases || [], lines: scoped.tables.purchase_lines || [], receipts: scoped.tables.purchase_receipts || [], expenses: scoped.tables.expenses || [], suppliers: scoped.tables.suppliers || [], sites: scoped.tables.sites || [] };
      }
      else if (url.pathname === '/api/history') json = url.searchParams.has('table')
        ? { table: url.searchParams.get('table'), total: 0, records: [], offset: Number(url.searchParams.get('offset') || 0), limit: 50 }
        : { totalSourceRows: 0, datasets: [], references: {} };
      else if (url.pathname === '/api/audit') json = { source: 'current', yearId: id.year, total: journalRecords.length, offset: 0, limit: 50, records: journalRecords.slice(0, 50) };
      else if (url.pathname === '/api/website-brochures') json = [{ id: uuid(7950), academic_year_id: id.year, title: 'Brochure des formations en informatique et cybersécurité', slug: 'formations-informatique', description: 'Parcours de licence professionnelle et poursuite d’études.', status: 'PUBLIE', filename: 'formations-escen.pdf', byte_size: 2450000, version: 1, program_id: uuid(89), cycle: 'LICENCE' }];
      else if (url.pathname === '/api/website-management') json = url.searchParams.get('kind') === 'articles' ? [{ id: uuid(7951), title: 'Ouverture de l’année universitaire et des formations', slug: 'ouverture-annee', excerpt: 'Découvrez les nouvelles formations et les dates de rentrée.', content: 'Informations institutionnelles de rentrée.', image: '', status: 'PUBLIE', version: 1 }] : {
        years: tables.academic_years, levels: tables.levels, programs: tables.programs,
        articles: [], applications: [{ id: uuid(7952), academic_year_id: id.year, reference: 'CAND-2026-001', identity: { nom: 'Mensah', prenom: 'Koffi', email: 'koffi@example.test', tel: '+22890000000' }, diploma: { type_diplome_id: 'Baccalauréat déclaré' }, guardians: [], documents: [], intake_label: 'Licence professionnelle en informatique', status: 'RECU', version: 1 }],
        intakes: [{ id: uuid(7953), academic_year_id: id.year, level_id: uuid(88), program_id: uuid(89), label: 'Licence professionnelle en informatique', level_name: 'Licence 1', program_name: 'Informatique', active: true, required_documents: ['diplome_file'], version: 1 }],
      };
      else if (url.pathname === '/api/exam-attempts') json = { serverNow: '2026-10-19T08:00:00Z', exams: [{ evaluationId: tables.evaluations[0].id, name: 'Examen en ligne de conception des systèmes distribués', kind: 'EXAMEN', opensAt: '2026-10-20T08:00:00Z', closesAt: '2026-10-20T10:00:00Z', durationMinutes: 90, attemptId: null, status: null, deadlineAt: null, submittedAt: null, completionStatus: null }] };
      else {
        const response = await dispatch(new Request(request.url(), { headers: request.headers() }));
        if (!response.ok) problems.push(`${response.status} ${url.pathname}: ${await response.clone().text()}`);
        return route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' });
      }
      return route.fulfill({ status: account === 'anonymous' && url.pathname === '/api/session' ? 401 : 200, json });
    } catch (error) {
      problems.push(`${url.pathname}: ${String(error)}`);
      return route.fulfill({ status: 500, json: { error: 'Fixture de capture incomplète.' } });
    }
  });
  return { problems };
}
