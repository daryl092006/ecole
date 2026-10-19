export interface PortalRoute { tab: string; section: string; href: string; title: string; studentId?: string; }
export const PORTAL_ROUTES: PortalRoute[] = [
  { tab: 'espace', section: 'espace_exams', href: '/mon-espace/epreuves', title: 'Mes épreuves en ligne' },
  { tab: 'espace', section: 'espace_dashboard', href: '/mon-espace', title: 'Mon espace' },
  { tab: 'espace', section: 'espace_support', href: '/mon-espace/support', title: 'Support technique' },
  { tab: 'espace', section: 'espace_announcements', href: '/mon-espace/annonces', title: 'Annonces et actualités' },
  { tab: 'espace', section: 'espace_documents', href: '/mon-espace/documents', title: 'Mes documents' },
  { tab: 'espace', section: 'espace_finance', href: '/mon-espace/scolarite', title: 'Mes frais et paiements' },
  { tab: 'dashboard_global', section: 'dashboard_kpis', href: '/tableau-de-bord', title: 'Vue d’ensemble' },
  { tab: 'dashboard_global', section: 'dashboard_reports', href: '/tableau-de-bord/rapports', title: 'Rapports de pilotage' },
  { tab: 'academique', section: 'acad_program', href: '/academique/filieres', title: 'Programmes de cours et matières' },
  { tab: 'academique', section: 'acad_reference', href: '/academique/referentiel', title: 'Préparer et gérer l’année' },
  { tab: 'academique', section: 'acad_schedule', href: '/academique/emploi-du-temps', title: 'Emploi du temps' },
  { tab: 'academique', section: 'acad_attendance', href: '/academique/presences', title: 'Feuilles de présence' },
  { tab: 'academique', section: 'acad_grades', href: '/academique/notes', title: 'Notes et résultats' },
  { tab: 'academique', section: 'acad_complaints', href: '/academique/reclamations', title: 'Réclamations académiques' },
  {tab:'academique',section:'acad_assessments',href:'/academique/evaluations',title:'Contrôles continus'},
  {tab:'academique',section:'acad_resits',href:'/academique/rattrapages',title:'Rattrapages'},
  {tab:'academique',section:'acad_subjects',href:'/academique/sujets',title:'Composition des épreuves'},
  { tab: 'academique', section: 'acad_exams', href: '/academique/examens', title: 'Examens' },
  { tab: 'academique', section: 'acad_jury', href: '/academique/deliberations', title: 'Délibérations et relevés' },
  { tab: 'academique', section: 'acad_settings', href: '/academique/parametres', title: 'Règles académiques à confirmer' },
  { tab: 'etudiants', section: 'stud_list', href: '/etudiants', title: 'Dossiers et inscriptions' },
  { tab: 'etudiants', section: 'stud_accounts', href: '/etudiants/comptes', title: 'Comptes étudiants' },
  { tab: 'etudiants', section: 'stud_cards', href: '/etudiants/cartes', title: 'Documents étudiants' },
  { tab: 'etudiants', section: 'stud_status', href: '/etudiants/parcours', title: 'Réinscriptions et statuts' },
  { tab: 'finance', section: 'fin_kpis', href: '/finance', title: 'Situation financière' },
  { tab: 'finance', section: 'fin_payments', href: '/finance/versements', title: 'Versements et reçus' },
  { tab: 'finance', section: 'fin_reports', href: '/finance/rapports', title: 'Rapports financiers' },
  { tab: 'finance', section: 'fin_contracts', href: '/finance/contrats', title: 'Contrats étudiants et bourses' },
  { tab: 'personnel', section: 'staff_list', href: '/personnel/utilisateurs', title: 'Comptes du personnel' },
  { tab: 'personnel', section: 'staff_roles', href: '/personnel/roles', title: 'Rôles ESCEN' },
  { tab: 'personnel', section: 'staff_permissions', href: '/personnel/permissions', title: 'Matrice des permissions' },
  { tab: 'personnel', section: 'staff_teachers', href: '/personnel/enseignants', title: 'Enseignants et affectations' },
  { tab: 'personnel', section: 'staff_records', href: '/personnel', title: 'Dossiers du personnel' },
  { tab: 'marketing', section: 'comm_announcements', href: '/communication/annonces', title: 'Annonces' },
  { tab: 'website', section: 'comm_news', href: '/site-web/articles', title: 'Articles' },
  { tab: 'website', section: 'web_applications', href: '/site-web/demandes', title: 'Demandes en ligne' },
  { tab: 'website', section: 'web_documents', href: '/site-web/documents', title: 'Formations et pièces' },
  { tab: 'website', section: 'web_brochures', href: '/site-web/brochures', title: 'Brochures' },
  { tab: 'logistique', section: 'log_purchases', href: '/logistique/achats', title: 'Demandes d’achat' },
  { tab:'logistique',section:'log_suppliers',href:'/logistique/fournisseurs',title:'Fournisseurs' },
  { tab: 'logistique', section: 'log_assets', href: '/logistique/inventaire', title: 'Inventaire du site' },
  { tab: 'systeme', section: 'sys_data', href: '/systeme/donnees', title: 'Données et contrôle de reprise' },
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
  if (path === '/communication/actualites') return PORTAL_ROUTES.find(r => r.section === 'comm_news');
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
