import { ROLES, type Permission, type RoleName } from '@/types/permissions';
import { ROLE_ACCESS, ROLE_PERMISSIONS } from '@/permissions/rolePermissions';
import { getSectionPath, getPortalRoute, HOME_PATH, MODULE_PATHS } from '@/constants/portalRoutes';

export const ALL_TABS = [
  {
    id: 'espace',
    name: 'Mon Espace',
    icon: 'Home',
    subTabs: [
      { id: 'espace_dashboard', name: 'Tableau de bord' },
      { id: 'espace_support', name: 'Support technique' },
      { id: 'espace_announcements', name: 'Annonces & Actualités' },
      { id: 'espace_documents', name: 'Mes documents' },
      { id: 'espace_finance', name: 'Ma scolarité' },
    ],
  },
  {
    id: 'dashboard_global',
    name: 'Tableau de Bord',
    icon: 'BarChart2',
    subTabs: [
      { id: 'dashboard_kpis', name: 'Statistiques Clés' },
      { id: 'dashboard_reports', name: 'Rapports & Activités' },
    ],
  },
  {
    id: 'academique',
    name: 'Académique',
    icon: 'BookOpen',
    subTabs: [
      { id: 'acad_program', name: 'Filières & Matières' },
      { id: 'acad_reference', name: 'Référentiel académique' },
      { id: 'acad_schedule', name: 'Emploi du temps' },
      { id: 'acad_attendance', name: 'Feuilles de présence' },
      { id: 'acad_grades', name: 'Évaluations & Notes' },
      { id: 'acad_complaints', name: 'Réclamations' },
      { id: 'acad_exams', name: 'Examens & Rattrapages' },
      { id: 'acad_jury', name: 'Délibérations & Relevés' },
      { id: 'acad_settings', name: 'Paramètres académiques' },
    ],
  },
  {
    id: 'etudiants',
    name: 'Étudiants',
    icon: 'GraduationCap',
    subTabs: [
      { id: 'stud_list', name: 'Liste des Étudiants' },
      { id: 'stud_cards', name: 'Cartes d\'Étudiant' },
      { id: 'stud_status', name: 'Réinscriptions & Abandons' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: 'CreditCard',
    subTabs: [
      { id: 'fin_kpis', name: 'Indicateurs Financiers' },
      { id: 'fin_payments', name: 'Échéanciers & Versements' },
      { id: 'fin_reports', name: 'Rapports Financiers' },
      { id: 'fin_contracts', name: 'Contrats, frais & Bourses' },
    ],
  },
  {
    id: 'personnel',
    name: 'Personnel',
    icon: 'Users',
    subTabs: [
      { id: 'staff_list', name: 'Utilisateurs & Rôles' },
      { id: 'staff_roles', name: 'Rôles ESCEN' },
      { id: 'staff_permissions', name: 'Matrice des permissions' },
      { id: 'staff_teachers', name: 'Enseignants & Affectations' },
      { id: 'staff_records', name: 'Dossiers du personnel' },
    ],
  },
  {
    id: 'marketing',
    name: 'Communication',
    icon: 'Megaphone',
    subTabs: [
      { id: 'comm_announcements', name: 'Créer une Annonce' },
      { id: 'comm_news', name: 'Actualités ESCEN' },
    ],
  },
  {
    id: 'logistique',
    name: 'Achats & Logistique',
    icon: 'Package',
    subTabs: [
      { id: 'log_purchases', name: 'Demandes d’achat' },
      { id: 'log_assets', name: 'Inventaire' },
    ],
  },
  {
    id: 'systeme',
    name: 'Système & Audit',
    icon: 'Settings',
    subTabs: [
      { id: 'sys_logs', name: 'Journal d\'Activité' },
      { id: 'sys_backups', name: 'Export du journal' },
      { id: 'sys_support', name: 'Tickets de Support' },
    ],
  },
];

const SUBTAB_PERMISSIONS: Record<string, Permission[]> = {
  acad_program: ['academic.view'],
  acad_reference: ['academic.structure.manage', 'academic.group.manage', 'academic.assignment.manage'],
  acad_schedule: ['schedule.view'],
  acad_attendance: ['attendance.view'],
  acad_grades: ['grade.view'],
  acad_complaints: ['complaint.view'],
  acad_exams: ['schedule.view'],
  acad_jury: ['grade.view'],
  acad_settings: ['academic.structure.manage'],
  fin_contracts: ['finance.view'],
  stud_list: ['student.view'],
  stud_cards: ['student.card.print'],
  stud_status: ['student.lifecycle.manage'],
  fin_kpis: ['finance.view'],
  fin_payments: ['finance.view'],
  fin_reports: ['finance.report.view'],
  staff_list: ['user.manage'],
  staff_roles: ['user.manage'],
  staff_permissions: ['user.manage'],
  staff_teachers: ['academic.assignment.manage'],
  comm_announcements: ['communication.manage'],
  comm_news: ['communication.view'],
  sys_logs: ['system.audit.view'],
  sys_backups: ['system.backup.manage'],
  sys_support: ['system.support.manage'],
};

export function getAvailableTabs(role: RoleName) {
  const rolePermissions = ROLE_PERMISSIONS[role];
  const roleAccess = ROLE_ACCESS[role];
  const canLogistics = [ROLES.DG, ROLES.DGA, ROLES.RAF, ROLES.ACHATS, ROLES.SITE].includes(role as typeof ROLES.DG);
  const canStaff = [ROLES.DG, ROLES.DGA, ROLES.RAF, ROLES.IT].includes(role as typeof ROLES.DG);
  return ALL_TABS
    .filter(tab => rolePermissions.allowedTabs.includes(tab.id) || (tab.id === 'logistique' && canLogistics) || (tab.id === 'personnel' && canStaff))
    .map(tab => ({
      ...tab,
      subTabs: tab.subTabs?.filter(subTab => {
        if (['espace_documents', 'espace_finance'].includes(subTab.id)) return role === ROLES.STUD || role === ROLES.DEL;
        if (subTab.id === 'acad_jury') return [ROLES.DG, ROLES.DGA, ROLES.DA, ROLES.LOG].includes(role as typeof ROLES.DG);
        if (subTab.id === 'acad_settings') return role === ROLES.DA || role === ROLES.DG;
        if (subTab.id === 'staff_records') return canStaff;
        const requiredPermissions = SUBTAB_PERMISSIONS[subTab.id];
        return !requiredPermissions || requiredPermissions.some(permission => roleAccess.permissions.includes(permission));
      }),
    })).map(tab => ({ ...tab, href: getSectionPath(tab.subTabs?.[0]?.id || 'espace_dashboard'), subTabs: tab.subTabs?.map(subTab => ({ ...subTab, href: getSectionPath(subTab.id) })) }));
}

export function isRouteAllowed(pathname: string, role: RoleName): boolean {
  const route = getPortalRoute(pathname);
  return getAvailableTabs(role).some(tab => route
    ? tab.id === route.tab && tab.subTabs?.some(section => section.id === route.section)
    : MODULE_PATHS[tab.id] === pathname && !!tab.subTabs?.length);
}
export function postLoginPath(requested: string | undefined, role: RoleName): string {
  return requested && isRouteAllowed(requested, role) ? requested : HOME_PATH;
}
