'use client';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadAllHistoryRecords } from '@/services/historyService';
import { historyValue } from '@/services/historyDisplayService';
import type { HistoryRecord } from '@/types/history';
import WorkPage from '@/components/ui/WorkPage';
import HistoricalWorkspace from './HistoricalWorkspace';
import ExamRichText from './ExamRichText';

export default function ArchiveCommunications({ section }: { section: string }) {
  const { activeRole, history } = usePortal(); const [records, setRecords] = useState<{ table: string; record: HistoryRecord }[] | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState(''); const [view, setView] = useState('reading'); const [selected, setSelected] = useState<{ table: string; record: HistoryRecord } | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setRecords(null); setError('');
    if (history.catalog) void Promise.all(['blogs', 'urgent_infos'].map(async table => ({ table, page: await loadAllHistoryRecords(table, activeRole, { query: '', flagged: false }, controller.signal) }))).then(pages => { if (!controller.signal.aborted) setRecords(pages.flatMap(item => item.page.records.map(record => ({ table: item.table, record })))); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Publications indisponibles.'); });
    return () => controller.abort();
  }, [activeRole, history.catalog, retry]);
  if (error || history.error) return <section className="card" role="alert"><p>{error || history.error}</p><button className="btn btn-primary" onClick={() => { history.retry(); setRetry(value => value + 1); }}>Réessayer les publications</button></section>;
  if (!records || !history.catalog) return <p role="status">Chargement des publications…</p>;
  const rows = records.filter(({ record }) => [record.values.title, record.values.content, record.values.summary, record.values.author_name].some(value => String(value || '').toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))));
  return <div><nav className="record-sections" aria-label="Présentation des publications"><button className={view === 'reading' ? 'selected' : ''} aria-pressed={view === 'reading'} onClick={() => setView('reading')}>Lire les publications</button><button className={view === 'data' ? 'selected' : ''} aria-pressed={view === 'data'} onClick={() => setView('data')}>Pièces et détails des archives</button></nav>
    {view === 'data' ? <HistoricalWorkspace section={section} embedded /> : <><label className="form-group">Rechercher une publication<input type="search" className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Titre, contenu ou auteur" /></label><div className="publication-list">{rows.map(item => <article className="card" key={item.record.id}><span className="page-eyebrow">{item.table === 'urgent_infos' ? 'INFORMATION URGENTE' : 'PUBLICATION'}</span><h2>{String(item.record.values.title || 'Titre non renseigné')}</h2><p className="cell-sub">{item.record.values.publication_date ? String(item.record.values.publication_date) : item.record.values.published_at ? String(item.record.values.published_at) : 'Date de diffusion non renseignée'} · Archive conservée</p><p>{String(item.record.values.summary || item.record.values.content || '').replace(/<[^>]*>/g, ' ').slice(0, 200)}</p><button className="btn btn-outline" onClick={() => setSelected(item)}>Lire la publication</button></article>)}{!rows.length && <section className="card"><p>Aucune publication pour cette recherche. Les documents présents dans les autres collections restent accessibles dans « Pièces et détails des archives ».</p></section>}</div></>}
    {selected && <WorkPage title={String(selected.record.values.title || 'Publication archivée')} onClose={() => setSelected(null)}><ExamRichText value={selected.record.values.content || selected.record.values.summary || 'Contenu non renseigné'} /><dl className="record-details-grid">{Object.entries(selected.record.values).filter(([key]) => !['content', 'summary'].includes(key)).map(([key, value]) => <div key={key}><dt>{({ title: 'Titre', author_name: 'Auteur', status: 'État', publication_date: 'Date de publication', target_audience: 'Destinataires', is_published: 'Publié', published_at: 'Publié le', deleted_at: 'Retiré le' } as Record<string, string>)[key] || key.replace(/_/g, ' ')}</dt><dd>{historyValue(key, value, selected.record, history.catalog!)}</dd></div>)}</dl><p>Lecture d’une archive. Aucun message n’est envoyé et aucun état de publication n’est modifié.</p></WorkPage>}
  </div>;
}
