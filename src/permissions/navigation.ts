import { ROLES, type Permission, type RoleName } from '@/types/permissions';
import { ROLE_ACCESS, ROLE_PERMISSIONS } from '@/permissions/rolePermissions';
import { getSectionPath, getPortalRoute, HOME_PATH, MODULE_PATHS } from '@/constants/portalRoutes';

export const ALL_TABS = [
  {
    id: 'espace',
    name: 'Accueil',
    icon: 'Home',
    subTabs: [
      { id: 'espace_dashboard', name: 'Tableau de bord' },
      { id: 'espace_profile', name: 'Mon profil' },
      { id: 'espace_attendance', name: 'Mon assiduité' },
      { id: 'espace_support', name: 'Support technique' },
      { id: 'espace_announcements', name: 'Annonces & Actualités' },
      { id: 'espace_exams', name: 'Mes épreuves en ligne' },
      { id: 'espace_documents', name: 'Mes documents' },
      { id: 'espace_finance', name: 'Ma scolarité' },
    ],
  },
  {
    id: 'dashboard_global',
    name: 'Pilotage',
    icon: 'BarChart2',
    subTabs: [
      { id: 'dashboard_kpis', name: 'Statistiques Clés' },
      { id: 'dashboard_reports', name: 'Rapports & Activités' },
    ],
  },
  {
    id: 'academique',
    name: 'Pédagogie',
    icon: 'BookOpen',
    subTabs: [
      { id: 'acad_program', name: 'Filières & Matières' },
      { id: 'acad_reference', name: 'Référentiel académique' },
      { id: 'acad_schedule', name: 'Emploi du temps' },
      { id: 'acad_attendance', name: 'Feuilles de présence' },
      {id:'acad_subjects',name:'Composition des épreuves'},
      { id: 'acad_grades', name: 'Notes et résultats' },
      { id: 'acad_complaints', name: 'Réclamations' },
      { id: 'acad_exams', name: 'Contrôles, examens et rattrapages' },
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
      { id: 'stud_accounts', name: 'Comptes étudiants' },
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
      { id: 'staff_list', name: 'Comptes du personnel' },
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

    ],
  },
  {
    id: 'website', name: 'Site web', icon: 'Globe',
    subTabs: [
      { id: 'web_applications', name: 'Candidatures' },
      { id: 'web_documents', name: 'Formations et pièces' },
      { id: 'web_brochures', name: 'Brochures' },
      { id: 'comm_news', name: 'Articles' },
    ],
  },
  {
    id: 'logistique',
    name: 'Achats & Logistique',
    icon: 'Package',
    subTabs: [
      { id: 'log_purchases', name: 'Demandes d’achat' },
      { id:'log_suppliers',name:'Fournisseurs' },
      { id: 'log_assets', name: 'Inventaire' },
    ],
  },
  {
    id: 'systeme',
    name: 'Administration',
    icon: 'Settings',
    subTabs: [
      { id: 'sys_data', name: 'Toutes les données' },
      { id: 'sys_logs', name: 'Journal d\'Activité' },
      { id: 'sys_emails', name: 'Suivi des mails' },
      { id: 'sys_backups', name: 'Export du journal' },
      { id: 'sys_support', name: 'Tickets de Support' },
    ],
  },
];

const SUBTAB_PERMISSIONS: Record<string, Permission[]> = {
  espace_exams: ['exam.take'],
  espace_attendance: ['attendance.view'],
  web_applications: ['application.view', 'student.view'],
  web_documents: ['student.view'],
  web_brochures: ['communication.view'],
  staff_records: ['staff.view'],
  log_suppliers:['purchase.view'],
  sys_data: ['system.audit.view'],
  stud_accounts: ['user.manage'],
  acad_program: ['academic.view'],
  acad_reference: ['academic.structure.manage', 'academic.group.manage', 'academic.assignment.manage'],
  acad_schedule: ['schedule.view'],
  acad_attendance: ['attendance.view'],
  acad_grades: ['grade.view'],
  acad_complaints: ['complaint.view'],
  acad_exams: ['schedule.view', 'academic.view', 'grade.view'],
  acad_resits:['schedule.view'],
  acad_assessments:['academic.view','grade.view'],
  acad_subjects:['evaluation.create'],
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
  staff_teachers: ['academic.assignment.manage', 'staff.manage'],
  comm_announcements: ['communication.manage'],
  comm_news: ['communication.view'],
  sys_logs: ['system.audit.view'],
  sys_emails: ['email.view'],
  sys_backups: ['system.backup.manage'],
  sys_support: ['system.support.manage'],
};

export function getAvailableTabs(role: RoleName, permissions?: Permission[], globalAccess = true) {
  const rolePermissions = ROLE_PERMISSIONS[role];
  const roleAccess = ROLE_ACCESS[role];
  const canLogistics = [ROLES.DG, ROLES.DGA, ROLES.RAF, ROLES.ACHATS, ROLES.SITE, ROLES.IT].includes(role as typeof ROLES.DG);
  const canStaff = [ROLES.DG, ROLES.DGA, ROLES.RAF, ROLES.IT].includes(role as typeof ROLES.DG);
  return ALL_TABS
    .filter(tab => (tab.id === 'website' && globalAccess) || rolePermissions.allowedTabs.includes(tab.id) || (tab.id === 'logistique' && canLogistics) || (tab.id === 'personnel' && canStaff))
    .map(tab => ({
      ...tab,
      subTabs: tab.subTabs?.filter(subTab => {
        if (subTab.id === 'espace_exams' && role !== ROLES.STUD && role !== ROLES.DEL) return false;
        if (tab.id === 'website') {
          if (!globalAccess) return false;
          const effective = permissions || roleAccess.permissions;
          if (subTab.id === 'web_applications') return effective.includes('application.view');
          if (['web_applications', 'web_documents'].includes(subTab.id)) return [ROLES.DG, ROLES.DGA, ROLES.DA, ROLES.LOG, ROLES.RAF, ROLES.MKT, ROLES.CC, ROLES.IT].includes(role as typeof ROLES.DG) && effective.includes('student.view');
          return effective.includes('communication.view') && ![ROLES.STUD, ROLES.DEL, ROLES.ENS].includes(role as typeof ROLES.STUD);
        }
        const effectiveRequired = SUBTAB_PERMISSIONS[subTab.id];
        if (subTab.id === 'sys_emails' && (!globalAccess || ![ROLES.DG, ROLES.IT].includes(role as typeof ROLES.DG))) return false;
        if (permissions && effectiveRequired && !effectiveRequired.some(permission => permissions.includes(permission))) return false;
        if (role === ROLES.IT && !permissions) return true;
        if (role === ROLES.IT && permissions) { const required = SUBTAB_PERMISSIONS[subTab.id]; return !required || required.some(permission => permissions.includes(permission)); }
        if (['espace_documents', 'espace_finance', 'espace_attendance'].includes(subTab.id)) return role === ROLES.STUD || role === ROLES.DEL;
        if (subTab.id === 'acad_jury') return [ROLES.DG, ROLES.DGA, ROLES.DA, ROLES.LOG].includes(role as typeof ROLES.DG);
        if (subTab.id === 'acad_settings') return role === ROLES.DA || role === ROLES.DG;
        if (subTab.id === 'staff_records') return canStaff && (permissions || roleAccess.permissions).includes('staff.view');
        const requiredPermissions = SUBTAB_PERMISSIONS[subTab.id];
        return !requiredPermissions || requiredPermissions.some(permission => (permissions || roleAccess.permissions).includes(permission));
      }),
    })).filter(tab => !!tab.subTabs?.length).map(tab => ({ ...tab, href: MODULE_PATHS[tab.id] || getSectionPath(tab.id === 'personnel' && tab.subTabs?.some(section => section.id === 'staff_records') ? 'staff_records' : tab.subTabs?.[0]?.id || 'espace_dashboard'), subTabs: tab.subTabs?.map(subTab => ({ ...subTab, name: getPortalRoute(getSectionPath(subTab.id))?.title || subTab.name, href: getSectionPath(subTab.id) })) }));
}

export function isRouteAllowed(pathname: string, role: RoleName): boolean {
  const route = getPortalRoute(pathname);
  const sectionId = route && ['acad_resits', 'acad_assessments'].includes(route.section) ? 'acad_exams' : route?.section;
  return getAvailableTabs(role).some(tab => route
    ? tab.id === route.tab && tab.subTabs?.some(section => section.id === sectionId)
    : MODULE_PATHS[tab.id] === pathname && !!tab.subTabs?.length);
}
export function postLoginPath(requested: string | undefined, role: RoleName): string {
  if (!requested || !requested.startsWith('/') || requested.startsWith('//') || /[\u0000-\u001f\u007f]/.test(requested)) return HOME_PATH;
  try {
    const destination = new URL(requested, 'https://escen.invalid');
    if (destination.origin !== 'https://escen.invalid' || !isRouteAllowed(destination.pathname, role)) return HOME_PATH;
    return destination.pathname + destination.search + destination.hash;
  } catch { return HOME_PATH; }
}
