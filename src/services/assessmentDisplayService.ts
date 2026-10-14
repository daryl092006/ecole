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
