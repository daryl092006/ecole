import type { Permission, RoleName } from '@/types';
import { ROLES } from '@/types/permissions';
import { ROLE_ACCESS, hasPermission } from '@/permissions/rolePermissions';
import { PERMISSION_LABELS } from '@/permissions/permissionLabels';

export const PERMISSION_DOMAINS = [
  { id: 'academic', label: 'Référentiel académique', prefixes: ['academic'] },
  { id: 'students', label: 'Dossiers étudiants', prefixes: ['student'] },
  { id: 'planning', label: 'Planning et présences', prefixes: ['schedule', 'attendance'] },
  { id: 'grades', label: 'Notes et réclamations', prefixes: ['evaluation', 'grade', 'complaint'] },
  { id: 'finance', label: 'Finance', prefixes: ['finance', 'payment'] },
  { id: 'staff', label: 'Personnel et accès', prefixes: ['staff', 'user'] },
  { id: 'logistics', label: 'Achats et inventaire', prefixes: ['purchase', 'asset'] },
  { id: 'communication', label: 'Communication', prefixes: ['communication'] },
  { id: 'system', label: 'Système et support', prefixes: ['system'] },
];

export function roleScopeDescription(role: RoleName): string {
  if (role === ROLES.ENS) return 'Uniquement ses enseignements et les groupes qui lui sont affectés.';
  if (role === ROLES.SURV) return 'Uniquement les séances dont il assure la surveillance.';
  if (role === ROLES.STUD || role === ROLES.DEL) return 'Uniquement ses propres données et les séances de ses groupes.';
  if (role === ROLES.IT) return 'Tout l’établissement : tous les modules et actions, avec validations et audit.';
  if (role === ROLES.STG) return 'Aucune permission métier automatique.';
  return 'Périmètre de l’établissement, limité aux actions attribuées à ce rôle.';
}

export function getPermissionCatalog(actor: RoleName) {
  if (!hasPermission(actor, 'user.manage')) throw new Error('Consultation du catalogue des accès non autorisée.');
  return PERMISSION_DOMAINS.map(domain => ({
    id: domain.id, label: domain.label,
    permissions: (Object.keys(PERMISSION_LABELS) as Permission[])
      .filter(permission => domain.prefixes.includes(permission.split('.')[0]))
      .map(permission => ({ code: permission, label: PERMISSION_LABELS[permission] })),
  }));
}

export function getRolePermissionSummary(role: RoleName | null, actor: RoleName) {
  const domains = getPermissionCatalog(actor);
  if (role === null) return { role, description: 'Aucun rôle attribué.', scope: 'Aucun accès métier attribué à ce compte.', count: 0, domains: domains.map(domain => ({ ...domain, permissions: domain.permissions.map(permission => ({ ...permission, granted: false })) })) };
  const access = ROLE_ACCESS[role];
  if (!access) throw new Error('Rôle inconnu.');
  return {
    role, description: access.description, scope: roleScopeDescription(role),
    count: access.permissions.length,
    domains: domains.map(domain => ({ ...domain, permissions: domain.permissions.map(permission => ({ ...permission, granted: hasPermission(role, permission.code) })) })),
  };
}
