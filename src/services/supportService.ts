import type { SupportTicket } from '@/types/support';
import type { RoleName } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';
import { createMockId } from '@/utils/createMockId';
export function createSupportTicket(title: string, description: string, author: string, role: RoleName): SupportTicket {
  if (!title.trim() || !description.trim()) throw new Error('Titre et description obligatoires.');
  if (title.trim().length > 160 || description.trim().length > 5000) throw new Error('L’objet est limité à 160 caractères et la description à 5 000 caractères.');
  const date = new Date().toISOString();
  return { id: createMockId('TICKET'), title: title.trim(), description: description.trim(), author, role, createdAt: date, status: 'OUVERT', history: [{ date, actor: author, role, oldValue: null, newValue: 'OUVERT', reason: description.trim() }] };
}
export function transitionSupportTicket(ticket: SupportTicket, target: SupportTicket['status'], reason: string, role: RoleName, actor: string = role): SupportTicket {
  if (!hasPermission(role, 'system.support.manage')) throw new Error('Traitement réservé au support technique.');
  if (reason.trim().length < 3 || reason.trim().length > 1000) throw new Error('Le compte rendu doit contenir entre 3 et 1 000 caractères.');
  if (!((ticket.status === 'OUVERT' && target === 'EN_COURS') || (ticket.status === 'EN_COURS' && target === 'RESOLU'))) throw new Error('Transition interdite.');
  return { ...ticket, status: target, history: [...ticket.history, { date: new Date().toISOString(), actor, role, oldValue: ticket.status, newValue: target, reason: reason.trim() }] };
}
