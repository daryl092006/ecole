'use client';
import IconButton from '@/components/ui/IconButton';
import Link from 'next/link';
import { ArrowUpRight, GraduationCap, Wallet, BookOpen, Users, ShieldCheck, CalendarDays, TrendingUp, Award, Server, Package, Megaphone, ClipboardCheck } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { HISTORY_TABLES, HISTORY_DOMAINS } from '@/data/historyCatalog';
import { getWorkspaceNavigation } from '@/constants/workspaceNavigation';
import { ROLES } from '@/types/permissions';
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
  const destinations = getWorkspaceNavigation(state.availableTabs, { hideStudentPersonalPages: true }).map(group => ({ ...group, pages: group.pages.filter(page => page.id !== 'espace_dashboard') })).filter(group => group.pages.length);
  const tables = state.relationalSnapshot.tables;
  const activeRows = (table: string) => (tables[table] || []).filter(row => !row.archived_at);
  const count = (table: string) => activeRows(table).length;
  const flagged = catalog?.datasets.reduce((sum, item) => sum + item.flagged, 0) ?? 0;
  const reports = state.availableTabs.flatMap(tab => tab.subTabs || []).filter(section => ['fin_reports', 'sys_backups', 'sys_data'].includes(section.id));
  const title = mode === 'overview' ? 'Vue d’ensemble' : mode === 'reports' ? 'Rapports de pilotage' : 'Votre espace de gestion';

  const canViewFinance = state.perms.permissions.includes('finance.view');
  const canViewGrades = state.perms.permissions.includes('grade.view');
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
      const openTickets = activeRows('support_tickets').filter(t => !['CLOSED', 'RESOLVED', 'FERME', 'RESOLU'].includes(String(t.status || '').toUpperCase())).length;
      return [
        {
          title: 'Système & Comptes',
          href: '/personnel/utilisateurs',
          icon: Server,
          items: [
            { label: 'Comptes actifs', value: `${activeUsers}/${state.users.length}` },
            { label: 'Enseignants', value: `${count('teachers')}` },
            { label: 'Support ouvert', value: `${openTickets}` },
            { label: 'Personnel', value: `${count('staff')}` },
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
      ];
    }

    if (state.perms.scope.ownDataOnly) {
      const me = state.students[0];
      return [
        {
          title: 'Mon Suivi',
          href: '/mon-espace/documents',
          icon: GraduationCap,
          items: [
            { label: 'Niveau', value: me?.niveau || '—' },
            { label: 'Groupe', value: me?.groupe || '—' },
            { label: 'Notes', value: `${count('grades')}` },
            { label: 'Payé', value: me?.financials?.available ? fmtCompactFcfa(me.financials.paid) : '—' },
            { label: 'Reste', value: me?.financials?.available ? fmtCompactFcfa(me.financials.remaining) : '—' },
          ],
        },
      ];
    }

    return [];
  })();

  const showPopulationBreakdown = !state.perms.scope.ownDataOnly && canViewStudents && totalStudents > 0;

  const quickActions = [
    ...(state.perms.permissions.includes('student.update') || state.perms.permissions.includes('student.view')
      ? [{ label: 'Dossiers étudiants', href: '/etudiants', icon: GraduationCap }]
      : []),
    ...(state.perms.permissions.includes('payment.record')
      ? [{ label: 'Versements et reçus', href: '/finance/versements', icon: Wallet }]
      : []),
    ...(state.perms.permissions.includes('grade.enter') || state.perms.permissions.includes('grade.review')
      ? [{ label: 'Consulter les notes', href: '/academique/notes', icon: BookOpen }]
      : []),
    ...(state.perms.permissions.includes('schedule.create') || state.perms.permissions.includes('attendance.record')
      ? [{ label: 'Emploi du temps', href: '/academique/emploi-du-temps', icon: CalendarDays }]
      : []),
    ...(state.perms.permissions.includes('student.lifecycle.manage')
      ? [{ label: 'Réinscriptions', href: '/etudiants/parcours', icon: ClipboardCheck }]
      : []),
    ...(state.perms.permissions.includes('academic.structure.manage') || state.perms.permissions.includes('academic.year.open')
      ? [{ label: 'Préparer l’année', href: '/academique/referentiel', icon: CalendarDays }]
      : []),
    ...(state.perms.permissions.includes('user.manage')
      ? [{ label: 'Comptes utilisateurs', href: '/personnel/utilisateurs', icon: Users }]
      : []),
    ...(state.perms.scope.ownDataOnly
      ? [
          { label: 'Mes documents', href: '/mon-espace/documents', icon: GraduationCap },
          { label: 'Ma scolarité & paiements', href: '/mon-espace/scolarite', icon: Wallet },
        ]
      : []),
  ].slice(0, 6);

  const renderKpiCards = () => (
    roleKpiCards.length > 0 && <div className="home-bottom-grid">
      {roleKpiCards.map(card => {
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

  if (mode === 'reports') return <div className="workspace-home"><div className="page-intro"><div><span className="page-eyebrow">PILOTAGE</span><h1>{title}</h1></div></div><div className="home-destinations">{reports.map(report => <Link key={report.id} href={report.href}><ArrowUpRight size={18} className="destination-arrow" /><h3>{report.name}</h3><span>Consulter</span></Link>)}</div>{!reports.length && <section className="card"><p>Aucun rapport disponible.</p></section>}</div>;
  return <div className="workspace-home">
    <div className="home-hero"><div><span className="page-eyebrow">{state.activeRole.toUpperCase()}</span><h1>{title}</h1></div></div>
    {error && <div className="review-notice" role="alert"><span>{error}</span><IconButton className="btn btn-outline" onClick={retry} label="Réessayer" /></div>}

    {mode === 'home' && <>
      <div className="home-metrics">{[...(canViewStudents || state.perms.scope.ownDataOnly ? [{label:state.perms.scope.ownDataOnly?'Mon dossier':'Étudiants',value:state.students.length,icon:GraduationCap}] : []),...(state.perms.permissions.includes('user.manage') ? [{label:'Comptes du personnel',value:state.users.filter(user=>user.kind==='staff').length,icon:Users}] : []),...(canViewFinance ? [{label:'Paiements',value:count('payments'),icon:Wallet}] : []),...(canViewGrades ? [{label:'Notes',value:count('grades'),icon:BookOpen}] : [])].map(metric => <div key={metric.label}><metric.icon size={21} /><strong>{metric.value.toLocaleString('fr-FR')}</strong><span>{metric.label}</span></div>)}</div>

      {quickActions.length > 0 && <div className="home-quick-actions" style={{ marginBottom: '1.25rem' }}>
        <div className="home-section-heading"><div><h2>Actions prioritaires</h2></div></div>
        <div className="quick-actions-bar">
          {quickActions.map(act => <Link key={act.label} href={act.href} className="quick-action-btn"><act.icon size={16} /><span>{act.label}</span><ArrowUpRight size={14} /></Link>)}
        </div>
      </div>}

      <div className="home-section-heading" style={{ marginTop: '2rem' }}><div><h2>Rubriques de l’établissement</h2></div></div>
      <div className="home-destinations home-navigation">{destinations.map(group => <section className="card" key={group.id} aria-label={group.name}><details className="home-directory-group"><summary><h3>{group.name}</h3><span>{group.pages.length} rubrique(s)</span></summary><div>{group.pages.map(page => <Link href={page.href} key={page.id}><span>{page.name}</span><ArrowUpRight size={16} /></Link>)}</div></details></section>)}</div>
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
