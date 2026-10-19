'use client';
import { useEffect, useRef, useState } from 'react';
import { downloadCsv } from '@/utils/csv';
import { usePortal } from '@/hooks/usePortal';
import { ROLES } from '@/types/permissions';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { academicYearRequestHeaders } from '@/services/academicYearSelection';
import { connectedFieldLabel } from '@/services/connectedRecordDisplayService';
import LoadingState from '@/components/ui/LoadingState';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkPage from '@/components/ui/WorkPage';
import IconButton from '@/components/ui/IconButton';

interface AuditRecord {
  id: string; date: string | null; actorId: string | null; actorName: string | null;
  roles: string[]; table: string | null; entityId: string | null; action: string | null;
  reason: string | null; oldValue: Record<string, unknown> | null; newValue: Record<string, unknown> | null;
  batchId: string | null; sourceId: string | null;
}
interface AuditPage { source: 'current' | 'history'; yearId: string | null; revision: number; records: AuditRecord[]; total: number; offset: number; limit: number; }
const emptyFilters = { query: '', author: '', table: '', action: '', start: '', end: '' };

export default function AuditJournalPanel({ exportMode = false }: { exportMode?: boolean }) {
  const portal = usePortal();
  const [source, setSource] = useState<'current' | 'history'>('current');
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<AuditPage | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<AuditRecord | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const exportController = useRef<AbortController | null>(null);
  const allowed = portal.globalAccess && portal.perms.permissions.includes('system.audit.view') && (!exportMode || portal.perms.permissions.includes('system.backup.manage')) && [ROLES.DG, ROLES.IT].includes(portal.activeRole as typeof ROLES.DG);

  useEffect(() => {
    exportController.current?.abort(); setExporting(false); setExportMessage(''); setExportError('');
    return () => exportController.current?.abort();
  }, [allowed, portal.activeRole, portal.academicYearSelection, source, filters, retry, exportMode]);

  const exportRecords = async (format: 'csv' | 'json') => {
    if (!page || exporting || !allowed) return;
    const controller = new AbortController(); exportController.current = controller;
    setExporting(true); setExportMessage(''); setExportError('');
    try {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      if (!data.session) throw new Error('Connexion requise.');
      const headers = { Authorization: `Bearer ${data.session.access_token}`, 'x-escen-role': portal.activeRole, ...academicYearRequestHeaders() };
      const records: AuditRecord[] = [];
      const ids = new Set<string>();
      let first: AuditPage | null = null;
      do {
        const params = new URLSearchParams({ mode: 'export', source, offset: String(records.length), ...filters });
        const response = await fetch(`/api/audit?${params}`, { headers, cache: 'no-store', signal: controller.signal });
        const result: AuditPage & { error?: string } = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(result.error || 'Export impossible.');
        first ||= result;
        if (result.revision !== first.revision || result.total !== first.total || result.yearId !== first.yearId || result.source !== source
          || result.offset !== records.length || result.records.some(record => ids.has(record.id))
          || (!result.records.length && records.length < first.total)) throw new Error('Le journal a changé pendant la préparation. Relancez l’export.');
        for (const record of result.records) { ids.add(record.id); records.push(record); }
        if (records.length > first.total) throw new Error('Résultat incohérent. Aucun fichier téléchargé.');
        setExportMessage(`${records.length} / ${first.total} événement(s) préparé(s)…`);
      } while (records.length < first.total);
      if (controller.signal.aborted) return;
      const filename = `journal-${source}-${first.yearId || 'toutes-annees'}`;
      if (format === 'csv') downloadCsv(`${filename}.csv`, ['Source', 'Année sélectionnée', 'Événement', 'Date source', 'Auteur référence', 'Auteur nom', 'Rôles', 'Action', 'Entité', 'Référence entité', 'Motif', 'Anciennes valeurs', 'Nouvelles valeurs', 'Lot source', 'Identifiant source'], records.map(record => [source, first!.yearId || '', record.id, record.date || '', record.actorId || '', record.actorName || '', record.roles.join(', '), record.action || '', record.table || '', record.entityId || '', record.reason || '', record.oldValue === null ? '' : JSON.stringify(record.oldValue), record.newValue === null ? '' : JSON.stringify(record.newValue), record.batchId || '', record.sourceId || '']));
      else {
        const url = URL.createObjectURL(new Blob([JSON.stringify({ source, yearId: first.yearId, filters, total: records.length, records }, null, 2)], { type: 'application/json;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = `${filename}.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
      setExportMessage(`${records.length} événement(s) téléchargé(s). Tous les résultats filtrés sont inclus.`);
    } catch (cause) {
      if (!controller.signal.aborted) { setExportMessage(''); setExportError(cause instanceof Error ? cause.message : 'Export impossible.'); }
    } finally { if (!controller.signal.aborted) setExporting(false); }
  };

  useEffect(() => {
    const controller = new AbortController();
    setPage(null); setError(''); setSelected(null);
    if (allowed) void (async () => {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      if (!data.session) throw new Error('Connexion requise.');
      const params = new URLSearchParams({ source, offset: String(offset), ...filters });
      const response = await fetch(`/api/audit?${params}`, {
        headers: { Authorization: `Bearer ${data.session.access_token}`, 'x-escen-role': portal.activeRole, ...academicYearRequestHeaders() },
        cache: 'no-store', signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Lecture du journal impossible.');
      if (!controller.signal.aborted) setPage(result);
    })().catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Lecture du journal impossible.'); });
    return () => controller.abort();
  }, [allowed, portal.activeRole, portal.academicYearSelection, source, filters, offset, retry]);

  const resetPage = () => { setPage(null); setOffset(0); setSelected(null); };
  const actor = (record: AuditRecord) => source === 'history' ? record.actorId ? `Auteur source #${record.actorId}` : 'Auteur non trouvé' : record.actorName || record.actorId || 'Auteur non trouvé';
  const date = (value: string | null) => value ? source === 'history' ? value : new Date(value).toLocaleString('fr-FR', { timeZone: 'Africa/Lome' }) : 'Date non trouvée';
  const values = (value: Record<string, unknown> | null) => value === null ? <p>Aucune valeur disponible.</p> : !Object.keys(value).length ? <p>Aucun champ affichable dans cette vue.</p> : <dl className="record-details-grid">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{connectedFieldLabel(key)}</dt><dd className="audit-values">{item === null ? 'Non renseigné' : typeof item === 'boolean' ? item ? 'Oui' : 'Non' : String(item)}</dd></div>)}</dl>;

  if (!allowed) return <section className="card"><h1>Journal d’activité</h1><p role="alert">Cette consultation est réservée au DG et à l’Informaticien avec accès global et permission d’audit.</p></section>;
  return <div>
    <div className="page-intro"><div><h1>{exportMode ? 'Export du journal' : 'Journal d’activité'}</h1><p>Consultez séparément les opérations actuelles et les événements conservés de l’ancien système.</p></div></div>
    <label className="workspace-picker">Source du journal<select className="select-input" value={source} onChange={event => { setSource(event.target.value as typeof source); setDraft(emptyFilters); setFilters(emptyFilters); resetPage(); }}><option value="current">Opérations actuelles</option><option value="history">Journal historique</option></select></label>
    <p className="info-box">{source === 'history' ? 'Les auteurs sont des références de l’ancien système, sans correspondance de compte supposée. Les dates sont celles de la source. Ce journal sans rattachement annuel confirmé est consultable avec « Toutes les années ».' : portal.academicYearContext?.selectedYearId ? 'Seuls les événements reliés à l’année consultée par leurs références sont affichés. Choisissez « Toutes les années » pour les identités, paramètres communs et événements sans année confirmée.' : 'Consultation de toutes les années, y compris les identités, paramètres communs et événements sans année confirmée.'}</p>
    <form className="card card-full mb-2" onSubmit={event => { event.preventDefault(); setFilters({ ...draft }); resetPage(); }}>
      <div className="form-grid">
        {([{ key: 'query', label: 'Rechercher un événement', max: 160 }, { key: 'author', label: 'Auteur : nom ou référence', max: 160 }, { key: 'table', label: source === 'history' ? 'Type d’entité exact' : 'Table exacte', max: 160 }, { key: 'action', label: 'Action exacte', max: 80 }] as const).map(field => <label className="form-group" key={field.key}>{field.label}<input className="input" type={field.key === 'query' ? 'search' : 'text'} maxLength={field.max} value={draft[field.key]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} /></label>)}
        <label className="form-group">Du<input className="input" type="date" value={draft.start} onChange={event => setDraft({ ...draft, start: event.target.value })} /></label>
        <label className="form-group">Au<input className="input" type="date" min={draft.start || undefined} value={draft.end} onChange={event => setDraft({ ...draft, end: event.target.value })} /></label>
      </div>
      <div className="btn-group"><button className="btn btn-primary">Appliquer les filtres</button><button className="btn btn-outline" type="button" onClick={() => { setDraft(emptyFilters); setFilters({ ...emptyFilters }); resetPage(); }}>Effacer les filtres</button><button className="btn btn-outline" type="button" onClick={() => { setPage(null); setRetry(value => value + 1); }}>Actualiser le journal</button></div>
    </form>
    {error ? <section className="card" role="alert"><h2>Journal indisponible</h2><p>{error}</p><button className="btn btn-outline" onClick={() => setRetry(value => value + 1)}>Réessayer</button></section> : !page ? <LoadingState label="Chargement du journal…" /> : <section className="card card-full">
      <h2>{source === 'current' ? 'Opérations actuelles' : 'Journal historique'} ({page.total})</h2>
      <ResponsiveTable className="data-table"><thead><tr><th>Date et heure</th><th>Auteur</th><th>Action</th><th>Entité</th><th>Détail</th></tr></thead><tbody>{page.records.map(record => <tr key={record.id}><td>{date(record.date)}</td><td>{actor(record)}</td><td>{record.action || 'Action non trouvée'}</td><td>{record.table || 'Type non trouvé'}<div className="cell-sub audit-values">{record.entityId || 'Référence non trouvée'}</div></td><td><IconButton className="btn btn-outline" label="Consulter l’événement" onClick={() => setSelected(record)} /></td></tr>)}{!page.records.length && <tr><td colSpan={5}>{source === 'history' && page.yearId ? 'Choisissez Toutes les années pour consulter les événements historiques sans rattachement annuel confirmé.' : 'Aucun événement pour cette source et ces filtres.'}</td></tr>}</tbody></ResponsiveTable>
      {page.total > page.limit && <div className="browser-pagination"><span>{offset + 1}–{Math.min(offset + page.limit, page.total)} sur {page.total}</span><div className="btn-group"><button className="btn btn-outline" disabled={!offset} onClick={() => { setPage(null); setOffset(value => Math.max(0, value - page.limit)); }}>Précédent</button><button className="btn btn-outline" disabled={offset + page.limit >= page.total} onClick={() => { setPage(null); setOffset(value => value + page.limit); }}>Suivant</button></div></div>}
    </section>}
    {exportMode && <section className="card card-full" aria-busy={exporting}>
      <h2>Télécharger les résultats filtrés</h2>
      <p>La liste ci-dessus prévisualise le périmètre. Le fichier inclut toutes les pages de la source et de l’année sélectionnées, avec les filtres appliqués. Les champs sensibles restent exclus. Ce téléchargement ne constitue pas une sauvegarde de la base.</p>
      <div className="btn-group"><button className="btn btn-primary" disabled={!page?.total || !!error || exporting} onClick={() => void exportRecords('csv')}>Télécharger le CSV</button><button className="btn btn-outline" disabled={!page?.total || !!error || exporting} onClick={() => void exportRecords('json')}>Télécharger le JSON</button>{exporting && <button className="btn btn-outline" onClick={() => { exportController.current?.abort(); setExporting(false); setExportMessage('Export annulé. Aucun fichier téléchargé.'); }}>Annuler l’export</button>}</div>
      {exporting && <LoadingState compact label="Préparation du fichier…" />}
      {exportMessage && <p role="status">{exportMessage}</p>}{exportError && <p role="alert">{exportError}</p>}
    </section>}
    {selected && <WorkPage title="Détail de l’événement" onClose={() => setSelected(null)}>
      <dl className="record-details-grid">{[['Source', source === 'current' ? 'Opérations actuelles' : 'Journal historique'], ['Référence de l’événement', selected.id], ['Date', date(selected.date)], ['Auteur', actor(selected)], ['Rôles enregistrés', selected.roles.join(', ') || 'Non trouvés'], ['Action', selected.action], ['Entité', selected.table], ['Référence de l’entité', selected.entityId], ['Motif', selected.reason || 'Non trouvé dans les champs affichables'], ...(source === 'history' ? [['Lot source', selected.batchId], ['Identifiant source', selected.sourceId]] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="audit-values">{value || 'Non trouvé'}</dd></div>)}</dl>
      {source === 'current' && <><p>Cette vue affiche une sélection de champs métier. Les autres champs et les données sensibles ne sont pas exposés ; les journaux originaux restent conservés.</p><h3>Anciennes valeurs</h3>{values(selected.oldValue)}<h3>Nouvelles valeurs</h3>{values(selected.newValue)}</>}
    </WorkPage>}
  </div>;
}
