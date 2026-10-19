export interface OnlineExamAnswer { text: string; option_ids: string[]; }
export interface OnlineExamQuestion {
  id: string; kind: string; prompt: string; points: number;
  options: { id: string; label: string }[];
}
export interface OnlineExamView {
  serverNow: string;
  accepted?: boolean;
  attempt: {
    id: string; evaluationId: string; paperId: string; revision: number; lastSaveId: string | null;
    status: 'EN_COURS' | 'REMISE' | 'EXPIREE' | 'INTERROMPUE';
    startedAt: string; deadlineAt: string; submittedAt: string | null;
    submissionKind: 'MANUAL' | 'AUTO_DEADLINE' | null;
    completionStatus: 'NON_TRAITE' | 'PARTIELLE' | 'COMPLETE' | null;
  };
  paper: { id: string; title: string; parts: { id: string; title: string; instructions: string | null; questions: OnlineExamQuestion[] }[] };
  answers: Record<string, OnlineExamAnswer>;
  lastSavedAt: string | null;
}
export interface OnlineExamDirectory {
  serverNow: string;
  exams: {
    evaluationId: string; name: string; kind: string; opensAt: string; closesAt: string; durationMinutes: number;
    attemptId: string | null; status: OnlineExamView['attempt']['status'] | null;
    deadlineAt: string | null; submittedAt: string | null; completionStatus: string | null;
  }[];
}
export type OnlineExamCommand = { action: 'start'; evaluationId: string } | {
  action: 'save' | 'submit'; attemptId: string; revision: number; saveId: string;
  answers: { questionId: string; response: OnlineExamAnswer }[];
};
