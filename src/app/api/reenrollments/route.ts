import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { previousAcademicYear, reenrollmentCandidates } from '@/services/reenrollmentService';
import type { RelationalSnapshot } from '@/types/persistence';
import { ROLES } from '@/types/permissions';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const {client,context} = await requireAccount(request); requirePermission(context,'student.view');
    const result = await client.rpc('escen_backend_snapshot');
    if (result.error) throw new RequestError(503,'Les inscriptions ne sont pas disponibles.');
    const snapshot = result.data as RelationalSnapshot;
    const year = await resolveAcademicYear(request,client,context,snapshot);
    if (!year.selectedYearId) throw new RequestError(409,'Choisissez l’année scolaire de réinscription.');
    const target = snapshot.tables.academic_years.find(row => row.id === year.selectedYearId)!;
    const previous = previousAcademicYear(snapshot.tables.academic_years,target);
    const scoped = filterRelationalSnapshot(snapshot,context);
    let historicalPrevious: string[] = []; let historicalTarget: string[] = [];
    if (previous && [ROLES.IT,ROLES.DG].includes(context.role as typeof ROLES.IT) && context.permissions.includes('system.audit.view') && context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id)) {
      const results = await Promise.all([previous.id,target.id].map(id => client.rpc('escen_history_student_ids_year',{p_year_id:id})));
      if (results.some(item => item.error)) throw new RequestError(503,'Le rattachement des anciennes inscriptions est indisponible.');
      historicalPrevious=results[0].data || []; historicalTarget=results[1].data || [];
    }
    return Response.json({target:{id:target.id,name:target.name},previous:previous ? {id:previous.id,name:previous.name} : null,students:previous ? reenrollmentCandidates(scoped,previous.id,target.id,historicalPrevious,historicalTarget) : []},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return errorResponse(error); }
}
