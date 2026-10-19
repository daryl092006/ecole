'use client';
import StudentDossierPicker from './StudentDossierPicker';
import StudentRecordDialog from './StudentRecordDialog';
import IconButton from '@/components/ui/IconButton';
import ScheduleCalendar from '@/components/ui/ScheduleCalendar';
import ScheduleGroupFilter from '@/components/ui/ScheduleGroupFilter';
import Link from 'next/link';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { DOMAIN_WORKSPACES } from '@/data/domainWorkspaces';
import { PORTAL_ROUTES } from '@/constants/portalRoutes';
import { connectedFieldLabel, connectedRecordName, connectedRecordValue } from '@/services/connectedRecordDisplayService';
import { receiptStatus } from '@/services/paymentAdjustmentService';
import type { DatabaseRow } from '@/types/persistence';
import HistoricalWorkspace, { HISTORY_SECTIONS } from './history/HistoricalWorkspace';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkPage from '@/components/ui/WorkPage';
import { downloadCsv } from '@/utils/csv';
import ArchiveSchedule from './history/ArchiveSchedule';
import ArchiveCommunications from './history/ArchiveCommunications';
import ArchiveFinanceWorkspace from './history/ArchiveFinanceWorkspace';
import GroupSubjectGradesPanel from './academic/GroupSubjectGradesPanel';

export default function ConnectedDomainWorkspace({ section, studentMatricule }: { section: string; studentMatricule?: string }) {
  const portal = usePortal(); const definition = DOMAIN_WORKSPACES[section]; const snapshot = portal.relationalSnapshot;
  const hasArchives = portal.history.enabled && !!HISTORY_SECTIONS[section];
  // Imported business records use the same tables as newly entered records.
  // An empty result must not silently switch to backup rows (or another year).
  const canonical = ['acad_grades', 'fin_kpis', 'fin_payments', 'fin_reports', 'fin_contracts', 'stud_status', 'espace_finance', 'sys_support', 'espace_support', 'comm_news', 'comm_announcements', 'espace_announcements'].includes(section);
  const hasCurrent = definition.collections.some(item => (snapshot.tables[item.table] || []).length > 0);
  const source = canonical || hasCurrent || !hasArchives ? 'current' : 'archives';
  const [collection, setCollection] = useState(definition.collections[0]?.table || '');
  const [query, setQuery] = useState(''); const [offset, setOffset] = useState(0); const [selected, setSelected] = useState<DatabaseRow | null>(null); const [exported, setExported] = useState(false);
  const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [scheduleGroupSelection, setScheduleGroupSelection] = useState({ yearId: '', groupId: '' });
  const contextual = !!studentMatricule || ['acad_grades', 'acad_jury', 'stud_cards'].includes(section);
  const [dossier, setDossier] = useState(studentMatricule || '');
  const [paymentPicker, setPaymentPicker] = useState(false);
  const [paymentDossier, setPaymentDossier] = useState('');
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
  const originalConfig = definition.collections.find(item => item.table === collection);
  const config = originalConfig && collection === 'receipts' ? { ...originalConfig, columns: [...originalConfig.columns, 'status'] } : originalConfig;
  const dateKey = ({ payments: 'paid_on', installments: 'due_on', financial_contracts: 'created_at', receipts: 'issued_at', payment_reversals: 'reversed_at' } as Record<string, string>)[collection];
  const title = PORTAL_ROUTES.find(route => route.section === section)?.title || 'Consultation';
  const nextPages = definition.next.flatMap(id => portal.availableTabs.flatMap(tab => tab.subTabs || []).filter(page => page.id === id));
  const scheduleYearId = portal.academicYearContext?.selectedYearId || '';
  const scheduleGroups = [...new Map((snapshot.tables.sessions || []).filter(row => row.group_id).map(row => [String(row.group_id), { id: String(row.group_id), label: connectedRecordValue('sessions', 'group_id', row.group_id, snapshot) }])).values()];
  const scheduleGroupId = scheduleGroupSelection.yearId === scheduleYearId && scheduleGroups.some(group => group.id === scheduleGroupSelection.groupId) ? scheduleGroupSelection.groupId : '';
  const rows = (snapshot.tables[collection] || []).map(row => collection === 'receipts' ? { ...row, status: receiptStatus(snapshot, row.payment_id) } : row).filter(row => (!contextual || inDossier(row))
    && (section !== 'acad_schedule' || collection !== 'sessions' || !scheduleGroupId || row.group_id === scheduleGroupId)
    && (!dateKey || ((!start || String(row[dateKey] || '').slice(0, 10) >= start) && (!end || (!!row[dateKey] && String(row[dateKey]).slice(0, 10) <= end))))
    && Object.entries(row).some(([key, value]) => connectedRecordValue(collection, key, value, snapshot).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))));
  const page = rows.slice(offset, offset + 25);
  if (['espace_documents', 'espace_finance'].includes(section) && !portal.perms.scope.ownDataOnly) return <section className="card"><h1>{title}</h1><p>Vous êtes connecté en tant que membre du personnel ({portal.activeRole}). Accédez directement aux espaces de gestion correspondants pour l’établissement :</p><nav className="next-activities" aria-label="Accès de gestion">{portal.availableTabs.flatMap(tab => tab.subTabs || []).filter(item => ['staff_records', 'stud_cards', 'fin_kpis', 'fin_payments'].includes(item.id)).map(item => <Link key={item.id} href={item.href}>{item.name} →</Link>)}</nav></section>;
  const selectDossier = (matricule: string) => { setDossier(matricule); setSelected(null); setQuery(''); setOffset(0); setExported(false); };
  const dossierPicker = contextual && !studentMatricule ? student ? <section className="card card-full"><h2>Dossier consulté</h2><p><strong>{student.firstname} {student.lastname}</strong> · {student.matricule}</p><p className="cell-sub">{student.filiere} · {student.niveau}</p><button className="btn btn-outline" onClick={() => selectDossier('')}>Changer de dossier</button></section> : <StudentDossierPicker students={portal.students} onSelect={selectDossier} /> : null;
  if (contextual && !student && !studentMatricule) return <div className="domain-workspace"><div className="page-intro"><h1>{title}</h1></div>{section === 'acad_grades' && <GroupSubjectGradesPanel snapshot={snapshot} canViewStudents={portal.perms.permissions.includes('student.view')} onSelectStudent={mat => { setDossier(mat); setSelected(null); setQuery(''); setOffset(0); setExported(false); }} />}{dossierPicker}</div>;
  return <div className="domain-workspace">{!studentMatricule && <div className="page-intro"><div><span className="page-eyebrow">CONSULTATION</span><h1>{title}</h1><p>{definition.purpose}</p></div></div>}
    {dossierPicker}
    {section === 'fin_payments' && !studentMatricule && portal.perms.permissions.includes('payment.record') && portal.perms.permissions.includes('student.view') && <section className="card card-full"><h2>Enregistrer un paiement</h2><p>Choisissez le dossier de l'étudiant pour vérifier son inscription et son contrat, puis enregistrer le versement.</p><button className="btn btn-primary" onClick={() => setPaymentPicker(true)}>Choisir le dossier pour encaisser</button></section>}
    {paymentPicker && <WorkPage title="Choisir le dossier pour encaisser" onClose={() => setPaymentPicker(false)}><StudentDossierPicker students={portal.students} onSelect={matricule => { setPaymentPicker(false); setPaymentDossier(matricule); }} /></WorkPage>}
    {paymentDossier && <StudentRecordDialog matricule={paymentDossier} onClose={() => setPaymentDossier('')} />}
    {!(studentMatricule && ['stud_status', 'fin_payments'].includes(section)) && <details className="availability-details" open><summary>Informations et périmètre de la rubrique</summary><p>{definition.availability}</p></details>}
    {source === 'archives' && hasArchives && !studentMatricule ? section.startsWith('fin_') ? <ArchiveFinanceWorkspace section={section} /> : section === 'acad_schedule' ? <ArchiveSchedule /> : ['comm_news', 'comm_announcements', 'espace_announcements'].includes(section) ? <ArchiveCommunications section={section} /> : contextual && !student?.historical ? <section className="card"><p>Aucune donnée reliée à ce dossier pour cette rubrique.</p></section> : <HistoricalWorkspace key={`${section}:${dossier}`} section={section} studentId={contextual ? student?.historical?.sourceId : undefined} batchId={contextual ? student?.historical?.batchId : undefined} embedded /> : <>
      {studentMatricule && collections.length > 1 ? <label className="workspace-picker">Consulter<select className="select-input" value={collection} onChange={event => { setCollection(event.target.value); setStart(''); setEnd(''); setQuery(''); setOffset(0); setExported(false); }}>{collections.map(item => <option key={item.table} value={item.table}>{item.title}</option>)}</select></label> : collections.length > 1 && <nav className="record-sections" aria-label="Données disponibles">{collections.map(item => <button key={item.table} aria-pressed={collection === item.table} className={collection === item.table ? 'selected' : ''} onClick={() => { setCollection(item.table); setStart(''); setEnd(''); setQuery(''); setOffset(0); setExported(false); }}>{item.title} {!contextual && ` (${snapshot.tables[item.table]?.length ?? 0})`}</button>)}</nav>}
      {config && collection === 'sessions' && section === 'acad_schedule' ? <><section className="card"><ScheduleGroupFilter groups={scheduleGroups} value={scheduleGroupId} onChange={groupId => setScheduleGroupSelection({ yearId: scheduleYearId, groupId })} count={rows.length} /></section><ScheduleCalendar period={portal.academicYearContext?.years.find(year => year.id === portal.academicYearContext?.selectedYearId)} sessions={rows.map(row => ({ id: row.id, start: String(row.starts_at || ''), end: String(row.ends_at || ''), title: connectedRecordName('sessions', row, snapshot), subtitle: `${connectedRecordValue('sessions', 'group_id', row.group_id, snapshot)} · ${connectedRecordValue('sessions', 'room_id', row.room_id, snapshot)}` }))} onSelect={id => setSelected(rows.find(row => row.id === id) || null)} /></> : config ? <section className="card card-full"><div className="browser-toolbar"><label className="form-group">{dateKey ? 'Rechercher un étudiant ou une référence' : `Rechercher dans ${config.title.toLocaleLowerCase('fr')}`}<input className="input" type="search" value={query} onChange={event => { setQuery(event.target.value); setOffset(0); setExported(false); }} placeholder="Nom, référence ou valeur" /></label><button className="btn btn-outline" disabled={!rows.length} onClick={() => { downloadCsv(collection + '-resultats.csv', config.columns.map(connectedFieldLabel), rows.map(row => config.columns.map(key => connectedRecordValue(collection, key, row[key], snapshot)))); setExported(true); }}>Exporter les {rows.length} résultat(s)</button></div>
        {dateKey && <details className="advanced-record-filters"><summary>Filtrer par période</summary><div className="planning-filters"><label className="form-group">{collection === 'payments' ? 'Versement à partir du' : collection === 'installments' ? 'Échéance à partir du' : 'Enregistrement à partir du'}<input className="input" type="date" value={start} onChange={event => { setStart(event.target.value); setOffset(0); setExported(false); }} /></label><label className="form-group">Jusqu’au<input className="input" type="date" min={start || undefined} value={end} onChange={event => { setEnd(event.target.value); setOffset(0); setExported(false); }} /></label></div></details>}
        {(query || start || end) && <button className="btn btn-outline" onClick={() => { setQuery(''); setStart(''); setEnd(''); setOffset(0); setExported(false); }}>Effacer les filtres</button>}
        {exported && <p role="status">{rows.length} ligne(s) exportée(s) avec succès.</p>}
        <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr>{config.columns.map(key => <th key={key}>{connectedFieldLabel(key)}</th>)}<th>Détail</th></tr></thead><tbody>{page.map(row => <tr key={row.id}>{config.columns.map(key => <td key={key}>{connectedRecordValue(collection, key, row[key], snapshot)}</td>)}<td><IconButton className="btn btn-outline" onClick={() => setSelected(row)} label="Ouvrir le détail" /></td></tr>)}{!page.length && <tr><td colSpan={config.columns.length + 1}>{query ? 'Aucun résultat pour cette recherche.' : 'Aucun enregistrement pour cette rubrique dans l’année et le dossier consultés.'}</td></tr>}</tbody></ResponsiveTable></div>
        {rows.length > 25 && <div className="browser-pagination"><span>{offset + 1}–{Math.min(offset + 25, rows.length)} sur {rows.length}</span><div className="btn-group"><IconButton className="btn btn-outline" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 25))} label="Précédent" /><IconButton className="btn btn-outline" disabled={offset + 25 >= rows.length} onClick={() => setOffset(value => value + 25)} label="Suivant" /></div></div>}
      </section> : <section className="card"><p>{definition.availability}</p></section>}
      {selected && <WorkPage title={connectedRecordName(collection, selected, snapshot)} onClose={() => setSelected(null)}><dl className="record-details-grid">{Object.entries(selected).filter(([key]) => !['auth_user_id', 'site_id', 'building_id', 'legacy_source_row_id'].includes(key)).map(([key, value]) => <div key={key}><dt>{connectedFieldLabel(key)}</dt><dd>{connectedRecordValue(collection, key, value, snapshot)}</dd></div>)}</dl>{!studentMatricule && portal.perms.permissions.includes('student.view') && (() => { const enrId = selected.enrollment_id || (collection === 'enrollments' ? selected.id : undefined); const studId = selected.student_id || (enrId ? snapshot.tables.enrollments?.find(e => e.id === enrId)?.student_id : undefined); const mat = studId ? snapshot.tables.students?.find(s => s.id === studId)?.matricule : undefined; return mat ? <div className="btn-group"><Link className="btn btn-outline" href={`/etudiants/${encodeURIComponent(String(mat))}`}>Ouvrir le dossier étudiant ({String(mat)})</Link></div> : null; })()}</WorkPage>}
    </>}
    {!studentMatricule && nextPages.length > 0 && <details className="next-activity-panel"><summary>Étapes liées</summary><nav className="next-activities" aria-label="Activités liées">{nextPages.map(item => <Link key={item.id} href={item.href}>{item.name} →</Link>)}</nav></details>}
  </div>;
}
