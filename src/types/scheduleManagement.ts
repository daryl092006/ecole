import type { TeacherDirectory } from './teachers';

export type SessionMode = 'COURS' | 'PAPIER' | 'EN_LIGNE';
export interface ManagedSession {
  id: string; assignmentId: string; offeringId: string; groupId: string; teacherId: string;
  roomId: string | null; startsAt: string; endsAt: string; mode: SessionMode; status: string;
  replacementTeacherId: string | null; actualRoomId: string | null; reason: string;
  hasAttendance: boolean; hasExam: boolean;
}
export interface ScheduleDirectory {
  revision: number; selectedYearId: string | null; canCreate: boolean; canUpdate: boolean;
  assignments: TeacherDirectory['assignments']; teachers: TeacherDirectory['teachers'];
  offerings: (TeacherDirectory['offerings'][number] & { siteId: string | null })[];
  groups: TeacherDirectory['groups']; components: TeacherDirectory['components'];
  rooms: { id: string; name: string; siteId: string | null; capacity: number; available: boolean }[];
  sites: { id: string; name: string }[]; canBlockAllSites: boolean;
  sessions: ManagedSession[];
  blockedPeriods: { id: string; name: string; kind: string; siteId: string | null; startsAt: string; endsAt: string; reason: string }[];
}
interface Common { revision: number; reason: string; }
export interface SessionInput { assignmentId: string; startsAt: string; endsAt: string; mode: SessionMode; roomId: string | null; }
export type ScheduleCommand = Common & (
  | ({ action: 'create_session' } & SessionInput)
  | ({ action: 'update_session'; sessionId: string } & SessionInput)
  | { action: 'move_session'; sessionId: string; startsAt: string; endsAt: string }
  | { action: 'cancel_session'; sessionId: string }
  | { action: 'replace_teacher'; sessionId: string; teacherId: string | null }
  | { action: 'block_period'; name: string; kind: 'JOUR_FERIE' | 'VACANCES' | 'FERMETURE' | 'EXAMEN' | 'AUTRE'; siteId: string | null; startsAt: string; endsAt: string }
);
