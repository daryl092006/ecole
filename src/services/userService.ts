import type { DemoUser } from '@/types/user';
import type { RoleName } from '@/types';
import { ROLES } from '@/types/permissions';
import { hasPermission } from '@/permissions/rolePermissions';
import { createMockId } from '@/utils/createMockId';
export const SENSITIVE_USER_ROLES: readonly RoleName[] = [ROLES.DG, ROLES.DGA, ROLES.DA, ROLES.RAF, ROLES.IT];
export function createDemoUser(name: string, email: string, userRole: RoleName, users: DemoUser[], actor: RoleName, author: string = actor): DemoUser {
  if (!hasPermission(actor, 'user.manage')) throw new Error('Gestion des utilisateurs non autorisée.');
  if (!name.trim() || name.trim().length > 160 || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Nom et email valide obligatoires (160 et 254 caractères maximum).');
  if (!Object.values(ROLES).includes(userRole)) throw new Error('Rôle inconnu.');
  if (SENSITIVE_USER_ROLES.includes(userRole) && actor !== ROLES.DG && actor !== ROLES.IT) throw new Error('La direction générale attribue les rôles de direction, de finance et d’administration technique.');
  if (users.some(item => item.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('Email déjà utilisé.');
  return { id: createMockId('USER'), name: name.trim(), email: email.trim(), role: userRole, active: true, history: [{ date: new Date().toISOString(), actor: author, role: actor, oldValue: null, newValue: userRole, reason: 'Création du compte de démonstration' }] };
}
export function toggleDemoUser(user: DemoUser, reason: string, actor: RoleName, author: string = actor): DemoUser {
  if (!hasPermission(actor, 'user.manage') || !reason.trim()) throw new Error('Permission et motif obligatoires.');
  if ((user.roles ?? (user.role ? [user.role] : [])).some(role => SENSITIVE_USER_ROLES.includes(role)) && actor !== ROLES.DG && actor !== ROLES.IT) throw new Error('Changement réservé à la direction générale pour ce rôle.');
  validateReason(reason);
  return { ...user, active: !user.active, history: [...user.history, { date: new Date().toISOString(), actor: author, role: actor, oldValue: String(user.active), newValue: String(!user.active), reason: reason.trim() }] };
}

function validateReason(reason: string) {
  if (reason.trim().length < 3 || reason.trim().length > 1000) throw new Error('Le motif doit contenir entre 3 et 1 000 caractères.');
}

export function canAdministerUser(user: DemoUser, actor: RoleName): boolean {
  return hasPermission(actor, 'user.manage') && (actor === ROLES.DG || actor === ROLES.IT || !(user.roles ?? (user.role ? [user.role] : [])).some(role => SENSITIVE_USER_ROLES.includes(role)));
}

export function assignableUserRoles(actor: RoleName): RoleName[] {
  if (!hasPermission(actor, 'user.manage')) throw new Error('Gestion des utilisateurs non autorisée.');
  return Object.values(ROLES).filter(role => actor === ROLES.DG || actor === ROLES.IT || !SENSITIVE_USER_ROLES.includes(role));
}

export function changeDemoUserRole(user: DemoUser, target: RoleName, reason: string, actor: RoleName, author: string = actor): DemoUser {
  if (!canAdministerUser(user, actor)) throw new Error('Modification du rôle non autorisée.');
  if (!assignableUserRoles(actor).includes(target)) throw new Error('Ce rôle ne peut pas être attribué par votre compte.');
  if (target === user.role) throw new Error('Cet utilisateur possède déjà ce rôle.');
  validateReason(reason);
  return { ...user, role: target, ...(user.roles ? { roles: [...new Set([target, ...user.roles.filter(role => role !== user.role)])] } : {}), history: [...user.history, { date: new Date().toISOString(), actor: author, role: actor, oldValue: user.role, newValue: target, reason: reason.trim() }] };
}

export function queryDemoUsers(users: DemoUser[], actor: RoleName, filters: { search: string; role: string; status: string }): DemoUser[] {
  if (!hasPermission(actor, 'user.manage')) throw new Error('Consultation de l’annuaire non autorisée.');
  if (filters.role && !Object.values(ROLES).includes(filters.role as RoleName)) throw new Error('Filtre de rôle inconnu.');
  if (!['', 'ACTIF', 'INACTIF'].includes(filters.status)) throw new Error('Filtre de statut inconnu.');
  const normalize = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const query = normalize(filters.search);
  return users.filter(user => (!filters.role || (user.roles ?? (user.role ? [user.role] : [])).includes(filters.role as RoleName)) && (!filters.status || user.active === (filters.status === 'ACTIF')) && (!query || normalize(`${user.name} ${user.email} ${(user.roles ?? (user.role ? [user.role] : [])).join(' ')}`).includes(query)));
}
