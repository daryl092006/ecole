import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { visiblePurchases, purchaseScope, purchaseCapability, planPurchaseCommand, purchaseCommandSchema, PurchasePolicyError } from '@/services/persistentPurchaseService';
import type { RelationalSnapshot } from '@/types/persistence';
export const dynamic = 'force-dynamic';
async function load(request: Request) {
  const auth = await requireAccount(request); requirePermission(auth.context, 'purchase.view');
  const result = await auth.client.rpc('escen_backend_snapshot');
  if (result.error) throw new RequestError(503, 'Chargement des achats indisponible.');
  const snapshot = result.data as RelationalSnapshot;
  return { ...auth, snapshot, year: await resolveAcademicYear(request, auth.client, auth.context, snapshot) };
}
export async function GET(request: Request) {
  try {
    const { context, snapshot, year } = await load(request);
    const readYear = year.selectedYearId || (year.selection === 'all' ? null : '00000000-0000-0000-0000-000000000000');
    const purchases = visiblePurchases(snapshot, context, readYear); const ids = new Set(purchases.map(row => row.id));
    return Response.json({ revision: snapshot.revision, yearId: year.selectedYearId, purchases,
      lines: (snapshot.tables.purchase_lines || []).filter(row => ids.has(String(row.purchase_id))), receipts: (snapshot.tables.purchase_receipts || []).filter(row => ids.has(String(row.purchase_id))),
      expenses: (snapshot.tables.expenses || []).filter(row => ids.has(String(row.purchase_id))).map(row => ({ id: row.id, purchase_id: row.purchase_id, amount: row.amount, paid_on: row.paid_on, reason: row.reason })),
      canCreate: purchaseCapability(context, 'purchase.create', year.selectedYearId), canApprove: purchaseCapability(context, 'purchase.approve', year.selectedYearId), canReceive: purchaseCapability(context, 'purchase.receive', year.selectedYearId),
      requiresSite: !context.grants.some(grant => !grant.site_id && !grant.group_id && (!year.selectedYearId || !grant.academic_year_id || grant.academic_year_id === year.selectedYearId)),
      suppliers: (snapshot.tables.suppliers || []).filter(row => !row.archived_at).map(row => ({ id: row.id, name: row.name })),
      sites: (snapshot.tables.sites || []).filter(row => row.active !== false && purchaseScope(context, year.selectedYearId, row.id)).map(row => ({ id: row.id, name: row.name })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { context, client, snapshot, year } = await load(request);
    const command = purchaseCommandSchema.parse(await request.json());
    requirePermission(context, command.action === 'create' ? 'purchase.create' : command.action === 'decide' ? 'purchase.approve' : 'purchase.receive');
    const plan = planPurchaseCommand(snapshot, context, year.selectedYearId, command, () => crypto.randomUUID());
    const result = await client.rpc('escen_backend_transaction', { p_actor_id: context.accountId, p_expected_revision: command.revision, p_changes: plan.changes });
    if (result.error) throw new RequestError(409, 'Enregistrement refusé. Actualisez l’achat et vérifiez les quantités et références.');
    return Response.json({ id: plan.id, revision: result.data }, { status: command.action === 'create' ? 201 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error instanceof PurchasePolicyError ? new RequestError(error.status, error.message) : error); }
}
