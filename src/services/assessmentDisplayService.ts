import type { HistoryRecord } from '@/types/history';
export type AssessmentCategory='control'|'exam'|'resit'|'unknown';
const normalize=(value:unknown)=>String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function assessmentCategory(record:HistoryRecord):AssessmentCategory {
  const kind=normalize(record.values.type);const session=normalize(record.values.session_type);
  if(session==='rattrapage' || kind==='rattrapage')return 'resit';
  if(kind==='examen')return 'exam';
  if(['devoir','interrogation','tp','expose','projet','controle','controle continu'].includes(kind))return 'control';
  return 'unknown';
}
export const ASSESSMENT_LABELS={control:'Contrôles continus',exam:'Examens',resit:'Rattrapages',unknown:'À classer'};

/** Correction progress is separate from the institutional grade workflow. */
export function assessmentProgress(values: Record<string, unknown>, now = new Date()): string {
  if (values.cancelled_at || values.archived_at || values.deleted_at) return 'Retirée';
  if (values.status === 'PUBLIEES' || [true, 1, '1'].includes(values.published as boolean | number | string)) return 'Résultats publiés';
  if (values.status === 'VALIDEES') return 'Notes validées';
  if (values.status === 'A_CONTROLER') return 'À contrôler';
  if (values.status === 'SOUMISES') return 'Correction soumise';
  if (values.correction_submission_date) return 'Correction soumise';
  if (values.status === 'SAISIES') return 'Notes saisies';
  const date = String(values.held_on || values.date || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date))) {
    const today = now.toISOString().slice(0, 10);
    if (date > today) return 'Programmée';
    if (date < today) return 'En attente de correction';
    return 'Prévue aujourd’hui';
  }
  return values.status === 'BROUILLON' ? 'Brouillon' : 'État non renseigné';
}

export function combinedAssessmentProgress(rows: Record<string, unknown>[], incompleteGradeCount = 0, candidateCount?: number): string {
  const states = [...new Set(rows.map(row => assessmentProgress(row)))];
  if (states.length === 1 && states[0] === 'Résultats publiés' && (incompleteGradeCount > 0 || candidateCount === 0)) {
    return candidateCount === 0 ? 'Aucun candidat' : 'Notes incomplètes';
  }
  return states.length === 1 ? states[0] : 'États différents';
}
