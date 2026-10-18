export interface EvaluationGradeValue {
  [key: string]: unknown;
  value?: unknown;
  absence_status?: unknown;
}

function numericGrade(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 20 ? number : null;
}

export function evaluationGradeValue(grade: EvaluationGradeValue | null | undefined): number | null {
  if (!grade) return null;
  if (grade.absence_status === 'NON_TRAITE') {
    return grade.value == null || numericGrade(grade.value) === 0 ? 0 : null;
  }
  if (grade.absence_status) return null;
  return numericGrade(grade.value);
}

export function evaluationGradeIsComplete(grade: EvaluationGradeValue | null | undefined): boolean {
  if (!grade) return false;
  if (grade.absence_status === 'NON_TRAITE') return false;
  if (grade.absence_status === 'ABSENT' || grade.absence_status === 'JUSTIFIE') return grade.value == null;
  return evaluationGradeValue(grade) !== null;
}
