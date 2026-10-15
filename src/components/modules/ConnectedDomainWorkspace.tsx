'use client';
import ScheduleCalendar from '@/components/ui/ScheduleCalendar';
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

export default function ConnectedDomainWorkspace({ section, studentMatricule }: { section: string; studentMatricule?: string }) {
  const portal = usePortal(); const definition = DOMAIN_WORKSPACES[section]; const snapshot = portal.relationalSnapshot;
  const hasArchives = portal.history.enabled && !!HISTORY_SECTIONS[section];
  const hasCurrent = definition.collections.some(item => (snapshot.tables[item.table] || []).length > 0);
  const source = hasCurrent || !hasArchives ? 'current' : 'archives';
  const [collection, setCollection] = useState(definition.collections[0]?.table || '');
  const [query, setQuery] = useState(''); const [offset, setOffset] = useState(0); const [selected, setSelected] = useState<DatabaseRow | null>(null); const [exported, setExported] = useState(false);
  const contextual = !!studentMatricule || ['acad_grades', 'acad_jury', 'stud_cards'].includes(section);
  const [dossier, setDossier] = useState(studentMatricule || '');
  const [dossierQuery, setDossierQuery] = useState('');
  const student = portal.students.find(item => item.matricule === dossier);
  const nativeStudent = snapshot.tables.students?.find(item => item.matricule === dossier);
  const ids = (table: string, key: string, parents: Set<unknown>) => new Set<unknown>((snapshot.tables[table] || []).filter(row => parents.has(row[key])).map(row => row.id));
  const enrollments = ids('enrollments', 'student_id', new Set(nativeStudent ? [nativeStudent.id] : []));
  const candidates = ids('evaluation_candidates', 'enrollment_id', enrollments);
  const grades = ids('grades', 'candidate_id', candidates);
  const decisions = ids('jury_decisions', 'enrollment_id', enrollments);
  const evaluations = new Set((snapshot.tables.evaluation_candidates || []).filter(row => candidates.has(row.id)).map(row => row.evaluation_id));
  const juries = new Set((snapshot.tables.jury_decisions || []).filter(row => decisions.has(row.id)).map(row => row.jury_id));
  const contracts = ids('financial_contracts', 'enrollment_id', enrollments);
  const versions = ids('contract_versions', 'contract_id', contracts);
  const payments = ids('payments', 'enrollment_id', enrollments);
  const inDossier = (row: DatabaseRow) => {
    if (!nativeStudent) return false;
    if (collection === 'enrollments') return enrollments.has(row.id);
    if (['enrollment_groups', 'enrollment_events', 'financial_contracts', 'payments', 'scholarship_awards'].includes(collection)) return enrollments.has(row.enrollment_id);
    if (['receipts', 'payment_reversals'].includes(collection)) return payments.has(row.payment_id);
    if (collection === 'installments') return versions.has(row.version_id);
    if (['student_documents', 'generated_documents'].includes(collection)) return row.student_id === nativeStudent.id;
    if (collection === 'grades') return candidates.has(row.candidate_id);
    if (collection === 'grade_revisions') return grades.has(row.grade_id);
    if (collection === 'evaluation_transitions') return evaluations.has(row.evaluation_id);
    if (collection === 'jury_decisions') return decisions.has(row.id);
    if (collection === 'juries') return juries.has(row.id);
    return false;
  };
  const collections = contextual ? definition.collections.filter(item => !['document_types', 'document_requirements'].includes(item.table)) : definition.collections;
  const config = definition.collections.find(item => item.table === collection);
  const title = PORTAL_ROUTES.find(route => route.section === section)?.title || 'Consultation';
  const nextPages = definition.next.flatMap(id => portal.availableTabs.flatMap(tab => tab.subTabs || []).filter(page => page.id === id));
  const rows = (snapshot.tables[collection] || []).filter(row => (!contextual || inDossier(row)) && Object.entries(row).some(([key, value]) => connectedRecordValue(collection, key, value, snapshot).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))));
  const page = rows.slice(offset, offset + 25);
  if (['espace_documents', 'espace_finance'].includes(section) && !portal.perms.scope.ownDataOnly) return <section className="card"><h1>{title}</h1><p>Cette rubrique concerne les données personnelles d’un étudiant. Avec votre rôle actuel, commencez par choisir le dossier à consulter.</p><nav className="next-activities" aria-label="Choisir un dossier">{portal.availableTabs.flatMap(tab => tab.subTabs || []).filter(item => item.id === 'stud_list' || item.id === (section === 'espace_documents' ? 'stud_cards' : 'fin_payments')).map(item => <Link key={item.id} href={item.href}>{item.name} →</Link>)}</nav></section>;
  const dossierPicker = contextual && !studentMatricule ? <section className="card card-full"><h2>{student ? 'Dossier consulté' : 'Choisir un dossier étudiant'}</h2>{student ? <><p><strong>{student.firstname} {student.lastname}</strong> · {student.matricule}</p><p className="cell-sub">{student.filiere} · {student.niveau}</p><div className="btn-group"><button className="btn btn-outline" onClick={() => { setDossier(''); setSelected(null); setQuery(''); setOffset(0); setExported(false); }}>Changer de dossier</button></div></> : <><label className="form-group">Rechercher un dossier<input className="input" type="search" placeholder="Nom ou matricule" value={dossierQuery} onChange={event => setDossierQuery(event.target.value)} /></label><ResponsiveTable className="data-table"><thead><tr><th>Étudiant</th><th>Formation</th><th>Dossier</th></tr></thead><tbody>{portal.students.filter(item => `${item.firstname} ${item.lastname} ${item.matricule}`.toLocaleLowerCase('fr').includes(dossierQuery.toLocaleLowerCase('fr'))).map(item => <tr key={item.matricule}><td>{item.firstname} {item.lastname}<div className="cell-sub">{item.matricule}</div></td><td>{item.filiere} · {item.niveau}</td><td><button className="btn btn-outline" onClick={() => { setDossier(item.matricule); setSelected(null); setQuery(''); setOffset(0); setExported(false); }}>Consulter le dossier</button></td></tr>)}</tbody></ResponsiveTable>{!portal.students.length && <p>Aucun dossier dans l’année et le périmètre consultés.</p>}</>}</section> : null;
  if (contextual && !student && !studentMatricule) return <div className="domain-workspace"><div className="page-intro"><h1>{title}</h1></div>{dossierPicker}</div>;
  return <div className="domain-workspace">{dossierPicker}{!studentMatricule && <div className="page-intro"><div><span className="page-eyebrow">CONSULTATION</span><h1>{title}</h1><p>{definition.purpose}</p></div></div>}
    <details className="availability-details"><summary>Consultation · opérations d’écriture non activées</summary><p>{definition.availability}</p></details>
    {source === 'archives' && hasArchives && !studentMatricule ? section.startsWith('fin_') ? <ArchiveFinanceWorkspace section={section} /> : section === 'acad_schedule' ? <ArchiveSchedule /> : ['comm_news', 'comm_announcements', 'espace_announcements'].includes(section) ? <ArchiveCommunications section={section} /> : contextual && !student?.historical ? <section className="card"><p>Aucune donnée reliée à ce dossier pour cette rubrique.</p></section> : <HistoricalWorkspace key={`${section}:${dossier}`} section={section} studentId={contextual ? student?.historical?.sourceId : undefined} batchId={contextual ? student?.historical?.batchId : undefined} embedded /> : <>
      {studentMatricule && collections.length > 1 ? <label className="workspace-picker">Consulter<select className="select-input" value={collection} onChange={event => { setCollection(event.target.value); setQuery(''); setOffset(0); setExported(false); }}>{collections.map(item => <option key={item.table} value={item.table}>{item.title}</option>)}</select></label> : collections.length > 1 && <nav className="record-sections" aria-label="Données disponibles">{collections.map(item => <button key={item.table} aria-pressed={collection === item.table} className={collection === item.table ? 'selected' : ''} onClick={() => { setCollection(item.table); setQuery(''); setOffset(0); setExported(false); }}>{item.title} {!contextual && ` (${snapshot.tables[item.table]?.length ?? 0})`}</button>)}</nav>}
      {config && collection === 'sessions' && section === 'acad_schedule' ? <ScheduleCalendar period={portal.academicYearContext?.years.find(year => year.id === portal.academicYearContext?.selectedYearId)} sessions={rows.map(row => ({ id: row.id, start: String(row.starts_at || ''), end: String(row.ends_at || ''), title: connectedRecordName('sessions', row, snapshot), subtitle: `${connectedRecordValue('sessions', 'group_id', row.group_id, snapshot)} · ${connectedRecordValue('sessions', 'room_id', row.room_id, snapshot)}` }))} onSelect={id => setSelected(rows.find(row => row.id === id) || null)} /> : config ? <section className="card card-full"><div className="browser-toolbar"><label className="form-group">Rechercher dans {config.title.toLocaleLowerCase('fr')}<input className="input" type="search" value={query} onChange={event => { setQuery(event.target.value); setOffset(0); setExported(false); }} placeholder="Nom, référence ou valeur" /></label><button className="btn btn-outline" disabled={!rows.length} onClick={() => { downloadCsv(collection + '-resultats.csv', config.columns.map(connectedFieldLabel), rows.map(row => config.columns.map(key => connectedRecordValue(collection, key, row[key], snapshot)))); setExported(true); }}>Exporter les {rows.length} résultat(s)</button></div>
        {exported && <p role="status">Export préparé : {rows.length} ligne(s) correspondant aux filtres. Aucune donnée n’a été modifiée.</p>}
        <ResponsiveTable className="data-table"><thead><tr>{config.columns.map(key => <th key={key}>{connectedFieldLabel(key)}</th>)}<th>Détail</th></tr></thead><tbody>{page.map(row => <tr key={row.id}>{config.columns.map(key => <td key={key}>{connectedRecordValue(collection, key, row[key], snapshot)}</td>)}<td><button className="btn btn-outline" onClick={() => setSelected(row)}>Ouvrir le détail</button></td></tr>)}{!page.length && <tr><td colSpan={config.columns.length + 1}>{query ? 'Aucun résultat pour cette recherche.' : 'Aucun enregistrement pour cette rubrique dans l’année et le dossier consultés.'}</td></tr>}</tbody></ResponsiveTable>
        {rows.length > 25 && <div className="browser-pagination"><span>{offset + 1}–{Math.min(offset + 25, rows.length)} sur {rows.length}</span><div className="btn-group"><button className="btn btn-outline" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 25))}>Précédent</button><button className="btn btn-outline" disabled={offset + 25 >= rows.length} onClick={() => setOffset(value => value + 25)}>Suivant</button></div></div>}
      </section> : <section className="card"><p>{definition.availability}</p></section>}
      {selected && <WorkPage title={connectedRecordName(collection, selected, snapshot)} onClose={() => setSelected(null)}><dl className="record-details-grid">{Object.entries(selected).filter(([key]) => !['auth_user_id', 'site_id', 'building_id', 'legacy_source_row_id'].includes(key)).map(([key, value]) => <div key={key}><dt>{connectedFieldLabel(key)}</dt><dd>{connectedRecordValue(collection, key, value, snapshot)}</dd></div>)}</dl><p>Consultation des informations enregistrées. Aucun état n’a été modifié à l’ouverture de cette fiche.</p></WorkPage>}
    </>}
    {!studentMatricule && nextPages.length > 0 && <details className="next-activity-panel"><summary>Étapes liées</summary><nav className="next-activities" aria-label="Activités liées">{nextPages.map(item => <Link key={item.id} href={item.href}>{item.name} →</Link>)}</nav></details>}
  </div>;
}
