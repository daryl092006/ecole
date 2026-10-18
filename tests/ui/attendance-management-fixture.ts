import type { PersistentChange, PersistentContext } from '../../src/types/persistence';
import { teacherFixture } from './teacher-management-fixture';
import { loadSecurityApi, securityContext, securityIds as id, uuid } from './security-fixture';

export const attendanceId = { session: uuid(2000), other: uuid(2001), teacherSession: uuid(2002), student: uuid(600), enrollment: uuid(500),
  presence: uuid(2100), proof: uuid(2200), file: uuid(2300) };
export function attendanceFixture(context: PersistentContext = securityContext(), mutate = false) {
  const snapshot = teacherFixture(context).snapshot;
  const t = snapshot.tables;
  t.people.push({ id: uuid(700), firstname: 'Élise', lastname: 'Étudiante', email: 'private@example.test' });
  t.students = [{ id: attendanceId.student, person_id: uuid(700), matricule: 'ETU-PRES-001' }];
  t.enrollment_groups = [{ id: uuid(800), enrollment_id: attendanceId.enrollment, offering_id: uuid(40), group_id: id.group, valid_from: '2026-01-01', valid_until: null }];
  t.sessions = [
    { id: attendanceId.session, assignment_id: id.assignment(0), offering_id: uuid(40), group_id: id.group, teacher_id: id.teacher, starts_at: '2026-11-01T08:00:00Z', ends_at: '2026-11-01T10:00:00Z', status: 'PLANIFIE' },
    { id: attendanceId.other, assignment_id: id.assignment(1), offering_id: uuid(40), group_id: id.otherGroup, teacher_id: uuid(21), starts_at: '2026-10-30T08:00:00Z', ends_at: '2026-10-30T10:00:00Z', status: 'PLANIFIE' },
    { id: attendanceId.teacherSession, assignment_id: id.assignment(1), offering_id: uuid(40), group_id: id.group, teacher_id: uuid(21), starts_at: '2026-10-29T08:00:00Z', ends_at: '2026-10-29T10:00:00Z', status: 'PLANIFIE' },
  ];
  t.session_supervisors = [{ id: uuid(2050), session_id: attendanceId.session, account_id: context.accountId }];
  t.attendances = [{ id: attendanceId.presence, session_id: attendanceId.session, enrollment_id: attendanceId.enrollment, offering_id: uuid(40), status: 'ABSENT', arrived_at: null, left_at: null, late_minutes: null, comment: null }];
  t.teacher_attendances = [];
  t.absence_justifications = [{ id: attendanceId.proof, attendance_id: attendanceId.presence, file_id: attendanceId.file, reason: 'Certificat médical', status: 'EN_ATTENTE' }];
  t.file_objects = [{ id: attendanceId.file, bucket: 'private-attendance', object_path: 'secret/proof.pdf', original_name: 'certificat.pdf' }];
  const transactions: PersistentChange[][] = [];
  const failures = { write: false, file: false, read: false };
  const downloads: string[] = [];
  const client = { storage: { from: (bucket: string) => ({ createSignedUrl: async (path: string) => {
    downloads.push(`${bucket}/${path}`);
    return failures.file ? { data: null, error: new Error('Storage unavailable') } : { data: { signedUrl: 'https://storage.example.test/signed-proof' }, error: null };
  } }) }, rpc: async (rpc: string, args: Record<string, unknown> = {}) => {
    if (rpc === 'escen_backend_snapshot') return failures.read ? { data: null, error: new Error('Read unavailable') } : { data: snapshot, error: null };
    if (rpc === 'escen_academic_year_context') return { data: { currentYearId: id.year }, error: null };
    if (rpc !== 'escen_attendance_transaction') throw new Error(`RPC inattendue : ${rpc}`);
    const changes = args.p_changes as PersistentChange[];
    transactions.push(changes);
    if (failures.write) return { data: null, error: new Error('Concurrent update') };
    if (mutate) {
      for (const change of changes) {
        const rows = t[change.table] ||= [];
        if (change.operation === 'insert') rows.push(change.record as typeof rows[number]);
        else {
          const row = rows.find(row => row.id === change.record.id)!;
          Object.assign(row, change.record);
          if (change.table === 'absence_justifications') {
            Object.assign(row, { reviewed_at: new Date().toISOString(), reviewed_by: context.accountId });
            const attendance = t.attendances.find(item => item.id === row.attendance_id)!;
            if (row.status === 'VALIDE' && ['ABSENT', 'RETARD'].includes(String(attendance.status))) Object.assign(attendance, { status: attendance.status === 'ABSENT' ? 'ABSENT_JUSTIFIE' : 'RETARD_JUSTIFIE', reason: row.review_reason });
          }
        }
      }
      snapshot.revision++;
    }
    return { data: mutate ? snapshot.revision : snapshot.revision + 1, error: null };
  } };
  const api = loadSecurityApi('app/api/attendances/route.ts', client, context) as { GET(request: Request): Promise<Response>; POST(request: Request): Promise<Response> };
  const post = (body: Record<string, unknown>, year = id.year) => api.POST(new Request('http://local.test/api/attendances', { method: 'POST', headers: { 'x-escen-year': year }, body: JSON.stringify({ revision: snapshot.revision, ...body }) }));
  const get = (year = id.year, query = '') => api.GET(new Request(`http://local.test/api/attendances${query}`, { headers: { 'x-escen-year': year } }));
  const entry = (status = 'PRESENT') => ({ enrollmentId: attendanceId.enrollment, status, arrivedAt: null, leftAt: null, lateMinutes: null, comment: '' });
  return { snapshot, transactions, failures, downloads, api, post, get, entry };
}
