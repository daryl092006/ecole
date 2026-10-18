export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'RETARD', 'ABSENT_JUSTIFIE', 'RETARD_JUSTIFIE', 'DISPENSE'] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];
export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Présent', ABSENT: 'Absent', RETARD: 'En retard', ABSENT_JUSTIFIE: 'Absence justifiée',
  RETARD_JUSTIFIE: 'Retard justifié', DISPENSE: 'Dispensé',
};
export interface StudentAttendance {
  id: string; enrollmentId: string; studentName: string; matricule: string; status: AttendanceStatus;
  arrivedAt: string | null; leftAt: string | null; lateMinutes: number | null; comment: string; reason: string;
}
export interface AttendanceStudent { enrollmentId: string; name: string; matricule: string; }
export interface TeacherAttendance {
  id: string; teacherId: string; teacherName: string; arrivedAt: string | null; leftAt: string | null; comment: string;
}
export interface AttendanceJustification {
  id: string; attendanceId: string; studentName: string; reason: string;
  status: 'EN_ATTENTE' | 'VALIDE' | 'REFUSE'; reviewReason: string; reviewedAt: string | null;
  hasFile: boolean;
}
export interface AttendanceSession {
  id: string; label: string; startsAt: string; endsAt: string; status: string;
  teacherId: string; teacherName: string; students: AttendanceStudent[];
  attendances: StudentAttendance[]; teacherAttendances: TeacherAttendance[]; justifications: AttendanceJustification[];
  canRecordStudents: boolean; canRecordTeacher: boolean; canReview: boolean;
}
export interface AttendanceDirectory { revision: number; selectedYearId: string | null; sessions: AttendanceSession[]; }
export type AttendanceEntry = {
  enrollmentId: string; status: AttendanceStatus; arrivedAt: string | null; leftAt: string | null;
  lateMinutes: number | null; comment: string;
};
export type AttendanceCommand = { revision: number } & (
  | { action: 'record_students'; sessionId: string; entries: AttendanceEntry[]; reason?: string }
  | { action: 'record_teacher'; sessionId: string; arrivedAt: string; leftAt: string | null; comment: string }
  | { action: 'review_justification'; justificationId: string; decision: 'VALIDE' | 'REFUSE'; reason: string }
);
