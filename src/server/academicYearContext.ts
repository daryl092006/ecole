import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PersistentContext, RelationalSnapshot } from '@/types/persistence';
import type { AcademicYearContext } from '@/types/academicYearContext';
import { accessibleAcademicYears } from '@/services/academicYearScopeService';
import { ROLES } from '@/types/permissions';
import { RequestError } from '@/server/auth';

export async function resolveAcademicYear(request: Request, client: SupabaseClient, context: PersistentContext, snapshot: RelationalSnapshot): Promise<AcademicYearContext> {
  const result = await client.rpc('escen_academic_year_context');
  if (result.error) throw new RequestError(503, 'Le contexte des années est indisponible. Réessayez.');
  const years = accessibleAcademicYears(snapshot, context);
  const personal = [ROLES.STUD, ROLES.DEL].includes(context.role as typeof ROLES.STUD);
  const currentYearId = years.some(year => year.id === result.data?.currentYearId)
    ? result.data.currentYearId as string
    : personal
      ? (years.find(year => year.status === 'OUVERTE')?.id || years[0]?.id || null)
      : null;
  const selection = request.headers.get('x-escen-year') || 'current';
  const selectedYearId = selection === 'all' ? null : selection === 'current' ? currentYearId : z.uuid().parse(selection);
  if (selectedYearId && !years.some(year => year.id === selectedYearId)) throw new RequestError(403, 'Cette année ne fait pas partie de vos attributions. Choisissez une année autorisée.');
  return { currentYearId, currentYearConfigured: !!result.data?.currentYearId || (personal && !!currentYearId), selectedYearId, selection, years };
}

export async function assertArchiveAcademicYear(request: Request, client: SupabaseClient, context: PersistentContext, rowId: string) {
  if (request.headers.get('x-escen-year') === 'all') return;
  const snapshot = await client.rpc('escen_backend_snapshot');
  if (snapshot.error) throw new RequestError(503, 'Contexte annuel indisponible.');
  const year = await resolveAcademicYear(request, client, context, snapshot.data as RelationalSnapshot);
  if (!year.selectedYearId) throw new RequestError(409,'Choisissez une année scolaire, ou Toutes les années pour une consultation historique explicite.');
  const matches = await client.rpc('escen_history_row_matches_year', {p_year_id: year.selectedYearId, p_row_id: rowId});
  if (matches.error) throw new RequestError(503, 'Le rattachement annuel est indisponible.');
  if (!matches.data) throw new RequestError(404, 'Cette archive n’est pas rattachée à l’année consultée. Choisissez Toutes les années pour examiner sa provenance.');
}
