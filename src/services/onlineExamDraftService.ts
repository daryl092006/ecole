import type { OnlineExamAnswer, OnlineExamView } from '@/types/onlineExam';

export const emptyExamAnswer = (): OnlineExamAnswer => ({ text: '', option_ids: [] });
export function examAnsweredCount(answers: Record<string, OnlineExamAnswer>) {
  return Object.values(answers).filter(answer => answer.text.trim() || answer.option_ids.length).length;
}
export function examAnswersEqual(a: Record<string, OnlineExamAnswer>, b: Record<string, OnlineExamAnswer>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every(key => JSON.stringify(a[key] || emptyExamAnswer()) === JSON.stringify(b[key] || emptyExamAnswer()));
}
export interface ExamLocalDraft {
  attemptId: string; revision: number; saveId: string; answers: Record<string, OnlineExamAnswer>;
}
export function canRestoreExamDraft(draft: ExamLocalDraft, view: OnlineExamView): boolean {
  return draft.attemptId === view.attempt.id && view.attempt.status === 'EN_COURS'
    && Date.parse(view.serverNow) < Date.parse(view.attempt.deadlineAt)
    && (draft.revision === view.attempt.revision || view.attempt.lastSaveId === draft.saveId);
}
