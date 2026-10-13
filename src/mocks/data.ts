import type {
  AcademicYear,
  Announcement,
  BlockedPeriod,
  ClassItem,
  Evaluation,
  Fee,
  Group,
  Level,
  Payment,
  PaymentCancellation,
  Program,
  Reclamation,
  Receipt,
  Room,
  Scholarship,
  Semester,
  Session,
  Student,
  Subject,
  SystemLog,
  Teacher,
  TeachingAssignment,
  Track,
} from '@/types';

// Le prototype démarre volontairement sans données préchargées.
// Toutes les entités sont créées par les processus de l'interface et restent en mémoire.
export const initialAcademicYears: AcademicYear[] = [];
export const initialSemesters: Semester[] = [];
export const initialPrograms: Program[] = [];
export const initialTracks: Track[] = [];
export const initialLevels: Level[] = [];
export const initialSubjects: Subject[] = [];
export const initialTeachers: Teacher[] = [];
export const initialGroups: Group[] = [];
export const initialTeachingAssignments: TeachingAssignment[] = [];
export const initialStudents: Student[] = [];
export const initialFees: Fee[] = [];
export const initialPayments: Payment[] = [];
export const initialReceipts: Receipt[] = [];
export const initialPaymentCancellations: PaymentCancellation[] = [];
export const initialScholarships: Scholarship[] = [];
export const initialClasses: ClassItem[] = [];
export const initialEvaluations: Evaluation[] = [];
export const initialReclamations: Reclamation[] = [];
export const initialRooms: Room[] = [];
export const initialBlockedPeriods: BlockedPeriod[] = [];
export const initialSessions: Session[] = [];
export const initialSystemLogs: SystemLog[] = [];
export const initialAnnouncements: Announcement[] = [];
