'use client';
import { useEffect, useState } from 'react';
import { Database, Download, Search, ChevronLeft, ChevronRight, FileText, AlertCircle } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { HISTORY_CRUD_TABLES } from '@/data/crudCatalog';
import { HISTORY_TABLES, HISTORY_DOMAINS } from '@/data/historyCatalog';
import { loadHistoryPage, loadHistoryDocument } from '@/services/historyService';
import { historyValue } from '@/services/historyDisplayService';
import type { HistoryPage, HistoryRecord } from '@/types/history';
import ExamCopies from './ExamCopies';
import WorkPage from '@/components/ui/WorkPage';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { downloadCsv } from '@/utils/csv';

export const HISTORY_SECTIONS: Record<string, string[]> = {
  acad_program: ['filieres', 'matieres', 'unite_valeurs', 'uv_weightings'],
  acad_reference: ['annee_scolaires', 'niveaux', 'groups', 'filiere_group', 'periodes', 'niveau_periode', 'unite_enseignements', 'annee_filiere','salles'],
  acad_schedule: ['emploi_du_temps', 'seances', 'salles'], acad_attendance: ['seances'],
  acad_grades: ['notes'], acad_exams: ['evaluations', 'exam_parts', 'exam_questions', 'exam_question_options', 'exam_submissions'],
  acad_jury: ['releve_notes'], stud_status: ['etudiant_group'], stud_cards: ['documents', 'albums', 'document_types', 'document_requirements'],
  fin_kpis: ['frais_etudiants', 'paiements', 'echeances'], fin_payments: ['paiements', 'echeances', 'echeanciers'],
  fin_reports: ['paiements', 'frais_etudiants', 'echeances'], fin_contracts: ['frais_etudiants', 'frais_scolarites', 'frais_inscriptions', 'tranche_paiements', 'bourse_etudiants'],
  staff_teachers: ['user_unite_valeur', 'users'], staff_records: ['users'],
  espace_announcements: ['blogs', 'urgent_infos'], sys_support: ['support_categories'], espace_support: ['support_categories'],
  comm_news: ['blogs', 'urgent_infos', 'gallery_albums', 'gallery_photos', 'blog_comments'], comm_announcements: ['urgent_infos', 'blogs'],
  sys_logs: ['activity_log'], sys_backups: ['activity_log', 'notifications'], history_all: HISTORY_TABLES.map(spec => spec.table),
};
export default function HistoricalWorkspace({ section, studentId, batchId, onResume }: { section: string; studentId?: string; batchId?: string; onResume?: (table:string,record:HistoryRecord)=>void }) {
  const { history, activeRole } = usePortal();
  const choices = HISTORY_SECTIONS[section] || ['etudiant_group', 'frais_etudiants', 'paiements', 'notes', 'documents'];
  const [domain, setDomain] = useState('all');
  const [table, setTable] = useState(choices[0]);
  const [query, setQuery] = useState(''); const [search, setSearch] = useState(''); const [flagged, setFlagged] = useState(false); const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<HistoryPage | null>(null); const [error, setError] = useState(''); const [reload, setReload] = useState(0);
  const [fileError, setFileError] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [selected, setSelected] = useState<HistoryRecord | null>(null);
  const config = HISTORY_TABLES.find(spec => spec.table === table)!;
  const catalog = history.catalog;
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(query); setOffset(0); }, 250); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => {
    const controller = new AbortController(); setPage(null); setError(''); setSelected(null);
    if (catalog) void loadHistoryPage(table, activeRole, { offset, query: search, flagged, studentId, batchId }, controller.signal).then(value => { if (!controller.signal.aborted) setPage(value); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [table, activeRole, offset, search, flagged, studentId, batchId, catalog, reload]);
  if (selected && table === 'evaluations') return <ExamCopies exam={selected} onBack={() => setSelected(null)} />;
  if (history.error) return <section className="card" role="alert"><h2>Les données historiques n’ont pas pu être chargées</h2><p>{history.error}</p><button className="btn btn-primary" onClick={history.retry}>Réessayer</button></section>;
  if (!catalog) return <section className="card" role="status">Chargement des données enregistrées…</section>;
  const metadata = catalog.datasets.find(item => item.table === table);
  const columns = config.columns;
  return <div className="historical-workspace">
    <div className="page-intro"><div><span className="page-eyebrow">DONNÉES DE L’ÉTABLISSEMENT</span><h1>{studentId ? 'Historique du dossier' : config.title}</h1><p>Enregistrements conservés de l’ancienne plateforme. Les anomalies restent signalées.</p></div><span className="source-badge"><Database size={15} /> Données réelles</span></div>
    {section === 'history_all' ? <div className="history-collections"><label>Rubrique<select className="select-input" value={domain} onChange={event => { const next = event.target.value; setDomain(next); setTable(HISTORY_TABLES.find(spec => next === 'all' || spec.domain === next)!.table); setOffset(0); setQuery(''); }}><option value="all">Toutes les rubriques</option>{Object.entries(HISTORY_DOMAINS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Données à consulter<select className="select-input" value={table} onChange={event => { setTable(event.target.value); setOffset(0); setQuery(''); setFlagged(false); }}>{HISTORY_TABLES.filter(spec => domain === 'all' || spec.domain === domain).map(spec => <option key={spec.table} value={spec.table}>{spec.title} ({catalog.datasets.find(item => item.table === spec.table)?.count || 0})</option>)}</select></label></div> : choices.length>1 ? <div className="dataset-selector" aria-label="Collections disponibles">{choices.map(value => { const spec = HISTORY_TABLES.find(item => item.table === value)!; const count = catalog.datasets.find(item => item.table === value)?.count || 0; return <button key={value} className={value === table ? 'selected' : ''} aria-pressed={value === table} onClick={() => { setTable(value); setQuery(''); setSearch(''); setOffset(0); setFlagged(false); }}><span>{spec.title}</span><strong>{count.toLocaleString('fr-FR')}</strong></button>; })}</div> : null}
    <div className="card card-full data-browser"><div className="browser-toolbar"><label className="browser-search"><Search size={17} /><input aria-label="Rechercher dans les données" placeholder="Rechercher un nom, une référence, un montant…" value={query} maxLength={160} onChange={event => setQuery(event.target.value)} /></label><label className="flagged-filter"><input type="checkbox" checked={flagged} onChange={event => { setFlagged(event.target.checked); setOffset(0); }} /> À vérifier ({metadata?.flagged || 0})</label><button className="btn btn-outline" disabled={!page?.records.length} onClick={() => downloadCsv(`${table}-page.csv`, columns.map(key => config.fields[key]), page!.records.map(record => columns.map(key => historyValue(key, record.values[key], record, catalog))))}><Download size={15} /> Exporter cette page</button></div>
      {error ? <div role="alert" className="empty-state"><strong>Chargement impossible</strong><span>{error}</span><button className="btn btn-primary" onClick={() => setReload(value => value + 1)}>Réessayer</button></div> : !page ? <div className="empty-state" role="status">Chargement des enregistrements…</div> : <>
        <div className="browser-result-count">{page.total.toLocaleString('fr-FR')} enregistrement(s){search ? ' correspondant à la recherche' : ''}</div>
        <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr>{columns.map(key => <th key={key}>{config.fields[key]}</th>)}<th>Contrôle</th><th>Détail</th></tr></thead><tbody>{page.records.map(record => <tr key={record.id}>{columns.map(key => <td key={key}><span className="record-value">{historyValue(key, record.values[key], record, catalog)}</span></td>)}<td>{record.issues.length || Object.values(record.files || {}).some(available => !available) ? <span className="pill pill-warning"><AlertCircle size={12} /> À vérifier</span> : <span className="cell-sub">Conservé</span>}</td><td><button className="btn btn-sm btn-outline" onClick={() => { setSelected(record); setFileError(''); }}><FileText size={14} /> {table === 'evaluations' ? 'Voir les copies' : 'Voir'}</button>{onResume && HISTORY_CRUD_TABLES[table] && <button className="btn btn-sm btn-primary" onClick={()=>onResume(table,record)}>Reprendre pour modifier</button>}</td></tr>)}{!page.records.length && <tr><td colSpan={columns.length + 2}>Aucun enregistrement pour ces filtres.</td></tr>}</tbody></ResponsiveTable></div>
        <div className="browser-pagination"><span>{page.total ? `${offset + 1}–${Math.min(offset + page.limit, page.total)} sur ${page.total}` : '0 résultat'}</span><div className="btn-group"><button className="btn btn-outline" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - page.limit))}><ChevronLeft size={16} /> Précédent</button><button className="btn btn-outline" disabled={offset + page.limit >= page.total} onClick={() => setOffset(value => value + page.limit)}>Suivant <ChevronRight size={16} /></button></div></div>
      </>}
    </div>
    {selected && <WorkPage title={`Enregistrement #${selected.sourceId}`} onClose={() => setSelected(null)}>{selected.issues.length > 0 && <div className="review-notice"><AlertCircle size={18} /><div><strong>Ce dossier nécessite une vérification</strong><p>{selected.issues.join(' · ')}</p></div></div>}<dl className="record-details-grid">{Object.entries(config.fields).filter(([key]) => key in selected.values).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{historyValue(key, selected.values[key], selected, catalog)}{typeof selected.values[key] === 'string' && /\.(pdf|jpe?g|png)$/i.test(String(selected.values[key])) && (selected.files?.[key] === false ? <span className="missing-file-label">Fichier non retrouvé dans les sauvegardes</span> : <button className="btn btn-sm btn-outline mt-2" disabled={fileLoading} onClick={() => { setFileLoading(true); setFileError(''); void loadHistoryDocument(selected.id, key, activeRole).then(url => { const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.click(); }).catch(cause => setFileError(cause instanceof Error ? cause.message : 'Téléchargement impossible.')).finally(() => setFileLoading(false)); }}><Download size={13} /> Télécharger la pièce</button>)}</dd></div>)}</dl>{fileError && <p role="alert">{fileError}</p>}<p className="cell-sub">Les valeurs originales sont conservées. Aucune donnée manquante n’a été remplacée par une valeur supposée.</p></WorkPage>}
  </div>;
}
