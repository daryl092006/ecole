import type { HistoryRecord } from '@/types/history';
export interface ArchivedAnswer {
  text: string; optionIds: string[]; justification: string; correction: string; correctedAt: string;
}
const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
export function decodeArchivedAnswer(value: unknown): ArchivedAnswer {
  let parsed = value;
  if (typeof value === 'string') { try { parsed = JSON.parse(value); } catch { /* Anciennes réponses textuelles conservées. */ } }
  const answer: ArchivedAnswer = { text: '', optionIds: [], justification: '', correction: '', correctedAt: '' };
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const fields = parsed as Record<string, unknown>;
    answer.text = text(fields.text);
    const options = fields.option_ids ?? fields.options_ids ?? fields.option_id;
    answer.optionIds = (Array.isArray(options) ? options : options == null ? [] : [options]).map(text).filter(Boolean);
    answer.justification = text(fields.justification);
    answer.correction = text(fields.commentaire_correction);
    answer.correctedAt = text(fields.corrige_le);
  } else answer.text = typeof parsed === 'boolean' ? parsed ? 'Vrai' : 'Faux' : text(parsed);
  return answer;
}
export function orderedQuestions(tables: Record<string, HistoryRecord[]>) {
  const parts = [...(tables.exam_parts || [])].sort((a,b) => Number(a.values.order || 0) - Number(b.values.order || 0) || a.sourceId.localeCompare(b.sourceId));
  const rank = (row: HistoryRecord) => { const index = parts.findIndex(part => part.sourceId === String(row.values.part_id)); return index < 0 ? parts.length : index; };
  return [...(tables.exam_questions || [])].sort((a,b) => rank(a)-rank(b) || Number(a.values.order || 0)-Number(b.values.order || 0) || a.sourceId.localeCompare(b.sourceId));
}
