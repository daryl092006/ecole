export type SubjectPurpose = 'CONTROLE_CONTINU' | 'EXAMEN' | 'RATTRAPAGE';
export type SubjectStatus = 'BROUILLON' | 'AUTORISE' | 'RETIRE';
export interface SubjectOption { label: string; correct: boolean; }
export type SubjectQuestionPresentation = 'TRUE_FALSE' | 'SHORT_TEXT' | 'LONG_TEXT';
export interface SubjectQuestion { prompt: string; kind: 'TEXTE' | 'QCM_SIMPLE' | 'QCM_MULTIPLE'; presentation?: SubjectQuestionPresentation; requiresJustification?: boolean; points: number; options: SubjectOption[]; correction: string; }
export interface SubjectPart { title: string; instructions: string; caseStudy?: boolean; questions: SubjectQuestion[]; }
export interface SubjectInput {
  title: string;
  instructions: string;
  durationMinutes: number;
  purpose: SubjectPurpose;
  evaluationId?: string | null;
  sourceEvaluationRowId?: string | null;
  authorize?: boolean;
  parts: SubjectPart[];
}
export interface PreparedSubject extends SubjectInput {
  id: string;
  libraryId: string;
  version: number;
  archived: boolean;
  status: SubjectStatus;
  authorizedBy?: string | null;
  authorizedAt?: string | null;
}
export interface SubjectExam {
  id: string; title: string; purpose: SubjectPurpose; group: string; subject: string;
  startsAt: string | null; endsAt: string | null; compositionClosesAt: string | null;
  durationMinutes: number; room: string; mode: string; issue: string | null;
}
export interface SubjectDirectory { revision: number; subjects: PreparedSubject[]; exams?: SubjectExam[]; features?: { qcmJustification: boolean }; }
