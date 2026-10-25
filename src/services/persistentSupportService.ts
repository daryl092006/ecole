import { z } from 'zod';
import type { PersistentChange, PersistentContext, RelationalSnapshot } from '@/types/persistence';

const common = { revision: z.number().int().nonnegative() };
export const supportCommandSchema = z.discriminatedUnion('action', [
  z.object({ ...common, action: z.literal('create'), title: z.string().trim().min(1).max(160), description: z.string().trim().min(3).max(5000), categoryId: z.uuid().nullable(), priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) }).strict(),
  z.object({ ...common, action: z.literal('reply'), ticketId: z.uuid(), body: z.string().trim().min(3).max(5000) }).strict(),
  z.object({ ...common, action: z.literal('transition'), ticketId: z.uuid(), fromStatus: z.enum(['OPEN', 'IN_PROGRESS']), toStatus: z.enum(['IN_PROGRESS', 'RESOLVED']), reason: z.string().trim().min(3).max(1000) }).strict(),
]);
export type SupportCommand = z.infer<typeof supportCommandSchema>;

export class SupportPolicyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function canManageSupport(context: PersistentContext, yearId: string | null) {
  return context.permissions.includes('system.support.manage') && context.grants.some(grant => !grant.site_id && !grant.group_id && (!yearId || !grant.academic_year_id || grant.academic_year_id === yearId));
}
export function visibleSupportTickets(snapshot: RelationalSnapshot, context: PersistentContext, yearId: string | null) {
  const manager = canManageSupport(context, yearId);
  return (snapshot.tables.support_tickets || []).filter(ticket => (!yearId || ticket.academic_year_id === yearId)
    && (ticket.author_id === context.accountId || manager && context.grants.some(grant => !grant.site_id && !grant.group_id && (!grant.academic_year_id || grant.academic_year_id === ticket.academic_year_id))));
}
export function planSupportCommand(snapshot: RelationalSnapshot, context: PersistentContext, yearId: string | null, command: SupportCommand, newId: () => string): { id: string; changes: PersistentChange[] } {
  if (!yearId) throw new SupportPolicyError(409, 'Choisissez une année scolaire précise.');
  if (command.revision !== snapshot.revision) throw new SupportPolicyError(409, 'Les demandes ont changé. Actualisez avant de réessayer.');
  if (command.action === 'create') {
    if (command.categoryId && !(snapshot.tables.support_categories || []).some(category => category.id === command.categoryId && category.active === true)) throw new SupportPolicyError(409, 'Cette catégorie n’est plus disponible.');
    const id = newId();
    return { id, changes: [{ table: 'support_tickets', operation: 'insert', record: { id, academic_year_id: yearId, author_id: context.accountId, assigned_to: null, category_id: command.categoryId, reference: `SUP-${id}`, title: command.title, description: command.description, priority: command.priority, status: 'OPEN' } }] };
  }
  const ticket = visibleSupportTickets(snapshot, context, yearId).find(row => row.id === command.ticketId);
  if (!ticket) throw new SupportPolicyError(404, 'Demande introuvable.');
  if (['RESOLVED', 'CLOSED'].includes(String(ticket.status))) throw new SupportPolicyError(409, 'Cette demande est terminée. Ouvrez une nouvelle demande si nécessaire.');
  if (command.action === 'reply') return { id: ticket.id, changes: [{ table: 'support_messages', operation: 'insert', record: { id: newId(), ticket_id: ticket.id, author_id: context.accountId, body: command.body } }] };
  if (!canManageSupport(context, yearId)) throw new SupportPolicyError(403, 'Traitement réservé au support technique.');
  if (ticket.status !== command.fromStatus) throw new SupportPolicyError(409, 'L’état de la demande a changé. Actualisez.');
  if (!(command.fromStatus === 'OPEN' && command.toStatus === 'IN_PROGRESS' || command.fromStatus === 'IN_PROGRESS' && command.toStatus === 'RESOLVED')) throw new SupportPolicyError(409, 'Transition de support interdite.');
  return { id: ticket.id, changes: [
    { table: 'support_tickets', operation: 'update', record: { id: ticket.id, status: command.toStatus, ...(command.toStatus === 'IN_PROGRESS' ? { assigned_to: context.accountId } : {}) } },
    { table: 'support_messages', operation: 'insert', record: { id: newId(), ticket_id: ticket.id, author_id: context.accountId, body: `${command.toStatus === 'IN_PROGRESS' ? 'Prise en charge' : 'Résolution'} : ${command.reason}` } },
  ] };
}
