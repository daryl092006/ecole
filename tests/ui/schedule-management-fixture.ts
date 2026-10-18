import type { PersistentChange, PersistentContext } from '../../src/types/persistence';
import { teacherFixture } from './teacher-management-fixture';
import { loadSecurityApi, securityContext, securityIds as id, uuid } from './security-fixture';

export function scheduleFixture(context: PersistentContext = securityContext(), mutate = false) {
  const snapshot = teacherFixture(context).snapshot;
  const tables = snapshot.tables;
  tables.sites = [{ id: id.site, name: 'Site principal' }, { id: id.otherSite, name: 'Autre site' }];
  tables.rooms = [0, 1].map(index => ({ id: uuid(950 + index), site_id: id.site, code: `S${index + 1}`, name: `Salle ${index + 1}`, capacity: 30, status: 'AVAILABLE' }));
  tables.offering_semesters = tables.academic_offerings.map((offering, index) => ({ id: uuid(960 + index), offering_id: offering.id, curriculum_id: offering.curriculum_id, curriculum_semester_id: uuid(offering.academic_year_id === id.year ? 84 : 85), starts_on: '2026-01-01', ends_on: '2027-12-31' }));
  tables.sessions = [{ id: uuid(970), assignment_id: id.assignment(0), offering_id: uuid(40), group_id: id.group, teacher_id: id.teacher,
    room_id: uuid(950), starts_at: '2026-10-20T08:00:00Z', ends_at: '2026-10-20T10:00:00Z', mode: 'COURS', status: 'PLANIFIE', reason: 'Séance initiale' }];
  tables.attendances = []; tables.blocked_periods = []; tables.exam_deliveries = [];
  const transactions: PersistentChange[][] = [];
  let failure: { message: string; code?: string } | null = null;
  const client = { async rpc(name: string, args: Record<string, unknown> = {}) {
    if (name === 'escen_backend_snapshot') return { data: snapshot, error: null };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: id.year }, error: null };
    if (name !== 'escen_backend_transaction') throw new Error(`RPC inattendue : ${name}`);
    if (failure) return { data: null, error: failure };
    const changes = args.p_changes as PersistentChange[];
    transactions.push(changes);
    if (mutate) {
      for (const change of changes) {
        const rows = tables[change.table] ||= [];
        if (change.operation === 'insert') rows.push(change.record as typeof rows[number]);
        else Object.assign(rows.find(row => row.id === change.record.id)!, change.record);
      }
      snapshot.revision++;
    }
    return { data: snapshot.revision, error: null };
  } };
  const api = loadSecurityApi('app/api/schedule/route.ts', client, context) as { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };
  const get = (year = id.year) => api.GET(new Request('http://local.test/api/schedule', { headers: { 'x-escen-year': year } }));
  const post = (body: Record<string, unknown>, year = id.year) => api.POST(new Request('http://local.test/api/schedule', { method: 'POST', headers: { 'x-escen-year': year }, body: JSON.stringify({ revision: snapshot.revision, reason: 'Organisation pédagogique validée', ...body }) }));
  return { snapshot, transactions, api, get, post, fail: (message: string) => { failure = { message }; } };
}

export const createSession = { action: 'create_session', assignmentId: id.assignment(0), roomId: uuid(950), mode: 'COURS', startsAt: '2026-10-21T08:00:00Z', endsAt: '2026-10-21T10:00:00Z' };
