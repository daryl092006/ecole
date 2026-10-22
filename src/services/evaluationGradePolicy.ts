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

export function evaluationGradeNoteLabel(
  grade: EvaluationGradeValue | null | undefined,
  attemptStatus?: unknown
): string {
  if (grade?.absence_status === 'ABSENT') return '— (Absent)';
  if (grade?.absence_status === 'JUSTIFIE') return '— (Justifié)';
  const val = evaluationGradeValue(grade);
  if (grade?.absence_status === 'NON_TRAITE') return '0 / 20 (provisoire)';
  if (val !== null) return `${val.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} / 20`;
  if (attemptStatus === 'EN_COURS') return 'Composition en cours';
  if (attemptStatus === 'REMISE' || attemptStatus === 'EXPIREE') return 'Copie remise · À corriger';
  return 'En attente de correction';
}

export function evaluationCandidateStatusLabel(
  grade: EvaluationGradeValue | null | undefined,
  attemptStatus?: unknown
): string {
  if (grade?.absence_status === 'ABSENT') return 'Absent injustifié';
  if (grade?.absence_status === 'JUSTIFIE') return 'Absent justifié';
  if (grade?.absence_status === 'NON_TRAITE') return 'Copie non traitée';
  if (evaluationGradeValue(grade) !== null) return 'Présent · Copie corrigée';
  if (attemptStatus === 'EN_COURS') return 'Présent · Composition en ligne en cours';
  if (attemptStatus === 'REMISE' || attemptStatus === 'EXPIREE') {
    return 'Présent · Copie remise (en attente de correction par l’enseignant)';
  }
  return 'En attente de correction par l’enseignant';
}
