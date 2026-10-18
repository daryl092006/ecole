export function isEvaluationEnrollmentStatus(status: unknown): boolean {
  return status === 'INSCRIT' || status === 'REINSCRIT';
}
