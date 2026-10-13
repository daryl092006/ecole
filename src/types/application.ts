import type { AcademicYear, Program, Track, Level, Semester, TeachingUnit, Subject, Teacher, TeachingAssignment, Group, Evaluation, Reclamation } from '@/types/academic';
import type { Student } from '@/types/student';
import type { Fee, Payment, Receipt, PaymentCancellation } from '@/types/finance';
import type { Room, Session, BlockedPeriod } from '@/types/schedule';
import type { Announcement } from '@/types/communication';
import type { SupportTicket } from '@/types/support';
export interface Enrollment {
  id: string; studentId: string; academicYearId: string; groupId: string; level: string; program: string;
  status: 'INSCRIT' | 'ABANDON' | 'DIPLOME'; date: string; reason: string;
  financials: Student['financials'];
}
export interface InstitutionSettings {
  id: string; name: string; address: string; phone: string; email: string;
  currency: 'XOF'; timezone: 'Africa/Lome'; passMark: number; compensation: boolean;
  eliminationMark: number; creditsPerSemester: number; examWeight: number;
  rulesApproved: boolean; rulesReason: string; receiptPrefix: string;
}
export interface JuryDecision {
  id: string; studentId: string; academicYearId: string; semesterId: string;
  average: number; credits: number; totalCredits: number;
  decision: 'ADMIS' | 'RATTRAPAGE' | 'AJOURNE'; reason: string; date: string;
  actor: string; rules: InstitutionSettings; rows: TranscriptRow[];
}
export interface TranscriptRow { subjectId: string; code: string; name: string; unitId: string; credits: number; coefficient: number; average: number | null; validated: boolean; }
export interface Exam {
  id: string; assignmentId: string; roomCode: string; date: string; startTime: string; endTime: string;
  kind: 'EXAMEN' | 'RATTRAPAGE'; supervisorId: string; status: 'PLANIFIE' | 'ANNULE'; reason: string;
}
export interface StaffRecord { id: string; name: string; email: string; phone: string; position: string; contract: 'PERMANENT' | 'VACATAIRE' | 'STAGIAIRE'; startDate: string; active: boolean; }
export interface Purchase { id: string; label: string; supplier: string; amount: number; date: string; status: 'DEMANDE' | 'APPROUVE' | 'RECU' | 'REFUSE'; reason: string; }
export interface Asset { id: string; name: string; location: string; quantity: number; status: 'DISPONIBLE' | 'MAINTENANCE' | 'HORS_SERVICE'; }
export interface StudentDocument {
  id: string; studentId: string; kind: 'IDENTITE' | 'BAC' | 'RELEVE' | 'PHOTO' | 'AUTRE';
  fileName: string; mimeType: 'image/jpeg' | 'image/png' | 'application/pdf'; size: number; dataUrl: string;
  status: 'A_VERIFIER' | 'CONFORME' | 'NON_CONFORME'; history: { date: string; actor: string; status: string; reason: string }[];
}
export interface Dataset {
  academicYears: AcademicYear[]; programs: Program[]; tracks: Track[]; levels: Level[];
  semesters: Semester[]; units: TeachingUnit[]; subjects: Subject[]; teachers: Teacher[];
  assignments: TeachingAssignment[]; groups: Group[]; students: Student[];
  evaluations: Evaluation[]; reclamations: Reclamation[]; rooms: Room[]; sessions: Session[];
  blockedPeriods: BlockedPeriod[]; tickets: SupportTicket[]; fees: Fee[]; payments: Payment[];
  receipts: Receipt[]; paymentCancellations: PaymentCancellation[]; announcements: Announcement[];
  enrollments: Enrollment[]; settings: InstitutionSettings[]; juryDecisions: JuryDecision[];
  exams: Exam[]; staff: StaffRecord[]; purchases: Purchase[]; assets: Asset[];
  documents: StudentDocument[];
}
export type Collection = keyof Dataset;
export type Entity = Dataset[Collection][number];

export const DEFAULT_SETTINGS: InstitutionSettings = {
  id: 'institution', name: 'ESCEN', address: 'Lomé, Togo', phone: '', email: '', currency: 'XOF',
  timezone: 'Africa/Lome', passMark: 10, compensation: false, eliminationMark: 0,
  creditsPerSemester: 30, examWeight: 60, rulesApproved: false, rulesReason: '', receiptPrefix: 'REC',
};
export const COLLECTIONS: Collection[] = ['academicYears', 'programs', 'tracks', 'levels', 'semesters', 'units', 'subjects', 'teachers', 'assignments', 'groups', 'students', 'evaluations', 'reclamations', 'rooms', 'sessions', 'blockedPeriods', 'tickets', 'fees', 'payments', 'receipts', 'paymentCancellations', 'announcements', 'enrollments', 'settings', 'juryDecisions', 'exams', 'staff', 'purchases', 'assets', 'documents'];
export function emptyDataset(): Dataset { return Object.fromEntries(COLLECTIONS.map(key => [key, []])) as unknown as Dataset; }
export function entityId(collection: Collection, item: Entity): string {
  return collection === 'students' ? (item as Student).matricule : collection === 'rooms' ? (item as Room).code : (item as { id: string }).id;
}
