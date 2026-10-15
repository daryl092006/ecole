'use client';
import LoadingState from '@/components/ui/LoadingState';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Database, Download, Search, ChevronLeft, ChevronRight, FileText, AlertCircle } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { HISTORY_CRUD_TABLES } from '@/data/crudCatalog';
import { HISTORY_TABLES, HISTORY_DOMAINS } from '@/data/historyCatalog';
import { loadHistoryPage, loadHistoryDocument, loadAllHistoryRecords } from '@/services/historyService';
import { historyValue } from '@/services/historyDisplayService';
import type { HistoryPage, HistoryRecord } from '@/types/history';
import ExamCopies from './ExamCopies';
import DetailDrawer from '@/components/ui/DetailDrawer';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { downloadCsv } from '@/utils/csv';
import { studentPath, PORTAL_ROUTES } from '@/constants/portalRoutes';

export const HISTORY_SECTIONS: Record<string, string[]> = {
  student_parcours: ['etudiant_group'],
  student_finance: ['frais_etudiants', 'paiements', 'echeances'],
  student_notes: ['notes'],
  student_documents: ['documents', 'albums'],
  acad_program: ['filieres', 'matieres', 'unite_valeurs', 'uv_weightings'],
  acad_reference: ['annee_scolaires', 'niveaux', 'groups', 'filiere_group', 'periodes', 'niveau_periode', 'unite_enseignements', 'annee_filiere','salles'],
  acad_schedule: ['emploi_du_temps', 'seances', 'salles'], acad_attendance: ['seances'],
  acad_grades: ['notes'], acad_exams: ['evaluations', 'exam_parts', 'exam_questions', 'exam_question_options', 'exam_submissions'],
  acad_jury: ['releve_notes'], stud_status: ['etudiant_group'], stud_cards: ['documents', 'albums'],
  fin_kpis: ['frais_etudiants', 'paiements', 'echeances'], fin_payments: ['paiements', 'echeances', 'echeanciers'],
  fin_reports: ['paiements', 'frais_etudiants', 'echeances'], fin_contracts: ['frais_etudiants', 'frais_scolarites', 'frais_inscriptions', 'tranche_paiements', 'bourse_etudiants'],
  staff_teachers: ['user_unite_valeur', 'users'], staff_records: ['users'],
  espace_announcements: ['blogs', 'urgent_infos'], sys_support: ['support_categories'], espace_support: ['support_categories'],
  comm_news: ['blogs', 'urgent_infos', 'gallery_albums', 'gallery_photos', 'blog_comments'], comm_announcements: ['urgent_infos', 'blogs'],
  sys_logs: ['activity_log'], sys_backups: ['activity_log', 'notifications'], history_all: HISTORY_TABLES.map(spec => spec.table),
};
export default function HistoricalWorkspace({ section, studentId: suppliedStudentId, batchId: suppliedBatchId, initialTable, embedded = false, onResume }: { section: string; studentId?: string; batchId?: string; initialTable?: string; embedded?: boolean; onResume?: (table:string,record:HistoryRecord)=>void }) {
  const portal = usePortal(); const { history, activeRole } = portal;
  const contextual = ['acad_grades', 'acad_jury', 'stud_cards'].includes(section);
  const [dossier, setDossier] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const contextStudent = portal.students.find(student => student.matricule === dossier);
  const studentId = suppliedStudentId || contextStudent?.historical?.sourceId;
  const batchId = suppliedBatchId || contextStudent?.historical?.batchId;
  const needsDossier = contextual && !suppliedStudentId;
  const canLoad = !needsDossier || !!(studentId && batchId);
  const choices = HISTORY_SECTIONS[section] || ['etudiant_group', 'frais_etudiants', 'paiements', 'notes', 'documents'];
  const [domain, setDomain] = useState('all');
  const [table, setTable] = useState(initialTable && choices.includes(initialTable) ? initialTable : choices[0]);
  const [query, setQuery] = useState(''); const [search, setSearch] = useState(''); const [flagged, setFlagged] = useState(false); const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<HistoryPage | null>(null); const [error, setError] = useState(''); const [reload, setReload] = useState(0);
  const [fileError, setFileError] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [exporting, setExporting] = useState(false); const [exportMessage, setExportMessage] = useState(''); const [exportError, setExportError] = useState(''); const [exportScope, setExportScope] = useState('all');
  const exportController = useRef<AbortController | null>(null);
  useEffect(() => { exportController.current?.abort(); setExporting(false); setExportMessage(''); setExportError(''); return () => exportController.current?.abort(); }, [table, search, flagged, studentId, batchId]);
  const [selected, setSelected] = useState<HistoryRecord | null>(null);
  const config = HISTORY_TABLES.find(spec => spec.table === table)!;
  const pageTitle = studentId ? 'Historique du dossier' : section === 'history_all' ? 'Données et contrôle de reprise' : PORTAL_ROUTES.find(route => route.section === section)?.title || config.title;
  const catalog = history.catalog;
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(query); setOffset(0); }, 250); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => {
    const controller = new AbortController(); setPage(null); setError(''); setSelected(null);
    if (catalog && canLoad) void loadHistoryPage(table, activeRole, { offset, query: search, flagged, studentId, batchId }, controller.signal).then(value => { if (!controller.signal.aborted) setPage(value); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [table, activeRole, offset, search, flagged, studentId, batchId, catalog, reload, canLoad]);
  if (selected && table === 'evaluations') return <ExamCopies exam={selected} onBack={() => setSelected(null)} />;
  if (history.error) return <section className="card" role="alert"><h2>Les données n’ont pas pu être chargées</h2><p>{history.error}</p><button className="btn btn-primary" onClick={history.retry}>Réessayer</button></section>;
  if (!catalog) return <LoadingState label="Chargement des données enregistrées…" />;
  const year = portal.academicYearContext?.years.find(item => item.id === portal.academicYearContext?.selectedYearId);
  const contextPicker = needsDossier ? <section className="card card-full"><h2>{contextStudent ? 'Dossier consulté' : 'Choisir un dossier étudiant'}</h2>{contextStudent ? <><p><strong>{contextStudent.firstname} {contextStudent.lastname}</strong> · {contextStudent.matricule}</p><p className="cell-sub">{year?.name || 'Toutes les années'} · {contextStudent.filiere} · {contextStudent.niveau}</p><div className="btn-group"><button className="btn btn-outline" onClick={() => { setDossier(''); setPage(null); setSelected(null); setQuery(''); setSearch(''); setOffset(0); }}>Changer de dossier</button><Link className="btn btn-outline" href={studentPath(contextStudent.matricule)}>Ouvrir le dossier complet</Link></div>{!studentId && <p role="status">Aucune donnée reliée à ce dossier pour cette rubrique.</p>}</> : <><p>Consultez les {section === 'acad_grades' ? 'notes et leurs évaluations' : section === 'acad_jury' ? 'relevés et décisions' : 'pièces et documents'} d’un étudiant dans l’année consultée.</p><label className="form-group">Rechercher un dossier<input className="input" type="search" placeholder="Nom ou matricule" value={studentQuery} onChange={event => setStudentQuery(event.target.value)} /></label><div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr><th>Étudiant</th><th>Formation</th><th>Dossier</th></tr></thead><tbody>{portal.students.filter(student => `${student.firstname} ${student.lastname} ${student.matricule}`.toLocaleLowerCase('fr').includes(studentQuery.toLocaleLowerCase('fr'))).map(student => <tr key={student.matricule}><td>{student.firstname} {student.lastname}<div className="cell-sub">{student.matricule}</div></td><td>{student.filiere}<div className="cell-sub">{student.niveau}</div></td><td><button className="btn btn-outline" onClick={() => { setDossier(student.matricule); setPage(null); setOffset(0); setQuery(''); setSearch(''); setFlagged(false); }}>Consulter le dossier</button></td></tr>)}</tbody></ResponsiveTable></div>{!portal.students.length && <p>Aucun dossier étudiant dans le contexte consulté.</p>}</>}</section> : null;
  if (needsDossier && !canLoad) return <div className="historical-workspace"><div className="page-intro"><h1>{PORTAL_ROUTES.find(route => route.section === section)?.title || config.title}</h1></div>{contextPicker}</div>;
  const metadata = catalog.datasets.find(item => item.table === table);
  const columns = config.columns;
  const selectedStudent = selected && portal.students.find(student => student.historical?.sourceId === String(selected.values.etudiant_id) && student.historical?.batchId === selected.batchId);
  const exportRecords = () => {
    const controller = new AbortController(); exportController.current = controller; setExporting(true); setExportError(''); setExportMessage('');
    const request = exportScope === 'page' ? Promise.resolve(page!) : loadAllHistoryRecords(table, activeRole, { query: search, flagged, studentId, batchId }, controller.signal);
    void request.then(result => {
      if (controller.signal.aborted) return;
      downloadCsv(table + '-export.csv', columns.map(key => config.fields[key]), result.records.map(record => columns.map(key => historyValue(key, record.values[key], record, catalog))));
      setExportMessage(result.records.length + ' ligne(s) préparée(s) en CSV · ' + (exportScope === 'page' ? 'page affichée' : 'tous les résultats filtrés') + '. Le fichier reprend les données consultées ; aucune opération métier n’a été exécutée.');
    }).catch(cause => { if (!controller.signal.aborted) setExportError(cause instanceof Error ? cause.message : 'Export impossible.'); }).finally(() => { if (!controller.signal.aborted) setExporting(false); });
  };
  return <div className="historical-workspace">
    {contextPicker}
    {!embedded && <div className="page-intro"><div><span className="page-eyebrow">DOSSIERS ET DOCUMENTS</span>{studentId ? <h2>{pageTitle}</h2> : <h1>{pageTitle}</h1>}<p>Consultez les données et leurs pièces pour l’année sélectionnée.</p></div><span className="source-badge"><Database size={15} /> Données</span></div>}
    {section === 'history_all' ? <div className="history-collections"><label>Rubrique<select className="select-input" value={domain} onChange={event => { const next = event.target.value; setDomain(next); setTable(HISTORY_TABLES.find(spec => next === 'all' || spec.domain === next)!.table); setOffset(0); setQuery(''); }}><option value="all">Toutes les rubriques</option>{Object.entries(HISTORY_DOMAINS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Données à consulter<select className="select-input" value={table} onChange={event => { setTable(event.target.value); setOffset(0); setQuery(''); setFlagged(false); }}>{HISTORY_TABLES.filter(spec => domain === 'all' || spec.domain === domain).map(spec => <option key={spec.table} value={spec.table}>{spec.title} ({catalog.datasets.find(item => item.table === spec.table)?.count || 0})</option>)}</select></label></div> : studentId && choices.length > 1 ? <label className="workspace-picker">Consulter<select className="select-input" value={table} onChange={event => { setTable(event.target.value); setQuery(''); setSearch(''); setOffset(0); setFlagged(false); }}>{choices.map(value => <option key={value} value={value}>{HISTORY_TABLES.find(item => item.table === value)!.title}</option>)}</select></label> : choices.length>1 ? <div className="dataset-selector" aria-label="Collections disponibles">{choices.map(value => { const spec = HISTORY_TABLES.find(item => item.table === value)!; const count = catalog.datasets.find(item => item.table === value)?.count || 0; return <button key={value} className={value === table ? 'selected' : ''} aria-pressed={value === table} onClick={() => { setTable(value); setQuery(''); setSearch(''); setOffset(0); setFlagged(false); }}><span>{spec.title}</span>{!studentId && <strong>{count.toLocaleString('fr-FR')}</strong>}</button>; })}</div> : null}
    <div className="card card-full data-browser"><div className="browser-toolbar"><label className="browser-search"><Search size={17} /><input aria-label="Rechercher dans les données" placeholder="Rechercher un nom, une référence, un montant…" value={query} maxLength={160} onChange={event => setQuery(event.target.value)} /></label><label className="flagged-filter"><input type="checkbox" checked={flagged} onChange={event => { setFlagged(event.target.checked); setOffset(0); }} /> À vérifier{!studentId && ` (${metadata?.flagged || 0})`}</label><details className="export-options"><summary>Exporter</summary><label>Périmètre du fichier<select className="select-input" value={exportScope} onChange={event=>setExportScope(event.target.value)}><option value="all">Tous les résultats filtrés ({page?.total || 0})</option><option value="page">Cette page ({page?.records.length || 0})</option></select></label><p>Les colonnes correspondent à la liste affichée. Les filtres et le dossier sélectionné sont conservés.</p><button className="btn btn-outline" disabled={!page?.records.length || exporting} onClick={exportRecords}><Download size={15} /> {exporting ? 'Préparation…' : 'Télécharger le CSV'}</button></details></div>
      {exportMessage && <p className="info-box" role="status">{exportMessage}</p>}{exportError && <p className="restricted-box" role="alert">{exportError}</p>}{error ? <div role="alert" className="empty-state"><strong>Chargement impossible</strong><span>{error}</span><button className="btn btn-primary" onClick={() => setReload(value => value + 1)}>Réessayer</button></div> : !page ? <LoadingState label="Chargement des enregistrements…" /> : <>
        <div className="browser-result-count"><strong>{config.title}</strong> · {page.total.toLocaleString('fr-FR')} enregistrement(s){search ? ' correspondant à la recherche' : ''}</div>
        <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr>{columns.map(key => <th key={key}>{config.fields[key]}</th>)}<th>Contrôle</th><th>Détail</th></tr></thead><tbody>{page.records.map(record => <tr key={record.id}>{columns.map(key => <td key={key}><span className="record-value">{historyValue(key, record.values[key], record, catalog)}</span></td>)}<td>{record.issues.length || Object.values(record.files || {}).some(available => !available) ? <span className="pill pill-warning"><AlertCircle size={12} /> À vérifier</span> : <span className="cell-sub">—</span>}</td><td><button className="btn btn-sm btn-outline" onClick={() => { setSelected(record); setFileError(''); }}><FileText size={14} /> {table === 'evaluations' ? 'Voir les copies' : 'Voir'}</button>{onResume && HISTORY_CRUD_TABLES[table] && <button className="btn btn-sm btn-primary" onClick={()=>onResume(table,record)}>Reprendre pour modifier</button>}</td></tr>)}{!page.records.length && <tr><td colSpan={columns.length + 2}>Aucun enregistrement pour ces filtres.</td></tr>}</tbody></ResponsiveTable></div>
        {page.total > page.limit && <div className="browser-pagination"><span>{offset + 1}–{Math.min(offset + page.limit, page.total)} sur {page.total}</span><div className="btn-group"><button className="btn btn-outline" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - page.limit))}><ChevronLeft size={16} /> Précédent</button><button className="btn btn-outline" disabled={offset + page.limit >= page.total} onClick={() => setOffset(value => value + page.limit)}>Suivant <ChevronRight size={16} /></button></div></div>}
      </>}
    </div>
    {selected && <DetailDrawer title={`${config.title} · ${selectedStudent ? selectedStudent.firstname + ' ' + selectedStudent.lastname : 'Référence #' + selected.sourceId}`} onClose={() => setSelected(null)}>{selected.issues.length > 0 && <div className="review-notice"><AlertCircle size={18} /><div><strong>Ce dossier nécessite une vérification</strong><p>{selected.issues.join(' · ')}</p></div></div>}<dl className="record-details-grid">{Object.keys(selected.values).map(key => [key, config.fields[key] || key.replace(/_/g, ' ')]).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{historyValue(key, selected.values[key], selected, catalog)}{typeof selected.values[key] === 'string' && /\.(pdf|jpe?g|png)$/i.test(String(selected.values[key])) && (selected.files?.[key] === false ? <span className="missing-file-label">Fichier indisponible</span> : <button className="btn btn-sm btn-outline mt-2" disabled={fileLoading} onClick={() => { setFileLoading(true); setFileError(''); void loadHistoryDocument(selected.id, key, activeRole).then(url => { const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.click(); }).catch(cause => setFileError(cause instanceof Error ? cause.message : 'Téléchargement impossible.')).finally(() => setFileLoading(false)); }}><Download size={13} /> Télécharger la pièce</button>)}</dd></div>)}</dl>{fileError && <p role="alert">{fileError}</p>}{selectedStudent && <Link className="btn btn-primary" href={studentPath(selectedStudent.matricule)}>Ouvrir le dossier de {selectedStudent.firstname} {selectedStudent.lastname}</Link>}<p className="cell-sub">Les informations manquantes ou incohérentes sont signalées sur les éléments concernés.</p></DetailDrawer>}
  </div>;
}
