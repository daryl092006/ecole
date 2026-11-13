export interface NavigationGroup {
  id: string;
  name: string;
  icon: string;
  category: string;
  sections: string[];
}

// Presentation only: destinations are intersected with the existing authorized pages.
export const WORKSPACE_NAVIGATION: NavigationGroup[] = [
  { id: 'home', name: 'Mon espace', icon: 'Home', category: 'Accueil et suivi', sections: ['espace_exams', 'espace_dashboard', 'espace_profile', 'espace_attendance', 'espace_announcements', 'espace_documents', 'espace_finance', 'espace_support'] },
  { id: 'overview', name: 'Pilotage', icon: 'BarChart2', category: 'Accueil et suivi', sections: ['dashboard_kpis', 'dashboard_reports'] },
  { id: 'year', name: 'Année scolaire', icon: 'CalendarDays', category: 'Scolarité', sections: ['acad_reference', 'acad_settings'] },
  { id: 'applications', name: 'Candidatures', icon: 'ClipboardCheck', category: 'Scolarité', sections: ['web_applications'] },
  { id: 'students', name: 'Dossiers étudiants', icon: 'GraduationCap', category: 'Scolarité', sections: ['stud_list', 'stud_status', 'stud_cards'] },
  { id: 'teaching', name: 'Cours et présences', icon: 'BookOpen', category: 'Scolarité', sections: ['acad_resources', 'acad_groups', 'acad_program', 'staff_teachers', 'acad_schedule', 'acad_attendance'] },
  { id: 'results', name: 'Examens et résultats', icon: 'ClipboardCheck', category: 'Scolarité', sections: ['acad_subjects', 'acad_exams', 'acad_grades', 'acad_complaints', 'acad_jury'] },
  { id: 'payments', name: 'Scolarité et paiements', icon: 'CreditCard', category: 'Services de l’établissement', sections: ['fin_kpis', 'fin_contracts', 'fin_payments', 'fin_reports'] },
  { id: 'staff', name: 'Personnel', icon: 'Users', category: 'Services de l’établissement', sections: ['staff_records'] },
  { id: 'communication', name: 'Communication', icon: 'Megaphone', category: 'Services de l’établissement', sections: ['comm_announcements'] },
  { id: 'logistics', name: 'Achats et matériel', icon: 'Package', category: 'Services de l’établissement', sections: ['log_suppliers', 'log_purchases', 'log_assets'] },
  { id: 'website', name: 'Site web', icon: 'Globe', category: 'Administration', sections: ['web_prospects', 'web_documents', 'web_brochures', 'comm_news', 'web_galleries'] },
  { id: 'access', name: 'Comptes et droits d’accès', icon: 'Users', category: 'Administration', sections: ['stud_accounts', 'staff_list', 'staff_roles', 'staff_permissions'] },
  { id: 'system', name: 'Données et assistance', icon: 'Settings', category: 'Administration', sections: ['sys_data', 'sys_logs', 'sys_emails', 'sys_backups', 'sys_support'] },
];

interface AuthorizedTab { id: string; subTabs?: { id: string; name: string; href: string }[]; }

const STUDENT_NAVIGATION: NavigationGroup[] = [
  { id: 'home', name: 'Mon quotidien', icon: 'Home', category: 'Mon espace étudiant', sections: ['espace_dashboard', 'espace_profile'] },
  { id: 'student_courses', name: 'Mes cours', icon: 'BookOpen', category: 'Mes études', sections: ['acad_schedule', 'acad_resources', 'acad_program'] },
  { id: 'student_results', name: 'Mes résultats et examens', icon: 'ClipboardCheck', category: 'Mes études', sections: ['acad_grades', 'espace_exams', 'acad_exams', 'acad_complaints'] },
  { id: 'student_attendance', name: 'Mon assiduité', icon: 'ClipboardCheck', category: 'Mes études', sections: ['espace_attendance'] },
  { id: 'student_admin', name: 'Mes démarches', icon: 'CreditCard', category: 'Ma vie étudiante', sections: ['espace_finance', 'espace_documents'] },
  { id: 'student_news', name: 'Annonces et assistance', icon: 'Megaphone', category: 'Ma vie étudiante', sections: ['espace_announcements', 'espace_support'] },
  { id: 'student_delegate', name: 'Mon rôle de délégué', icon: 'Users', category: 'Ma vie étudiante', sections: ['acad_attendance'] },
];

export function getWorkspaceNavigation(tabs: AuthorizedTab[], options?: { hideStudentPersonalPages?: boolean; studentView?: boolean; delegateView?: boolean }) {
  const pages = tabs.flatMap(tab => (tab.subTabs || []).map(page => ({ ...page, tab: tab.id })));
  const pageIds = new Set(pages.map(p => p.id));
  const isStudentOnly = !tabs.some(tab => tab.id !== 'espace');
  const shouldDeduplicateStaffHome = Boolean(options?.hideStudentPersonalPages) && !isStudentOnly && !options?.studentView;
  return (options?.studentView ? STUDENT_NAVIGATION.filter(group => group.id !== 'student_delegate' || options.delegateView) : WORKSPACE_NAVIGATION).map(group => ({
    ...group,
    pages: group.sections
      .filter(id => {
        if (!shouldDeduplicateStaffHome) return true;
        if (['espace_documents', 'espace_finance', 'espace_attendance'].includes(id)) return false;
        if (id === 'espace_announcements' && (pageIds.has('comm_announcements') || pageIds.has('comm_news'))) return false;
        if (id === 'espace_support' && pageIds.has('sys_support')) return false;
        return true;
      })
      .flatMap(id => pages.filter(page => page.id === id)),
  })).filter(group => group.pages.length > 0);
}
