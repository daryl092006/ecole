export type CourseResourceKind = 'SUPPORT' | 'EXERCICE' | 'ENREGISTREMENT' | 'LIEN' | 'AUTRE';

export const COURSE_RESOURCE_KIND_LABELS: Record<CourseResourceKind, string> = {
  SUPPORT: 'Support de cours',
  EXERCICE: 'TD / Exercice',
  ENREGISTREMENT: 'Enregistrement (Replay)',
  LIEN: 'Lien externe / Ressource web',
  AUTRE: 'Autre document',
};

export interface CourseResourceItem {
  id: string;
  academicYearId: string;
  offeringId: string;
  groupId: string;
  groupName: string;
  componentId: string;
  subjectCode: string;
  subjectName: string;
  assignmentId: string | null;
  teacherName: string;
  sessionId: string | null;
  sessionLabel: string | null;
  title: string;
  description: string | null;
  kind: CourseResourceKind;
  resourceUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  byteSize: number | null;
  hasStorageFile: boolean;
  uploadedByName: string;
  createdAt: string;
}

export interface CourseListEntry {
  assignmentId: string;
  offeringId: string;
  offeringLabel: string;
  groupId: string;
  groupName: string;
  componentId: string;
  subjectCode: string;
  subjectName: string;
  semesterName: string;
  credits: number;
  coefficient: number;
  teacherId: string;
  teacherName: string;
  teacherEmail: string | null;
  validFrom: string;
  validUntil: string | null;
  totalSessions: number;
  onlineSessions: number;
  resourcesCount: number;
  recordingsCount: number;
}

export interface OnlineCourseSessionItem {
  id: string;
  assignmentId: string;
  offeringId: string;
  groupId: string;
  groupName: string;
  componentId: string;
  subjectName: string;
  teacherName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  mode: 'EN_LIGNE' | 'COURS' | 'PAPIER';
  meetingUrl: string | null;
  meetingProvider: 'TEAMS' | 'LIEN' | null;
  recordingUrl: string | null;
  recordingSyncedAt: string | null;
}

export interface CourseResourcesDirectory {
  revision: number;
  selectedYearId: string | null;
  canManage: boolean;
  canScheduleOnline: boolean;
  courses: CourseListEntry[];
  onlineSessions: OnlineCourseSessionItem[];
  resources: CourseResourceItem[];
}

