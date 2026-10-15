'use client';
import ScheduleCalendar from '@/components/ui/ScheduleCalendar';
import LoadingState from '@/components/ui/LoadingState';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadAllHistoryRecords } from '@/services/historyService';
import { historyValue } from '@/services/historyDisplayService';
import { HISTORY_TABLES } from '@/data/historyCatalog';
import type { HistoryRecord } from '@/types/history';
import WorkPage from '@/components/ui/WorkPage';
import HistoricalWorkspace from './HistoricalWorkspace';

export default function ArchiveSchedule() {
  const { activeRole, history, availableTabs, academicYearContext } = usePortal();
  const [records, setRecords] = useState<HistoryRecord[] | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const [view, setView] = useState('agenda'); const [query, setQuery] = useState(''); const [group, setGroup] = useState(''); const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [selected, setSelected] = useState<HistoryRecord | null>(null);
  const catalog = history.catalog;
  useEffect(() => {
    const controller = new AbortController(); setRecords(null); setError('');
    if (catalog) void loadAllHistoryRecords('emploi_du_temps', activeRole, { query: '', flagged: false }, controller.signal).then(result => { if (!controller.signal.aborted) setRecords(result.records); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Planning indisponible.'); });
    return () => controller.abort();
  }, [activeRole, catalog, retry]);
  if (history.error || error) return <section className="card" role="alert"><p>{history.error || error}</p><button className="btn btn-primary" onClick={() => { history.retry(); setRetry(value => value + 1); }}>Réessayer le planning</button></section>;
  if (!catalog || !records) return <LoadingState label="Chargement du planning…" />;
  const value = (row: HistoryRecord, key: string) => historyValue(key, row.values[key], row, catalog);
  const day = (row: HistoryRecord) => /^\d{4}-\d{2}-\d{2}/.test(String(row.values.debut)) ? String(row.values.debut).slice(0, 10) : '';
  const groups = [...new Map(records.filter(row => row.values.group_id != null).map(row => [row.batchId + ':' + row.values.group_id, value(row, 'group_id')])).entries()];
  const rows = records.filter(row => (!group || row.batchId + ':' + row.values.group_id === group) && (!start || day(row) >= start) && (!end || !!day(row) && day(row) <= end) && ['uv_id', 'group_id', 'salle_id', 'debut', 'details'].some(key => value(row, key).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')))).sort((a, b) => String(a.values.debut || '').localeCompare(String(b.values.debut || '')));

  return <div><nav className="record-sections" aria-label="Présentation du planning"><button className={view === 'agenda' ? 'selected' : ''} aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}>Calendrier</button><button className={view === 'data' ? 'selected' : ''} aria-pressed={view === 'data'} onClick={() => setView('data')}>Liste, séances réalisées et salles</button></nav>
    {view === 'data' ? <HistoricalWorkspace section="acad_schedule" embedded /> : <><section className="card"><div className="planning-search"><label className="form-group">Rechercher une séance<input className="input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Matière, groupe, salle…" /></label></div><details className="advanced-record-filters"><summary>Filtrer par groupe et période</summary><div className="planning-filters"><label className="form-group">Groupe<select className="select-input" value={group} onChange={event => setGroup(event.target.value)}><option value="">Tous les groupes</option>{groups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="form-group">Du<input className="input" type="date" value={start} onChange={event => setStart(event.target.value)} /></label><label className="form-group">Au<input className="input" type="date" value={end} min={start || undefined} onChange={event => setEnd(event.target.value)} /></label></div></details><p>{rows.length} séance(s) correspondant aux filtres.</p>{(query || group || start || end) && <button className="btn btn-outline" onClick={() => { setQuery(''); setGroup(''); setStart(''); setEnd(''); }}>Effacer les filtres</button>}</section>
      <ScheduleCalendar period={academicYearContext?.years.find(year => year.id === academicYearContext?.selectedYearId)} sessions={rows.map(row => ({ id: row.id, start: String(row.values.debut || ''), end: String(row.values.fin || ''), title: value(row, 'uv_id'), subtitle: `${value(row, 'group_id')} · ${value(row, 'salle_id')}` }))} onSelect={id => setSelected(rows.find(row => row.id === id) || null)} />
    </>}
    {selected && <WorkPage title={value(selected, 'uv_id')} onClose={() => setSelected(null)}><dl className="record-details-grid">{Object.entries(HISTORY_TABLES.find(spec => spec.table === 'emploi_du_temps')!.fields).filter(([key]) => key in selected.values).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{value(selected, key)}</dd></div>)}</dl>{availableTabs.some(tab => tab.subTabs?.some(page => page.id === 'acad_attendance')) && <Link className="btn btn-outline" href="/academique/presences">Consulter les séances réalisées</Link>}</WorkPage>}
  </div>;
}
