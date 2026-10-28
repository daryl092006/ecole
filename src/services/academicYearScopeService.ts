import references from '@/data/relationalReferences.json';
import type { DatabaseRow, PersistentContext, RelationalSnapshot } from '@/types/persistence';
import type { AcademicYearOption } from '@/types/academicYearContext';
import { ROLES } from '@/types/permissions';
const map: Record<string, Record<string, string>> = references;
const id = (row: DatabaseRow, field: string) => String(row[field] || '');

export function accessibleAcademicYears(snapshot: RelationalSnapshot, context: PersistentContext): AcademicYearOption[] {
  const rows = (table: string) => snapshot.tables[table] || [];
  const personal = [ROLES.STUD, ROLES.DEL].includes(context.role as typeof ROLES.STUD);
  const teacher = context.role === ROLES.ENS; const supervisor = context.role === ROLES.SURV;
  if (!context.permissions.length && !personal) return [];
  const global = !personal && !teacher && !supervisor && context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id);
  const allowed = new Set<string>();
  const assignments = rows('teaching_assignments');
  const supervisedSessions = new Set(rows('session_supervisors').filter(link => link.account_id === context.accountId).map(link => link.session_id));
  for (const link of rows('exam_room_supervisors').filter(row => row.account_id === context.accountId)) {
    const room = rows('exam_rooms').find(row => row.id === link.exam_room_id);
    const delivery = rows('exam_deliveries').find(row => row.id === room?.delivery_id);
    if (delivery) supervisedSessions.add(delivery.session_id);
  }
  for (const offering of rows('academic_offerings')) {
    const granted = context.grants.some(grant => (!grant.site_id || grant.site_id === offering.site_id) && (!grant.academic_year_id || grant.academic_year_id === offering.academic_year_id)
      && (!grant.group_id || rows('group_offerings').some(link => link.offering_id === offering.id && link.group_id === grant.group_id)));
    const relevant = personal ? rows('enrollments').some(row => row.student_id === context.studentId && row.offering_id === offering.id)
      : teacher ? assignments.some(row => row.teacher_id === context.teacherId && row.offering_id === offering.id)
        || !!context.teacherId && rows('sessions').some(session => session.replacement_teacher_id === context.teacherId && session.offering_id === offering.id)
        : supervisor ? rows('sessions').some(session => session.offering_id === offering.id && supervisedSessions.has(session.id)) : granted;
    if (relevant && granted) allowed.add(id(offering, 'academic_year_id'));
  }
  if (!personal && !teacher && !supervisor) for (const group of rows('groups')) if (context.grants.some(grant => (!grant.site_id || grant.site_id === group.site_id) && (!grant.group_id || grant.group_id === group.id) && (!grant.academic_year_id || grant.academic_year_id === group.academic_year_id))) allowed.add(id(group, 'academic_year_id'));
  if (!personal && !teacher && !supervisor) for (const grant of context.grants) if (grant.academic_year_id) allowed.add(grant.academic_year_id);
  return rows('academic_years').filter(row => !row.archived_at && (global || allowed.has(row.id))).map(row => ({ id: row.id, name: String(row.name), status: row.status as AcademicYearOption['status'], starts_on: String(row.starts_on), ends_on: String(row.ends_on) })).sort((a, b) => b.starts_on.localeCompare(a.starts_on));
}

/** Restrict only annual entities and their descendants. Shared catalogs and civil identities are retained. */
export function filterSnapshotForAcademicYear(snapshot: RelationalSnapshot, yearId: string | null, confirmedHistoricalStudentIds: string[] = []): RelationalSnapshot {
  if (!yearId) return snapshot;
  const tables = { ...snapshot.tables };
  const annual = new Set<string>(Object.entries(map).filter(([, fields]) => fields.academic_year_id === 'academic_years').map(([table]) => table));
  for (const [table, rows] of Object.entries(tables)) if (rows.some(row => row.academic_year_id !== undefined)) annual.add(table);
  // Grants express authorization, never a filter on which identity/role exists.
  annual.delete('role_grants'); annual.delete('academic_working_year');
  const sharedSubjectIds = new Set(
    (tables.curriculum_components || [])
      .filter(row => !row.archived_at)
      .map(row => String(row.subject_id || ''))
      .filter(Boolean)
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const [table, fields] of Object.entries(map)) {
      if (annual.has(table) || ['role_grants', 'academic_working_year', 'accounts', 'people', 'students'].includes(table)) continue;
      if (Object.values(fields).some(parent => annual.has(parent))) { annual.add(table); changed = true; }
    }
  }
  for (const table of annual) tables[table] = (tables[table] || []).filter(row => {
    if (row.academic_year_id != null) return row.academic_year_id === yearId || (table === 'subjects' && sharedSubjectIds.has(row.id));
    // A nullable year is not evidence of membership: require a real annual parent.
    return Object.entries(map[table] || {}).some(([field, parent]) => annual.has(parent) && row[field] != null);
  });
  // A chain must reach a known year; a cycle of unknown parents is not a year.
  const attributed = new Set<string>();
  for (const table of annual) for (const row of tables[table] || []) if (row.academic_year_id === yearId || (table === 'subjects' && sharedSubjectIds.has(row.id))) attributed.add(`${table}:${row.id}`);
  for (let pass = 0; pass < annual.size; pass++) {
    let added = false;
    for (const table of annual) for (const row of tables[table] || []) {
      const key = `${table}:${row.id}`;
      if (!attributed.has(key) && Object.entries(map[table] || {}).some(([field, parent]) => annual.has(parent) && row[field] != null && attributed.has(`${parent}:${String(row[field])}`))) { attributed.add(key); added = true; }
    }
    if (!added) break;
  }
  for (const table of annual) tables[table] = (tables[table] || []).filter(row => attributed.has(`${table}:${row.id}`));
  // Fixed point handles relationships in any order, including multiple parents.
  for (let pass = 0; pass < annual.size; pass++) {
    let removed = false;
    for (const table of annual) {
      const previous = tables[table] || [];
      const next = previous.filter(row => Object.entries(map[table] || {}).every(([field, parent]) => !annual.has(parent) || row[field] == null || (tables[parent] || []).some(item => item.id === row[field])));
      if (next.length !== previous.length) { tables[table] = next; removed = true; }
    }
    if (!removed) break;
  }
  const selectedStudents = new Set((tables.enrollments || []).map(row => row.student_id));
  tables.students = (tables.students || []).filter(student => selectedStudents.has(student.id) || confirmedHistoricalStudentIds.includes(student.id));
  return { ...snapshot, tables };
}
