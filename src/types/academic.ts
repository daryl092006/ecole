import type { RoleName } from '@/types/permissions';
export type AcademicYearStatus = 'BROUILLON' | 'OUVERTE' | 'EN_CLOTURE' | 'CLOTUREE';
export interface AcademicYearHistoryEntry {
  id: string;
  dateTime: string;
  actor: string;
  role: string;
  action: 'CREATION' | 'MODIFICATION' | 'CHANGEMENT_STATUT';
  oldValue?: Partial<AcademicYear>;
  newValue: Partial<AcademicYear>;
  reason?: string;
}
export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  active: boolean;
  history: AcademicYearHistoryEntry[];
}
export type AcademicCycle = 'LICENCE' | 'MASTER';
export interface Semester { id: string; academicYearId: string; levelId: string; name: string; order: number; startDate: string; endDate: string; active: boolean; }
export interface CatalogHistoryEntry {
  id: string;
  dateTime: string;
  actorRole: string;
  action: 'CREATION' | 'MODIFICATION' | 'ACTIVATION' | 'DESACTIVATION';
  details: string;
}
export interface Program { id: string; code: string; name: string; description: string; active: boolean; history: CatalogHistoryEntry[]; }
export interface Track { id: string; programId: string; code: string; name: string; active: boolean; history: CatalogHistoryEntry[]; }
export interface Level { id: string; code: string; name: string; cycle: AcademicCycle; order: number; active: boolean; }
export interface TeachingUnit { id: string; code: string; name: string; programId: string; academicYearId: string; semesterId: string; credits: number; active: boolean; }
export interface Subject { id: string; code: string; name: string; coefficient: number; active: boolean; teachingUnitId?: string; academicYearId?: string; credits?: number; }
export interface Teacher { id: string; employeeNumber: string; firstname: string; lastname: string; email: string; specialty: string; active: boolean; }

export interface Group {
  id: string;
  name: string;
  filieres: string[];
  niveau: string;
  academicYear: string;
  studentIds: string[];
  programIds: string[];
  trackIds: string[];
  levelId: string;
  academicYearId: string;
}

export interface TeachingAssignment {
  id: string;
  subjectId: string;
  teacherId: string;
  groupId: string;
  semesterId: string;
  academicYearId: string;
  active: boolean;
}

export interface ClassItem {
  id: string;
  code: string;
  name: string;
  filiere: string;
  level: string;
  groupId: string;
  teacherId: string;
  coefficient: number;
  teacher: string;
  semester: string;
}

export interface GradeEntry {
  matricule: string;
  value: number | null;
  absent?: boolean;
}

export type GradeWorkflowStatus =
  | 'BROUILLON'
  | 'SAISIES'
  | 'SOUMISES'
  | 'A_CONTROLER'
  | 'VALIDEES'
  | 'PUBLIEES';

export interface Evaluation {
  examMode?: 'PAPIER' | 'EN_LIGNE';
  examEndAt?: string;
  examCancelled?: boolean;
  id: string;
  classId: string;
  type: string;
  name: string;
  date: string;
  status: GradeWorkflowStatus;
  grades: GradeEntry[];
  history: GradeTransitionHistory[];
  corrections?: { studentId: string; oldValue: number; newValue: number; actor: string; role: RoleName; date: string; reason: string }[];
}

export interface GradeTransitionHistory {
  id: string;
  date: string;
  actor: string;
  role: string;
  from: GradeWorkflowStatus;
  to: GradeWorkflowStatus;
  comment?: string;
}

export type ComplaintWorkflowStatus =
  | 'NOUVELLE'
  | 'EN_ANALYSE'
  | 'TRANSMISE_ENSEIGNANT'
  | 'AVIS_ENSEIGNANT'
  | 'DECISION_ACADEMIQUE'
  | 'CORRECTION_EVENTUELLE'
  | 'CLOTUREE';

export interface Reclamation {
  id: string;
  studentMatricule: string;
  evaluationId: string;
  reason: string;
  status: ComplaintWorkflowStatus;
  response: string;
  history: ComplaintTransitionHistory[];
  correction?: { previousGrade: number; newGrade: number; reason: string; evaluationId: string };
}

export interface ComplaintTransitionHistory {
  id: string;
  date: string;
  actor: string;
  role: string;
  from: ComplaintWorkflowStatus;
  to: ComplaintWorkflowStatus;
  comment?: string;
}
