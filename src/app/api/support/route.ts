import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { supportCommandSchema, canManageSupport, visibleSupportTickets, planSupportCommand, SupportPolicyError } from '@/services/persistentSupportService';
import type { RelationalSnapshot } from '@/types/persistence';

export const dynamic = 'force-dynamic';
async function load(request: Request) {
  const auth = await requireAccount(request);
  const result = await auth.client.rpc('escen_backend_snapshot');
  if (result.error) throw new RequestError(503, 'Chargement des demandes indisponible.');
  const snapshot = result.data as RelationalSnapshot;
  const year = await resolveAcademicYear(request, auth.client, auth.context, snapshot);
  return { ...auth, snapshot, year };
}
export async function GET(request: Request) {
  try {
    const { context, snapshot, year } = await load(request);
    const tickets = visibleSupportTickets(snapshot, context, year.selectedYearId);
    const ids = new Set(tickets.map(ticket => ticket.id));
    return Response.json({ revision: snapshot.revision, yearId: year.selectedYearId, canManage: canManageSupport(context, year.selectedYearId), tickets,
      messages: (snapshot.tables.support_messages || []).filter(message => ids.has(String(message.ticket_id))),
      categories: (snapshot.tables.support_categories || []).filter(category => category.active === true),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { client, context, snapshot, year } = await load(request);
    const command = supportCommandSchema.parse(await request.json());
    if (command.action === 'transition') requirePermission(context, 'system.support.manage');
    const plan = planSupportCommand(snapshot, context, year.selectedYearId, command, () => crypto.randomUUID());
    const result = await client.rpc('escen_backend_transaction', { p_actor_id: context.accountId, p_expected_revision: command.revision, p_changes: plan.changes });
    if (result.error) throw new RequestError(409, 'Enregistrement refusé. Actualisez les demandes avant de réessayer.');
    return Response.json({ id: plan.id, revision: result.data }, { status: command.action === 'create' ? 201 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error instanceof SupportPolicyError ? new RequestError(error.status, error.message) : error); }
}
