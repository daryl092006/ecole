'use client';
import Link from 'next/link';
import { ArrowUpRight, GraduationCap, Wallet, BookOpen, Users, ShieldCheck, CalendarDays, Megaphone, Package, Settings, BarChart2 } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { HISTORY_TABLES, HISTORY_DOMAINS } from '@/data/historyCatalog';
import { DOMAIN_WORKSPACES } from '@/data/domainWorkspaces';
import type { HistoryDomain } from '@/types/history';
const moduleDetails: Record<string, { description: string; icon: typeof Users; domain: string }> = {
  etudiants: { description: 'Dossiers, comptes, documents et parcours des étudiants.', icon: GraduationCap, domain: 'students' },
  academique: { description: 'Enseignements, planning, épreuves et résultats.', icon: BookOpen, domain: 'academic' },
  finance: { description: 'Contrats, frais, versements et suivi financier.', icon: Wallet, domain: 'finance' },
  personnel: { description: 'Dossiers professionnels, enseignants, comptes et accès.', icon: Users, domain: 'staff' },
  logistique: { description: 'Demandes d’achat, fournisseurs et équipements.', icon: Package, domain: 'staff' },
  marketing: { description: 'Annonces et actualités de l’établissement.', icon: Megaphone, domain: 'academic' },
  systeme: { description: 'Support, journal d’activité et contrôle des données.', icon: Settings, domain: 'staff' },
  dashboard_global: { description: 'Vue d’ensemble et rapports de pilotage.', icon: BarChart2, domain: 'finance' },
};
export default function WorkspaceHome({ mode = 'home' }: { mode?: 'home' | 'overview' | 'reports' }) {
  const state = usePortal(); const { catalog, error, retry } = state.history;
  const destinations = [...state.availableTabs.filter(tab => moduleDetails[tab.id]).map(tab => ({ ...moduleDetails[tab.id], title: tab.name, href: tab.href })), ...(state.perms.scope.ownDataOnly ? state.availableTabs.find(tab=>tab.id==='espace')?.subTabs?.filter(page=>page.id!=='espace_dashboard').map(page=>({title:page.name,href:page.href,description:DOMAIN_WORKSPACES[page.id]?.purpose || 'Consulter les informations disponibles pour mon compte.',icon:BookOpen,domain:'students'})) || [] : [])];
  const count = (table: string) => catalog?.datasets.find(item => item.table === table)?.count ?? 0;
  const flagged = catalog?.datasets.reduce((sum, item) => sum + item.flagged, 0) ?? 0;
  const reports = state.availableTabs.flatMap(tab => tab.subTabs || []).filter(section => ['fin_reports', 'sys_backups', 'sys_data'].includes(section.id));
  const title = mode === 'overview' ? 'Vue d’ensemble' : mode === 'reports' ? 'Rapports de pilotage' : 'Votre espace de gestion';
  if (mode === 'reports') return <div className="workspace-home"><div className="page-intro"><div><span className="page-eyebrow">PILOTAGE</span><h1>{title}</h1><p>Accédez aux rapports et aux exports disponibles pour votre rôle. Les données historiques restent identifiées comme archives.</p></div></div><div className="home-destinations">{reports.map(report => <Link key={report.id} href={report.href}><ArrowUpRight size={18} className="destination-arrow" /><h3>{report.name}</h3><span>Consulter</span></Link>)}</div>{!reports.length && <section className="card"><p>Aucun rapport supplémentaire n’est disponible pour votre rôle.</p></section>}</div>;
  return <div className="workspace-home">
    <div className="home-hero"><div><span className="page-eyebrow">ESCEN · GESTION DE L’ÉTABLISSEMENT</span><h1>{title}</h1><p>{mode === 'overview' ? 'Effectifs chargés, volumes d’archives et éléments à vérifier dans votre périmètre.' : 'Retrouvez les dossiers, les données académiques et les opérations financières au même endroit.'}</p></div><div className="home-account"><ShieldCheck size={22} /><span>{state.session?.name}<small>{state.activeRole}</small></span></div></div>
    {error && <div className="review-notice" role="alert"><span>{error}</span><button className="btn btn-outline" onClick={retry}>Réessayer</button></div>}
    <div className="home-metrics">{[...(state.perms.permissions.includes('student.view') || state.perms.scope.ownDataOnly ? [{label:state.perms.scope.ownDataOnly?'Mon dossier':'Étudiants',value:state.students.length,icon:GraduationCap}] : []),...(state.perms.permissions.includes('user.manage') ? [{label:'Comptes du personnel',value:state.users.filter(user=>user.kind==='staff').length,icon:Users}] : []),...(state.history.enabled && state.perms.permissions.includes('finance.view') ? [{label:'Paiements conservés',value:catalog?count('paiements'):'…',icon:Wallet}] : []),...(state.history.enabled && state.perms.permissions.includes('grade.view') ? [{label:'Notes conservées',value:catalog?count('notes'):'…',icon:BookOpen}] : [])].map(metric => <div key={metric.label}><metric.icon size={21} /><strong>{metric.value.toLocaleString('fr-FR')}</strong><span>{metric.label}</span></div>)}</div>
    {mode === 'home' && <><div className="home-section-heading"><div><h2>Accéder aux dossiers</h2><p>Une rubrique pour chaque activité de l’établissement.</p></div></div>
    <div className="home-destinations">{destinations.map(item => <Link href={item.href} key={item.href}><div className={`destination-icon ${item.domain}`}><item.icon size={24} /></div><ArrowUpRight size={18} className="destination-arrow" /><h3>{item.title}</h3><p>{item.description}</p><span>Ouvrir la rubrique</span></Link>)}</div></>}
    <div className="home-bottom-grid">{state.history.enabled && state.availableTabs.some(tab => tab.subTabs?.some(section => section.id === 'acad_reference')) && <section className="card"><div className="card-header"><h2><CalendarDays size={18} /> Données pédagogiques</h2><Link href="/academique/referentiel">Consulter</Link></div><div className="home-record-counts">{[['Années universitaires', 'annee_scolaires'], ['Groupes', 'groups'], ['Enseignements', 'unite_valeurs'], ['Séances prévues', 'emploi_du_temps'], ['Évaluations et examens', 'evaluations']].map(([label, table]) => <div key={table}><span>{label}</span><strong>{catalog ? count(table) : '…'}</strong></div>)}</div></section>}
      {state.history.enabled && state.perms.permissions.includes('system.audit.view') && <section className="card"><div className="card-header"><h2><ShieldCheck size={18} /> Qualité des données</h2><Link href="/systeme/donnees">Voir les données</Link></div><strong className="review-count">{catalog ? flagged : '…'}</strong><p>enregistrements nécessitent une vérification. Ils sont visibles avec leurs valeurs originales et leurs anomalies.</p><div className="home-source-summary">{(Object.keys(HISTORY_DOMAINS) as HistoryDomain[]).map(domain => { const tables = HISTORY_TABLES.filter(item => item.domain === domain).map(item => item.table); const total = catalog?.datasets.filter(item => tables.includes(item.table)).reduce((sum, item) => sum + item.count, 0); return <span key={domain}>{HISTORY_DOMAINS[domain]} <strong>{total?.toLocaleString('fr-FR') ?? '…'}</strong></span>; })}</div></section>}
    </div>
  </div>;
}
