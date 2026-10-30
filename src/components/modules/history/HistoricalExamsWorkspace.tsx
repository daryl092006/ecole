'use client';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadAllHistoricalAssessments } from '@/services/historyService';
import { historyValue } from '@/services/historyDisplayService';
import type { HistoryPage, HistoryRecord } from '@/types/history';
import Link from 'next/link';
import { assessmentCategory, assessmentProgress, ASSESSMENT_LABELS, type AssessmentCategory } from '@/services/assessmentDisplayService';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import ExamCopies from './ExamCopies';
export default function HistoricalExamsWorkspace({category='exam'}:{category?:AssessmentCategory}) {
  const { activeRole, history, perms } = usePortal();
  const [page, setPage] = useState<HistoryPage | null>(null); const [offset, setOffset] = useState(0);
  const [error, setError] = useState(''); const [retry, setRetry] = useState(0); const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [archived,setArchived]=useState(false);
  const [selected, setSelected] = useState<HistoryRecord | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setPage(null); setError(''); setSelected(null);
    if (history.catalog) void loadAllHistoricalAssessments(activeRole,controller.signal).then(result => { if (!controller.signal.aborted) {setPage(result);const id=new URL(window.location.href).searchParams.get('epreuve');const record=result.records.find(row=>row.id===id && assessmentCategory(row)===category);if(record)setSelected(record);} }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [activeRole, history.catalog, offset, retry, category]);
  useEffect(() => { if (selected) { window.scrollTo({ top: 0 }); document.getElementById('exam-workspace-title')?.focus(); } }, [selected]);
  if (selected) return <div id="exam-workspace-title" tabIndex={-1}><ExamCopies exam={selected} backLabel={category==='resit'?'Tous les rattrapages':category==='control'?'Tous les contrôles':'Tous les examens'} onBack={() => { const id = selected.id; setSelected(null); requestAnimationFrame(() => document.getElementById(`exam-${id}`)?.focus()); }} /></div>;
  const catalog = history.catalog;
  const classified=page?.records.filter(exam=>assessmentCategory(exam)===category && Boolean(exam.values.deleted_at)===archived) || [];
  const rows = classified.filter(exam => (!statusFilter || assessmentProgress(exam.values) === statusFilter) && `${historyValue('unite_valeur_id',exam.values.unite_valeur_id,exam,catalog!)} ${historyValue('group_id',exam.values.group_id,exam,catalog!)} ${exam.values.date || ''} ${exam.values.type || ''}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))) || [];
  const formatSlotTime = (value: unknown, examDate: unknown) => {
    const text = String(value || '').trim();
    if (!text) return '';
    const match = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?$/);
    if (match) return (!examDate || match[1] === String(examDate).slice(0, 10)) ? match[2] : `${match[1]} ${match[2]}`;
    return text.replace(/^(\d{2}:\d{2}):\d{2}$/, '$1');
  };
  return <div><div className="page-intro"><div><h1>{ASSESSMENT_LABELS[category]}</h1><p>{category==='control'?'Devoirs, interrogations, travaux pratiques et projets.':category==='resit'?'Épreuves de seconde session, distinctes des examens initiaux.':'Épreuves de session normale.'}</p></div></div>
    {history.error || error ? <section className="card" role="alert"><p>{history.error || error}</p><IconButton className="btn btn-outline" onClick={() => { history.retry(); setRetry(value => value+1); }} label="Réessayer" /></section> : !page ? <LoadingState label="Chargement des épreuves…" /> : <section className="card card-full"><div className="card-header"><h2>{classified.length} épreuve(s)</h2></div><label className="checkbox-field"><input type="checkbox" checked={archived} onChange={event=>{setArchived(event.target.checked);setStatusFilter('');}} /> Épreuves retirées</label><label className="form-group">Rechercher une épreuve<input className="input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Matière, groupe ou date" /></label><label className="form-group">État de l’épreuve<select className="select-input" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Tous les états</option>{[...new Set(classified.map(exam => assessmentProgress(exam.values)))].sort().map(status => <option key={status}>{status}</option>)}</select></label><ResponsiveTable pageSize={0} className="data-table"><thead><tr><th>Épreuve</th><th>Groupe</th><th>Date et horaire</th><th>Format</th><th>État de l’épreuve</th><th>Actions</th></tr></thead><tbody>{rows.map(exam => <tr key={exam.id}><td><strong>{historyValue('unite_valeur_id',exam.values.unite_valeur_id,exam,catalog!)}</strong><div className="cell-sub">{String(exam.values.type || 'Évaluation')}</div>{category==='resit' && <div className="cell-sub">{exam.values.parent_id ? 'Épreuve initiale référencée' : 'Épreuve initiale non renseignée'}</div>}</td><td>{historyValue('group_id',exam.values.group_id,exam,catalog!)}</td><td>{String(exam.values.date || 'Non renseignée')}<div className="cell-sub">{[exam.values.debut,exam.values.fin].map(v => formatSlotTime(v, exam.values.date)).filter(Boolean).join(' – ')}</div></td><td>{exam.values.is_online == null ? 'Non renseigné' : ['1',1,true].includes(exam.values.is_online as string | number | boolean) ? 'En ligne' : 'Papier'}</td><td>{assessmentProgress(exam.values)}</td><td><div className="btn-group">{perms.permissions.includes('evaluation.create') && <Link className="btn btn-outline" href={`/academique/sujets?nouveau=1&source=${encodeURIComponent(exam.id)}&nature=${category}`}>Composer le sujet</Link>}<IconButton id={`exam-${exam.id}`} className="btn btn-outline" onClick={() => setSelected(exam)} label="Voir les copies" /></div></td></tr>)}{!rows.length && <tr><td colSpan={6}>Aucune épreuve pour cette recherche.</td></tr>}</tbody></ResponsiveTable>{page.total > page.limit && <div className="browser-pagination"><span>{offset+1}–{Math.min(offset+page.limit,page.total)} sur {page.total}</span><div className="btn-group"><IconButton className="btn btn-outline" disabled={!offset} onClick={() => setOffset(value => Math.max(0,value-page.limit))} label="Précédent" /><IconButton className="btn btn-outline" disabled={offset+page.limit >= page.total} onClick={() => setOffset(value => value+page.limit)} label="Suivant" /></div></div>}</section>}
  </div>;
}
