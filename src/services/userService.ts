import type { DemoUser } from '@/types/user';
import type { RoleName } from '@/types';
import { ROLES } from '@/types/permissions';
import { hasPermission } from '@/permissions/rolePermissions';
import { createMockId } from '@/utils/createMockId';
export function createDemoUser(name: string, email: string, userRole: RoleName, users: DemoUser[], actor: RoleName): DemoUser {
  if (!hasPermission(actor, 'user.manage')) throw new Error('Gestion des utilisateurs non autorisée.');
  if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Nom et email valide obligatoires.');
  if (!Object.values(ROLES).includes(userRole)) throw new Error('Rôle inconnu.');
  if ([ROLES.DG, ROLES.DA, ROLES.RAF, ROLES.IT].includes(userRole as typeof ROLES.DG) && actor !== ROLES.DG) throw new Error('La direction générale attribue les rôles de direction, de finance et d’administration technique.');
  if (users.some(item => item.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('Email déjà utilisé.');
  return { id: createMockId('USER'), name: name.trim(), email: email.trim(), role: userRole, active: true, history: [{ date: new Date().toISOString(), actor, oldValue: null, newValue: userRole, reason: 'Création du compte de démonstration' }] };
}
export function toggleDemoUser(user: DemoUser, reason: string, actor: RoleName): DemoUser {
  if (!hasPermission(actor, 'user.manage') || !reason.trim()) throw new Error('Permission et motif obligatoires.');
  if ([ROLES.DG, ROLES.DA, ROLES.RAF, ROLES.IT].includes(user.role as typeof ROLES.DG) && actor !== ROLES.DG) throw new Error('Changement réservé à la direction générale pour ce rôle.');
  return { ...user, active: !user.active, history: [...user.history, { date: new Date().toISOString(), actor, oldValue: String(user.active), newValue: String(!user.active), reason: reason.trim() }] };
}
