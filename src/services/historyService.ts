import type { HistoryCatalog, HistoryPage } from '@/types/history';
import type { RoleName } from '@/types/permissions';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
async function getHistory(path: string, role: RoleName, signal?: AbortSignal) {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  if (!data.session) throw new Error('Connexion requise.');
  const response = await fetch(path, { headers: { Authorization: `Bearer ${data.session.access_token}`, 'x-escen-role': role }, cache: 'no-store', signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Les données historiques sont indisponibles.');
  return result;
}
export const loadHistoryCatalog = (role: RoleName, signal?: AbortSignal): Promise<HistoryCatalog> => getHistory('/api/history', role, signal);
export function loadHistoryPage(table: string, role: RoleName, filters: { offset: number; query: string; flagged: boolean; studentId?: string; batchId?: string }, signal?: AbortSignal): Promise<HistoryPage> {
  const query = new URLSearchParams({ table, offset: String(filters.offset), query: filters.query, flagged: String(filters.flagged) });
  if (filters.studentId) query.set('studentId', filters.studentId);
  if (filters.batchId) query.set('batchId', filters.batchId);
  return getHistory(`/api/history?${query}`, role, signal);
}
export async function loadHistoryDocument(id: string, field: string, role: RoleName): Promise<string> {
  const result = await getHistory(`/api/history/file?${new URLSearchParams({ id, field })}`, role);
  return result.url;
}

export function loadHistoricalExam(id: string, role: RoleName, signal?: AbortSignal): Promise<{ exam: import('@/types/history').HistoryRecord; tables: Record<string, import('@/types/history').HistoryRecord[]> }> {
  return getHistory(`/api/history/exam?${new URLSearchParams({ id })}`, role, signal);
}

export async function loadAllHistoricalAssessments(role:RoleName,signal?:AbortSignal):Promise<HistoryPage> {
  return loadAllHistoryRecords('evaluations', role, { query: '', flagged: false }, signal);
}

export async function loadAllHistoryRecords(table: string, role: RoleName, filters: { query: string; flagged: boolean; studentId?: string; batchId?: string }, signal?: AbortSignal): Promise<HistoryPage> {
  const first=await loadHistoryPage(table,role,{offset:0,...filters},signal);
  if(first.total>20000)throw new Error('Le volume dépasse 20 000 lignes. Précisez la recherche avant de continuer.');
  if (!Number.isInteger(first.limit) || first.limit < 1) throw new Error('Pagination invalide. Aucun export n’a été produit.');
  const records=[...first.records];
  for(let offset=first.limit;offset<first.total;offset+=first.limit){const page=await loadHistoryPage(table,role,{offset,...filters},signal);records.push(...page.records);}
  if(records.length !== first.total || new Set(records.map(record => record.id)).size !== records.length) throw new Error('Les résultats ont changé ou sont incomplets. Relancez la recherche avant de réessayer.');
  return {...first,records,limit:first.total || first.limit};
}
