'use client';
import ListFilters from '@/components/ui/ListFilters';
import StudentDossierPicker from './StudentDossierPicker';
import StudentRecordDialog from './StudentRecordDialog';
import FinancialSituationPanel from './FinancialSituationPanel';
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
import ArchiveCommunications from './history/ArchiveCommunications';
import ArchiveFinanceWorkspace from './history/ArchiveFinanceWorkspace';
import GroupSubjectGradesPanel from './academic/GroupSubjectGradesPanel';
import TranscriptPrintAction from './academic/TranscriptPrintAction';

export default function ConnectedDomainWorkspace({ section, studentMatricule, onlyCollection }: { section: string; studentMatricule?: string; onlyCollection?: string }) {
  const portal = usePortal(); const base = DOMAIN_WORKSPACES[section]; const definition = onlyCollection ? { ...base, collections: base.collections.filter(item => item.table === onlyCollection) } : base; const snapshot = portal.relationalSnapshot;
  const hasArchives = portal.history.enabled && !!HISTORY_SECTIONS[section];
  const scheduleYearId = portal.academicYearContext?.selectedYearId || '';
  // Imported business records use the same tables as newly entered records.
  // An empty result must not silently switch to backup rows (or another year).
  const canonical = ['acad_schedule', 'acad_grades', 'fin_kpis', 'fin_payments', 'fin_reports', 'fin_contracts', 'stud_status', 'espace_finance', 'sys_support', 'espace_support', 'comm_news', 'comm_announcements', 'espace_announcements'].includes(section);
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
  const attendances = ids('attendances', 'enrollment_id', enrollments);
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
    if (['enrollment_groups', 'enrollment_events', 'financial_contracts', 'payments', 'scholarship_awards', 'attendances'].includes(collection)) return enrollments.has(row.enrollment_id);
    if (collection === 'absence_justifications') return attendances.has(row.attendance_id);
    if (['receipts', 'payment_reversals'].includes(collection)) return payments.has(row.payment_id);
    if (collection === 'installments') return versions.has(row.version_id);
    if (['student_documents', 'generated_documents'].includes(collection)) return row.student_id === nativeStudent.id;
    if (collection === 'grades') return candidates.has(row.candidate_id);
    if (collection === 'complaints') return candidates.has(row.candidate_id) || grades.has(row.grade_id);
    if (collection === 'grade_revisions') return grades.has(row.grade_id);
    if (collection === 'evaluation_transitions') return evaluations.has(row.evaluation_id);
    if (collection === 'jury_decisions') return decisions.has(row.id);
    if (collection === 'juries') return juries.has(row.id);
    return false;
  };
  const collections = contextual ? definition.collections.filter(item => !['document_types', 'document_requirements', 'teacher_attendances'].includes(item.table)) : definition.collections;
  const originalConfig = definition.collections.find(item => item.table === collection);
  const config = originalConfig && collection === 'receipts' ? { ...originalConfig, columns: [...originalConfig.columns, 'status'] } : originalConfig;
  const dateKey = ({ payments: 'paid_on', installments: 'due_on', financial_contracts: 'created_at', receipts: 'issued_at', payment_reversals: 'reversed_at' } as Record<string, string>)[collection];
  const title = PORTAL_ROUTES.find(route => route.section === section)?.title || 'Consultation';
  const scheduleGroups = [...new Map((snapshot.tables.sessions || []).filter(row => row.group_id).map(row => [String(row.group_id), { id: String(row.group_id), label: connectedRecordValue('sessions', 'group_id', row.group_id, snapshot) }])).values()];
  const scheduleGroupId = scheduleGroupSelection.yearId === scheduleYearId && scheduleGroups.some(group => group.id === scheduleGroupSelection.groupId) ? scheduleGroupSelection.groupId : '';
  const collectionRows = (snapshot.tables[collection] || []).map(row => collection === 'receipts' ? { ...row, status: receiptStatus(snapshot, row.payment_id) } : row)
    .filter(row => (!contextual || inDossier(row)) && (section !== 'acad_schedule' || collection !== 'sessions' || !scheduleGroupId || row.group_id === scheduleGroupId));
  const rows = collectionRows.filter(row => (!dateKey || ((!start || String(row[dateKey] || '').slice(0, 10) >= start) && (!end || (!!row[dateKey] && String(row[dateKey]).slice(0, 10) <= end))))
    && Object.entries(row).some(([key, value]) => connectedRecordValue(collection, key, value, snapshot).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))));
  const showExport = rows.length > 0 && (section === 'fin_reports' || rows.length > 25);
  const canOpenFinancialDossier = !studentMatricule && portal.perms.permissions.includes('payment.record') && portal.perms.permissions.includes('student.view') && ['fin_payments', 'fin_contracts'].includes(section);
  const page = rows.slice(offset, offset + 10);
  if (['espace_documents', 'espace_finance'].includes(section) && !portal.perms.scope.ownDataOnly) return (
    <section className="card card-full staff-redirect-card">
      <div className="staff-redirect-header">
        <span className="pill pill-default">Espace personnel étudiant</span>
        <h1>{title}</h1>
        <p className="staff-redirect-desc">
          Cette rubrique est réservée aux étudiants pour consulter leurs documents et quittances scolaires personnelles.
          En tant que <strong>{portal.activeRole}</strong>, accédez directement aux modules de gestion de l’établissement :
        </p>
      </div>
      <nav className="staff-redirect-grid" aria-label="Accès de gestion">
        {portal.availableTabs.flatMap(tab => tab.subTabs || []).filter(item => ['staff_records', 'stud_cards', 'fin_kpis', 'fin_payments'].includes(item.id)).map(item => (
          <Link key={item.id} href={item.href} className="staff-redirect-link-card">
            <span className="staff-redirect-link-title">{item.name}</span>
            <span className="staff-redirect-link-arrow">Accéder →</span>
          </Link>
        ))}
      </nav>
    </section>
  );
  const selectDossier = (matricule: string) => { setDossier(matricule); setSelected(null); setQuery(''); setOffset(0); setExported(false); };
  const dossierPicker = contextual && !studentMatricule ? student ? (
    <section className="card card-full dossier-active-card">
      <div className="dossier-active-inner">
        <div>

          <h2>Dossier consulté : {student.firstname} {student.lastname}</h2>
          <p className="cell-sub">Matricule : <strong>{student.matricule}</strong> · {student.filiere} · {student.niveau}</p>
        </div>
        <div className="btn-group">
          {portal.perms.permissions.includes('student.view') && (
            <Link className="btn btn-primary" href={`/etudiants/${encodeURIComponent(student.matricule)}`}>
              Accéder au dossier complet →
            </Link>
          )}
          <button className="btn btn-outline" onClick={() => selectDossier('')}>
            Changer de dossier
          </button>
        </div>
      </div>
    </section>
  ) : <StudentDossierPicker students={portal.students} onSelect={selectDossier} /> : null;
  if (contextual && !student && !studentMatricule) return <div className="domain-workspace"><div className="page-intro"><div><h1>{title}</h1></div></div>{section === 'acad_grades' && <GroupSubjectGradesPanel snapshot={snapshot} canViewStudents={portal.perms.permissions.includes('student.view')} onSelectStudent={selectDossier} />}{section === 'acad_jury' && <section className="card card-full mb-2"><div className="card-header"><div><h2>Jurys enregistrés ({(snapshot.tables.juries || []).length})</h2><p className="cell-sub">{definition.availability}</p></div><span className="pill pill-default">{(snapshot.tables.jury_decisions || []).length} décision(s) · {(snapshot.tables.generated_documents || []).length} document(s)</span></div>{(snapshot.tables.juries || []).length > 0 ? <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr><th>Semestre</th><th>Tenue le</th><th>Décisions</th><th>Procès-verbal</th></tr></thead><tbody>{(snapshot.tables.juries || []).map(jury => <tr key={jury.id}><td><strong>{connectedRecordValue('juries', 'offering_semester_id', jury.offering_semester_id, snapshot)}</strong></td><td>{connectedRecordValue('juries', 'held_at', jury.held_at, snapshot)}</td><td>{(snapshot.tables.jury_decisions || []).filter(d => d.jury_id === jury.id).length}</td><td>{String(jury.minutes || '—')}</td></tr>)}</tbody></ResponsiveTable></div> : <p className="cell-sub">Aucun jury enregistré pour l’année consultée. Sélectionnez un dossier étudiant ci-dessous pour consulter ses décisions ou relevés.</p>}</section>}{dossierPicker}</div>;
  return <div className="domain-workspace">{!studentMatricule && <div className="page-intro"><div><h1>{title}</h1></div>{canOpenFinancialDossier && <button className="btn btn-primary" onClick={() => setPaymentPicker(true)}>{section === 'fin_contracts' ? 'Gérer un contrat' : 'Enregistrer un paiement'}</button>}</div>}
    {dossierPicker}


    {paymentPicker && <WorkPage title={section === 'fin_contracts' ? 'Choisir le dossier pour gérer le contrat' : 'Choisir le dossier pour encaisser'} onClose={() => setPaymentPicker(false)}><StudentDossierPicker students={portal.students} onSelect={matricule => { setPaymentPicker(false); setPaymentDossier(matricule); }} /></WorkPage>}
    {paymentDossier && <StudentRecordDialog initialSection="finance" matricule={paymentDossier} onClose={() => setPaymentDossier('')} />}
    {section === 'acad_jury' && <p className="cell-sub">{definition.availability}</p>}
    {source === 'archives' && hasArchives && !studentMatricule ? section.startsWith('fin_') ? <ArchiveFinanceWorkspace section={section} /> : ['comm_news', 'comm_announcements', 'espace_announcements'].includes(section) ? <ArchiveCommunications section={section} /> : contextual && !student?.historical ? <section className="card"><p>Aucune donnée reliée à ce dossier pour cette rubrique.</p></section> : <HistoricalWorkspace key={`${section}:${dossier}`} section={section} studentId={contextual ? student?.historical?.sourceId : undefined} batchId={contextual ? student?.historical?.batchId : undefined} embedded /> : <>
      {studentMatricule && collections.length > 1 ? <label className="workspace-picker">Consulter<select className="select-input" value={collection} onChange={event => { setCollection(event.target.value); setStart(''); setEnd(''); setQuery(''); setOffset(0); setExported(false); }}>{collections.map(item => <option key={item.table} value={item.table}>{item.title}</option>)}</select></label> : collections.length > 1 && <nav className="record-sections" aria-label="Données disponibles">{collections.map(item => <button key={item.table} aria-pressed={collection === item.table} className={collection === item.table ? 'selected' : ''} onClick={() => { setCollection(item.table); setStart(''); setEnd(''); setQuery(''); setOffset(0); setExported(false); }}>{item.title} {!contextual && ` (${snapshot.tables[item.table]?.length ?? 0})`}</button>)}{section === 'fin_reports' && !studentMatricule && <button type="button" aria-pressed={collection === '__situation__'} className={collection === '__situation__' ? 'selected' : ''} onClick={() => { setCollection('__situation__'); setStart(''); setEnd(''); setQuery(''); setOffset(0); setExported(false); }}>Situation & retards par étudiant ({portal.students.length})</button>}</nav>}
      {collection === '__situation__' && section === 'fin_reports' ? <FinancialSituationPanel students={portal.students} role={portal.activeRole} canViewStudents={portal.perms.permissions.includes('student.view')} /> : config && collection === 'sessions' && section === 'acad_schedule' ? <><section className="card"><ScheduleGroupFilter groups={scheduleGroups} value={scheduleGroupId} onChange={groupId => setScheduleGroupSelection({ yearId: scheduleYearId, groupId })} count={rows.length} /></section><ScheduleCalendar period={portal.academicYearContext?.years.find(year => year.id === portal.academicYearContext?.selectedYearId)} sessions={rows.map(row => ({ id: row.id, start: String(row.starts_at || ''), end: String(row.ends_at || ''), title: connectedRecordName('sessions', row, snapshot), subtitle: [connectedRecordValue('sessions', 'group_id', row.group_id, snapshot), connectedRecordValue('sessions', 'teacher_id', row.replacement_teacher_id || row.teacher_id, snapshot), connectedRecordValue('sessions', 'room_id', row.actual_room_id || row.room_id, snapshot), row.status ? String(row.status) : ''].filter(Boolean).join(' · ') }))} onSelect={id => setSelected(rows.find(row => row.id === id) || null)} /></> : config ? <section className="card card-full"><div className="browser-toolbar"><ListFilters count={collectionRows.length} active={Boolean(query)}><label className="form-group">{dateKey ? 'Rechercher un étudiant ou une référence' : `Rechercher dans ${config.title.toLocaleLowerCase('fr')}`}<input className="input" type="search" value={query} onChange={event => { setQuery(event.target.value); setOffset(0); setExported(false); }} placeholder="Nom, référence ou valeur" /></label></ListFilters>{showExport && <button className="btn btn-outline" onClick={() => { downloadCsv(collection + '-resultats.csv', config.columns.map(connectedFieldLabel), rows.map(row => config.columns.map(key => connectedRecordValue(collection, key, row[key], snapshot)))); setExported(true); }}>Exporter les {rows.length} résultat(s)</button>}</div>
        {dateKey && (section === 'fin_reports' || collectionRows.length > 1 || start || end) && <section className="workspace-filter-panel" aria-label="Filtrer par période"><div className="planning-filters"><label className="form-group">{collection === 'payments' ? 'Versement à partir du' : collection === 'installments' ? 'Échéance à partir du' : 'Enregistrement à partir du'}<input className="input" type="date" value={start} onChange={event => { setStart(event.target.value); setOffset(0); setExported(false); }} /></label><label className="form-group">Jusqu’au<input className="input" type="date" min={start || undefined} value={end} onChange={event => { setEnd(event.target.value); setOffset(0); setExported(false); }} /></label></div></section>}
        {(query || start || end) && <button className="btn btn-outline" onClick={() => { setQuery(''); setStart(''); setEnd(''); setOffset(0); setExported(false); }}>Effacer les filtres</button>}
        {exported && <p role="status">{rows.length} ligne(s) exportée(s) avec succès.</p>}
        <div className="table-wrap"><ResponsiveTable pageSize={0} className="data-table"><thead><tr>{config.columns.map(key => <th key={key}>{connectedFieldLabel(key)}</th>)}<th>Détail</th></tr></thead><tbody>{page.map(row => <tr key={row.id}>{config.columns.map(key => <td key={key}>{connectedRecordValue(collection, key, row[key], snapshot)}</td>)}<td><IconButton className="btn btn-outline" onClick={() => setSelected(row)} label="Ouvrir le détail" /></td></tr>)}{!page.length && <tr><td colSpan={config.columns.length + 1}>{query ? 'Aucun résultat pour cette recherche.' : 'Aucune donnée pour l’année consultée.'}</td></tr>}</tbody></ResponsiveTable></div>
        {rows.length > 10 && <div className="browser-pagination"><span>{offset + 1}–{Math.min(offset + 10, rows.length)} sur {rows.length}</span><div className="btn-group"><IconButton className="btn btn-outline" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 10))} label="Précédent" /><IconButton className="btn btn-outline" disabled={offset + 10 >= rows.length} onClick={() => setOffset(value => value + 10)} label="Suivant" /></div></div>}
      </section> : <section className="card"><p>{definition.availability}</p></section>}
      {selected && <WorkPage title={connectedRecordName(collection, selected, snapshot)} onClose={() => setSelected(null)}>{collection === 'generated_documents' && selected.kind === 'RELEVE' && <TranscriptPrintAction key={selected.id} document={selected} />}<dl className="record-details-grid">{Object.entries(selected).filter(([key]) => [...(config?.columns || []), 'reference', 'reason', 'comment', 'description', 'content'].includes(key)).map(([key, value]) => <div key={key}><dt>{connectedFieldLabel(key)}</dt><dd>{connectedRecordValue(collection, key, value, snapshot)}</dd></div>)}</dl>{!studentMatricule && portal.perms.permissions.includes('student.view') && (() => { const paymentRow = selected.payment_id ? snapshot.tables.payments?.find(p => p.id === selected.payment_id) : undefined; const versionRow = selected.version_id ? snapshot.tables.contract_versions?.find(v => v.id === selected.version_id) : undefined; const contractRow = (selected.contract_id || versionRow?.contract_id) ? snapshot.tables.financial_contracts?.find(c => c.id === (selected.contract_id || versionRow?.contract_id)) : undefined; const enrId = selected.enrollment_id || paymentRow?.enrollment_id || contractRow?.enrollment_id || (collection === 'enrollments' ? selected.id : undefined); const studId = selected.student_id || (enrId ? snapshot.tables.enrollments?.find(e => e.id === enrId)?.student_id : undefined); const mat = studId ? snapshot.tables.students?.find(s => s.id === studId)?.matricule : undefined; return mat ? <div className="btn-group">{canOpenFinancialDossier && <button type="button" className="btn btn-primary" onClick={() => { setSelected(null); setPaymentDossier(String(mat)); }}>{section === 'fin_contracts' ? 'Gérer le contrat' : 'Gérer les versements'}</button>}<Link className="btn btn-outline" href={`/etudiants/${encodeURIComponent(String(mat))}`}>Ouvrir le dossier étudiant ({String(mat)})</Link></div> : null; })()}</WorkPage>}
    </>}

  </div>;
}
