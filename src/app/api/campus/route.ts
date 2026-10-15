import { ROLES } from '@/types/permissions';
import { requireAccount, errorResponse, RequestError } from '@/server/auth';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterSnapshotForAcademicYear } from '@/services/academicYearScopeService';
import type { RelationalSnapshot } from '@/types/persistence';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    const result = await client.rpc('escen_backend_snapshot');
    if (result.error) throw new RequestError(503, 'Chargement des dossiers indisponible.');
    const snapshot = result.data as RelationalSnapshot;
    const academicContext = await resolveAcademicYear(request, client, context, snapshot);
    let confirmedHistoricalStudentIds: string[] = [];
    if (academicContext.selectedYearId && [ROLES.IT, ROLES.DG].includes(context.role as typeof ROLES.IT) && context.permissions.includes('system.audit.view') && context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id)) {
      const membership = await client.rpc('escen_history_student_ids_year', {p_year_id:academicContext.selectedYearId});
      if (membership.error) throw new RequestError(503, 'Le rattachement annuel des dossiers historiques est indisponible.');
      confirmedHistoricalStudentIds = membership.data || [];
    }
    const scoped = filterSnapshotForAcademicYear(filterRelationalSnapshot(snapshot, context), academicContext.selectedYearId || (academicContext.selection === 'all' ? null : '00000000-0000-0000-0000-000000000000'), confirmedHistoricalStudentIds);
    scoped.tables.academic_years = (snapshot.tables.academic_years || []).filter(year => academicContext.years.some(allowed => allowed.id === year.id));
    return Response.json({ ...scoped, academicContext }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    await requireAccount(request);
    throw new RequestError(501, 'Les commandes métier persistantes ne sont pas encore activées.');
  } catch (error) { return errorResponse(error); }
}
