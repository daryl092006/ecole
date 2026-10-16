'use client';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { HISTORY_TABLES } from '@/data/historyCatalog';
import { loadAllHistoryRecords } from '@/services/historyService';
import { historyValue } from '@/services/historyDisplayService';
import type { HistoryRecord } from '@/types/history';
import { HISTORY_SECTIONS } from './HistoricalWorkspace';
import HistoryRecordDetails from './HistoryRecordDetails';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { downloadCsv } from '@/utils/csv';

export default function ArchiveFinanceWorkspace({ section }: { section: string }) {
  const { history, activeRole } = usePortal(); const choices = HISTORY_SECTIONS[section];
  const [table, setTable] = useState(choices[0]); const [records, setRecords] = useState<HistoryRecord[] | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState(''); const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [flagged, setFlagged] = useState(false); const [offset, setOffset] = useState(0); const [exported, setExported] = useState(''); const [selected, setSelected] = useState<HistoryRecord | null>(null);
  const spec = HISTORY_TABLES.find(item => item.table === table)!; const catalog = history.catalog;
  useEffect(() => {
    const controller = new AbortController(); setRecords(null); setError('');
    if (catalog) void loadAllHistoryRecords(table, activeRole, { query: '', flagged: false }, controller.signal).then(result => { if (!controller.signal.aborted) setRecords(result.records); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Données financières indisponibles.'); });
    return () => controller.abort();
  }, [table, activeRole, catalog, retry]);
  const dateKey = table === 'paiements' ? 'date_paiement' : table === 'echeances' ? 'date_limite' : 'created_at';
  const value = (record: HistoryRecord, key: string) => historyValue(key, record.values[key], record, catalog!);
  const rows = (records || []).filter(record => (!flagged || record.issues.length > 0) && (!start || String(record.values[dateKey] || '').slice(0, 10) >= start) && (!end || !!record.values[dateKey] && String(record.values[dateKey]).slice(0, 10) <= end) && Object.keys(spec.fields).some(key => value(record, key).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))));
  const reset = () => { setQuery(''); setStart(''); setEnd(''); setFlagged(false); setOffset(0); setExported(''); };
  const page = rows.slice(offset, offset + 25);
  return <div><nav className="record-sections" aria-label="Données financières disponibles">{choices.map(key => <button key={key} aria-pressed={table === key} className={table === key ? 'selected' : ''} onClick={() => { setTable(key); reset(); }}>{HISTORY_TABLES.find(item => item.table === key)!.title} ({catalog?.datasets.find(item => item.table === key)?.count ?? 0})</button>)}</nav>
    {error || history.error ? <section className="card" role="alert"><p>{error || history.error}</p><IconButton className="btn btn-primary" onClick={() => { history.retry(); setRetry(value => value + 1); }} label="Réessayer les données financières" /></section> : !records || !catalog ? <LoadingState label="Chargement des données financières…" /> : <section className="card card-full"><div className="planning-search"><label className="form-group">Rechercher un étudiant ou une référence<input className="input" type="search" value={query} onChange={event => { setQuery(event.target.value); setOffset(0); setExported(''); }} placeholder="Nom, référence, année, montant…" /></label></div><details className="advanced-record-filters"><summary>Filtrer par période</summary><div className="planning-filters"><label className="form-group">{dateKey === 'date_limite' ? 'Échéance à partir du' : dateKey === 'date_paiement' ? 'Versement à partir du' : 'Enregistrement à partir du'}<input className="input" type="date" value={start} onChange={event => { setStart(event.target.value); setOffset(0); setExported(''); }} /></label><label className="form-group">Jusqu’au<input className="input" type="date" min={start || undefined} value={end} onChange={event => { setEnd(event.target.value); setOffset(0); setExported(''); }} /></label></div></details>
      <div className="browser-toolbar"><label className="checkbox-field"><input type="checkbox" checked={flagged} onChange={event => { setFlagged(event.target.checked); setOffset(0); setExported(''); }} /> Éléments à vérifier uniquement</label><div className="btn-group">{(query || start || end || flagged) && <button className="btn btn-outline" onClick={reset}>Effacer les filtres</button>}<button className="btn btn-outline" disabled={!rows.length} onClick={() => { downloadCsv(table + '-resultats.csv', spec.columns.map(key => spec.fields[key]), rows.map(record => spec.columns.map(key => value(record, key)))); setExported(`${rows.length} ligne(s) préparée(s) en CSV : ${spec.title}, ${start || 'sans début de période'} → ${end || 'sans fin de période'}. Les filtres de recherche et de contrôle sont appliqués.`); }}>Exporter les {rows.length} résultat(s)</button></div></div>
      <p className="browser-result-count">{rows.length} résultat(s) · {spec.title}. Les montants de ces lignes ne sont pas transformés en solde étudiant sans allocations vérifiées.</p>{exported && <p className="info-box" role="status">{exported}</p>}
      <ResponsiveTable className="data-table"><thead><tr>{spec.columns.map(key => <th key={key}>{spec.fields[key]}</th>)}<th>Contrôle</th><th>Détail</th></tr></thead><tbody>{page.map(record => <tr key={record.id}>{spec.columns.map(key => <td key={key}>{value(record, key)}</td>)}<td>{record.issues.length ? 'À vérifier' : '—'}{record.values.annule === true || record.values.annule === 1 || record.values.annule === '1' ? ' · Annulé' : ''}</td><td><IconButton className="btn btn-outline" onClick={() => setSelected(record)} label="Voir le détail" /></td></tr>)}{!page.length && <tr><td colSpan={spec.columns.length + 2}>Aucun résultat pour cette collection et ces filtres.</td></tr>}</tbody></ResponsiveTable>
      {rows.length > 25 && <div className="browser-pagination"><span>{offset + 1}–{Math.min(offset + 25, rows.length)} sur {rows.length}</span><div className="btn-group"><IconButton className="btn btn-outline" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 25))} label="Précédent" /><IconButton className="btn btn-outline" disabled={offset + 25 >= rows.length} onClick={() => setOffset(value => value + 25)} label="Suivant" /></div></div>}
    </section>}
    {selected && <HistoryRecordDetails table={table} record={selected} onClose={() => setSelected(null)} />}
  </div>;
}
