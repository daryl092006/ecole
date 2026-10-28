'use client';
import ListFilters from '@/components/ui/ListFilters';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadSupport, manageSupport } from '@/services/remoteCampusService';
import type { SupportCommand } from '@/services/persistentSupportService';
import { SUPPORT_STATUS_LABELS, type SupportDirectory } from '@/types/supportWorkspace';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import ResponsiveTable from '@/components/ui/ResponsiveTable';

type Action = { kind: 'create' } | { kind: 'reply'; ticketId: string } | { kind: 'transition'; ticketId: string; target: 'IN_PROGRESS' | 'RESOLVED' };
const priorities: Record<string, string> = { LOW: 'Faible', MEDIUM: 'Normale', HIGH: 'Haute', CRITICAL: 'Critique' };
export default function SupportWorkspace() {
  const portal = usePortal();
  const [directory, setDirectory] = useState<SupportDirectory | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoadError('');
    void loadSupport(portal.activeRole, controller.signal).then(data => { if (!controller.signal.aborted) setDirectory(data); }).catch(cause => { if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [portal.activeRole, portal.academicYearSelection, reload]);
  function open(next: Action) { setAction(next); setError(''); setTitle(''); setDescription(''); setCategoryId(''); setPriority('MEDIUM'); setBody(''); }
  if (!directory) return loadError ? <ErrorState title="Support indisponible" message={loadError} onRetry={() => setReload(value => value + 1)} /> : <LoadingState label="Chargement des demandes…" variant="table" />;
  const tickets = directory.tickets.filter(ticket => (!status || ticket.status === status) && `${ticket.reference} ${ticket.title} ${ticket.description || ''}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const selected = directory.tickets.find(ticket => ticket.id === selectedId);
  const current = action && action.kind !== 'create' ? directory.tickets.find(ticket => ticket.id === action.ticketId) : null;
  const actionLabel = action?.kind === 'create' ? 'Ouvrir une demande' : action?.kind === 'reply' ? 'Envoyer la réponse' : action?.kind === 'transition' && action.target === 'IN_PROGRESS' ? 'Prendre en charge' : 'Résoudre la demande';
  async function save() {
    if (!action || !directory || busy) return;
    setBusy(true); setError('');
    try {
      const command: SupportCommand = action.kind === 'create' ? { action: 'create', revision: directory.revision, title: title.trim(), description: description.trim(), categoryId: categoryId || null, priority }
        : action.kind === 'reply' ? { action: 'reply', revision: directory.revision, ticketId: action.ticketId, body: body.trim() }
          : { action: 'transition', revision: directory.revision, ticketId: action.ticketId, fromStatus: current?.status as 'OPEN' | 'IN_PROGRESS', toStatus: action.target, reason: body.trim() };
      await manageSupport(command, portal.activeRole);
      setAction(null); if (action.kind === 'create') setSelectedId(null); setSuccess('La demande a été enregistrée.');
      await portal.refreshCampus();
      setReload(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  }
  return <div className="domain-workspace workspace-stack support-workspace">
    <div className="page-intro">
      <div>
        <span className="page-eyebrow">ASSISTANCE & SUPPORT</span>
        <h1>{directory.canManage ? 'Centre de support' : 'Mes demandes de support'}</h1>
        <p>Suivez vos demandes d’assistance, échangez avec le support technique et consultez les résolutions.</p>
      </div>
      <div className="btn-group">
        <button className="btn btn-outline" onClick={() => setReload(value => value + 1)}>Actualiser</button>
        <button className="btn btn-primary" disabled={!directory.yearId} onClick={() => open({ kind: 'create' })}>Ouvrir une demande</button>
      </div>
    </div>
    {!directory.yearId && <p className="info-box">Toutes les années : consultation uniquement. Choisissez une année précise pour écrire.</p>}
    {success && <p role="status" className="info-box">{success}</p>}
    {loadError && <p role="alert" className="restricted-box">{loadError}<button className="btn btn-outline" onClick={() => setReload(value => value + 1)}>Réessayer</button></p>}
    <section className="card"><ListFilters count={directory.tickets.length} active={Boolean(query || status)}><div className="form-row"><label className="form-group">Rechercher une demande<input type="search" className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Référence, titre ou description" /></label><label className="form-group">État<select className="select-input" value={status} onChange={event => setStatus(event.target.value)}><option value="">Tous les états</option>{Object.entries(SUPPORT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      </ListFilters>
      <ResponsiveTable className="data-table"><thead><tr><th>Demande</th><th>Priorité</th><th>État</th><th>Action</th></tr></thead><tbody>{tickets.map(ticket => <tr key={ticket.id}><td><strong>{String(ticket.title)}</strong><div className="cell-sub">{String(ticket.reference)}</div></td><td>{priorities[String(ticket.priority)] || 'Non renseignée'}</td><td>{SUPPORT_STATUS_LABELS[String(ticket.status)] || String(ticket.status)}</td><td><button className="btn btn-outline" onClick={() => setSelectedId(ticket.id)}>Ouvrir le suivi</button></td></tr>)}{!tickets.length && <tr><td colSpan={4}>{query || status ? 'Aucune demande pour ces filtres.' : 'Aucune demande.'}</td></tr>}</tbody></ResponsiveTable>
    </section>
    {selected && <WorkPage title={String(selected.title)} onClose={() => setSelectedId(null)}><div className="workspace-stack support-thread"><p className="cell-sub">{String(selected.reference)} · {SUPPORT_STATUS_LABELS[String(selected.status)]}</p><p>{String(selected.description || 'Aucune description.')}</p><h3>Échanges et suivi</h3>{directory.messages.filter(message => message.ticket_id === selected.id).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))).map(message => <section className="card" key={message.id}><strong>{message.author_id === selected.author_id ? 'Auteur de la demande' : 'Support technique'}</strong><p>{String(message.body)}</p><p className="cell-sub">{String(message.created_at ? new Date(String(message.created_at)).toLocaleString('fr-FR') : '')}</p></section>)}{!directory.messages.some(message => message.ticket_id === selected.id) && <p>Aucun échange pour le moment.</p>}
      <DrawerActions>{directory.yearId && !['RESOLVED', 'CLOSED'].includes(String(selected.status)) && <button className="btn btn-primary" onClick={() => open({ kind: 'reply', ticketId: selected.id })}>Répondre</button>}{directory.yearId && directory.canManage && ['OPEN', 'IN_PROGRESS'].includes(String(selected.status)) && <button className="btn btn-outline" onClick={() => open({ kind: 'transition', ticketId: selected.id, target: selected.status === 'OPEN' ? 'IN_PROGRESS' : 'RESOLVED' })}>{selected.status === 'OPEN' ? 'Prendre en charge' : 'Résoudre la demande'}</button>}</DrawerActions>
    </div></WorkPage>}
    {action && <WorkPage title={actionLabel} busy={busy} onClose={() => setAction(null)}><ReviewedForm busy={busy} error={error} onConfirm={() => { void save(); }} confirmLabel={actionLabel}
      fields={action.kind === 'create' ? [{ label: 'Titre', value: title.trim() }, { label: 'Description', value: description.trim() }, { label: 'Priorité', value: priorities[priority] }, { label: 'Catégorie', value: String(directory.categories.find(category => category.id === categoryId)?.name || 'Non précisée') }] : [{ label: 'Demande', value: String(current?.title || '') }, ...(action.kind === 'transition' ? [{ label: 'État', previous: SUPPORT_STATUS_LABELS[String(current?.status)], value: SUPPORT_STATUS_LABELS[action.target] }] : []), { label: action.kind === 'reply' ? 'Réponse' : 'Compte rendu', value: body.trim() }]}
      consequence={action.kind === 'create' ? 'La demande sera enregistrée pour cette année et visible par le support technique.' : action.kind === 'reply' ? 'Ce message sera conservé dans le suivi, visible par l’auteur et le support technique.' : 'L’état et le compte rendu seront enregistrés ensemble dans le suivi de la demande.'}
      validate={() => action.kind === 'create' ? !title.trim() || description.trim().length < 3 ? 'Saisissez un titre et une description d’au moins trois caractères.' : null : body.trim().length < 3 ? 'Le message doit contenir au moins trois caractères.' : null}>
      {action.kind === 'create' ? <><label className="form-group">Titre<input className="input" required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label><label className="form-group">Description<textarea className="input" required minLength={3} maxLength={5000} value={description} onChange={event => setDescription(event.target.value)} /></label><label className="form-group">Catégorie<select className="select-input" value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">Non précisée</option>{directory.categories.map(category => <option key={category.id} value={category.id}>{String(category.name)}</option>)}</select></label><label className="form-group">Priorité<select className="select-input" value={priority} onChange={event => setPriority(event.target.value as typeof priority)}>{Object.entries(priorities).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></> : <label className="form-group">{action.kind === 'reply' ? 'Réponse' : 'Compte rendu'}<textarea className="input" required minLength={3} maxLength={action.kind === 'reply' ? 5000 : 1000} value={body} onChange={event => setBody(event.target.value)} /></label>}
      <DrawerActions><button type="submit" className="btn btn-primary">Vérifier les informations</button></DrawerActions>
    </ReviewedForm>{error && <button className="btn btn-outline" disabled={busy} onClick={() => setReload(value => value + 1)}>Actualiser les données avant de réessayer</button>}</WorkPage>}
  </div>;
}
