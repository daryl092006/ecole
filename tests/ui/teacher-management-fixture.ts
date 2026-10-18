import type { PersistentContext, PersistentChange } from '../../src/types/persistence';
import { loadSecurityApi, evaluationSecurityRoute, securityContext, securityIds as id, uuid } from './security-fixture';

export function teacherFixture(context: PersistentContext = securityContext(), mutate = false) {
  const snapshot = evaluationSecurityRoute(context).snapshot;
  const tables = snapshot.tables;
  tables.academic_years[0].starts_on = '2026-01-01'; tables.academic_years[0].ends_on = '2027-12-31';
  tables.people = [0, 1, 2].map(index => ({ id: uuid(920 + index), firstname: ['Alice', 'Benoît', 'Claire'][index], lastname: 'Enseignant' }));
  tables.staff = [0, 1, 2].map(index => ({ id: uuid(910 + index), person_id: uuid(920 + index), employee_number: `ENS-${index + 1}` }));
  tables.teachers = [0, 1].map(index => ({ id: uuid(20 + index), staff_id: uuid(910 + index), specialty: ['Analyse', 'Réseaux'][index], active: true }));
  tables.programs = [{ id: uuid(89), name: 'Informatique' }]; tables.levels = [{ id: uuid(88), name: 'Licence 1' }];
  tables.curricula = [0, 1].map(index => ({ id: uuid(80 + index), program_id: uuid(89), level_id: uuid(88), status: 'APPROVED' }));
  tables.curriculum_semesters = [0, 1].map(index => ({ id: uuid(84 + index), curriculum_id: uuid(80 + index), position: 1 }));
  tables.teaching_units = [0, 1].map(index => ({ id: uuid(82 + index), curriculum_id: uuid(80 + index), semester_id: uuid(84 + index) }));
  tables.curriculum_components.forEach((row, index) => Object.assign(row, { curriculum_id: uuid(80 + index), unit_id: uuid(82 + index), code: `EC${index + 1}` }));
  tables.subjects.forEach((row, index) => { row.name = ['Analyse annuelle', 'Réseaux annuels'][index]; });
  tables.academic_offerings.forEach(row => Object.assign(row, { curriculum_id: uuid(row.academic_year_id === id.year ? 80 : 81), level_id: uuid(88) }));
  tables.groups.forEach((row, index) => { row.name = `Groupe ${index + 1}`; });
  tables.teaching_assignments.forEach(row => Object.assign(row, { curriculum_id: tables.academic_offerings.find(offering => offering.id === row.offering_id)!.curriculum_id, valid_from: '2026-01-01', valid_until: '2027-12-31' }));
  const transactions: PersistentChange[][] = [];
  const client = { rpc: async (name: string, args: Record<string, unknown> = {}) => {
    if (name === 'escen_backend_snapshot') return { data: snapshot, error: null };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: id.year }, error: null };
    if (name !== 'escen_backend_transaction') throw new Error(`RPC inattendue : ${name}`);
    const changes = args.p_changes as PersistentChange[];
    transactions.push(changes);
    if (mutate) {
      for (const change of changes) {
        const rows = tables[change.table] ||= [];
        if (change.operation === 'insert') rows.push(change.record as typeof rows[number]);
        else Object.assign(rows.find(row => row.id === change.record.id)!, change.record);
      }
      snapshot.revision += 1;
    }
    return { data: mutate ? snapshot.revision : 5, error: null };
  } };
  const api = loadSecurityApi('app/api/teachers/route.ts', client, context) as { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };
  const staffApi = loadSecurityApi('app/api/staff/route.ts', client, context) as { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };
  const post = (body: Record<string, unknown>, year = id.year) => api.POST(new Request('http://local.test/api/teachers', {
    method: 'POST', headers: { 'x-escen-year': year }, body: JSON.stringify({ revision: snapshot.revision, reason: 'Motif de gestion pédagogique', ...body }),
  }));
  const get = (year = id.year) => api.GET(new Request('http://local.test/api/teachers', { headers: { 'x-escen-year': year } }));
  return { snapshot, transactions, api, staffApi, post, get };
}
