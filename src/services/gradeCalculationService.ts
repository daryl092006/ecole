/**
 * Règle de notation ESCEN :
 * - Deux types d'évaluations : Devoir et Examen
 * - Le Devoir compte pour 40% (coefficient 0.40)
 * - L'Examen compte pour 60% (coefficient 0.60)
 * - En cas de session de rattrapage, la note de rattrapage se substitue à la note d'examen si elle lui est supérieure.
 */

export const DEVOIR_WEIGHT = 0.40;
export const EXAM_WEIGHT = 0.60;

export interface SubjectGradeInput {
  kind: string; // 'DEVOIR' | 'EXAMEN' | 'RATTRAPAGE' | etc.
  value: number | null;
}

export interface ComputedSubjectResult {
  average: number | null;
  devoirAverage: number | null;
  examFinalNote: number | null;
  isComplete: boolean;
  hasDevoir: boolean;
  hasExam: boolean;
}

export function computeSubjectAverage(grades: SubjectGradeInput[]): ComputedSubjectResult {
  const devoirs = grades
    .filter(g => (g.kind === 'DEVOIR' || ['INTERROGATION', 'TP', 'PROJET', 'EXPOSE'].includes(g.kind)) && g.value !== null)
    .map(g => g.value as number);

  const examens = grades
    .filter(g => g.kind === 'EXAMEN' && g.value !== null)
    .map(g => g.value as number);

  const rattrapages = grades
    .filter(g => g.kind === 'RATTRAPAGE' && g.value !== null)
    .map(g => g.value as number);

  const devoirAverage = devoirs.length ? devoirs.reduce((a, b) => a + b, 0) / devoirs.length : null;
  const initialExam = examens.length ? examens.reduce((a, b) => a + b, 0) / examens.length : null;
  const resitExam = rattrapages.length ? Math.max(...rattrapages) : null;

  let examFinalNote = initialExam;
  if (resitExam !== null) {
    examFinalNote = initialExam !== null ? Math.max(initialExam, resitExam) : resitExam;
  }

  const hasDevoir = devoirAverage !== null;
  const hasExam = examFinalNote !== null;

  if (hasDevoir && hasExam) {
    const weighted = DEVOIR_WEIGHT * devoirAverage! + EXAM_WEIGHT * examFinalNote!;
    return {
      average: Math.round(weighted * 100) / 100,
      devoirAverage: Math.round(devoirAverage! * 100) / 100,
      examFinalNote: Math.round(examFinalNote! * 100) / 100,
      isComplete: true,
      hasDevoir: true,
      hasExam: true,
    };
  }

  return {
    average: null,
    devoirAverage: devoirAverage !== null ? Math.round(devoirAverage * 100) / 100 : null,
    examFinalNote: examFinalNote !== null ? Math.round(examFinalNote * 100) / 100 : null,
    isComplete: false,
    hasDevoir,
    hasExam,
  };
}

