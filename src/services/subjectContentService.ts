import type { SubjectInput, SubjectQuestion } from '@/types/subject';

export const questionTypes = [
  { id: 'QCM_SIMPLE', label: 'QCM unique', icon: 'circle' },
  { id: 'QCM_MULTIPLE', label: 'QCM multiple', icon: 'check' },
  { id: 'TRUE_FALSE', label: 'Vrai / Faux', icon: 'split' },
  { id: 'SHORT_TEXT', label: 'Texte court', icon: 'short' },
  { id: 'LONG_TEXT', label: 'Texte long', icon: 'long' },
] as const;
export type QuestionType = typeof questionTypes[number]['id'];
export function questionType(question: SubjectQuestion): QuestionType {
  return question.presentation || (question.kind === 'TEXTE' ? 'LONG_TEXT' : question.kind);
}
export function changeQuestionType(question: SubjectQuestion, type: QuestionType): SubjectQuestion {
  const choice = type === 'QCM_SIMPLE' || type === 'QCM_MULTIPLE' || type === 'TRUE_FALSE';
  return { ...question, kind: type === 'QCM_MULTIPLE' ? 'QCM_MULTIPLE' : choice ? 'QCM_SIMPLE' : 'TEXTE',
    presentation: type === 'TRUE_FALSE' || type === 'SHORT_TEXT' || type === 'LONG_TEXT' ? type : undefined,
    requiresJustification: choice ? question.requiresJustification || false : false,
    options: type === 'TRUE_FALSE' ? [{ label: 'Vrai', correct: false }, { label: 'Faux', correct: false }]
      : !choice ? [] : question.kind !== 'TEXTE' && question.presentation !== 'TRUE_FALSE'
        ? question.options.map((option, index) => ({ ...option, correct: type === 'QCM_MULTIPLE' ? option.correct : option.correct && question.options.findIndex(row => row.correct) === index }))
        : [{ label: '', correct: false }, { label: '', correct: false }, { label: '', correct: false }] };
}
/** Text extraction for labels/validation only. HTML rendering uses a strict DOM allow-list. */
export const subjectPlainText = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
export function questionCompletionIssue(question: SubjectQuestion): string | null {
  if (!subjectPlainText(question.prompt)) return 'Rédigez l’énoncé de la question.';
  if (!Number.isFinite(question.points) || question.points <= 0) return 'Indiquez un nombre de points supérieur à zéro.';
  if (question.kind !== 'TEXTE') {
    if (question.options.length < 2 || question.options.some(option => !option.label.trim())) return 'Renseignez au moins deux réponses proposées.';
    const correct = question.options.filter(option => option.correct).length;
    if (question.kind === 'QCM_SIMPLE' && correct !== 1) return 'Choisissez une seule bonne réponse.';
    if (question.kind === 'QCM_MULTIPLE' && !correct) return 'Choisissez au moins une bonne réponse.';
  } else if (!subjectPlainText(question.correction)) return 'Renseignez les indications de correction.';
  return null;
}
export function subjectCompletion(subject: SubjectInput) {
  const questions = subject.parts.flatMap(part => part.questions);
  const complete = questions.filter(question => !questionCompletionIssue(question)).length;
  return { questions: questions.length, complete, percent: questions.length ? Math.round(complete * 100 / questions.length) : 0 };
}
