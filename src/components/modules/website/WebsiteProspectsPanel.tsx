'use client';
import { useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { usePortal } from '@/hooks/usePortal';
import { loadWebsiteProspects } from '@/services/remoteCampusService';
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
  const controller = useRef<AbortController | null>(null);
  const pendingMore = useRef(false);

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

  return <section>
    <PageHeader eyebrow="Site web" title="Prospects" description="Coordonnées laissées lors d’une demande de brochure, pour le suivi par ESCEN.">
      <button className="btn btn-outline" type="button" disabled={loading || loadingMore} onClick={() => setRevision(value => value + 1)}>Actualiser</button>
    </PageHeader>
    {loading ? <LoadingState label="Chargement des prospects…" /> : error ? <ErrorState message={error} onRetry={() => setRevision(value => value + 1)} /> : <div className="card">
      {!page.prospects.length ? <p role="status">Aucune demande de brochure pour l’année consultée.</p> : <div className="table-wrap">
        <ResponsiveTable className="data-table" aria-label="Prospects des demandes de brochures">
          <thead><tr><th>Nom complet</th><th>Email</th><th>Téléphone</th><th>Demande reçue le</th></tr></thead>
          <tbody>{page.prospects.map(prospect => <tr key={prospect.id}>
            <td>{prospect.full_name}</td>
            <td><a href={`mailto:${prospect.email}`}>{prospect.email}</a></td>
            <td><a href={`tel:${prospect.phone.replace(/[^+\d]/g, '')}`}>{prospect.phone}</a></td>
            <td>{new Date(prospect.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Lome' })}</td>
          </tr>)}</tbody>
        </ResponsiveTable>
      </div>}
      {moreError && <p role="alert">{moreError}</p>}
      {page.nextCursor && <button className="btn btn-outline" type="button" disabled={loadingMore} onClick={() => void more()}>{loadingMore ? 'Chargement…' : moreError ? 'Réessayer le chargement' : 'Afficher les demandes précédentes'}</button>}
    </div>}
  </section>;
}
