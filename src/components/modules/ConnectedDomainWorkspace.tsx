'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { DOMAIN_WORKSPACES } from '@/data/domainWorkspaces';
import { PORTAL_ROUTES } from '@/constants/portalRoutes';
import { connectedFieldLabel, connectedRecordName, connectedRecordValue } from '@/services/connectedRecordDisplayService';
import type { DatabaseRow } from '@/types/persistence';
import HistoricalWorkspace, { HISTORY_SECTIONS } from './history/HistoricalWorkspace';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkPage from '@/components/ui/WorkPage';
import { downloadCsv } from '@/utils/csv';
import ArchiveSchedule from './history/ArchiveSchedule';
import ArchiveCommunications from './history/ArchiveCommunications';
import ArchiveFinanceWorkspace from './history/ArchiveFinanceWorkspace';

export default function ConnectedDomainWorkspace({ section }: { section: string }) {
  const portal = usePortal(); const definition = DOMAIN_WORKSPACES[section]; const snapshot = portal.relationalSnapshot;
  const hasArchives = portal.history.enabled && !!HISTORY_SECTIONS[section];
  const [source, setSource] = useState(hasArchives ? 'archives' : 'current');
  const [collection, setCollection] = useState(definition.collections[0]?.table || '');
  const [query, setQuery] = useState(''); const [offset, setOffset] = useState(0); const [selected, setSelected] = useState<DatabaseRow | null>(null); const [exported, setExported] = useState(false);
  const config = definition.collections.find(item => item.table === collection);
  const title = PORTAL_ROUTES.find(route => route.section === section)?.title || 'Consultation';
  const nextPages = definition.next.flatMap(id => portal.availableTabs.flatMap(tab => tab.subTabs || []).filter(page => page.id === id));
  const rows = (snapshot.tables[collection] || []).filter(row => Object.entries(row).some(([key, value]) => connectedRecordValue(collection, key, value, snapshot).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))));
  const page = rows.slice(offset, offset + 25);
  if (['espace_documents', 'espace_finance'].includes(section) && !portal.perms.scope.ownDataOnly) return <section className="card"><h1>{title}</h1><p>Cette rubrique concerne les données personnelles d’un étudiant. Avec votre rôle actuel, commencez par choisir le dossier à consulter.</p><nav className="next-activities" aria-label="Choisir un dossier">{portal.availableTabs.flatMap(tab => tab.subTabs || []).filter(item => item.id === 'stud_list' || item.id === (section === 'espace_documents' ? 'stud_cards' : 'fin_payments')).map(item => <Link key={item.id} href={item.href}>{item.name} →</Link>)}</nav></section>;
  return <div className="domain-workspace"><div className="page-intro"><div><span className="page-eyebrow">CONSULTATION</span><h1>{title}</h1><p>{definition.purpose}</p></div></div>
    <details className="availability-details"><summary>Consultation · opérations d’écriture non activées</summary><p>{definition.availability}</p></details>
    {hasArchives && <nav className="record-sections" aria-label="Origine des données"><button className={source === 'archives' ? 'selected' : ''} aria-pressed={source === 'archives'} onClick={() => setSource('archives')}>Archives conservées</button><button className={source === 'current' ? 'selected' : ''} aria-pressed={source === 'current'} onClick={() => setSource('current')}>Données actuelles</button></nav>}
    {source === 'archives' && hasArchives ? section.startsWith('fin_') ? <ArchiveFinanceWorkspace section={section} /> : section === 'acad_schedule' ? <ArchiveSchedule /> : ['comm_news', 'comm_announcements', 'espace_announcements'].includes(section) ? <ArchiveCommunications section={section} /> : <HistoricalWorkspace key={section} section={section} embedded /> : <>
      {definition.collections.length > 1 && <nav className="record-sections" aria-label="Données disponibles">{definition.collections.map(item => <button key={item.table} aria-pressed={collection === item.table} className={collection === item.table ? 'selected' : ''} onClick={() => { setCollection(item.table); setQuery(''); setOffset(0); setExported(false); }}>{item.title} ({snapshot.tables[item.table]?.length ?? 0})</button>)}</nav>}
      {config ? <section className="card card-full"><div className="browser-toolbar"><label className="form-group">Rechercher dans {config.title.toLocaleLowerCase('fr')}<input className="input" type="search" value={query} onChange={event => { setQuery(event.target.value); setOffset(0); setExported(false); }} placeholder="Nom, référence ou valeur" /></label><button className="btn btn-outline" disabled={!rows.length} onClick={() => { downloadCsv(collection + '-resultats.csv', config.columns.map(connectedFieldLabel), rows.map(row => config.columns.map(key => connectedRecordValue(collection, key, row[key], snapshot)))); setExported(true); }}>Exporter les {rows.length} résultat(s)</button></div>
        {exported && <p role="status">Export préparé : {rows.length} ligne(s) correspondant aux filtres. Aucune donnée n’a été modifiée.</p>}
        <ResponsiveTable className="data-table"><thead><tr>{config.columns.map(key => <th key={key}>{connectedFieldLabel(key)}</th>)}<th>Détail</th></tr></thead><tbody>{page.map(row => <tr key={row.id}>{config.columns.map(key => <td key={key}>{connectedRecordValue(collection, key, row[key], snapshot)}</td>)}<td><button className="btn btn-outline" onClick={() => setSelected(row)}>Ouvrir le détail</button></td></tr>)}{!page.length && <tr><td colSpan={config.columns.length + 1}>{query ? 'Aucun résultat pour cette recherche.' : 'Aucun enregistrement actuel disponible dans votre périmètre. Consultez les archives si elles sont proposées.'}</td></tr>}</tbody></ResponsiveTable>
        {rows.length > 25 && <div className="browser-pagination"><span>{offset + 1}–{Math.min(offset + 25, rows.length)} sur {rows.length}</span><div className="btn-group"><button className="btn btn-outline" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 25))}>Précédent</button><button className="btn btn-outline" disabled={offset + 25 >= rows.length} onClick={() => setOffset(value => value + 25)}>Suivant</button></div></div>}
      </section> : <section className="card"><p>{definition.availability}</p></section>}
      {selected && <WorkPage title={connectedRecordName(collection, selected, snapshot)} onClose={() => setSelected(null)}><dl className="record-details-grid">{Object.entries(selected).filter(([key]) => key !== 'auth_user_id').map(([key, value]) => <div key={key}><dt>{connectedFieldLabel(key)}</dt><dd>{connectedRecordValue(collection, key, value, snapshot)}</dd></div>)}</dl><p>Consultation des informations enregistrées. Aucun état n’a été modifié à l’ouverture de cette fiche.</p></WorkPage>}
    </>}
    {nextPages.length > 0 && <section className="next-activity-panel"><h2>Continuer le parcours</h2><nav className="next-activities" aria-label="Activités liées">{nextPages.map(item => <Link key={item.id} href={item.href}>{item.name} →</Link>)}</nav></section>}
  </div>;
}
