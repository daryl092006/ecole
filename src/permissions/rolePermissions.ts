import { Permission, PermissionSchema, RoleAccess, RoleName, ROLES } from '@/types/permissions';

import { PERMISSION_LABELS } from '@/permissions/permissionLabels';

const academicOversight: Permission[] = [
  'academic.view', 'schedule.view', 'attendance.view', 'grade.view',
  'attendance.review',
  'grade.review', 'grade.approve', 'grade.publish', 'complaint.view', 'complaint.review',
  'student.view',
];

const academicManagement: Permission[] = [
  ...academicOversight,
  'academic.structure.manage',
];

export const ROLE_ACCESS: Record<RoleName, RoleAccess> = {
  [ROLES.DG]: { role: ROLES.DG, description: 'Vision globale, décisions stratégiques et validation des annulations financières.', permissions: ['application.view', 'academic.view', 'schedule.view', 'grade.view', 'complaint.view', 'finance.view', 'finance.report.view', 'student.view', 'communication.view', 'system.audit.view', 'email.view', 'user.manage', 'payment.cancel', 'staff.view', 'staff.manage', 'purchase.view', 'purchase.approve', 'asset.view'], scope: {} },
  [ROLES.DGA]: { role: ROLES.DGA, description: 'Suivi opérationnel global.', permissions: ['application.view', 'academic.view', 'schedule.view', 'grade.view', 'complaint.view', 'finance.view', 'finance.report.view', 'student.view', 'communication.view', 'staff.view', 'purchase.view', 'asset.view'], scope: {} },
  [ROLES.DA]: { role: ROLES.DA, description: 'Pilote la structure académique, les jurys et le parcours des étudiants.', permissions: ['application.view','application.decide', ...academicManagement, 'academic.year.open', 'student.lifecycle.manage', 'student.card.print'], scope: {} },
  [ROLES.LOG]: { role: ROLES.LOG, description: 'Gère les dossiers, les groupes, les affectations et la planification.', permissions: ['academic.view', 'academic.structure.manage', 'schedule.view', 'attendance.view', 'grade.view', 'complaint.view', 'student.view', 'student.update', 'academic.group.manage', 'academic.assignment.manage', 'schedule.create', 'schedule.update', 'student.group.assign', 'student.lifecycle.manage', 'student.card.print'], scope: {} },
  [ROLES.CC]: { role: ROLES.CC, description: 'Réception, vérification et suivi des candidatures, confirmation des frais et création du dossier étudiant après admission.', permissions: ['application.view', 'application.review', 'application.followup', 'application.payment.confirm', 'student.view', 'academic.view', 'schedule.view'], scope: {} },
  [ROLES.ENS]: { role: ROLES.ENS, description: 'Ses enseignements, groupes, présences et notes.', permissions: ['academic.view', 'schedule.view', 'attendance.view', 'attendance.record', 'evaluation.create', 'grade.view', 'grade.enter', 'grade.submit', 'complaint.view'], scope: { groupIds: [] } },
  [ROLES.SURV]: { role: ROLES.SURV, description: 'Séances affectées, présences et incidents.', permissions: ['schedule.view', 'attendance.view', 'attendance.record'], scope: { sessionIds: [] } },
  [ROLES.RAF]: { role: ROLES.RAF, description: 'Opérations financières quotidiennes.', permissions: ['application.view', 'application.payment.confirm', 'academic.view', 'schedule.view', 'finance.view', 'finance.report.view', 'payment.record', 'student.view', 'staff.view', 'staff.manage', 'purchase.view', 'purchase.approve', 'asset.view'], scope: {} },
  [ROLES.MKT]: { role: ROLES.MKT, description: 'Communication institutionnelle, suivi des candidatures, consultation des étudiants et des programmes.', permissions: ['application.view', 'application.followup', 'student.view', 'academic.view', 'schedule.view', 'communication.view', 'communication.manage'], scope: {} },
  [ROLES.ACHATS]: { role: ROLES.ACHATS, description: 'Achats et logistique non académique.', permissions: ['purchase.view', 'purchase.create', 'purchase.receive', 'asset.view', 'asset.manage'], scope: {} },
  [ROLES.SITE]: { role: ROLES.SITE, description: 'Supervision opérationnelle du site.', permissions: ['schedule.view', 'communication.view', 'purchase.view', 'asset.view', 'asset.manage'], scope: {} },
  [ROLES.IT]: { role: ROLES.IT, description: 'Accès complet aux modules et actions de la plateforme, avec validations et audit.', permissions: Object.keys(PERMISSION_LABELS) as Permission[], scope: {} },
  [ROLES.STUD]: { role: ROLES.STUD, description: 'Accès à ses propres données académiques.', permissions: ['schedule.view', 'grade.view', 'complaint.view', 'exam.take', 'attendance.view'], scope: { groupIds: [], ownDataOnly: true } },
  [ROLES.DEL]: { role: ROLES.DEL, description: 'Étudiant délégué : présences de son groupe et du professeur de la séance ; autres données personnelles uniquement.', permissions: ['schedule.view', 'grade.view', 'complaint.view', 'exam.take', 'attendance.view', 'attendance.record'], scope: { groupIds: [], ownDataOnly: true } },
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
  if (([ROLES.DG, ROLES.DGA, ROLES.RAF].includes(role as typeof ROLES.DG) || permissions.includes('academic.assignment.manage')) && !tabs.includes('personnel')) tabs.push('personnel');
  if ([ROLES.DG, ROLES.DGA, ROLES.RAF, ROLES.ACHATS, ROLES.SITE, ROLES.IT].includes(role as typeof ROLES.DG)) tabs.push('logistique');
  if (permissions.some(permission => permission.startsWith('communication.'))) tabs.push('marketing');
  if (permissions.some(permission => permission.startsWith('system.'))) tabs.push('systeme');
  if (role === ROLES.DG || role === ROLES.DGA || role === ROLES.IT) tabs.splice(1, 0, 'dashboard_global');
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
