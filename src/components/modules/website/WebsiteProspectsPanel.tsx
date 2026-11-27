'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import DataPanel from '@/components/ui/DataPanel';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { usePortal } from '@/hooks/usePortal';
import { loadWebsiteProspects } from '@/services/remoteCampusService';
import { downloadCsv } from '@/utils/csv';
import type { WebsiteProspectsPage } from '@/types/website';

export default function WebsiteProspectsPanel() {
  const portal = usePortal();
  const role = portal.activeRole;
  const year = portal.academicYearContext?.selectedYearId;
  const selection = portal.academicYearContext?.selection;
  const [page, setPage] = useState<WebsiteProspectsPage>({ prospects: [], nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const controller = useRef<AbortController | null>(null);
  const pendingMore = useRef(false);

  const filteredProspects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return page.prospects;
    return page.prospects.filter(p =>
      `${p.full_name} ${p.email} ${p.phone}`.toLowerCase().includes(q)
    );
  }, [page.prospects, search]);

  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    pendingMore.current = false;
    setPage({ prospects: [], nextCursor: null }); setLoading(true); setError(''); setMoreError(''); setLoadingMore(false);
    void loadWebsiteProspects(role, undefined, current.signal)
      .then(data => { if (!current.signal.aborted) setPage(data); })
      .catch(cause => { if (!current.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); })
      .finally(() => { if (!current.signal.aborted) setLoading(false); });
    return () => current.abort();
  }, [role, year, selection, revision]);

  async function more() {
    if (!page.nextCursor || pendingMore.current || !controller.current) return;
    const current = controller.current;
    pendingMore.current = true; setLoadingMore(true); setMoreError('');
    try {
      const next = await loadWebsiteProspects(role, page.nextCursor, current.signal);
      if (!current.signal.aborted) setPage(previous => ({ prospects: [...previous.prospects, ...next.prospects], nextCursor: next.nextCursor }));
    } catch (cause) {
      if (!current.signal.aborted) setMoreError(cause instanceof Error ? cause.message : 'Chargement impossible.');
    } finally {
      if (!current.signal.aborted) { pendingMore.current = false; setLoadingMore(false); }
    }
  }

  return <section className="domain-workspace workspace-stack">
    <PageHeader eyebrow="Site web" title="Prospects" description="Coordonnées laissées lors d’une demande de brochure, pour le suivi par ESCEN.">
      {filteredProspects.length > 0 && (
        <button
          className="btn btn-outline"
          type="button"
          onClick={() => {
            downloadCsv(
              'escen-prospects-brochures.csv',
              ['Nom complet', 'Email', 'Téléphone', 'Date de demande'],
              filteredProspects.map(p => [
                p.full_name,
                p.email,
                p.phone,
                new Date(p.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Lome' }),
              ])
            );
          }}
        >
          Exporter CSV ({filteredProspects.length})
        </button>
      )}
      <button className="btn btn-outline" type="button" disabled={loading || loadingMore} onClick={() => setRevision(value => value + 1)}>Actualiser</button>
    </PageHeader>
    {loading ? <LoadingState label="Chargement des prospects…" /> : error ? <ErrorState message={error} onRetry={() => setRevision(value => value + 1)} /> : <DataPanel title="Demandes de brochure" meta={<span className="data-panel-title-count">{filteredProspects.length} demande(s) affichée(s)</span>}
      toolbar={page.prospects.length > 0 ? (
        <div className="panel-filter-grid">
          <label className="form-group">
            Rechercher un prospect
            <input
              className="input"
              type="search"
              placeholder="Nom, email ou numéro de téléphone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
        </div>
      ) : undefined}
      footer={<>{moreError && <p role="alert">{moreError}</p>}{page.nextCursor && <button className="btn btn-outline" type="button" disabled={loadingMore} onClick={() => void more()}>{loadingMore ? 'Chargement…' : moreError ? 'Réessayer le chargement' : 'Afficher les demandes précédentes'}</button>}</>}>
      {!filteredProspects.length ? <p role="status">{page.prospects.length ? 'Aucun prospect ne correspond à cette recherche.' : 'Aucune demande de brochure pour l’année consultée.'}</p> : <div className="table-wrap">
        <ResponsiveTable className="data-table" aria-label="Prospects des demandes de brochures">
          <thead><tr><th>Nom complet</th><th>Email</th><th>Téléphone</th><th>Demande reçue le</th></tr></thead>
          <tbody>{filteredProspects.map(prospect => <tr key={prospect.id}>
            <td>{prospect.full_name}</td>
            <td><a href={`mailto:${prospect.email}`}>{prospect.email}</a></td>
            <td><a href={`tel:${prospect.phone.replace(/[^+\d]/g, '')}`}>{prospect.phone}</a></td>
            <td>{new Date(prospect.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Lome' })}</td>
          </tr>)}</tbody>
        </ResponsiveTable>
      </div>}
    </DataPanel>}
  </section>;
}
