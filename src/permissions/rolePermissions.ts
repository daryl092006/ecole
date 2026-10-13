import { Permission, PermissionSchema, RoleAccess, RoleName, ROLES } from '@/types/permissions';

const academicOversight: Permission[] = [
  'academic.view', 'schedule.view', 'attendance.view', 'grade.view',
  'grade.review', 'grade.approve', 'grade.publish', 'complaint.view', 'complaint.review',
  'student.view',
];

const academicManagement: Permission[] = [
  ...academicOversight,
  'academic.structure.manage',
];

export const ROLE_ACCESS: Record<RoleName, RoleAccess> = {
  [ROLES.DG]: { role: ROLES.DG, description: 'Vision globale et décisions stratégiques.', permissions: ['academic.view', 'schedule.view', 'grade.view', 'complaint.view', 'finance.view', 'finance.report.view', 'student.view', 'communication.view', 'system.audit.view'], scope: {} },
  [ROLES.DGA]: { role: ROLES.DGA, description: 'Suivi opérationnel global.', permissions: ['academic.view', 'schedule.view', 'grade.view', 'complaint.view', 'finance.view', 'finance.report.view', 'student.view', 'communication.view'], scope: {} },
  [ROLES.DA]: { role: ROLES.DA, description: 'Pilote la structure académique : années, filières, parcours, niveaux et matières.', permissions: [...academicManagement, 'academic.year.open'], scope: {} },
  [ROLES.LOG]: { role: ROLES.LOG, description: 'Assure provisoirement la gestion académique, les groupes, les affectations et la planification.', permissions: [...academicManagement, 'academic.group.manage', 'academic.assignment.manage', 'schedule.create', 'schedule.update', 'student.group.assign'], scope: {} },
  [ROLES.ENS]: { role: ROLES.ENS, description: 'Ses enseignements, groupes, présences et notes.', permissions: ['academic.view', 'schedule.view', 'attendance.view', 'attendance.record', 'evaluation.create', 'grade.view', 'grade.enter', 'grade.submit', 'complaint.view'], scope: { groupIds: [] } },
  [ROLES.SURV]: { role: ROLES.SURV, description: 'Séances affectées, présences et incidents.', permissions: ['schedule.view', 'attendance.view', 'attendance.record'], scope: { sessionIds: [] } },
  [ROLES.RAF]: { role: ROLES.RAF, description: 'Opérations financières quotidiennes.', permissions: ['finance.view', 'finance.report.view', 'payment.record', 'student.view'], scope: {} },
  [ROLES.MKT]: { role: ROLES.MKT, description: 'Communication institutionnelle.', permissions: ['communication.view', 'communication.manage'], scope: {} },
  [ROLES.ACHATS]: { role: ROLES.ACHATS, description: 'Achats et logistique non académique.', permissions: [], scope: {} },
  [ROLES.SITE]: { role: ROLES.SITE, description: 'Supervision opérationnelle du site.', permissions: ['schedule.view', 'communication.view'], scope: {} },
  [ROLES.IT]: { role: ROLES.IT, description: 'Administration technique sans privilège métier.', permissions: ['user.manage', 'system.audit.view', 'system.backup.manage', 'system.support.manage'], scope: {} },
  [ROLES.STUD]: { role: ROLES.STUD, description: 'Accès à ses propres données académiques.', permissions: ['schedule.view', 'grade.view', 'complaint.view'], scope: { groupIds: [], ownDataOnly: true } },
  [ROLES.DEL]: { role: ROLES.DEL, description: 'Étudiant avec responsabilités limitées de représentation.', permissions: ['schedule.view', 'grade.view', 'complaint.view'], scope: { groupIds: [], ownDataOnly: true } },
  [ROLES.STG]: { role: ROLES.STG, description: 'Aucune permission métier automatique.', permissions: [], scope: {} },
};

export function hasPermission(role: RoleName, permission: Permission): boolean {
  return ROLE_ACCESS[role].permissions.includes(permission);
}

function getAllowedTabs(role: RoleName, permissions: Permission[]): string[] {
  const tabs = ['espace'];
  if (permissions.some(permission => ['academic.view', 'schedule.view', 'attendance.view', 'grade.view', 'complaint.view'].includes(permission))) tabs.push('academique');
  if (permissions.includes('student.view')) tabs.push('etudiants');
  if (permissions.includes('finance.view')) tabs.push('finance');
  if (permissions.includes('user.manage')) tabs.push('personnel');
  if (permissions.some(permission => permission.startsWith('communication.'))) tabs.push('marketing');
  if (permissions.some(permission => permission.startsWith('system.'))) tabs.push('systeme');
  if (role === ROLES.DG || role === ROLES.DGA) tabs.splice(1, 0, 'dashboard_global');
  return tabs;
}

export const ROLE_PERMISSIONS = Object.fromEntries(
  Object.values(ROLE_ACCESS).map(access => [access.role, {
    name: access.role,
    desc: access.description,
    permissions: access.permissions,
    scope: access.scope,
    allowedTabs: getAllowedTabs(access.role, access.permissions),
    canEditGrades: access.permissions.includes('grade.enter'),
    canValidateGrades: access.permissions.includes('grade.approve'),
    canEditFinance: access.permissions.includes('payment.record'),
    canManageUsers: access.permissions.includes('user.manage'),
    canPlanCourses: access.permissions.includes('schedule.create'),
  }])
) as Record<RoleName, PermissionSchema>;
