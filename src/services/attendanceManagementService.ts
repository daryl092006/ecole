import type { DatabaseRow, PersistentContext, RelationalSnapshot } from '@/types/persistence';
import type { AttendanceDirectory, AttendanceStatus } from '@/types/attendanceManagement';
import { ROLES } from '@/types/permissions';

const text = (value: unknown) => typeof value === 'string' ? value : '';
const timestamp = (value: unknown) => value == null ? null : text(value);
const name = (person: DatabaseRow | undefined) => `${text(person?.firstname)} ${text(person?.lastname)}`.trim();

/** One complete grant must cover the session, including for teachers and supervisors. */
export function attendanceSessions(snapshot: RelationalSnapshot, context: PersistentContext, yearId: string | null) {
  if (!context.permissions.includes('attendance.view')) return [];
  const rows = (table: string) => snapshot.tables[table] || [];
  const supervised = new Set(rows('session_supervisors').filter(row => row.account_id === context.accountId).map(row => row.session_id));
  for (const link of rows('exam_room_supervisors').filter(row => row.account_id === context.accountId)) {
    const room = rows('exam_rooms').find(row => row.id === link.exam_room_id);
    const delivery = rows('exam_deliveries').find(row => row.id === room?.delivery_id);
    if (delivery) supervised.add(delivery.session_id);
  }
  return rows('sessions').filter(session => {
    const offering = rows('academic_offerings').find(row => row.id === session.offering_id);
    if (!offering || yearId && offering.academic_year_id !== yearId) return false;
    if (!context.grants.some(grant => (!grant.site_id || grant.site_id === offering.site_id)
      && (!grant.group_id || grant.group_id === session.group_id)
      && (!grant.academic_year_id || grant.academic_year_id === offering.academic_year_id))) return false;
    if (context.role === ROLES.ENS) return !!context.teacherId && (session.replacement_teacher_id || session.teacher_id) === context.teacherId;
    if (context.role === ROLES.SURV) return supervised.has(session.id);
    return ![ROLES.STUD, ROLES.DEL].includes(context.role as typeof ROLES.STUD);
  });
}

export function attendanceDirectory(snapshot: RelationalSnapshot, context: PersistentContext, yearId: string | null): AttendanceDirectory {
  const rows = (table: string) => snapshot.tables[table] || [];
  const year = rows('academic_years').find(row => row.id === yearId);
  const writableYear = !!yearId && !!year && !year.archived_at && ['OUVERTE', 'EN_CLOTURE'].includes(text(year.status));
  const teacherPerson = (teacherId: string) => {
    const teacher = rows('teachers').find(row => row.id === teacherId);
    const member = rows('staff').find(row => row.id === teacher?.staff_id);
    return rows('people').find(row => row.id === member?.person_id);
  };
  return { revision: snapshot.revision, selectedYearId: yearId, sessions: attendanceSessions(snapshot, context, yearId)
    .sort((a, b) => text(b.starts_at).localeCompare(text(a.starts_at)))
    .map(session => {
      const day = new Date(text(session.starts_at)).toISOString().slice(0, 10);
      const teacherId = text(session.replacement_teacher_id || session.teacher_id);
      const person = teacherPerson(teacherId);
      const group = rows('groups').find(row => row.id === session.group_id);
      const assignment = rows('teaching_assignments').find(row => row.id === session.assignment_id);
      const component = rows('curriculum_components').find(row => row.id === assignment?.component_id);
      const subject = rows('subjects').find(row => row.id === component?.subject_id);
      // Use membership at the session date, as enforced by guard_attendance in PostgreSQL.
      const members = new Set(rows('enrollment_groups').filter(link => link.group_id === session.group_id
        && text(link.valid_from) <= day && (!link.valid_until || text(link.valid_until) > day)).map(link => link.enrollment_id));
      const students = rows('enrollments').filter(row => members.has(row.id) && row.offering_id === session.offering_id).flatMap(enrollment => {
        const student = rows('students').find(row => row.id === enrollment.student_id);
        const studentPerson = rows('people').find(row => row.id === student?.person_id);
        return student && studentPerson ? [{ enrollmentId: enrollment.id, name: name(studentPerson), matricule: text(student.matricule) }] : [];
      });
      const attendances = rows('attendances').filter(row => row.session_id === session.id && row.offering_id === session.offering_id).map(row => {
        const enrollment = rows('enrollments').find(item => item.id === row.enrollment_id);
        const student = rows('students').find(item => item.id === enrollment?.student_id);
        return { id: row.id, enrollmentId: text(row.enrollment_id), studentName: name(rows('people').find(item => item.id === student?.person_id)),
          matricule: text(student?.matricule), status: row.status as AttendanceStatus, arrivedAt: timestamp(row.arrived_at), leftAt: timestamp(row.left_at),
          lateMinutes: row.late_minutes == null ? null : Number(row.late_minutes), comment: text(row.comment), reason: text(row.reason) };
      });
      const writable = writableYear && !['ANNULE', 'REPORTE'].includes(text(session.status));
      return {
        id: session.id, label: `${text(group?.name) || 'Groupe'} · ${text(subject?.name) || 'Séance'}`,
        startsAt: text(session.starts_at), endsAt: text(session.ends_at), status: text(session.status), teacherId, teacherName: name(person), students, attendances,
        teacherAttendances: rows('teacher_attendances').filter(row => row.session_id === session.id).map(row => ({
          id: row.id, teacherId: text(row.teacher_id), teacherName: name(teacherPerson(text(row.teacher_id))),
          arrivedAt: timestamp(row.arrived_at), leftAt: timestamp(row.left_at), comment: text(row.comment),
        })),
        justifications: rows('absence_justifications').flatMap(row => {
          const attendance = attendances.find(item => item.id === row.attendance_id);
          return attendance ? [{ id: row.id, attendanceId: attendance.id, studentName: attendance.studentName, reason: text(row.reason),
            status: row.status as 'EN_ATTENTE' | 'VALIDE' | 'REFUSE', reviewReason: text(row.review_reason), reviewedAt: timestamp(row.reviewed_at),
            hasFile: rows('file_objects').some(file => file.id === row.file_id) }] : [];
        }),
        canRecordStudents: writable && context.permissions.includes('attendance.record') && [ROLES.ENS, ROLES.SURV, ROLES.IT].includes(context.role as typeof ROLES.ENS),
        canRecordTeacher: writable && context.permissions.includes('attendance.record') && [ROLES.SURV, ROLES.IT].includes(context.role as typeof ROLES.SURV) && !!person && person.id !== context.personId,
        canReview: writable && context.permissions.includes('attendance.review') && [ROLES.DA, ROLES.IT].includes(context.role as typeof ROLES.DA),
      };
    }) };
}
