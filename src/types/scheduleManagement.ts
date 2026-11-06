import type { TeacherDirectory } from './teachers';

export type SessionMode = 'COURS' | 'PAPIER' | 'EN_LIGNE';
export interface ScheduledExam {
  id: string; evaluationId: string; name: string; opensAt: string; closesAt: string;
  durationMinutes: number | null; hasCopies: boolean; hasResults: boolean;
}
export interface ManagedSession {
  participants: { assignmentId: string; offeringId: string; groupId: string }[];
  shared: boolean; canUpdate: boolean;
  id: string; assignmentId: string; offeringId: string; groupId: string; teacherId: string;
  roomId: string | null; startsAt: string; endsAt: string; mode: SessionMode; status: string;
  replacementTeacherId: string | null; actualRoomId: string | null; reason: string;
  meetingUrl?: string | null; meetingId?: string | null; meetingProvider?: 'TEAMS' | 'LIEN' | null;
  recordingUrl?: string | null; recordingSyncedAt?: string | null;
  hasAttendance: boolean; hasExam: boolean; exam: ScheduledExam | null;
}
export interface ScheduleDirectory {
  revision: number; selectedYearId: string | null; canCreate: boolean; canUpdate: boolean;
  assignments: TeacherDirectory['assignments']; teachers: TeacherDirectory['teachers'];
  offerings: (TeacherDirectory['offerings'][number] & { siteId: string | null })[];
  groups: TeacherDirectory['groups']; components: TeacherDirectory['components'];
  rooms: { id: string; name: string; siteId: string | null; available: boolean }[];
  sites: { id: string; name: string }[]; canBlockAllSites: boolean;
  sessions: ManagedSession[];
  blockedPeriods: { id: string; name: string; kind: string; siteId: string | null; startsAt: string; endsAt: string; reason: string }[];
}
interface Common { revision: number; reason: string; }
export interface SessionSlotInput { startsAt: string; endsAt: string; }
export interface SessionInput {
  assignmentId: string; startsAt: string; endsAt: string; mode: SessionMode; roomId: string | null;
  meetingUrl?: string | null; recordingUrl?: string | null; slots?: SessionSlotInput[];
}
export type ScheduleCommand = Common & (
  | { action: 'create_shared_course'; assignmentIds: string[]; roomId: string; startsAt: string; endsAt: string }
  | ({ action: 'create_session' } & SessionInput)
  | ({ action: 'update_session'; sessionId: string } & SessionInput)
  | { action: 'move_session'; sessionId: string; startsAt: string; endsAt: string }
  | { action: 'cancel_session'; sessionId: string }
  | { action: 'replace_teacher'; sessionId: string; teacherId: string | null }
  | { action: 'generate_online_link'; sessionId: string; customMeetingUrl?: string | null }
  | { action: 'sync_recording'; sessionId: string; recordingUrl?: string | null }
  | { action: 'block_period'; name: string; kind: 'JOUR_FERIE' | 'VACANCES' | 'FERMETURE' | 'EXAMEN' | 'AUTRE'; siteId: string | null; startsAt: string; endsAt: string }
);
