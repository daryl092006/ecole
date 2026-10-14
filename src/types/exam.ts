export interface ExamQuestion {
  id: string;
  prompt: string;
  kind: 'QCM' | 'TEXTE';
  points: number;
  options: string[];
  correctOption?: number;
}
export interface ExamPaper {
  id: string;
  questions: ExamQuestion[];
  durationMinutes: number;
  status: 'BROUILLON' | 'AUTORISE';
}
export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  deadline: string;
  submittedAt?: string;
  status: 'EN_COURS' | 'REMISE';
  answers: Record<string, string>;
  scores: Record<string, number>;
}
