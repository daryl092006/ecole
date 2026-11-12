'use client';
import ListFilters from '@/components/ui/ListFilters';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadCommunications, manageCommunication } from '@/services/remoteCampusService';
import type { CommunicationCommand } from '@/services/persistentCommunicationService';
import type { CommunicationDirectory } from '@/types/communicationWorkspace';
import type { DatabaseRow } from '@/types/persistence';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import PageHeader from '@/components/ui/PageHeader';

type Action = { kind: 'create' } | { kind: 'publish' | 'withdraw'; row: DatabaseRow };
const stateLabel = (row: DatabaseRow) =>
  row.withdrawn_at
    ? 'Retirée'
    : !row.published_at
    ? 'Brouillon'
    : row.expires_at && Date.parse(String(row.expires_at)) <= Date.now()
    ? 'Expirée'
    : 'Publiée';

export default function CommunicationsWorkspace() {
  const portal = usePortal();
  const [directory, setDirectory] = useState<CommunicationDirectory | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [viewing, setViewing] = useState<DatabaseRow | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('all');
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [expiration, setExpiration] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoadError('');
    void loadCommunications(portal.activeRole, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setDirectory(data);
      })
      .catch(cause => {
        if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'Chargement impossible.');
      });
    return () => controller.abort();
  }, [portal.activeRole, portal.academicYearSelection, reload]);

  function open(next: Action) {
    setAction(next);
    setError('');
    setTitle('');
    setContent('');
    setAudience('all');
    setTarget('');
    setReason('');
    setExpiration('');
  }

  if (!directory) {
    return loadError ? (
      <ErrorState title="Annonces indisponibles" message={loadError} onRetry={() => setReload(value => value + 1)} />
    ) : (
      <LoadingState label="Chargement des annonces…" variant="cards" />
    );
  }

  const label = action?.kind === 'create' ? 'Enregistrer le brouillon' : action?.kind === 'publish' ? 'Publier l’annonce' : 'Retirer l’annonce';
  const targets = audience === 'role' ? directory.roles : directory.groups;
  const audienceLabel = audience === 'all' ? 'Tous les comptes' : String(targets.find(row => row.id === target)?.name || 'Destinataire à choisir');

  function destination(row: DatabaseRow) {
    return directory!
      .audiences.filter(item => item.communication_id === row.id)
      .map(item =>
        item.all_accounts
          ? 'Tous les comptes'
          : String(directory!.roles.find(role => role.id === item.role_id)?.name || directory!.groups.find(group => group.id === item.group_id)?.name || 'Destinataires enregistrés')
      )
      .join(', ');
  }

  async function save() {
    if (!directory || !action || busy) return;
    setBusy(true);
    setError('');
    try {
      const command: CommunicationCommand =
        action.kind === 'create'
          ? {
              action: 'create',
              revision: directory.revision,
              title: title.trim(),
              content: content.trim(),
              audiences: [audience === 'all' ? { kind: 'all' } : { kind: audience as 'role' | 'group', id: target }]
            }
          : action.kind === 'publish'
          ? {
              action: 'publish',
              id: action.row.id,
              revision: directory.revision,
              expiresAt: expiration ? new Date(expiration).toISOString() : null
            }
          : { action: 'withdraw', id: action.row.id, revision: directory.revision, reason: reason.trim() || 'Retrait de l’annonce' };
      await manageCommunication(command, portal.activeRole);
      setAction(null);
      setSuccess(
        action.kind === 'create'
          ? 'Brouillon enregistré. Il reste privé jusqu’à sa publication.'
          : action.kind === 'publish'
          ? 'Annonce publiée dans les espaces des destinataires.'
          : 'Annonce retirée. Son historique est conservé.'
      );
      await portal.refreshCampus();
      setReload(value => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  const rows = directory.announcements
    .filter(row => `${row.title} ${row.content}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')))
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));

  return (
    <div className="domain-workspace workspace-stack communication-workspace">
      <PageHeader
        eyebrow="COMMUNICATION & VIE DU CAMPUS"
        title="Annonces et actualités"
        description="Consultez les informations officielles, diffusez des notes de service et gérez les publications ciblées aux étudiants et enseignants."
      >
        {directory.canManage && (
          <button className="btn btn-primary" disabled={!directory.yearId} onClick={() => open({ kind: 'create' })}>
            Rédiger une annonce
          </button>
        )}
      </PageHeader>

      {success && (
        <p role="status" className="info-box">
          {success}
        </p>
      )}
      {loadError && (
        <p role="alert" className="restricted-box">
          {loadError}
          <button className="btn btn-outline" onClick={() => setReload(value => value + 1)}>
            Réessayer
          </button>
        </p>
      )}
      {!directory.yearId && <p className="info-box">Toutes les années : consultation uniquement.</p>}

      <ListFilters count={directory.announcements.length} active={Boolean(query)}>
        <section className="card">
          <label className="form-group" style={{ margin: 0 }}>
            <input
              className="input"
              type="search"
              placeholder="Rechercher une annonce par titre ou mot-clé…"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </label>
        </section>
      </ListFilters>

      {!rows.length && (
        <section className="card card-full">
          <p className="cell-sub" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            Aucune annonce trouvée pour ces critères de recherche.
          </p>
        </section>
      )}

      {rows.map(row => (
        <article className="card publication-card" key={row.id}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{String(row.title)}</h2>
            <span
              className={`pill ${
                stateLabel(row) === 'Publiée' ? 'pill-success' : stateLabel(row) === 'Brouillon' ? 'pill-default' : 'pill-warning'
              }`}
            >
              {stateLabel(row)}
            </span>
          </div>
          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            {String(row.content).slice(0, 240)}
            {String(row.content).length > 240 ? '…' : ''}
          </p>
          {directory.canManage && (
            <p className="cell-sub" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              Destinataires : <strong>{destination(row)}</strong>
            </p>
          )}
          <div className="btn-group">
            <button className="btn btn-outline" onClick={() => setViewing(row)}>
              Lire l’annonce
            </button>
            {directory.canManage && directory.yearId && !row.withdrawn_at && (
              <>
                {!row.published_at && (
                  <button className="btn btn-primary" onClick={() => open({ kind: 'publish', row })}>
                    Publier l’annonce
                  </button>
                )}
                <button className="btn btn-outline" onClick={() => open({ kind: 'withdraw', row })}>
                  Retirer l’annonce
                </button>
              </>
            )}
          </div>
        </article>
      ))}

      {viewing && (
        <WorkPage title={String(viewing.title)} onClose={() => setViewing(null)}>
          <div className="communication-content">
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '1rem' }}>{String(viewing.content)}</p>
            {viewing.withdrawal_reason != null && (
              <p className="cell-sub" style={{ marginTop: '1.5rem', color: 'var(--danger)' }}>
                Motif de retrait : {String(viewing.withdrawal_reason)}
              </p>
            )}
          </div>
        </WorkPage>
      )}

      {action && (
        <WorkPage title={label} busy={busy} onClose={() => setAction(null)}>
          <ReviewedForm
            busy={busy}
            error={error}
            confirmLabel={label}
            onConfirm={() => {
              void save();
            }}
            fields={
              action.kind === 'create'
                ? [
                    { label: 'Titre', value: title },
                    { label: 'Contenu', value: content },
                    { label: 'Destinataires', value: audienceLabel }
                  ]
                : [
                    { label: 'Annonce', value: String(action.row.title) },
                    { label: 'Destinataires', value: destination(action.row) },
                    ...(action.kind === 'publish'
                      ? [
                          {
                            label: 'Expiration',
                            value: expiration ? new Date(expiration).toLocaleString('fr-FR') : 'Sans expiration'
                          }
                        ]
                      : [])
                  ]
            }
            consequence={
              action.kind === 'create'
                ? 'Le brouillon et ses destinataires seront enregistrés ensemble. Il ne sera pas visible dans les espaces des destinataires.'
                : action.kind === 'publish'
                ? 'L’annonce deviendra visible dans les espaces des destinataires sélectionnés. Aucun email ne sera envoyé.'
                : 'L’annonce ne sera plus visible dans les espaces des destinataires. Les données et l’historique seront conservés.'
            }
            validate={() =>
              action.kind === 'create'
                ? !title.trim() || !content.trim() || (audience !== 'all' && !target)
                  ? 'Complétez le titre, le contenu et les destinataires.'
                  : null
                : action.kind === 'withdraw'
                ? null
                : expiration && (!Number.isFinite(Date.parse(expiration)) || Date.parse(expiration) <= Date.now())
                ? 'Choisissez une expiration future.'
                : null
            }
          >
            {action.kind === 'create' ? (
              <>
                <label className="form-group">
                  Titre
                  <input className="input" required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} />
                </label>
                <label className="form-group">
                  Contenu
                  <textarea className="input" required rows={6} maxLength={5000} value={content} onChange={event => setContent(event.target.value)} />
                </label>
                <label className="form-group">
                  Destinataires
                  <select
                    className="select-input"
                    value={audience}
                    onChange={event => {
                      setAudience(event.target.value);
                      setTarget('');
                    }}
                  >
                    <option value="all">Tous les comptes</option>
                    <option value="role">Un rôle</option>
                    <option value="group">Un groupe</option>
                  </select>
                </label>
                {audience !== 'all' && (
                  <label className="form-group">
                    {audience === 'role' ? 'Rôle destinataire' : 'Groupe destinataire'}
                    <select className="select-input" required value={target} onChange={event => setTarget(event.target.value)}>
                      <option value="">Choisir</option>
                      {targets.map(row => (
                        <option key={row.id} value={row.id}>
                          {String(row.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            ) : action.kind === 'publish' ? (
              <label className="form-group">
                Expiration (facultative)
                <input className="input" type="datetime-local" value={expiration} onChange={event => setExpiration(event.target.value)} />
              </label>
            ) : (
              <p>Confirmez le retrait de l’annonce <strong>{String(action.row.title)}</strong>.</p>
            )}
            <DrawerActions>
              <button className="btn btn-primary" type="submit">
                Vérifier les informations
              </button>
            </DrawerActions>
          </ReviewedForm>
          {error && (
            <button className="btn btn-outline" disabled={busy} onClick={() => setReload(value => value + 1)}>
              Actualiser les données avant de réessayer
            </button>
          )}
        </WorkPage>
      )}
    </div>
  );
}
