import { z } from 'zod';
import type { DatabaseRow, PersistentChange, PersistentContext, RelationalSnapshot } from '@/types/persistence';
import type { Permission } from '@/types/permissions';

const quantity = z.number().min(.001).max(999999999.999).refine(value => Number(value.toFixed(3)) === value, 'Trois décimales maximum.');
const common = { revision: z.number().int().nonnegative(), reason: z.string().trim().min(3).max(1000) };
export const purchaseCommandSchema = z.discriminatedUnion('action', [
  z.object({ ...common, action: z.literal('create'), supplierId: z.uuid().nullable(), siteId: z.uuid().nullable(), lines: z.array(z.object({ description: z.string().trim().min(1).max(500), quantity, unitAmount: z.number().int().min(0).max(999999999999999) }).strict()).min(1).max(50) }).strict(),
  z.object({ ...common, action: z.literal('decide'), id: z.uuid(), decision: z.enum(['APPROUVE', 'REFUSE']) }).strict(),
  z.object({ ...common, action: z.literal('receive'), id: z.uuid(), lines: z.array(z.object({ lineId: z.uuid(), quantity }).strict()).min(1).max(50) }).strict(),
]);
export type PurchaseCommand = z.infer<typeof purchaseCommandSchema>;
export class PurchasePolicyError extends Error { constructor(public status: number, message: string) { super(message); } }
export function purchaseScope(context: PersistentContext, yearId: string | null, siteId?: unknown) {
  return context.grants.some(grant => !grant.group_id && (!yearId || !grant.academic_year_id || grant.academic_year_id === yearId) && (siteId === undefined || !grant.site_id || grant.site_id === siteId));
}
export function visiblePurchases(snapshot: RelationalSnapshot, context: PersistentContext, yearId: string | null) {
  return context.permissions.includes('purchase.view') ? (snapshot.tables.purchases || []).filter(row => (!yearId || row.academic_year_id === yearId) && purchaseScope(context, String(row.academic_year_id || ''), row.site_id || null)) : [];
}
const units = (value: unknown) => Math.round(Number(value) * 1000);
export function purchaseCapability(context: PersistentContext, permission: Permission, yearId: string | null) { return context.permissions.includes(permission) && purchaseScope(context, yearId); }
export function planPurchaseCommand(snapshot: RelationalSnapshot, context: PersistentContext, yearId: string | null, command: PurchaseCommand, newId: () => string): { id: string; changes: PersistentChange[] } {
  if (!yearId) throw new PurchasePolicyError(409, 'Choisissez une année scolaire précise.');
  const permission = command.action === 'create' ? 'purchase.create' : command.action === 'decide' ? 'purchase.approve' : 'purchase.receive';
  if (!purchaseCapability(context, permission, yearId)) throw new PurchasePolicyError(403, 'Cette opération d’achat ne fait pas partie de vos attributions.');
  if (command.revision !== snapshot.revision) throw new PurchasePolicyError(409, 'Les achats ont changé. Actualisez avant de réessayer.');
  if (command.action === 'create') {
    if (!purchaseScope(context, yearId, command.siteId)) throw new PurchasePolicyError(403, 'Choisissez un site autorisé.');
    if (command.siteId && !(snapshot.tables.sites || []).some(row => row.id === command.siteId && row.active !== false)) throw new PurchasePolicyError(400, 'Site indisponible.');
    if (command.supplierId && !(snapshot.tables.suppliers || []).some(row => row.id === command.supplierId && !row.archived_at)) throw new PurchasePolicyError(400, 'Fournisseur indisponible.');
    const id = newId();
    return { id, changes: [{ table: 'purchases', operation: 'insert', record: { id, academic_year_id: yearId, site_id: command.siteId, supplier_id: command.supplierId, reference: `ACH-${id}`, requested_by: context.accountId, status: 'DEMANDE', reason: command.reason } }, ...command.lines.map(line => ({ table: 'purchase_lines', operation: 'insert' as const, record: { id: newId(), purchase_id: id, description: line.description, quantity: line.quantity, unit_amount: line.unitAmount } }))] };
  }
  const purchase = visiblePurchases(snapshot, context, yearId).find(row => row.id === command.id);
  if (!purchase) throw new PurchasePolicyError(404, 'Achat introuvable.');
  if (command.action === 'decide') {
    if (purchase.status !== 'DEMANDE') throw new PurchasePolicyError(409, 'Cette demande a déjà reçu une décision.');
    return { id: purchase.id, changes: [{ table: 'purchases', operation: 'update', record: { id: purchase.id, status: command.decision, reason: command.reason } }] };
  }
  if (!['APPROUVE', 'RECEPTION_PARTIELLE'].includes(String(purchase.status))) throw new PurchasePolicyError(409, 'Seul un achat approuvé avec des quantités restantes peut être réceptionné.');
  if (new Set(command.lines.map(line => line.lineId)).size !== command.lines.length) throw new PurchasePolicyError(400, 'Une ligne de réception est présente plusieurs fois.');
  const lines = (snapshot.tables.purchase_lines || []).filter(row => row.purchase_id === purchase.id);
  const received = (line: DatabaseRow) => (snapshot.tables.purchase_receipts || []).filter(row => row.line_id === line.id).reduce((sum, row) => sum + units(row.quantity), 0);
  const receipts: PersistentChange[] = command.lines.map(entry => {
    const line = lines.find(row => row.id === entry.lineId);
    if (!line) throw new PurchasePolicyError(400, 'La ligne n’appartient pas à cet achat.');
    if (received(line) + units(entry.quantity) > units(line.quantity)) throw new PurchasePolicyError(409, 'La réception dépasse la quantité restant à recevoir.');
    return { table: 'purchase_receipts', operation: 'insert', record: { id: newId(), purchase_id: purchase.id, line_id: line.id, quantity: entry.quantity, received_by: context.accountId, reason: command.reason } };
  });
  const complete = lines.every(line => received(line) + units(command.lines.find(entry => entry.lineId === line.id)?.quantity || 0) === units(line.quantity));
  return { id: purchase.id, changes: [...receipts, { table: 'purchases', operation: 'update', record: { id: purchase.id, status: complete ? 'RECU' : 'RECEPTION_PARTIELLE', reason: command.reason } }] };
}
