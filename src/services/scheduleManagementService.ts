import type { DatabaseRow, PersistentContext, RelationalSnapshot } from '@/types/persistence';
import type { ScheduleDirectory } from '@/types/scheduleManagement';
import { assignmentIsGranted, teacherAcademicScope, teacherDirectory } from './teacherManagementService';

export function canBlockSite(context: PersistentContext, yearId: string | null, siteId: string | null) {
  return !!yearId && context.permissions.includes('schedule.update') && context.grants.some(grant => !grant.group_id
    && (!grant.academic_year_id || grant.academic_year_id === yearId) && (!grant.site_id || grant.site_id === siteId));
}

export function scheduleDirectory(snapshot: RelationalSnapshot, context: PersistentContext, yearId: string | null): ScheduleDirectory {
  const directory = teacherDirectory(snapshot, context, yearId);
  const scoped = teacherAcademicScope(snapshot, context, yearId);
  const rows = (table: string) => snapshot.tables[table] || [];
  const year = rows('academic_years').find(row => row.id === yearId && !row.archived_at);
  const writable = !!year && year.status !== 'CLOTUREE';
  const offerings = directory.offerings.map(offering => ({ ...offering, siteId: (rows('academic_offerings').find(row => row.id === offering.id)?.site_id as string | null) || null }));
  // Keep historical sessions readable even if their assignment/component is now archived.
  const sessions = (scoped.tables.sessions || []).filter(session => {
    const offering = rows('academic_offerings').find(row => row.id === session.offering_id);
    return offering?.academic_year_id === yearId && assignmentIsGranted(context, offering, session.group_id);
  });
  const siteAllowed = (siteId: unknown) => context.grants.some(grant => (!grant.academic_year_id || grant.academic_year_id === yearId)
    && (!grant.site_id || grant.site_id === siteId));
  return {
    revision: snapshot.revision, selectedYearId: yearId,
    canCreate: writable && year.status !== 'EN_CLOTURE' && context.permissions.includes('schedule.create'),
    canUpdate: writable && context.permissions.includes('schedule.update'),
    teachers: directory.teachers, assignments: directory.assignments.filter(assignment => directory.components.some(component => component.id === assignment.componentId)
      && directory.groups.some(group => group.id === assignment.groupId && group.offeringIds.includes(assignment.offeringId))),
    offerings, groups: directory.groups, components: directory.components,
    rooms: rows('rooms').filter(room => !room.archived_at && (!room.site_id || siteAllowed(room.site_id))).map(room => ({ id: room.id,
      name: `${String(room.code || '')} · ${String(room.name || '')}`, siteId: room.site_id ? String(room.site_id) : null,
      capacity: Number(room.capacity), available: room.status === 'AVAILABLE' })),
    sites: rows('sites').filter(site => !site.archived_at && canBlockSite(context, yearId, site.id)).map(site => ({ id: site.id, name: String(site.name) })),
    canBlockAllSites: canBlockSite(context, yearId, null),
    sessions: sessions.map(row => ({ id: row.id, assignmentId: String(row.assignment_id), offeringId: String(row.offering_id), groupId: String(row.group_id),
      teacherId: String(row.teacher_id), roomId: row.room_id ? String(row.room_id) : null, startsAt: String(row.starts_at), endsAt: String(row.ends_at),
      mode: row.mode as ScheduleDirectory['sessions'][number]['mode'], status: String(row.status), replacementTeacherId: row.replacement_teacher_id ? String(row.replacement_teacher_id) : null,
      actualRoomId: row.actual_room_id ? String(row.actual_room_id) : null, reason: String(row.reason || ''),
      hasAttendance: rows('attendances').some(attendance => attendance.session_id === row.id), hasExam: rows('exam_deliveries').some(exam => exam.session_id === row.id) })),
    blockedPeriods: rows('blocked_periods').filter(period => (!period.academic_year_id || period.academic_year_id === yearId)
      && (!period.site_id || siteAllowed(period.site_id))).map(period => ({ id: period.id, name: String(period.name), kind: String(period.kind),
        siteId: period.site_id ? String(period.site_id) : null, startsAt: String(period.starts_at), endsAt: String(period.ends_at), reason: String(period.reason || '') })),
  };
}

export const overlaps = (start: unknown, end: unknown, other: DatabaseRow) => Date.parse(String(start)) < Date.parse(String(other.ends_at)) && Date.parse(String(end)) > Date.parse(String(other.starts_at));

export function scheduleConflict(snapshot: RelationalSnapshot, proposed: DatabaseRow): string | null {
  const sessions = (snapshot.tables.sessions || []).filter(row => row.id !== proposed.id && !['ANNULE', 'REPORTE'].includes(String(row.status)) && overlaps(proposed.starts_at, proposed.ends_at, row));
  if (sessions.some(row => row.group_id === proposed.group_id)) return 'Ce groupe a déjà une séance sur ce créneau.';
  const teacher = proposed.replacement_teacher_id || proposed.teacher_id;
  if (sessions.some(row => (row.replacement_teacher_id || row.teacher_id) === teacher)) return 'Cet enseignant a déjà une séance sur ce créneau.';
  const room = proposed.actual_room_id || proposed.room_id;
  if (room && sessions.some(row => (row.actual_room_id || row.room_id) === room)) return 'Cette salle est déjà occupée sur ce créneau.';
  if (room && (snapshot.tables.exam_rooms || []).some(examRoom => examRoom.room_id === room && (snapshot.tables.exam_deliveries || []).some(delivery => delivery.id === examRoom.delivery_id
    && (snapshot.tables.sessions || []).some(session => session.id === delivery.session_id && session.id !== proposed.id && !['ANNULE', 'REPORTE'].includes(String(session.status)))
    && Date.parse(String(delivery.access_opens_at)) < Date.parse(String(proposed.ends_at)) && Date.parse(String(delivery.access_closes_at)) > Date.parse(String(proposed.starts_at))))) return 'Cette salle est réservée pour une épreuve sur ce créneau.';
  return null;
}

export function scheduleDatabaseError(error: { message?: string; code?: string }) {
  const message = error.message || '';
  if (message.includes('session_group_conflict')) return 'Ce groupe a déjà une séance sur ce créneau.';
  if (message.includes('session_teacher_conflict')) return 'Cet enseignant a déjà une séance sur ce créneau.';
  if (message.includes('session_room_conflict')) return 'Cette salle est déjà occupée sur ce créneau.';
  if (/émargée/.test(message)) return 'Cette séance a déjà été émargée : ses horaires, son affectation et son annulation sont protégés.';
  if (/période bloquée/.test(message)) return 'Ce créneau se trouve dans une période bloquée.';
  if (/Traiter les séances existantes/.test(message)) return 'Déplacez ou annulez les séances existantes avant de bloquer cette période.';
  if (/hors de l’affectation/.test(message)) return 'Les horaires dépassent les dates de l’affectation.';
  if (/hors du semestre/.test(message)) return 'Les horaires dépassent les dates du semestre de cette matière.';
  if (/Salle|salle/.test(message)) return 'La salle est indisponible, incompatible avec le site ou trop petite pour le groupe.';
  if (/copies ou résultats/.test(message)) return 'Cette séance d’examen possède des copies ou des résultats et ne peut pas être annulée.';
  return 'Enregistrement refusé : actualisez les données et vérifiez les dates et les conflits. Aucune modification partielle n’est conservée.';
}
