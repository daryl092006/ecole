export const ROLES = {
  DG: 'Directeur Général',
  DGA: 'Directeur Général Adjoint',
  DA: 'Directeur Académique',
  LOG: 'Logisticien académique',
  ENS: 'Enseignant',
  SURV: 'Surveillant',
  RAF: 'Responsable Administratif et Financier',
  MKT: 'Responsable marketing',
  ACHATS: 'Responsable des achats et de la logistique',
  SITE: 'Responsable du site',
  IT: 'Informaticien',
  STUD: 'Étudiant',
  DEL: 'Délégué',
  STG: 'Stagiaire',
} as const;

export type RoleName = typeof ROLES[keyof typeof ROLES];

export type Permission =
  | 'academic.view'
  | 'academic.structure.manage'
  | 'academic.year.open'
  | 'academic.group.manage'
  | 'academic.assignment.manage'
  | 'schedule.view'
  | 'schedule.create'
  | 'schedule.update'
  | 'attendance.view'
  | 'attendance.record'
  | 'attendance.review'
  | 'exam.take'
  | 'evaluation.create'
  | 'grade.view'
  | 'grade.enter'
  | 'grade.submit'
  | 'grade.review'
  | 'grade.approve'
  | 'grade.publish'
  | 'complaint.view'
  | 'complaint.review'
  | 'finance.view'
  | 'finance.report.view'
  | 'payment.record'
  | 'payment.cancel'
  | 'student.view'
  | 'student.update'
  | 'student.group.assign'
  | 'student.card.print'
  | 'student.lifecycle.manage'
  | 'communication.view'
  | 'communication.manage'
  | 'user.manage'
  | 'staff.view'
  | 'staff.manage'
  | 'purchase.view'
  | 'purchase.create'
  | 'purchase.approve'
  | 'purchase.receive'
  | 'asset.view'
  | 'asset.manage'
  | 'email.view'
  | 'email.retry'
  | 'system.audit.view'
  | 'system.backup.manage'
  | 'system.support.manage';

export interface Scope {
  teacherId?: string;
  studentId?: string;
  groupIds?: string[];
  sessionIds?: string[];
  ownDataOnly?: boolean;
}

export interface RoleAccess {
  role: RoleName;
  description: string;
  permissions: Permission[];
  scope: Scope;
}

export interface PermissionSchema {
  name: string;
  desc: string;
  allowedTabs: string[];
  permissions: Permission[];
  scope: Scope;
  canEditGrades: boolean;
  canValidateGrades: boolean;
  canEditFinance: boolean;
  canManageUsers: boolean;
  canPlanCourses: boolean;
}
