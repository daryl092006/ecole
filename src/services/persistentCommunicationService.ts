import { z } from 'zod';
import type { PersistentContext, RelationalSnapshot, PersistentChange } from '@/types/persistence';
export class CommunicationPolicyError extends Error { constructor(public status: number, message: string) { super(message); } }

export const communicationCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), revision: z.number().int().nonnegative(), title: z.string().trim().min(1).max(160), content: z.string().trim().min(1).max(5000), audiences: z.array(z.discriminatedUnion('kind', [z.object({ kind: z.literal('all') }).strict(), z.object({ kind: z.literal('role'), id: z.uuid() }).strict(), z.object({ kind: z.literal('group'), id: z.uuid() }).strict()])).min(1).max(30) }).strict(),
  z.object({ action: z.literal('publish'), revision: z.number().int().nonnegative(), id: z.uuid(), expiresAt: z.iso.datetime({ offset: true }).nullable() }).strict(),
  z.object({ action: z.literal('withdraw'), revision: z.number().int().nonnegative(), id: z.uuid(), reason: z.string().trim().min(3).max(1000) }).strict(),
]);
export type CommunicationCommand = z.infer<typeof communicationCommandSchema>;
export function canManageCommunications(context: PersistentContext) {
  return context.permissions.includes('communication.manage') && context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id);
}
export function planCommunicationCommand(snapshot: RelationalSnapshot, context: PersistentContext, yearId: string | null, command: CommunicationCommand, now: string, newId: () => string): { id: string; changes: PersistentChange[] } {
  if (!canManageCommunications(context)) throw new CommunicationPolicyError(403, 'Diffusion réservée aux comptes autorisés sur tout l’établissement.');
  if (!yearId) throw new CommunicationPolicyError(409, 'Choisissez une année scolaire précise.');
  if (snapshot.revision !== command.revision) throw new CommunicationPolicyError(409, 'Les annonces ont changé. Actualisez.');
  if (command.action === 'create') {
    const targets = command.audiences;
    if (targets.some(target => target.kind === 'all') && targets.length !== 1) throw new CommunicationPolicyError(400, 'Choisissez tous les comptes ou des destinataires précis.');
    const unique = new Set(targets.map(target => target.kind === 'all' ? 'all' : `${target.kind}:${target.id}`));
    if (unique.size !== targets.length) throw new CommunicationPolicyError(400, 'Un destinataire est présent plusieurs fois.');
    const id = newId();
    const audiences = targets.map(target => {
      if (target.kind === 'role' && !(snapshot.tables.roles || []).some(role => role.id === target.id && role.active === true)) throw new CommunicationPolicyError(400, 'Rôle destinataire indisponible.');
      if (target.kind === 'group' && !(snapshot.tables.groups || []).some(group => group.id === target.id && group.academic_year_id === yearId && !group.archived_at)) throw new CommunicationPolicyError(400, 'Le groupe doit appartenir à l’année sélectionnée.');
      return { table: 'communication_audiences', operation: 'insert', record: { id: newId(), communication_id: id, all_accounts: target.kind === 'all', role_id: target.kind === 'role' ? target.id : null, group_id: target.kind === 'group' ? target.id : null } } as PersistentChange;
    });
    return { id, changes: [{ table: 'communications', operation: 'insert', record: { id, academic_year_id: yearId, author_id: context.accountId, title: command.title, content: command.content, published_at: null, expires_at: null } }, ...audiences] };
  }
  const row = (snapshot.tables.communications || []).find(item => item.id === command.id && item.academic_year_id === yearId);
  if (!row) throw new CommunicationPolicyError(404, 'Annonce introuvable.');
  if (row.withdrawn_at) throw new CommunicationPolicyError(409, 'Cette annonce est déjà retirée.');
  if (command.action === 'publish') {
    if (command.expiresAt && Date.parse(command.expiresAt) <= Date.parse(now)) throw new CommunicationPolicyError(400, 'L’expiration doit être future.');
    if (row.published_at) throw new CommunicationPolicyError(409, 'Cette annonce est déjà publiée.');
    const audiences = (snapshot.tables.communication_audiences || []).filter(item => item.communication_id === row.id);
    if (!audiences.length) throw new CommunicationPolicyError(409, 'Définissez les destinataires avant la publication.');
    for (const target of audiences) {
      if (target.role_id && !(snapshot.tables.roles || []).some(role => role.id === target.role_id && role.active === true)) throw new CommunicationPolicyError(409, 'Un rôle destinataire n’est plus actif.');
      if (target.group_id && !(snapshot.tables.groups || []).some(group => group.id === target.group_id && group.academic_year_id === yearId && !group.archived_at)) throw new CommunicationPolicyError(409, 'Un groupe destinataire n’est plus disponible.');
    }
    return { id: row.id, changes: [{ table: 'communications', operation: 'update', record: { id: row.id, published_at: now, expires_at: command.expiresAt } }] };
  }
  return { id: row.id, changes: [{ table: 'communications', operation: 'update', record: { id: row.id, withdrawn_at: now, withdrawal_reason: command.reason } }] };
}
