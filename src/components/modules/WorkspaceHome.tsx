'use client';
import IconButton from '@/components/ui/IconButton';
import PageHeader from '@/components/ui/PageHeader';
import Link from 'next/link';
import { ArrowUpRight, GraduationCap, Wallet, BookOpen, Users, ShieldCheck, CalendarDays, TrendingUp, Award, Server, Package, Megaphone, ClipboardCheck } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { HISTORY_TABLES, HISTORY_DOMAINS } from '@/data/historyCatalog';
import { ROLES, type RoleName } from '@/types/permissions';
import type { HistoryDomain } from '@/types/history';
import { netPaymentTotal } from '@/services/financialProjectionService';
import { effectivePayments } from '@/services/paymentAllocationService';
import StudentHome from '@/components/modules/student/StudentHome';
import WorkspaceActions from '@/components/ui/WorkspaceActions';
import KpiChart from '@/components/ui/KpiChart';
import { PURCHASE_STATUS_LABELS } from '@/types/purchaseWorkspace';
import { APPLICATION_STAGES } from '@/types/admissions';

function fmtCompactFcfa(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} M FCFA`;
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
}

interface RoleKpiCard {
  title: string;
  href: string;
  icon: typeof Award;
  items: { label: string; value: string }[];
}

export default function WorkspaceHome({ mode = 'home' }: { mode?: 'home' | 'overview' | 'reports' }) {
  const state = usePortal(); const { catalog, error, retry } = state.history;
  if (mode === 'home' && (state.activeRole === ROLES.STUD || state.activeRole === ROLES.DEL)) return <StudentHome />;
  const tables = state.relationalSnapshot.tables;
  const activeRows = (table: string) => (tables[table] || []).filter(row => !row.archived_at);
  const count = (table: string) => activeRows(table).length;
  const flagged = catalog?.datasets.reduce((sum, item) => sum + item.flagged, 0) ?? 0;
  const reports = state.availableTabs.flatMap(tab => tab.subTabs || []).filter(section => ['fin_reports', 'sys_backups', 'sys_data'].includes(section.id));
  const firstName = state.session?.name?.split(/\s+/)[0] || '';
  const title = mode === 'overview' ? 'Vue d’ensemble' : mode === 'reports' ? 'Rapports de pilotage' : `Bonjour${firstName ? ` ${firstName}` : ''}.`;
  const roleDescriptions: Partial<Record<RoleName, string>> = {
    [ROLES.DG]: 'Retrouvez le suivi de l’établissement, les dossiers étudiants et la situation financière.',
    [ROLES.DGA]: 'Retrouvez le suivi des activités, les dossiers étudiants et les indicateurs de l’établissement.',
    [ROLES.DA]: 'Retrouvez les enseignements, les évaluations et les résultats académiques.',
    [ROLES.LOG]: 'Retrouvez la planification des cours, les groupes et le suivi des présences.',
    [ROLES.CC]: 'Retrouvez les candidatures, les dossiers étudiants et les règlements de scolarité.',
    [ROLES.ENS]: 'Retrouvez vos cours, vos évaluations et les résultats de vos étudiants.',
    [ROLES.SURV]: 'Retrouvez les séances, les épreuves et les feuilles de présence de votre périmètre.',
    [ROLES.RAF]: 'Retrouvez les contrats, les versements, les reçus et le suivi financier.',
    [ROLES.MKT]: 'Retrouvez les communications, les publications et le suivi des candidatures.',
    [ROLES.ACHATS]: 'Retrouvez les demandes d’achat, les fournisseurs et les équipements.',
    [ROLES.SITE]: 'Retrouvez les candidatures, les formations et les publications du site.',
    [ROLES.IT]: 'Retrouvez les comptes, les accès, le support et le suivi du système.',
    [ROLES.STG]: 'Retrouvez les dossiers, les activités et les annonces accessibles à votre rôle.',
  };

  const canViewStudents = state.perms.permissions.includes('student.view');

  // Financial aggregates
  const knownFinancialStudents = state.students.filter(s => s.financials?.available !== false);
  const payments = activeRows('payments');
  const confirmedPayments = effectivePayments(state.relationalSnapshot);
  const pendingPayments = payments.filter(p => String(p.status || '').toUpperCase() === 'PENDING');
  const paymentsCollected = netPaymentTotal(state.relationalSnapshot);
  const expectedAmount = knownFinancialStudents.reduce((sum, s) => sum + (Number(s.financials?.expected ?? 0) || 0), 0);
  const collectedAmount = knownFinancialStudents.length
    ? knownFinancialStudents.reduce((sum, s) => sum + (Number(s.financials?.paid ?? 0) || 0), 0)
    : paymentsCollected;
  const remainingAmount = knownFinancialStudents.length
    ? knownFinancialStudents.reduce((sum, s) => sum + (Number(s.financials?.remaining ?? 0) || 0), 0)
    : Math.max(0, expectedAmount - collectedAmount);
  const recoveryRate = expectedAmount > 0 ? Math.min(100, (collectedAmount / expectedAmount) * 100) : 0;

  // Population breakdowns
  const totalStudents = state.students.length;
  const filiereMap = new Map<string, number>();
  for (const s of state.students) {
    const fName = String(s.filiere || 'Non renseignée').trim() || 'Non renseignée';
    filiereMap.set(fName, (filiereMap.get(fName) || 0) + 1);
  }
  const filiereBreakdown = [...filiereMap.entries()]
    .map(([name, cnt]) => ({ name, count: cnt, pct: totalStudents > 0 ? Math.round((cnt / totalStudents) * 100) : 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));


  const niveauMap = new Map<string, number>();
  for (const s of state.students) {
    const nName = String(s.niveau || 'Non renseigné').trim() || 'Non renseigné';
    niveauMap.set(nName, (niveauMap.get(nName) || 0) + 1);
  }
  const niveauBreakdown = [...niveauMap.entries()]
    .map(([name, cnt]) => ({ name, count: cnt, pct: totalStudents > 0 ? Math.round((cnt / totalStudents) * 100) : 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));


  const groupeMap = new Map<string, number>();
  for (const s of state.students) {
    const gName = String(s.groupe || 'Non affecté').trim() || 'Non affecté';
    groupeMap.set(gName, (groupeMap.get(gName) || 0) + 1);
  }
  const groupeBreakdown = [...groupeMap.entries()]
    .map(([name, cnt]) => ({ name, count: cnt, pct: totalStudents > 0 ? Math.round((cnt / totalStudents) * 100) : 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));



  const programsCount = count('programs') || filiereBreakdown.filter(f => f.name !== 'Non renseignée').length;
  const activeEvals = activeRows('evaluations').filter(e => !e.cancelled_at);
  const settledStudents = knownFinancialStudents.filter(s => (s.financials?.remaining ?? 0) <= 0 && (s.financials?.available === true || (s.financials?.expected ?? 0) > 0)).length;
  const debtorStudents = knownFinancialStudents.filter(s => (s.financials?.remaining ?? 0) > 0).length;

  // Compact role-specific KPI cards (short 1-2 word labels, big numbers)
  const applications = activeRows('online_applications');
  const pendingApps = applications.filter(a => !['ADMIS_OFFICIEL', 'REFUSE'].includes(String(a.workflow_stage || a.status || ''))).length;
  const admittedApps = applications.filter(a => String(a.workflow_stage || a.status || '') === 'ADMIS_OFFICIEL').length;
  const absencesCount = activeRows('attendances').filter(a => a.status && String(a.status).toUpperCase() !== 'PRESENT').length;
  const totalExpenses = activeRows('expenses').reduce((sum, e) => sum + (Number(e.amount ?? 0) || 0), 0);
  const publishedComms = activeRows('communications').filter(c => c.published_at && !c.withdrawn_at).length;
  const openTicketsCount = activeRows('support_tickets').filter(t => ['OPEN', 'IN_PROGRESS'].includes(String(t.status))).length;

  const roleKpiCards: RoleKpiCard[] = (() => {
    const role = state.activeRole;

    if (role === ROLES.IT) {
      const activeUsers = state.users.filter(u => u.active).length;
      const teacherStaffIds = new Set(activeRows('teachers').map(row => row.staff_id));
      const contractStaffIds = new Set(activeRows('staff_contracts').filter(row => !row.ends_on).map(row => row.staff_id));
      const teacherOnlyPersonIds = new Set(
        activeRows('staff')
          .filter(row => teacherStaffIds.has(row.id) && !contractStaffIds.has(row.id))
          .map(row => row.person_id),
      );
      const adminStaffCount = new Set([
        ...activeRows('staff')
          .filter(row => !teacherStaffIds.has(row.id) || contractStaffIds.has(row.id))
          .map(row => row.person_id),
        ...activeRows('accounts')
          .filter(row => row.account_type === 'staff' && row.active !== false && !teacherOnlyPersonIds.has(row.person_id))
          .map(row => row.person_id),
      ]).size;
      return [
        {
          title: 'Système & Comptes',
          href: '/personnel/utilisateurs',
          icon: Server,
          items: [
            { label: 'Comptes actifs', value: `${activeUsers}/${state.users.length}` },
            { label: 'Enseignants', value: `${count('teachers')}` },
            { label: 'Support ouvert', value: `${openTicketsCount}` },
            { label: 'Personnel', value: `${adminStaffCount}` },
            { label: 'Dossiers étudiants', value: `${totalStudents}` },
          ],
        },
        {
          title: 'Pilotage Établissement',
          href: '/finance',
          icon: TrendingUp,
          items: [
            { label: 'Filières', value: `${programsCount}` },
            { label: 'Groupes', value: `${count('groups')}` },
            { label: 'Épreuves', value: `${activeEvals.length}` },
            { label: 'Encaissé', value: fmtCompactFcfa(collectedAmount) },
            { label: 'Recouvrement', value: expectedAmount > 0 ? `${Math.round(recoveryRate)} %` : 'Non établi' },
          ],
        },
        {
          title: 'Admissions & Pédagogie',
          href: '/site-web/demandes',
          icon: GraduationCap,
          items: [
            { label: 'Candidatures', value: `${applications.length}` },
            { label: 'À traiter', value: `${pendingApps}` },
            { label: 'Admis', value: `${admittedApps}` },
            { label: 'Séances', value: `${count('sessions')}` },
            { label: 'Notes', value: `${count('grades')}` },
            { label: 'Absences', value: `${absencesCount}` },
          ],
        },
        {
          title: 'Opérations & Achats',
          href: '/logistique/achats',
          icon: Package,
          items: [
            { label: 'Achats', value: `${count('purchases')}` },
            { label: 'Dépenses', value: fmtCompactFcfa(totalExpenses) },
            { label: 'Publications', value: `${publishedComms}` },
            { label: 'Réclamations', value: `${count('complaints')}` },
            { label: 'Justificatifs', value: `${count('absence_justifications')}` },
            { label: 'Documents', value: `${count('generated_documents')}` },
          ],
        },
      ];
    }

    if (role === ROLES.DG || role === ROLES.DGA) {
      return [
        {
          title: 'Direction & Scolarité',
          href: '/etudiants',
          icon: GraduationCap,
          items: [
            { label: 'Dossiers', value: `${totalStudents}` },
            { label: 'Filières', value: `${programsCount}` },
            { label: 'Groupes', value: `${count('groups')}` },
            { label: 'Enseignants', value: `${count('teachers')}` },
            { label: 'Contrats', value: `${count('financial_contracts')}` },
            { label: 'Bourses', value: `${count('scholarship_awards')}` },
          ],
        },
        {
          title: 'Finances & Recouvrement',
          href: '/finance',
          icon: TrendingUp,
          items: [
            { label: 'Attendu', value: knownFinancialStudents.length ? fmtCompactFcfa(expectedAmount) : 'Non établi' },
            { label: 'Encaissé', value: fmtCompactFcfa(collectedAmount) },
            { label: 'Reste à payer', value: knownFinancialStudents.length ? fmtCompactFcfa(remainingAmount) : 'Non établi' },
            { label: 'Recouvrement', value: expectedAmount > 0 ? `${Math.round(recoveryRate)} %` : 'Non établi' },
            { label: 'Dossiers soldés', value: `${settledStudents}` },
            { label: 'Débiteurs', value: `${debtorStudents}` },
          ],
        },
        {
          title: 'Admissions & Pédagogie',
          href: '/site-web/demandes',
          icon: BookOpen,
          items: [
            { label: 'Candidatures', value: `${applications.length}` },
            { label: 'À traiter', value: `${pendingApps}` },
            { label: 'Admis', value: `${admittedApps}` },
            { label: 'Épreuves', value: `${activeEvals.length}` },
            { label: 'Notes', value: `${count('grades')}` },
            { label: 'Absences', value: `${absencesCount}` },
          ],
        },
        {
          title: 'Achats & Opérations',
          href: '/logistique/achats',
          icon: Package,
          items: [
            { label: 'Achats', value: `${count('purchases')}` },
            { label: 'Dépenses', value: fmtCompactFcfa(totalExpenses) },
            { label: 'Publications', value: `${publishedComms}` },
            { label: 'Réclamations', value: `${count('complaints')}` },
            { label: 'Support ouvert', value: `${openTicketsCount}` },
            { label: 'Documents', value: `${count('generated_documents')}` },
          ],
        },
      ];
    }

    if (role === ROLES.DA) {
      return [
        {
          title: 'Pédagogie & Cours',
          href: '/academique/referentiel',
          icon: BookOpen,
          items: [
            { label: 'Filières', value: `${programsCount}` },
            { label: 'Groupes', value: `${count('groups')}` },
            { label: 'Matières', value: `${count('subjects')}` },
            { label: 'Enseignants', value: `${count('teachers')}` },
            { label: 'Affectations', value: `${count('teaching_assignments')}` },
            { label: 'Séances', value: `${count('sessions')}` },
          ],
        },
        {
          title: 'Examens & Résultats',
          href: '/academique/notes',
          icon: Award,
          items: [
            { label: 'Épreuves', value: `${activeEvals.length}` },
            { label: 'Copies', value: `${count('evaluation_candidates')}` },
            { label: 'Notes', value: `${count('grades')}` },
            { label: 'Réclamations', value: `${count('complaints')}` },
            { label: 'Décisions jury', value: `${count('jury_decisions')}` },
          ],
        },
        {
          title: 'Présences & Admissions',
          href: '/academique/presences',
          icon: ClipboardCheck,
          items: [
            { label: 'Pointages', value: `${count('attendances')}` },
            { label: 'Absences', value: `${absencesCount}` },
            { label: 'Justificatifs', value: `${count('absence_justifications')}` },
            { label: 'Présences ens.', value: `${count('teacher_attendances')}` },
            { label: 'Candidatures', value: `${applications.length}` },
            { label: 'Étudiants', value: `${totalStudents}` },
          ],
        },
      ];
    }

    if (role === ROLES.LOG) {
      const absences = activeRows('attendances').filter(a => a.status && String(a.status).toUpperCase() !== 'PRESENT').length;
      return [
        {
          title: 'Planning & Salles',
          href: '/academique/emploi-du-temps',
          icon: CalendarDays,
          items: [
            { label: 'Séances', value: `${count('sessions')}` },
            { label: 'Salles', value: `${count('rooms')}` },
            { label: 'Groupes', value: `${count('groups')}` },
            { label: 'Affectations', value: `${count('teaching_assignments')}` },
            { label: 'Examens', value: `${activeEvals.length}` },
            { label: 'Congés', value: `${count('blocked_periods')}` },
          ],
        },
        {
          title: 'Présences & Dossiers',
          href: '/academique/presences',
          icon: ClipboardCheck,
          items: [
            { label: 'Pointages', value: `${count('attendances')}` },
            { label: 'Absences', value: `${absences}` },
            { label: 'Justificatifs', value: `${count('absence_justifications')}` },
            { label: 'Présences ens.', value: `${count('teacher_attendances')}` },
            { label: 'Étudiants', value: `${totalStudents}` },
            { label: 'Cartes émises', value: `${count('generated_documents')}` },
          ],
        },
      ];
    }

    if (role === ROLES.RAF) {
      return [
        {
          title: 'Facturation & Contrats',
          href: '/finance/contrats',
          icon: Wallet,
          items: [
            { label: 'Facturés', value: `${knownFinancialStudents.length}/${totalStudents}` },
            { label: 'Attendu', value: knownFinancialStudents.length ? fmtCompactFcfa(expectedAmount) : 'Non établi' },
            { label: 'Contrats', value: `${count('financial_contracts')}` },
            { label: 'Échéances', value: `${count('installments')}` },
            { label: 'Bourses', value: `${count('scholarship_awards')}` },
            { label: 'Débiteurs', value: `${debtorStudents}` },
          ],
        },
        {
          title: 'Trésorerie & Recouvrement',
          href: '/finance/versements',
          icon: TrendingUp,
          items: [
            { label: 'Encaissé', value: fmtCompactFcfa(collectedAmount) },
            { label: 'Reste à payer', value: knownFinancialStudents.length ? fmtCompactFcfa(remainingAmount) : 'Non établi' },
            { label: 'Recouvrement', value: expectedAmount > 0 ? `${Math.round(recoveryRate)} %` : 'Non établi' },
            { label: 'Règlements', value: `${confirmedPayments.length}` },
            { label: 'En attente', value: `${pendingPayments.length}` },
            { label: 'Reçus', value: `${count('receipts')}` },
          ],
        },
        {
          title: 'Dépenses & Achats',
          href: '/logistique/achats',
          icon: Package,
          items: [
            { label: 'Dépenses', value: fmtCompactFcfa(totalExpenses) },
            { label: 'Achats', value: `${count('purchases')}` },
            { label: 'Réceptions', value: `${count('purchase_receipts')}` },
            { label: 'Fournisseurs', value: `${count('suppliers')}` },
            { label: 'Équipements', value: `${count('assets')}` },
          ],
        },
      ];
    }

    if (role === ROLES.ENS) {
      return [
        {
          title: 'Mes Enseignements',
          href: '/academique/emploi-du-temps',
          icon: CalendarDays,
          items: [
            { label: 'Cours', value: `${count('teaching_assignments')}` },
            { label: 'Groupes', value: `${count('groups')}` },
            { label: 'Matières', value: `${count('subjects')}` },
            { label: 'Séances', value: `${count('sessions')}` },
            { label: 'Présences', value: `${count('attendances')}` },
            { label: 'Étudiants', value: `${totalStudents}` },
          ],
        },
        {
          title: 'Mes Évaluations',
          href: '/academique/examens',
          icon: Award,
          items: [
            { label: 'Épreuves', value: `${activeEvals.length}` },
            { label: 'Copies', value: `${count('evaluation_candidates')}` },
            { label: 'Notes', value: `${count('grades')}` },
            { label: 'Réclamations', value: `${count('complaints')}` },
          ],
        },
      ];
    }

    if (role === ROLES.SURV) {
      const absences = activeRows('attendances').filter(a => a.status && String(a.status).toUpperCase() !== 'PRESENT').length;
      return [
        {
          title: 'Surveillance & Présences',
          href: '/academique/presences',
          icon: ClipboardCheck,
          items: [
            { label: 'Séances', value: `${count('sessions')}` },
            { label: 'Salles', value: `${count('rooms')}` },
            { label: 'Groupes', value: `${count('groups')}` },
            { label: 'Présences', value: `${count('attendances')}` },
            { label: 'Absences', value: `${absences}` },
            { label: 'Justificatifs', value: `${count('absence_justifications')}` },
          ],
        },
        {
          title: 'Examens',
          href: '/academique/examens',
          icon: BookOpen,
          items: [
            { label: 'Épreuves', value: `${activeEvals.length}` },
            { label: 'Candidats', value: `${count('evaluation_candidates')}` },
            { label: 'Étudiants', value: `${totalStudents}` },
          ],
        },
      ];
    }

    if (role === ROLES.ACHATS) {
      const approvedPurchases = activeRows('purchases').filter(p => ['APPROUVE', 'COMMANDE', 'RECU'].includes(String(p.status))).length;
      const pendingPurchases = activeRows('purchases').filter(p => ['BROUILLON', 'SOUMIS', 'EN_ATTENTE'].includes(String(p.status))).length;
      return [
        {
          title: 'Achats & Fournisseurs',
          href: '/logistique/achats',
          icon: Package,
          items: [
            { label: 'Demandes', value: `${count('purchases')}` },
            { label: 'En attente', value: `${pendingPurchases}` },
            { label: 'Validées', value: `${approvedPurchases}` },
            { label: 'Réceptions', value: `${count('purchase_receipts')}` },
            { label: 'Fournisseurs', value: `${count('suppliers')}` },
            { label: 'Dépenses', value: fmtCompactFcfa(totalExpenses) },
          ],
        },
        {
          title: 'Stocks & Équipements',
          href: '/logistique/achats',
          icon: ClipboardCheck,
          items: [
            { label: 'Lignes d’achat', value: `${count('purchase_lines')}` },
            { label: 'Équipements', value: `${count('assets')}` },
            { label: 'Salles', value: `${count('rooms')}` },
            { label: 'Support ouvert', value: `${openTicketsCount}` },
          ],
        },
      ];
    }

    if (role === ROLES.CC) {
      return [
        {
          title: 'Candidatures & Étudiants',
          href: '/site-web/demandes',
          icon: Megaphone,
          items: [
            { label: 'Candidatures', value: `${applications.length}` },
            { label: 'À traiter', value: `${pendingApps}` },
            { label: 'Admis', value: `${admittedApps}` },
            { label: 'Étudiants', value: `${totalStudents}` },
            { label: 'Filières', value: `${programsCount}` },
            { label: 'Groupes', value: `${count('groups')}` },
          ],
        },
        {
          title: 'Scolarité & Recouvrement',
          href: '/finance/versements',
          icon: Wallet,
          items: [
            { label: 'Encaissé', value: fmtCompactFcfa(collectedAmount) },
            { label: 'Reste à payer', value: knownFinancialStudents.length ? fmtCompactFcfa(remainingAmount) : 'Non établi' },
            { label: 'Recouvrement', value: expectedAmount > 0 ? `${Math.round(recoveryRate)} %` : 'Non établi' },
            { label: 'Règlements', value: `${confirmedPayments.length}` },
            { label: 'En attente', value: `${pendingPayments.length}` },
          ],
        },
        {
          title: 'Documents & Suivi',
          href: '/etudiants/documents',
          icon: Users,
          items: [
            { label: 'Documents émis', value: `${count('generated_documents')}` },
            { label: 'Contrats', value: `${count('financial_contracts')}` },
            { label: 'Bourses', value: `${count('scholarship_awards')}` },
            { label: 'Réclamations', value: `${count('complaints')}` },
            { label: 'Support ouvert', value: `${openTicketsCount}` },
          ],
        },
      ];
    }

    if (role === ROLES.MKT || role === ROLES.SITE) {
      return [
        {
          title: 'Communication & Site',
          href: '/site-web/articles',
          icon: Megaphone,
          items: [
            { label: 'Publications', value: `${count('communications')}` },
            { label: 'En ligne', value: `${publishedComms}` },
            { label: 'Articles web', value: `${count('annual_website_articles')}` },
            { label: 'Concours & rentrées', value: `${count('annual_website_intakes')}` },
            { label: 'Brochures', value: `${count('annual_website_brochures')}` },
            { label: 'Filières', value: `${programsCount}` },
          ],
        },
        {
          title: 'Candidatures & Rentrées',
          href: '/site-web/demandes',
          icon: Users,
          items: [
            { label: 'Candidatures', value: `${applications.length}` },
            { label: 'À traiter', value: `${pendingApps}` },
            { label: 'Admis', value: `${admittedApps}` },
            { label: 'Étudiants', value: `${totalStudents}` },
            { label: 'Groupes', value: `${count('groups')}` },
          ],
        },
        ...(role === ROLES.MKT ? [{
          title: 'Étudiants & Cours',
          href: '/etudiants',
          icon: GraduationCap,
          items: [
            { label: 'Étudiants', value: `${totalStudents}` },
            { label: 'Filières', value: `${programsCount}` },
            { label: 'Groupes', value: `${count('groups')}` },
            { label: 'Séances', value: `${count('sessions')}` },
          ],
        }] : []),
      ];
    }

    if (state.perms.scope.ownDataOnly) {
      const me = state.students.find(student => student.matricule === state.session?.matricule);
      return [
        {
          title: 'Mon Suivi',
          href: '/mon-espace/documents',
          icon: GraduationCap,
          items: [
            { label: 'Niveau', value: me?.niveau && me.niveau !== 'Niveau non renseigné' ? me.niveau : '—' },
            { label: 'Groupe', value: me?.groupe && me.groupe !== 'Non affecté' ? me.groupe : '—' },
            { label: 'Notes', value: `${count('grades')}` },
            { label: 'Payé', value: me?.financials?.available ? fmtCompactFcfa(me.financials.paid) : '—' },
            { label: 'Reste', value: me?.financials?.available ? fmtCompactFcfa(me.financials.remaining) : '—' },
          ],
        },
      ];
    }

    return canViewStudents ? [{ title: 'Scolarité', href: '/etudiants', icon: GraduationCap,
      items: [{ label: 'Dossiers étudiants', value: `${totalStudents}` }, { label: 'Groupes', value: `${count('groups')}` }] }] : [];
  })();


  const tasksByRole: Record<RoleName, string[]> = {
    [ROLES.DG]: ['dashboard_kpis', 'stud_list', 'fin_kpis', 'acad_grades', 'comm_announcements'],
    [ROLES.DGA]: ['dashboard_kpis', 'stud_list', 'fin_kpis', 'acad_grades', 'comm_announcements'],
    [ROLES.DA]: ['acad_exams', 'acad_grades', 'acad_schedule', 'stud_list', 'acad_reference'],
    [ROLES.CC]: ['web_applications', 'stud_list', 'fin_payments', 'fin_contracts'],
    [ROLES.LOG]: ['acad_schedule', 'acad_attendance', 'staff_teachers', 'acad_program'],
    [ROLES.ENS]: ['acad_schedule', 'acad_subjects', 'acad_grades', 'acad_complaints'],
    [ROLES.SURV]: ['acad_exams', 'acad_attendance', 'acad_schedule'],
    [ROLES.RAF]: ['fin_payments', 'fin_kpis', 'fin_contracts', 'fin_reports', 'stud_list'],
    [ROLES.MKT]: ['comm_announcements', 'web_applications', 'stud_list', 'acad_schedule', 'acad_program', 'comm_news', 'web_galleries', 'web_brochures'],
    [ROLES.ACHATS]: ['log_purchases', 'log_suppliers', 'log_assets'],
    [ROLES.SITE]: ['web_applications', 'web_documents', 'web_brochures', 'comm_news', 'web_galleries'],
    [ROLES.IT]: ['staff_list', 'stud_accounts', 'sys_support', 'acad_reference', 'sys_logs'],
    [ROLES.STUD]: ['acad_resources', 'acad_schedule', 'acad_program', 'espace_attendance', 'espace_exams', 'espace_documents', 'espace_finance', 'espace_announcements', 'espace_support'],
    [ROLES.DEL]: ['acad_resources', 'acad_attendance', 'acad_program', 'espace_attendance', 'espace_exams', 'espace_documents', 'espace_finance', 'acad_complaints', 'espace_support'],
    [ROLES.STG]: ['stud_list', 'acad_schedule', 'espace_announcements', 'espace_support'],
  };
  const taskIcons: Record<string, typeof Award> = {
    dashboard_kpis: TrendingUp, stud_list: GraduationCap, fin_kpis: Wallet, fin_payments: Wallet,
    fin_contracts: Wallet, fin_reports: TrendingUp, acad_exams: ClipboardCheck, acad_subjects: ClipboardCheck,
    acad_grades: BookOpen, acad_resources: BookOpen, acad_schedule: CalendarDays, acad_attendance: ClipboardCheck,
    staff_teachers: Users, staff_list: Users, stud_accounts: Users, acad_reference: CalendarDays,
    acad_program: BookOpen, log_purchases: Package, log_suppliers: Package, log_assets: Package,
    espace_attendance: ClipboardCheck, espace_exams: ClipboardCheck, espace_documents: GraduationCap, espace_finance: Wallet,
    sys_logs: ShieldCheck, sys_support: Server,
  };
  const authorizedPages = state.availableTabs.flatMap(tab => tab.subTabs || []);
  const activityDescriptions: Record<string, string> = {
    dashboard_kpis: 'Consulter les indicateurs de l’année', stud_list: 'Retrouver un dossier et son parcours',
    fin_kpis: 'Consulter la situation financière', fin_payments: 'Retrouver les règlements et les reçus',
    fin_contracts: 'Consulter les frais et les contrats', fin_reports: 'Consulter les états financiers',
    acad_exams: 'Retrouver les épreuves planifiées', acad_subjects: 'Retrouver les sujets et les questions',
    acad_grades: 'Consulter les notes et les résultats', acad_complaints: 'Retrouver les demandes de vérification',
    acad_resources: 'Retrouver les supports pédagogiques', acad_schedule: 'Consulter les séances et les horaires',
    acad_attendance: 'Retrouver les séances à émarger', staff_teachers: 'Consulter les profils et les affectations',
    staff_list: 'Retrouver les comptes du personnel', stud_accounts: 'Retrouver les accès étudiants',
    acad_reference: 'Consulter la configuration de l’année', acad_program: 'Consulter les maquettes et les matières',
    web_applications: 'Retrouver les dossiers de candidature', web_documents: 'Consulter les formations et les pièces demandées',
    comm_news: 'Retrouver les articles du site', web_galleries: 'Retrouver les galeries de photos',
    web_brochures: 'Retrouver les brochures des formations', comm_announcements: 'Retrouver les annonces du campus',
    log_purchases: 'Suivre les demandes et les réceptions', log_suppliers: 'Consulter les coordonnées des fournisseurs',
    log_assets: 'Consulter le matériel enregistré', sys_support: 'Suivre les demandes d’assistance',
    sys_logs: 'Consulter les opérations enregistrées', espace_support: 'Retrouver vos demandes d’assistance',
    espace_announcements: 'Consulter les informations du campus',
  };
  const quickActions = tasksByRole[state.activeRole].flatMap(id => {
    const page = authorizedPages.find(item => item.id === id);
    return page ? [{ label: page.name, href: page.href, icon: taskIcons[id] || Megaphone, description: activityDescriptions[id] || 'Ouvrir cet espace de travail' }] : [];
  });
  const allowedDestination = (href: string) => state.availableTabs.some(tab => tab.href === href || tab.subTabs?.some(page => page.href === href));
  const evaluationStates: Record<string, string> = { BROUILLON: 'Brouillons', SAISIES: 'En saisie', SOUMISES: 'Soumises', A_CONTROLER: 'À contrôler', VALIDEES: 'Validées', PUBLIEES: 'Publiées' };
  const groupStates = (table: string, labels: Record<string, string>) => {
    const counts = new Map<string, number>();
    for (const row of activeRows(table)) {
      const label = labels[String(row.status)] || 'Autres états';
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    return [...counts].map(([label, value]) => ({ label, value }));
  };
  const communicationStates = () => {
    const states = new Map<string, number>();
    const now = Date.now();
    for (const row of activeRows('communications')) {
      const published = Date.parse(String(row.published_at));
      const expires = row.expires_at ? Date.parse(String(row.expires_at)) : null;
      const label = row.withdrawn_at ? 'Retirées' : !row.published_at ? 'Brouillons'
        : !Number.isFinite(published) || expires !== null && !Number.isFinite(expires) ? 'À vérifier'
        : published > now ? 'Programmées' : expires !== null && expires <= now ? 'Expirées' : 'Publiées';
      states.set(label, (states.get(label) || 0) + 1);
    }
    return [...states].map(([label, value]) => ({ label, value }));
  };
  const applicationStates = () => {
    const counts = new Map<string, number>();
    for (const row of applications) {
      const stage = String(row.workflow_stage || row.status || '') as keyof typeof APPLICATION_STAGES;
      const label = APPLICATION_STAGES[stage] || 'Autres étapes';
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    return [...counts].map(([label, value]) => ({ label, value }));
  };
  const attendanceStates = () => {
    const counts = new Map<string, number>();
    for (const row of activeRows('attendances')) {
      const raw = String(row.status || '').toUpperCase();
      const label = raw === 'PRESENT' ? 'Présents' : raw === 'ABSENT' ? 'Absents' : raw === 'RETARD' ? 'Retards'
        : ['ABSENT_JUSTIFIE', 'RETARD_JUSTIFIE', 'DISPENSE'].includes(raw) ? 'Justifiés / Dispensés' : 'Autres';
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    return [...counts].map(([label, value]) => ({ label, value }));
  };
  const renderCharts = () => <div className="home-bottom-grid" aria-label="Indicateurs graphiques">
    {!state.perms.scope.ownDataOnly && canViewStudents && <KpiChart title="Répartition des étudiants" description="Effectifs des dossiers visibles pour l’année et le périmètre consultés." series={[
      { label: 'Par filière', values: filiereBreakdown.map(item => ({ label: item.name, value: item.count })) },
      { label: 'Par niveau', values: niveauBreakdown.map(item => ({ label: item.name, value: item.count })) },
      { label: 'Par groupe', values: groupeBreakdown.map(item => ({ label: item.name, value: item.count })) },
    ]} />}
    {state.perms.permissions.includes('finance.view') && <KpiChart title="Répartition des frais" description={`${knownFinancialStudents.length} dossier(s) avec une situation financière renseignée. Les règlements en attente sont exclus.`} kind="donut" format="currency" available={knownFinancialStudents.length > 0} series={[{ label: 'Frais', values: [{ label: 'Réglé', value: collectedAmount }, { label: 'Reste à régler', value: remainingAmount }] }]} />}
    {state.perms.permissions.includes('user.manage') && <KpiChart title="État des comptes" description="Comptes de connexion visibles dans votre périmètre." kind="donut" series={[{ label: 'Comptes', values: [{ label: 'Actifs', value: state.users.filter(user => user.active).length }, { label: 'Inactifs', value: state.users.filter(user => !user.active).length }] }]} />}
    {[ROLES.IT, ROLES.DG, ROLES.DGA, ROLES.DA, ROLES.LOG, ROLES.ENS, ROLES.SURV].includes(state.activeRole as typeof ROLES.DA) && (state.perms.permissions.includes('grade.view') || state.perms.permissions.includes('schedule.view')) && <KpiChart title="État des évaluations" description="Répartition des évaluations visibles selon leur état enregistré, sans estimation des résultats." series={[{ label: 'Évaluations', values: groupStates('evaluations', evaluationStates) }]} />}
    {[ROLES.IT, ROLES.DG, ROLES.DGA, ROLES.CC, ROLES.MKT, ROLES.SITE].includes(state.activeRole as typeof ROLES.CC) && applications.length > 0 && <KpiChart title="État des candidatures" description="Répartition des candidatures visibles selon leur étape de traitement." series={[{ label: 'Candidatures', values: applicationStates() }]} />}
    {[ROLES.IT, ROLES.DG, ROLES.DGA, ROLES.DA, ROLES.LOG, ROLES.SURV].includes(state.activeRole as typeof ROLES.DA) && activeRows('attendances').length > 0 && <KpiChart title="Répartition des présences" description="Pointages enregistrés pour les séances visibles dans votre périmètre." kind="donut" series={[{ label: 'Présences', values: attendanceStates() }]} />}
    {[ROLES.IT, ROLES.DG, ROLES.DGA, ROLES.RAF, ROLES.ACHATS].includes(state.activeRole as typeof ROLES.ACHATS) && state.perms.permissions.includes('purchase.view') && <KpiChart title="Suivi des achats" description="Demandes visibles, regroupées selon leur état enregistré." series={[{ label: 'Demandes', values: groupStates('purchases', PURCHASE_STATUS_LABELS) }]} />}
    {[ROLES.IT, ROLES.DG, ROLES.DGA, ROLES.MKT, ROLES.SITE].includes(state.activeRole as typeof ROLES.MKT) && state.perms.permissions.includes('communication.view') && <KpiChart title="État des communications" description="Communications visibles selon leur état de publication enregistré." series={[{ label: 'Publications', values: communicationStates() }]} />}
  </div>;
  const followUps = [
    { page: ['sys_support', 'espace_support'], label: 'Demandes de support ouvertes', count: activeRows('support_tickets').filter(ticket => ['OPEN', 'IN_PROGRESS'].includes(String(ticket.status))).length },
    { page: ['fin_payments'], label: 'Paiements en attente', count: pendingPayments.length },
    { page: ['acad_schedule'], label: 'Séances à venir', count: activeRows('sessions').filter(session => !['ANNULE', 'REPORTE'].includes(String(session.status)) && Date.parse(String(session.starts_at)) > Date.now()).length },
  ].flatMap(item => {
    const page = authorizedPages.find(page => item.page.includes(page.id));
    return page && item.count > 0 ? [{ ...item, href: page.href }] : [];
  });

  const renderKpiCards = () => (
    roleKpiCards.length > 0 && <div className="home-bottom-grid">
      {roleKpiCards.filter(card => allowedDestination(card.href)).map(card => {
        const Icon = card.icon;
        return (
          <section className="card" key={card.title} aria-label={card.title}>
            <div className="card-header">
              <h2><Icon size={18} /> {card.title}</h2>
              <Link href={card.href}>Ouvrir →</Link>
            </div>
            <div className="kpi-stat-grid">
              {card.items.map(item => (
                <div className="kpi-stat-tile" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );

  if (mode === 'reports') {
    return (
      <div className="workspace-home">
        <PageHeader
          eyebrow="PILOTAGE & EXTRACTIONS"
          title="Rapports de pilotage"
          description="Accédez aux journaux d’audit, archives financières et exports consolidés de données."
        />
        <div className="home-destinations">
          {reports.map(report => (
            <Link key={report.id} href={report.href}>
              <ArrowUpRight size={18} className="destination-arrow" />
              <h3>{report.name}</h3>
              <span>Consulter</span>
            </Link>
          ))}
        </div>
        {!reports.length && (
          <section className="card">
            <p>Aucun rapport disponible.</p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="workspace-home">
      <PageHeader
        eyebrow={mode === 'home' ? state.activeRole : 'TABLEAU DE BORD'}
        title={title}
        description={
          mode === 'home' ? roleDescriptions[state.activeRole] : 'Vue d’ensemble des activités, effectifs et opérations du campus pour l’année sélectionnée.'
        }
      >
        {mode === 'home' && authorizedPages.some(page => page.id === 'espace_profile') && <Link className="btn btn-outline" href={authorizedPages.find(page => page.id === 'espace_profile')!.href}>Mon profil</Link>}
      </PageHeader>
    {error && <div className="review-notice" role="alert"><span>{error}</span><IconButton className="btn btn-outline" onClick={retry} label="Réessayer" /></div>}

    {mode === 'home' && <>
      {renderCharts()}
      {renderKpiCards()}
      <section className="card" aria-label="Éléments à suivre">
        <div className="card-header"><h2>À suivre</h2></div>
        {followUps.length > 0 ? <div className="home-record-counts">{followUps.map(item => <div key={item.label}><Link href={item.href}>{item.label}</Link><strong>{item.count}</strong></div>)}</div>
          : <p>Aucun élément en attente dans votre périmètre.</p>}
      </section>
      <WorkspaceActions actions={quickActions} />
    </>}

    {mode === 'overview' && <>
      {renderCharts()}
      {renderKpiCards()}

      <div className="home-bottom-grid">{state.history.enabled && state.availableTabs.some(tab => tab.subTabs?.some(section => section.id === 'acad_reference')) && <section className="card"><div className="card-header"><h2><CalendarDays size={18} /> Données pédagogiques</h2><Link href="/academique/referentiel">Consulter</Link></div><div className="home-record-counts">{[['Années universitaires', 'academic_years'], ['Groupes', 'groups'], ['Enseignements', 'teaching_assignments'], ['Séances prévues', 'sessions'], ['Évaluations et examens', 'evaluations']].map(([label, table]) => <div key={table}><span>{label}</span><strong>{count(table)}</strong></div>)}</div></section>}
        {state.activeRole === ROLES.IT && state.history.enabled && state.perms.permissions.includes('system.audit.view') && <section className="card"><div className="card-header"><h2><ShieldCheck size={18} /> Contrôle de reprise des données</h2><Link href="/systeme/donnees">Voir les données</Link></div><strong className="review-count">{catalog ? flagged : '…'}</strong><div className="home-source-summary">{(Object.keys(HISTORY_DOMAINS) as HistoryDomain[]).map(domain => { const tables = HISTORY_TABLES.filter(item => item.domain === domain).map(item => item.table); const total = catalog?.datasets.filter(item => tables.includes(item.table)).reduce((sum, item) => sum + item.count, 0); return <span key={domain}>{HISTORY_DOMAINS[domain]} <strong>{total?.toLocaleString('fr-FR') ?? '…'}</strong></span>; })}</div></section>}
      </div>
    </>}
    </div>
  );
}
