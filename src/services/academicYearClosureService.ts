import type { RelationalSnapshot } from '@/types/persistence';

export interface YearClosureCheck {
  key: string;
  label: string;
  count: number;
  href: string;
}
export interface YearClosureReview {
  revision: number;
  yearId: string;
  checks: YearClosureCheck[];
  ready: boolean;
}

export function academicYearClosureReview(snapshot: RelationalSnapshot, yearId: string): YearClosureReview {
  const rows = (table: string) => snapshot.tables[table] || [];
  // Keep the same historical scope as the SQL command, including archived records.
  const offerings = new Set(rows('academic_offerings').filter(row => row.academic_year_id === yearId).map(row => row.id));
  const evaluations = rows('evaluations').filter(row => offerings.has(String(row.offering_id)));
  const evaluationIds = new Set(evaluations.map(row => row.id));
  const candidates = new Set(rows('evaluation_candidates').filter(row => evaluationIds.has(String(row.evaluation_id))).map(row => row.id));
  const checks: YearClosureCheck[] = [
    { key: 'evaluations', label: 'Évaluations à publier ou à annuler', count: evaluations.filter(row => !row.cancelled_at && row.status !== 'PUBLIEES').length, href: '/academique/evaluations' },
    { key: 'complaints', label: 'Réclamations à terminer', count: rows('complaints').filter(row => candidates.has(String(row.candidate_id)) && row.status !== 'CLOTUREE').length, href: '/academique/reclamations' },
    { key: 'attempts', label: 'Tentatives d’examen encore en cours', count: rows('exam_attempts').filter(row => evaluationIds.has(String(row.evaluation_id)) && row.status === 'EN_COURS').length, href: '/academique/examens' },
  ];
  return { revision: snapshot.revision, yearId, checks, ready: checks.every(check => check.count === 0) };
}
