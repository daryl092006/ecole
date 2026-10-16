'use client';
import IconButton from '@/components/ui/IconButton';
import Link from 'next/link';
import { ArrowUpRight, GraduationCap, Wallet, BookOpen, Users, ShieldCheck, CalendarDays } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { HISTORY_TABLES, HISTORY_DOMAINS } from '@/data/historyCatalog';
import { getWorkspaceNavigation } from '@/constants/workspaceNavigation';
import type { HistoryDomain } from '@/types/history';
export default function WorkspaceHome({ mode = 'home' }: { mode?: 'home' | 'overview' | 'reports' }) {
  const state = usePortal(); const { catalog, error, retry } = state.history;
  const destinations = getWorkspaceNavigation(state.availableTabs).map(group => ({ ...group, pages: group.pages.filter(page => page.id !== 'espace_dashboard') })).filter(group => group.pages.length);
  const count = (table: string) => state.relationalSnapshot.tables[table]?.filter(row => !row.archived_at).length ?? 0;
  const flagged = catalog?.datasets.reduce((sum, item) => sum + item.flagged, 0) ?? 0;
  const reports = state.availableTabs.flatMap(tab => tab.subTabs || []).filter(section => ['fin_reports', 'sys_backups', 'sys_data'].includes(section.id));
  const title = mode === 'overview' ? 'Vue d’ensemble' : mode === 'reports' ? 'Rapports de pilotage' : 'Votre espace de gestion';
  if (mode === 'reports') return <div className="workspace-home"><div className="page-intro"><div><span className="page-eyebrow">PILOTAGE</span><h1>{title}</h1><p>Accédez aux rapports et aux exports disponibles pour votre rôle.</p></div></div><div className="home-destinations">{reports.map(report => <Link key={report.id} href={report.href}><ArrowUpRight size={18} className="destination-arrow" /><h3>{report.name}</h3><span>Consulter</span></Link>)}</div>{!reports.length && <section className="card"><p>Aucun rapport supplémentaire n’est disponible pour votre rôle.</p></section>}</div>;
  return <div className="workspace-home">
    <div className="home-hero"><div><span className="page-eyebrow">ESCEN · GESTION DE L’ÉTABLISSEMENT</span><h1>{title}</h1><p>{mode === 'overview' ? 'Effectifs, paiements, résultats et éléments à vérifier pour l’année consultée.' : 'Retrouvez les dossiers, les données académiques et les opérations financières au même endroit.'}</p></div></div>
    {error && <div className="review-notice" role="alert"><span>{error}</span><IconButton className="btn btn-outline" onClick={retry} label="Réessayer" /></div>}
    <div className="home-metrics">{[...(state.perms.permissions.includes('student.view') || state.perms.scope.ownDataOnly ? [{label:state.perms.scope.ownDataOnly?'Mon dossier':'Étudiants',value:state.students.length,icon:GraduationCap}] : []),...(state.perms.permissions.includes('user.manage') ? [{label:'Comptes du personnel',value:state.users.filter(user=>user.kind==='staff').length,icon:Users}] : []),...(state.perms.permissions.includes('finance.view') ? [{label:'Paiements',value:count('payments'),icon:Wallet}] : []),...(state.perms.permissions.includes('grade.view') ? [{label:'Notes',value:count('grades'),icon:BookOpen}] : [])].map(metric => <div key={metric.label}><metric.icon size={21} /><strong>{metric.value.toLocaleString('fr-FR')}</strong><span>{metric.label}</span></div>)}</div>
    {mode === 'home' && <><div className="home-section-heading"><div><h2>Accéder aux dossiers</h2><p>Une rubrique pour chaque activité de l’établissement.</p></div></div>
    <div className="home-destinations home-navigation">{destinations.map(group => <section className="card" key={group.id} aria-label={group.name}><h3>{group.name}</h3><div>{group.pages.map(page => <Link href={page.href} key={page.id}><span>{page.name}</span><ArrowUpRight size={16} /></Link>)}</div></section>)}</div></>}

    {mode === 'overview' && <div className="home-bottom-grid">{state.history.enabled && state.availableTabs.some(tab => tab.subTabs?.some(section => section.id === 'acad_reference')) && <section className="card"><div className="card-header"><h2><CalendarDays size={18} /> Données pédagogiques</h2><Link href="/academique/referentiel">Consulter</Link></div><div className="home-record-counts">{[['Années universitaires', 'academic_years'], ['Groupes', 'groups'], ['Enseignements', 'teaching_assignments'], ['Séances prévues', 'sessions'], ['Évaluations et examens', 'evaluations']].map(([label, table]) => <div key={table}><span>{label}</span><strong>{count(table)}</strong></div>)}</div></section>}
      {state.history.enabled && state.perms.permissions.includes('system.audit.view') && <section className="card"><div className="card-header"><h2><ShieldCheck size={18} /> Qualité des données</h2><Link href="/systeme/donnees">Voir les données</Link></div><strong className="review-count">{catalog ? flagged : '…'}</strong><p>enregistrements nécessitent une vérification. Ils sont visibles avec leurs valeurs originales et leurs anomalies.</p><div className="home-source-summary">{(Object.keys(HISTORY_DOMAINS) as HistoryDomain[]).map(domain => { const tables = HISTORY_TABLES.filter(item => item.domain === domain).map(item => item.table); const total = catalog?.datasets.filter(item => tables.includes(item.table)).reduce((sum, item) => sum + item.count, 0); return <span key={domain}>{HISTORY_DOMAINS[domain]} <strong>{total?.toLocaleString('fr-FR') ?? '…'}</strong></span>; })}</div></section>}
    </div>}
  </div>;
}
