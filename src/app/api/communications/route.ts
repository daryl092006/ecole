import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { filterSnapshotForAcademicYear } from '@/services/academicYearScopeService';
import { communicationCommandSchema, canManageCommunications, planCommunicationCommand, CommunicationPolicyError } from '@/services/persistentCommunicationService';
import { ROLES } from '@/types/permissions';
import type { RelationalSnapshot } from '@/types/persistence';

export const dynamic = 'force-dynamic';
async function load(request: Request) {
  const auth = await requireAccount(request);
  if (![ROLES.STUD, ROLES.DEL].includes(auth.context.role as typeof ROLES.STUD)) requirePermission(auth.context, 'communication.view');
  const result = await auth.client.rpc('escen_backend_snapshot');
  if (result.error) throw new RequestError(503, 'Chargement des annonces indisponible.');
  const snapshot = result.data as RelationalSnapshot;
  const year = await resolveAcademicYear(request, auth.client, auth.context, snapshot);
  return { ...auth, snapshot, year };
}
export async function GET(request: Request) {
  try {
    const { context, snapshot, year } = await load(request);
    const scoped = filterSnapshotForAcademicYear(filterRelationalSnapshot(snapshot, context), year.selectedYearId || (year.selection === 'all' ? null : '00000000-0000-0000-0000-000000000000'));
    const canManage = canManageCommunications(context);
    return Response.json({ revision: snapshot.revision, yearId: year.selectedYearId, canManage,
      announcements: scoped.tables.communications || [], audiences: scoped.tables.communication_audiences || [],
      roles: canManage ? (snapshot.tables.roles || []).filter(role => role.active === true).map(role => ({ id: role.id, name: role.name, code: role.code })) : [],
      groups: canManage ? (snapshot.tables.groups || []).filter(group => group.academic_year_id === year.selectedYearId && !group.archived_at).map(group => ({ id: group.id, name: group.name })) : [],
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { context, client, snapshot, year } = await load(request);
    requirePermission(context, 'communication.manage');
    const command = communicationCommandSchema.parse(await request.json());
    const plan = planCommunicationCommand(snapshot, context, year.selectedYearId, command, new Date().toISOString(), () => crypto.randomUUID());
    const result = await client.rpc('escen_backend_transaction', { p_actor_id: context.accountId, p_expected_revision: command.revision, p_changes: plan.changes });
    if (result.error) throw new RequestError(409, 'Enregistrement refusé. Actualisez les annonces avant de réessayer.');
    return Response.json({ id: plan.id, revision: result.data }, { status: command.action === 'create' ? 201 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error instanceof CommunicationPolicyError ? new RequestError(error.status, error.message) : error); }
}
