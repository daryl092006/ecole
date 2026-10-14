export interface PortalRoute { tab: string; section: string; href: string; title: string; studentId?: string; }
export const PORTAL_ROUTES: PortalRoute[] = [
  { tab: 'espace', section: 'espace_dashboard', href: '/mon-espace', title: 'Mon espace' },
  { tab: 'espace', section: 'espace_support', href: '/mon-espace/support', title: 'Support technique' },
  { tab: 'espace', section: 'espace_announcements', href: '/mon-espace/annonces', title: 'Annonces et actualités' },
  { tab: 'espace', section: 'espace_documents', href: '/mon-espace/documents', title: 'Mes documents' },
  { tab: 'espace', section: 'espace_finance', href: '/mon-espace/scolarite', title: 'Ma scolarité' },
  { tab: 'dashboard_global', section: 'dashboard_kpis', href: '/tableau-de-bord', title: 'Vue d’ensemble' },
  { tab: 'dashboard_global', section: 'dashboard_reports', href: '/tableau-de-bord/rapports', title: 'Rapports de pilotage' },
  { tab: 'academique', section: 'acad_program', href: '/academique/filieres', title: 'Filières et matières' },
  { tab: 'academique', section: 'acad_reference', href: '/academique/referentiel', title: 'Référentiel académique' },
  { tab: 'academique', section: 'acad_schedule', href: '/academique/emploi-du-temps', title: 'Emploi du temps' },
  { tab: 'academique', section: 'acad_attendance', href: '/academique/presences', title: 'Feuilles de présence' },
  { tab: 'academique', section: 'acad_grades', href: '/academique/notes', title: 'Évaluations et notes' },
  { tab: 'academique', section: 'acad_complaints', href: '/academique/reclamations', title: 'Réclamations académiques' },
  { tab: 'academique', section: 'acad_exams', href: '/academique/examens', title: 'Examens et rattrapages' },
  { tab: 'academique', section: 'acad_jury', href: '/academique/deliberations', title: 'Délibérations et relevés' },
  { tab: 'academique', section: 'acad_settings', href: '/academique/parametres', title: 'Paramètres académiques' },
  { tab: 'etudiants', section: 'stud_list', href: '/etudiants', title: 'Liste des étudiants' },
  { tab: 'etudiants', section: 'stud_cards', href: '/etudiants/cartes', title: 'Cartes et certificats' },
  { tab: 'etudiants', section: 'stud_status', href: '/etudiants/parcours', title: 'Réinscriptions et statuts' },
  { tab: 'finance', section: 'fin_kpis', href: '/finance', title: 'Situation financière' },
  { tab: 'finance', section: 'fin_payments', href: '/finance/versements', title: 'Versements et reçus' },
  { tab: 'finance', section: 'fin_reports', href: '/finance/rapports', title: 'Rapports financiers' },
  { tab: 'finance', section: 'fin_contracts', href: '/finance/contrats', title: 'Contrats, frais et bourses' },
  { tab: 'personnel', section: 'staff_list', href: '/personnel/utilisateurs', title: 'Utilisateurs et rôles' },
  { tab: 'personnel', section: 'staff_roles', href: '/personnel/roles', title: 'Rôles ESCEN' },
  { tab: 'personnel', section: 'staff_permissions', href: '/personnel/permissions', title: 'Matrice des permissions' },
  { tab: 'personnel', section: 'staff_teachers', href: '/personnel/enseignants', title: 'Enseignants et affectations' },
  { tab: 'personnel', section: 'staff_records', href: '/personnel', title: 'Dossiers du personnel' },
  { tab: 'marketing', section: 'comm_announcements', href: '/communication/annonces', title: 'Publier une annonce' },
  { tab: 'marketing', section: 'comm_news', href: '/communication/actualites', title: 'Actualités institutionnelles' },
  { tab: 'logistique', section: 'log_purchases', href: '/logistique/achats', title: 'Demandes d’achat' },
  { tab: 'logistique', section: 'log_assets', href: '/logistique/inventaire', title: 'Inventaire du site' },
  { tab: 'systeme', section: 'sys_logs', href: '/systeme/journal', title: 'Journal d’activité' },
  { tab: 'systeme', section: 'sys_backups', href: '/systeme/export', title: 'Export du journal' },
  { tab: 'systeme', section: 'sys_support', href: '/systeme/support', title: 'Centre de support' },
];
export const HOME_PATH = '/mon-espace';
export const MODULE_PATHS: Record<string, string> = { academique: '/academique', marketing: '/communication', logistique: '/logistique', systeme: '/systeme' };
export function getPortalRoute(pathname: string): PortalRoute | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  const exact = PORTAL_ROUTES.find(route => route.href === path);
  if (exact) return exact;
  if (/^\/etudiants\/[^/]+$/.test(path)) {
    try { return { tab: 'etudiants', section: 'stud_list', href: path, title: 'Dossier étudiant', studentId: decodeURIComponent(path.split('/')[2]) }; } catch { return undefined; }
  }
}
export function getSectionPath(section: string): string {
  const route = PORTAL_ROUTES.find(item => item.section === section);
  if (!route) throw new Error(`Écran inconnu : ${section}`);
  return route.href;
}
export function studentPath(studentId: string) { return '/etudiants/' + encodeURIComponent(studentId); }
