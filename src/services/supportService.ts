import type { SupportTicket } from '@/types/support';
import type { RoleName } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';
import { createMockId } from '@/utils/createMockId';
export function createSupportTicket(title: string, description: string, author: string, role: RoleName): SupportTicket {
  if (!title.trim() || !description.trim()) throw new Error('Titre et description obligatoires.');
  const date = new Date().toISOString();
  return { id: createMockId('TICKET'), title: title.trim(), description: description.trim(), author, role, createdAt: date, status: 'OUVERT', history: [{ date, actor: author, role, oldValue: null, newValue: 'OUVERT', reason: description.trim() }] };
}
export function transitionSupportTicket(ticket: SupportTicket, target: SupportTicket['status'], reason: string, role: RoleName): SupportTicket {
  if (!hasPermission(role, 'system.support.manage')) throw new Error('Traitement réservé au support technique.');
  if (!reason.trim()) throw new Error('Compte rendu obligatoire.');
  if (!((ticket.status === 'OUVERT' && target === 'EN_COURS') || (ticket.status === 'EN_COURS' && target === 'RESOLU'))) throw new Error('Transition interdite.');
  return { ...ticket, status: target, history: [...ticket.history, { date: new Date().toISOString(), actor: role, role, oldValue: ticket.status, newValue: target, reason: reason.trim() }] };
}
