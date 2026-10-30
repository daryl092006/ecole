'use client';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { ROLES } from '@/types/permissions';
import type { EmailPage, EmailRecord, EmailStatus } from '@/types/email';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { academicYearRequestHeaders } from '@/services/academicYearSelection';
import { roleHeaderValue } from '@/services/remoteCampusService';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import IconButton from '@/components/ui/IconButton';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';

const statuses: Record<EmailStatus, string> = { PENDING: 'En attente', PROCESSING: 'En cours', ACCEPTED: 'Accepté par le service', FAILED: 'Échec confirmé', UNKNOWN: 'À vérifier' };
const date = (value: string) => new Date(value).toLocaleString('fr-FR', { timeZone: 'Africa/Lome' });

export default function EmailOutboxPanel() {
  const portal = usePortal();
  const [page, setPage] = useState<EmailPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<EmailRecord | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [message, setMessage] = useState('');
  const allowed = portal.globalAccess && portal.perms.permissions.includes('email.view') && [ROLES.DG, ROLES.IT].includes(portal.activeRole as typeof ROLES.DG);
  const canRetry = allowed && portal.activeRole === ROLES.IT && portal.perms.permissions.includes('email.retry') && !!portal.academicYearContext?.selectedYearId;
  const headers = async () => {
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    if (!data.session) throw new Error('Connexion requise.');
    return { Authorization: `Bearer ${data.session.access_token}`, 'x-escen-role': roleHeaderValue(portal.activeRole), ...academicYearRequestHeaders() };
  };

  useEffect(() => {
    const controller = new AbortController();
    setPage(null); setError(''); setSelected(null);
    if (allowed) void (async () => {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      if (!data.session) throw new Error('Connexion requise.');
      const response = await fetch(`/api/email-outbox?offset=${offset}`, { cache: 'no-store', signal: controller.signal,
        headers: { Authorization: `Bearer ${data.session.access_token}`, 'x-escen-role': roleHeaderValue(portal.activeRole), ...academicYearRequestHeaders() } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Suivi des mails indisponible.');
      if (!controller.signal.aborted) setPage(result);
    })().catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Suivi des mails indisponible.'); });
    return () => controller.abort();
  }, [allowed, portal.activeRole, portal.academicYearSelection, offset, revision]);

  const retry = async () => {
    if (!selected || !canRetry || busy) return;
    setBusy(true); setSaveError('');
    try {
      const response = await fetch('/api/email-outbox', { method: 'POST', headers: { ...await headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, version: selected.version, reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Reprise impossible.');
      await portal.refreshCampus();
      setSelected(null); setRetrying(false); setPage(null); setRevision(value => value + 1);
      setMessage('Mail remis en attente. Son envoi dépend du service configuré.');
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Reprise impossible.'); }
    finally { setBusy(false); }
  };

  if (!allowed) return <section className="card"><h1>Suivi des mails</h1><p role="alert">Accès réservé à la direction et à l’Informaticien avec attribution globale.</p></section>;
  return <section className="card card-full email-workspace">
    <div className="setup-actions"><div><h1>Suivi des mails</h1><p>Notifications liées aux actions de l’année consultée.</p></div><button className="btn btn-outline" onClick={() => setRevision(value => value + 1)}>Actualiser</button></div>
    {message && <p role="status">{message}</p>}
    {error ? <ErrorState title="Mails indisponibles" message={error} onRetry={() => setRevision(value => value + 1)} /> : !page ? <LoadingState label="Chargement des mails…" variant="table" /> : <>
      {!page.configuration.ready && <p className="info-box" role="status">Envoi non configuré. Les messages restent en attente.</p>}
      <p className="cell-sub">« Accepté par le service » ne confirme pas la réception dans la boîte mail.</p>
      <ResponsiveTable pageSize={0} className="data-table"><thead><tr><th>Date</th><th>Destinataire</th><th>Objet</th><th>État</th><th>Actions</th></tr></thead><tbody>
        {page.records.map(record => <tr key={record.id}>
          <td>{date(record.created_at)}</td><td>{record.recipient_name}<div className="cell-sub audit-values">{record.recipient_email}</div></td><td>{record.subject}</td>
          <td><span className={`pill ${record.status === 'ACCEPTED' ? 'pill-success' : record.status === 'FAILED' || record.status === 'UNKNOWN' ? 'pill-warning' : 'pill-default'}`}>{statuses[record.status]}</span></td>
          <td><div className="btn-group"><IconButton className="btn btn-outline" label="Consulter le mail" onClick={() => { setSelected(record); setRetrying(false); setSaveError(''); }} />{canRetry && record.status === 'FAILED' && record.attempts < 5 && <IconButton className="btn btn-outline" label="Réessayer l’envoi" onClick={() => { setSelected(record); setRetrying(true); setReason(''); setSaveError(''); }} />}</div></td>
        </tr>)}
        {!page.records.length && <tr><td colSpan={5}>Aucun mail pour cette année. Les actions historiques ne déclenchent pas d’envoi rétroactif.</td></tr>}
      </tbody></ResponsiveTable>
      {page.total > page.limit && <div className="browser-pagination"><span>{Math.min(offset + 1, page.total)}–{Math.min(offset + page.limit, page.total)} sur {page.total}</span><div className="btn-group"><button className="btn btn-outline" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - page.limit))}>Précédent</button><button className="btn btn-outline" disabled={offset + page.limit >= page.total} onClick={() => setOffset(value => value + page.limit)}>Suivant</button></div></div>}
    </>}
    {selected && <WorkPage title={retrying ? 'Reprendre un mail en échec' : 'Détail du mail'} busy={busy} onClose={() => { if (!busy) setSelected(null); }}>
      {retrying ? <ReviewedForm onConfirm={() => void retry()} busy={busy} error={saveError} fields={[
        { label: 'Destinataire', value: selected.recipient_email }, { label: 'Objet', value: selected.subject },
        { label: 'État', previous: statuses[selected.status], value: 'En attente' }, { label: 'Motif', value: reason },
      ]} consequence="Le même message sera proposé au service d’envoi. Vérifiez que la cause du refus est corrigée. Les envois incertains ne sont pas repris ici." confirmLabel="Confirmer la reprise">
        <label className="form-group">Motif<input className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
        <button className="btn btn-primary" type="submit">Vérifier la reprise</button>
      </ReviewedForm> : <>
        <dl className="record-details-grid">{[['Destinataire', selected.recipient_email], ['Objet', selected.subject], ['État', statuses[selected.status]], ['Tentatives', String(selected.attempts)], ['Année · référence', selected.academic_year_id], ['Dernière mise à jour', date(selected.updated_at)], ['Référence du service', selected.provider_reference || 'Aucune'], ['Code de suivi', selected.last_error_code || 'Aucun'], ['Motif', selected.reason]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="audit-values">{value}</dd></div>)}</dl>
        {selected.status === 'UNKNOWN' && <p className="info-box">Vérifiez auprès du service si ce mail a été accepté. Aucun renvoi automatique n’est effectué.</p>}
      </>}
    </WorkPage>}
  </section>;
}
