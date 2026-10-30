'use client';
import IconButton from '@/components/ui/IconButton';
import Link from 'next/link';
import { ArrowUpRight, GraduationCap, Wallet, BookOpen, Users, ShieldCheck, CalendarDays, TrendingUp, Award, Server, Package, Megaphone, ClipboardCheck } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { HISTORY_TABLES, HISTORY_DOMAINS } from '@/data/historyCatalog';
import { ROLES, type RoleName } from '@/types/permissions';
import type { HistoryDomain } from '@/types/history';
import { netPaymentTotal } from '@/services/financialProjectionService';
import { effectivePayments } from '@/services/paymentAllocationService';

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
  const tables = state.relationalSnapshot.tables;
  const activeRows = (table: string) => (tables[table] || []).filter(row => !row.archived_at);
  const count = (table: string) => activeRows(table).length;
  const flagged = catalog?.datasets.reduce((sum, item) => sum + item.flagged, 0) ?? 0;
  const reports = state.availableTabs.flatMap(tab => tab.subTabs || []).filter(section => ['fin_reports', 'sys_backups', 'sys_data'].includes(section.id));
  const title = mode === 'overview' ? 'Vue d’ensemble' : mode === 'reports' ? 'Rapports de pilotage' : state.perms.scope.ownDataOnly ? 'Mon espace étudiant' : 'Mon espace ESCEN';

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
  const roleKpiCards: RoleKpiCard[] = (() => {
    const role = state.activeRole;

    if (role === ROLES.IT) {
      const activeUsers = state.users.filter(u => u.active).length;
      const openTickets = activeRows('support_tickets').filter(t => ['OPEN', 'IN_PROGRESS'].includes(String(t.status))).length;
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
            { label: 'Support ouvert', value: `${openTickets}` },
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
            { label: 'Notes', value: `${count('grades')}` },
            { label: 'Réclamations', value: `${count('complaints')}` },
            { label: 'Décisions jury', value: `${count('jury_decisions')}` },
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
          href: '/academique/evaluations',
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
      const totalExpenses = activeRows('expenses').reduce((sum, e) => sum + (Number(e.amount ?? 0) || 0), 0);
      return [
        {
          title: 'Achats & Fournisseurs',
          href: '/logistique/achats',
          icon: Package,
          items: [
            { label: 'Demandes', value: `${count('purchases')}` },
            { label: 'Lignes', value: `${count('purchase_lines')}` },
            { label: 'Réceptions', value: `${count('purchase_receipts')}` },
            { label: 'Fournisseurs', value: `${count('suppliers')}` },
            { label: 'Dépenses', value: fmtCompactFcfa(totalExpenses) },
            { label: 'Équipements', value: `${count('assets')}` },
          ],
        },
      ];
    }

    if (role === ROLES.CC) {
      return [
        {
          title: 'Candidatures & Étudiants',
          href: '/site-web/candidatures',
          icon: Megaphone,
          items: [
            { label: 'Candidatures', value: `${count('online_applications')}` },
            { label: 'Étudiants', value: `${totalStudents}` },
            { label: 'Filières', value: `${programsCount}` },
            { label: 'Groupes', value: `${count('groups')}` },
          ],
        },
      ];
    }

    if (role === ROLES.MKT || role === ROLES.SITE) {
      const publishedComms = activeRows('communications').filter(c => c.published_at && !c.withdrawn_at).length;
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
        ...(role === ROLES.MKT ? [{
          title: 'Étudiants & Cours',
          href: '/etudiants/liste',
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
      const studentSessions = activeRows('sessions');
      return [
        {
          title: 'Mon Parcours',
          href: '/mon-espace/profil',
          icon: GraduationCap,
          items: [
            { label: 'Filière', value: me?.filiere && me.filiere !== 'Filière non renseignée' ? me.filiere : '—' },
            { label: 'Niveau', value: me?.niveau && me.niveau !== 'Niveau non renseigné' ? me.niveau : '—' },
            { label: 'Groupe', value: me?.groupe && me.groupe !== 'Non affecté' ? me.groupe : '—' },
            { label: 'Séances', value: `${studentSessions.length}` },
          ],
        },
        {
          title: 'Ma Scolarité',
          href: '/mon-espace/scolarite',
          icon: Wallet,
          items: [
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

  const showPopulationBreakdown = !state.perms.scope.ownDataOnly && canViewStudents && totalStudents > 0;

  const tasksByRole: Record<RoleName, string[]> = {
    [ROLES.DG]: ['dashboard_kpis', 'stud_list', 'fin_kpis', 'acad_grades', 'comm_announcements'],
    [ROLES.DGA]: ['dashboard_kpis', 'stud_list', 'fin_kpis', 'acad_grades', 'comm_announcements'],
    [ROLES.DA]: ['acad_exams', 'acad_grades', 'acad_schedule', 'stud_list', 'acad_reference'],
    [ROLES.CC]: ['web_applications', 'stud_list'],
    [ROLES.LOG]: ['acad_schedule', 'acad_attendance', 'staff_teachers', 'acad_program'],
    [ROLES.ENS]: ['acad_schedule', 'acad_subjects', 'acad_grades', 'acad_attendance', 'acad_complaints'],
    [ROLES.SURV]: ['acad_exams', 'acad_attendance', 'acad_schedule'],
    [ROLES.RAF]: ['fin_payments', 'fin_kpis', 'fin_contracts', 'fin_reports', 'stud_list'],
    [ROLES.MKT]: ['comm_announcements', 'web_applications', 'stud_list', 'acad_schedule', 'acad_program', 'comm_news', 'web_brochures'],
    [ROLES.ACHATS]: ['log_purchases', 'log_suppliers', 'log_assets'],
    [ROLES.SITE]: ['web_applications', 'web_documents', 'web_brochures', 'comm_news'],
    [ROLES.IT]: ['staff_list', 'stud_accounts', 'sys_support', 'acad_reference', 'sys_logs'],
    [ROLES.STUD]: ['acad_schedule', 'acad_program', 'espace_attendance', 'espace_exams', 'espace_documents', 'espace_finance', 'espace_announcements', 'espace_support'],
    [ROLES.DEL]: ['acad_attendance', 'acad_program', 'espace_attendance', 'espace_exams', 'espace_documents', 'espace_finance', 'acad_complaints', 'espace_support'],
    [ROLES.STG]: ['stud_list', 'acad_schedule', 'espace_announcements', 'espace_support'],
  };
  const taskIcons: Record<string, typeof Award> = {
    dashboard_kpis: TrendingUp, stud_list: GraduationCap, fin_kpis: Wallet, fin_payments: Wallet,
    fin_contracts: Wallet, fin_reports: TrendingUp, acad_exams: ClipboardCheck, acad_subjects: ClipboardCheck,
    acad_grades: BookOpen, acad_schedule: CalendarDays, acad_attendance: ClipboardCheck,
    staff_teachers: Users, staff_list: Users, stud_accounts: Users, acad_reference: CalendarDays,
    acad_program: BookOpen, log_purchases: Package, log_suppliers: Package, log_assets: Package,
    espace_attendance: ClipboardCheck, espace_exams: ClipboardCheck, espace_documents: GraduationCap, espace_finance: Wallet,
    sys_logs: ShieldCheck, sys_support: Server,
  };
  const authorizedPages = state.availableTabs.flatMap(tab => tab.subTabs || []);
  const quickActions = tasksByRole[state.activeRole].flatMap(id => {
    const page = authorizedPages.find(item => item.id === id);
    return page ? [{ label: page.name, href: page.href, icon: taskIcons[id] || Megaphone }] : [];
  });
  const allowedDestination = (href: string) => state.availableTabs.some(tab => tab.href === href || tab.subTabs?.some(page => page.href === href));
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

  const renderPopulationBreakdown = () => (
    showPopulationBreakdown && <div className="home-bottom-grid">
      <section className="card" aria-label="Effectifs par filière">
        <div className="card-header">
          <h2><GraduationCap size={18} /> Par filière</h2>
          <Link href="/etudiants">Voir →</Link>
        </div>
        <div className="kpi-bar-list">
          {filiereBreakdown.map(f => (
            <div className="kpi-bar-item" key={f.name}>
              <div className="kpi-bar-head">
                <span>{f.name}</span>
                <strong>{f.count} ({f.pct} %)</strong>
              </div>
              <div className="kpi-bar-track">
                <div className="kpi-bar-fill" style={{ width: `${Math.max(4, f.pct)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-label="Effectifs par niveau et par groupe">
        <div className="card-header">
          <h2><Users size={18} /> Par niveau & groupe</h2>
          <Link href="/academique/referentiel">Voir →</Link>
        </div>
        <div className="kpi-bar-grid">
          <div className="kpi-stat-grid">
            {niveauBreakdown.map(n => (
              <div className="kpi-stat-tile" key={n.name}>
                <strong>{n.count}</strong>
                <span>{n.name} ({n.pct} %)</span>
              </div>
            ))}
          </div>
          <div className="kpi-bar-list" style={{ marginTop: '14px' }}>
            {groupeBreakdown.map(g => (
              <div className="kpi-bar-item" key={g.name}>
                <div className="kpi-bar-head">
                  <span>{g.name}</span>
                  <strong>{g.count} ({g.pct} %)</strong>
                </div>
                <div className="kpi-bar-track">
                  <div className="kpi-bar-fill" style={{ width: `${Math.max(4, g.pct)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  if (mode === 'reports') return <div className="workspace-home"><div className="page-intro"><div><h1>{title}</h1></div></div><div className="home-destinations">{reports.map(report => <Link key={report.id} href={report.href}><ArrowUpRight size={18} className="destination-arrow" /><h3>{report.name}</h3><span>Consulter</span></Link>)}</div>{!reports.length && <section className="card"><p>Aucun rapport disponible.</p></section>}</div>;
  return <div className="workspace-home">
    <div className="home-hero"><div><h1>{title}</h1></div></div>
    {error && <div className="review-notice" role="alert"><span>{error}</span><IconButton className="btn btn-outline" onClick={retry} label="Réessayer" /></div>}

    {mode === 'home' && <>
      <p className="auth-form-description">Votre tableau de bord · {state.activeRole}. Les informations correspondent à votre périmètre et à l’année consultée.</p>
      {renderKpiCards()}
      <section className="card" aria-label="Éléments à suivre">
        <div className="card-header"><h2>À suivre</h2></div>
        {followUps.length > 0 ? <div className="home-record-counts">{followUps.map(item => <div key={item.label}><Link href={item.href}>{item.label}</Link><strong>{item.count}</strong></div>)}</div>
          : <p>Aucun élément en attente dans votre périmètre.</p>}
      </section>
      {quickActions.length > 0 && <div className="home-quick-actions" style={{ marginBottom: '1.25rem' }}>
        <div className="home-section-heading"><div><h2>Que souhaitez-vous faire ?</h2></div></div>
        <div className="quick-actions-bar">
          {quickActions.map(act => <Link key={act.label} href={act.href} className="quick-action-btn"><act.icon size={16} /><span>{act.label}</span><ArrowUpRight size={14} /></Link>)}
        </div>
      </div>}


    </>}

    {mode === 'overview' && <>
      {renderKpiCards()}
      {renderPopulationBreakdown()}

      <div className="home-bottom-grid">{state.history.enabled && state.availableTabs.some(tab => tab.subTabs?.some(section => section.id === 'acad_reference')) && <section className="card"><div className="card-header"><h2><CalendarDays size={18} /> Données pédagogiques</h2><Link href="/academique/referentiel">Consulter</Link></div><div className="home-record-counts">{[['Années universitaires', 'academic_years'], ['Groupes', 'groups'], ['Enseignements', 'teaching_assignments'], ['Séances prévues', 'sessions'], ['Évaluations et examens', 'evaluations']].map(([label, table]) => <div key={table}><span>{label}</span><strong>{count(table)}</strong></div>)}</div></section>}
        {state.activeRole === ROLES.IT && state.history.enabled && state.perms.permissions.includes('system.audit.view') && <section className="card"><div className="card-header"><h2><ShieldCheck size={18} /> Contrôle de reprise des données</h2><Link href="/systeme/donnees">Voir les données</Link></div><strong className="review-count">{catalog ? flagged : '…'}</strong><div className="home-source-summary">{(Object.keys(HISTORY_DOMAINS) as HistoryDomain[]).map(domain => { const tables = HISTORY_TABLES.filter(item => item.domain === domain).map(item => item.table); const total = catalog?.datasets.filter(item => tables.includes(item.table)).reduce((sum, item) => sum + item.count, 0); return <span key={domain}>{HISTORY_DOMAINS[domain]} <strong>{total?.toLocaleString('fr-FR') ?? '…'}</strong></span>; })}</div></section>}
      </div>
    </>}
  </div>;
}
