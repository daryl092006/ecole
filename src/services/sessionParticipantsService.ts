import type { DatabaseRow, PersistentContext, RelationalSnapshot } from '@/types/persistence';
import { ROLES } from '@/types/permissions';
import { ensureSharedSessionParticipants } from './sharedSessionParticipants';

export function sessionParticipants(snapshot: RelationalSnapshot, session: DatabaseRow): DatabaseRow[] {
  ensureSharedSessionParticipants(snapshot);
  const participants = (snapshot.tables.session_participants || []).filter(row => row.session_id === session.id);
  // Historical snapshots and the single-session API retain their original relationship.
  return participants.length ? participants : [{ ...session, session_id: session.id }];
}

export function participantGranted(snapshot: RelationalSnapshot, context: PersistentContext, participant: DatabaseRow, yearId?: string | null) {
  const offering = snapshot.tables.academic_offerings?.find(row => row.id === participant.offering_id);
  return !!offering && (!yearId || offering.academic_year_id === yearId) && context.grants.some(grant =>
    (!grant.site_id || grant.site_id === offering.site_id) && (!grant.group_id || grant.group_id === participant.group_id)
    && (!grant.academic_year_id || grant.academic_year_id === offering.academic_year_id));
}

export function enrollmentParticipates(snapshot: RelationalSnapshot, session: DatabaseRow, participant: DatabaseRow, enrollmentId: string) {
  const day = String(session.starts_at).slice(0, 10);
  return (snapshot.tables.enrollment_groups || []).some(link => link.enrollment_id === enrollmentId
    && link.group_id === participant.group_id && link.offering_id === participant.offering_id
    && String(link.valid_from) <= day && (!link.valid_until || String(link.valid_until) > day))
    && (snapshot.tables.enrollments || []).some(row => row.id === enrollmentId && row.offering_id === participant.offering_id);
}

export function visibleSessionParticipants(snapshot: RelationalSnapshot, context: PersistentContext, session: DatabaseRow,
  yearId?: string | null, purpose: 'schedule' | 'attendance' = 'schedule') {
  const rows = (name: string) => snapshot.tables[name] || [];
  const hasExplicitSupervision = context.role === ROLES.SURV && (
    rows('session_supervisors').some(row => row.account_id === context.accountId)
    || rows('exam_room_supervisors').some(row => row.account_id === context.accountId)
  );
  if (hasExplicitSupervision && !rows('session_supervisors').some(row => row.session_id === session.id && row.account_id === context.accountId)
    && !rows('exam_room_supervisors').some(row => row.account_id === context.accountId && rows('exam_rooms').some(room => room.id === row.exam_room_id
      && rows('exam_deliveries').some(delivery => delivery.id === room.delivery_id && delivery.session_id === session.id)))) return [];
  if (context.role === ROLES.ENS && (!context.teacherId || (purpose === 'attendance'
    ? (session.replacement_teacher_id || session.teacher_id) !== context.teacherId
    : session.teacher_id !== context.teacherId && session.replacement_teacher_id !== context.teacherId))) return [];
  return sessionParticipants(snapshot, session).filter(participant => {
    if (!participantGranted(snapshot, context, participant, yearId)) return false;
    if (context.role !== ROLES.DEL && context.role !== ROLES.STUD) return true;
    return !!context.studentId && rows('enrollments').some(enrollment => enrollment.student_id === context.studentId
      && enrollmentParticipates(snapshot, session, participant, enrollment.id));
  });
}

export function attendanceEnrollmentIds(snapshot: RelationalSnapshot, context: PersistentContext, session: DatabaseRow, yearId?: string | null) {
  const participants = visibleSessionParticipants(snapshot, context, session, yearId, 'attendance');
  return new Set((snapshot.tables.enrollments || []).filter(enrollment =>
    (context.role !== ROLES.STUD || enrollment.student_id === context.studentId)
    && participants.some(participant => enrollmentParticipates(snapshot, session, participant, enrollment.id))).map(row => row.id));
}
