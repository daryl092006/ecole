'use client';
import ListFilters from '@/components/ui/ListFilters';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadPurchases, managePurchase } from '@/services/remoteCampusService';
import type { PurchaseCommand } from '@/services/persistentPurchaseService';
import { PURCHASE_STATUS_LABELS, type PurchaseDirectory } from '@/types/purchaseWorkspace';
import type { DatabaseRow } from '@/types/persistence';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import ResponsiveTable from '@/components/ui/ResponsiveTable';

type Action = { kind: 'create' } | { kind: 'approve' | 'refuse' | 'receive'; row: DatabaseRow };
interface DraftLine { key: string; description: string; quantity: string; unitAmount: string; }
const newLine = (): DraftLine => ({ key: crypto.randomUUID(), description: '', quantity: '1', unitAmount: '' });
const displayQuantity = (value: unknown) => Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
export default function PurchasesWorkspace() {
  const portal = usePortal();
  const [directory, setDirectory] = useState<PurchaseDirectory | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoadError('');
    void loadPurchases(portal.activeRole, controller.signal).then(data => { if (!controller.signal.aborted) setDirectory(data); }).catch(cause => { if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [portal.activeRole, portal.academicYearSelection, reload]);
  function open(next: Action) { setAction(next); setError(''); setSupplierId(''); setSiteId(''); setLines([newLine()]); setQuantities({}); setReason(''); }
  if (!directory) return loadError ? <ErrorState title="Achats indisponibles" message={loadError} onRetry={() => setReload(value => value + 1)} /> : <LoadingState label="Chargement des achats…" variant="table" />;
  const supplierName = (row: DatabaseRow) => String(directory.suppliers.find(supplier => supplier.id === row.supplier_id)?.name || 'Fournisseur non renseigné');
  const actionLabel = action?.kind === 'create' ? 'Enregistrer la demande' : action?.kind === 'approve' ? 'Approuver la demande' : action?.kind === 'refuse' ? 'Refuser la demande' : 'Enregistrer la réception';
  const purchaseLines = action && action.kind !== 'create' ? directory.lines.filter(line => line.purchase_id === action.row.id) : [];
  const received = (line: DatabaseRow) => directory.receipts.filter(receipt => receipt.line_id === line.id).reduce((sum, receipt) => sum + Math.round(Number(receipt.quantity) * 1000), 0) / 1000;
  const remaining = (line: DatabaseRow) => (Math.round(Number(line.quantity) * 1000) - Math.round(received(line) * 1000)) / 1000;
  const viewing = directory.purchases.find(row => row.id === viewingId);
  const filtered = directory.purchases.filter(row => (!status || row.status === status) && `${row.reference} ${row.reason} ${supplierName(row)}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  function editLine(key: string, field: keyof DraftLine, value: string) { setLines(current => current.map(line => line.key === key ? { ...line, [field]: value } : line)); }
  function validate() {
    if (reason.trim().length < 3) return 'Le motif doit contenir au moins trois caractères.';
    if (action?.kind === 'create' && (directory!.requiresSite && !siteId || !lines.length || lines.some(line => !line.description.trim() || !line.quantity || Number(line.quantity) <= 0 || !line.unitAmount || !Number.isSafeInteger(Number(line.unitAmount)) || Number(line.unitAmount) < 0))) return 'Complétez les lignes, les quantités, les prix entiers et le site requis.';
    if (action?.kind === 'receive' && !purchaseLines.some(line => Number(quantities[line.id]) > 0)) return 'Renseignez au moins une quantité reçue.';
    if (action?.kind === 'receive' && purchaseLines.some(line => Number(quantities[line.id] || 0) < 0 || Number(quantities[line.id] || 0) > remaining(line))) return 'Une quantité dépasse le reste à recevoir.';
    return null;
  }
  async function save() {
    if (!directory || !action || busy) return;
    setBusy(true); setError('');
    try {
      const common = { revision: directory.revision, reason: reason.trim() };
      const command: PurchaseCommand = action.kind === 'create' ? { ...common, action: 'create', supplierId: supplierId || null, siteId: siteId || null, lines: lines.map(line => ({ description: line.description.trim(), quantity: Number(line.quantity), unitAmount: Number(line.unitAmount) })) }
        : action.kind === 'receive' ? { ...common, action: 'receive', id: action.row.id, lines: purchaseLines.filter(line => Number(quantities[line.id]) > 0).map(line => ({ lineId: line.id, quantity: Number(quantities[line.id]) })) }
          : { ...common, action: 'decide', id: action.row.id, decision: action.kind === 'approve' ? 'APPROUVE' : 'REFUSE' };
      await managePurchase(command, portal.activeRole);
      setAction(null); setSuccess('L’opération d’achat a été enregistrée.'); await portal.refreshCampus(); setReload(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  }
  return <div className="domain-workspace workspace-stack purchases-workspace"><div className="page-intro"><div><h1>Demandes d’achat</h1></div>{directory.canCreate && <button className="btn btn-primary" disabled={!directory.yearId} onClick={() => open({ kind: 'create' })}>Nouvelle demande d’achat</button>}</div>
    {success && <p role="status" className="info-box">{success}</p>}{loadError && <p role="alert" className="restricted-box">{loadError}<button className="btn btn-outline" onClick={() => setReload(value => value + 1)}>Réessayer</button></p>}{!directory.yearId && <p className="info-box">Toutes les années : consultation uniquement.</p>}
    <section className="card"><ListFilters count={directory.purchases.length} active={Boolean(query || status)}><div className="form-row"><label className="form-group">Rechercher un achat<input className="input" type="search" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="form-group">État<select className="select-input" value={status} onChange={event => setStatus(event.target.value)}><option value="">Tous les états</option>{Object.entries(PURCHASE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      </ListFilters><ResponsiveTable className="data-table"><thead><tr><th>Demande</th><th>Fournisseur</th><th>État</th><th>Actions</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td><strong>{String(row.reason)}</strong><div className="cell-sub">{String(row.reference)}</div></td><td>{supplierName(row)}</td><td>{PURCHASE_STATUS_LABELS[String(row.status)]}</td><td><div className="btn-group"><button className="btn btn-outline" onClick={() => setViewingId(row.id)}>Ouvrir le détail</button>{directory.yearId && directory.canApprove && row.status === 'DEMANDE' && <><button className="btn btn-primary" onClick={() => open({ kind: 'approve', row })}>Approuver</button><button className="btn btn-outline" onClick={() => open({ kind: 'refuse', row })}>Refuser</button></>}{directory.yearId && directory.canReceive && ['APPROUVE', 'RECEPTION_PARTIELLE'].includes(String(row.status)) && <button className="btn btn-primary" onClick={() => open({ kind: 'receive', row })}>Réceptionner</button>}</div></td></tr>)}{!filtered.length && <tr><td colSpan={4}>Aucun achat pour ces critères.</td></tr>}</tbody></ResponsiveTable>
    </section>
    {viewing && <WorkPage title={String(viewing.reference)} onClose={() => setViewingId(null)}><div className="workspace-stack purchase-details"><p>{supplierName(viewing)} · {PURCHASE_STATUS_LABELS[String(viewing.status)]}</p><p>{String(viewing.reason)}</p><h3>Lignes et quantités</h3>{directory.lines.filter(line => line.purchase_id === viewing.id).map(line => <section className="card" key={line.id}><h4>{String(line.description)}</h4><p>Commandé : {displayQuantity(line.quantity)} · Prix unitaire : {Number(line.unit_amount).toLocaleString('fr-FR')} FCFA</p><p>Reçu : {displayQuantity(received(line))} · Reste à recevoir : {displayQuantity(remaining(line))}</p></section>)}<h3>Historique des réceptions</h3>{directory.receipts.filter(receipt => receipt.purchase_id === viewing.id).map(receipt => <section className="card" key={receipt.id}><p>{String(directory.lines.find(line => line.id === receipt.line_id)?.description || 'Ligne')} : {displayQuantity(receipt.quantity)}</p><p>{String(receipt.reason)}</p><p className="cell-sub">{new Date(String(receipt.received_at)).toLocaleString('fr-FR')}</p></section>)}<h3>Dépenses enregistrées</h3>{directory.expenses.filter(expense => expense.purchase_id === viewing.id).map(expense => <section className="card" key={expense.id}><p>{Number(expense.amount).toLocaleString('fr-FR')} FCFA · {String(expense.paid_on)}</p><p>{String(expense.reason || '')}</p></section>)}{!directory.expenses.some(expense => expense.purchase_id === viewing.id) && <p>Aucune dépense enregistrée pour cet achat.</p>}</div></WorkPage>}
    {action && <WorkPage title={actionLabel} busy={busy} onClose={() => setAction(null)}><ReviewedForm busy={busy} error={error} confirmLabel={actionLabel} onConfirm={() => { void save(); }} validate={validate}
      fields={[...(action.kind === 'create' ? [{ label: 'Fournisseur', value: String(directory.suppliers.find(row => row.id === supplierId)?.name || 'Non renseigné') }, { label: 'Site', value: String(directory.sites.find(row => row.id === siteId)?.name || 'Non renseigné') }, ...lines.map((line, index) => ({ label: `Ligne ${index + 1}`, value: `${line.description} · ${line.quantity} · ${line.unitAmount} FCFA / unité` }))] : [{ label: 'Achat', value: String(action.row.reference) }, { label: 'État', previous: PURCHASE_STATUS_LABELS[String(action.row.status)], value: action.kind === 'approve' ? 'Approuvée' : action.kind === 'refuse' ? 'Refusée' : 'Réception partielle ou complète selon les quantités' }, ...purchaseLines.filter(line => action.kind !== 'receive' || Number(quantities[line.id]) > 0).map(line => ({ label: String(line.description), value: action.kind === 'receive' ? `${quantities[line.id]} reçu(s) sur ${displayQuantity(remaining(line))} restant(s)` : `${displayQuantity(line.quantity)} · ${Number(line.unit_amount).toLocaleString('fr-FR')} FCFA / unité` }))]), { label: 'Motif', value: reason }]}
      consequence={action.kind === 'create' ? 'La demande et ses lignes seront enregistrées ensemble, en attente de décision.' : action.kind === 'approve' ? 'La demande sera approuvée et les quantités pourront être réceptionnées.' : action.kind === 'refuse' ? 'La demande sera refusée avec conservation du motif et de l’historique.' : 'Les quantités livrées seront conservées. L’achat sera marqué reçu lorsque toutes les lignes seront complètes.'}>
      {action.kind === 'create' && <><label className="form-group">Fournisseur (facultatif)<select className="select-input" value={supplierId} onChange={event => setSupplierId(event.target.value)}><option value="">Non renseigné</option>{directory.suppliers.map(row => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</select></label>{(directory.sites.length > 0 || directory.requiresSite) && <label className="form-group">Site{directory.requiresSite ? '' : ' (facultatif)'}<select className="select-input" required={directory.requiresSite} value={siteId} onChange={event => setSiteId(event.target.value)}><option value="">Choisir</option>{directory.sites.map(row => <option key={row.id} value={row.id}>{String(row.name)}</option>)}</select></label>}{lines.map((line, index) => <fieldset className="card purchase-draft-line" key={line.key}><legend>Ligne {index + 1}</legend><label className="form-group">Description de la ligne {index + 1}<input className="input" required maxLength={500} value={line.description} onChange={event => editLine(line.key, 'description', event.target.value)} /></label><div className="form-row"><label className="form-group">Quantité de la ligne {index + 1}<input className="input" type="number" required min="0.001" step="0.001" value={line.quantity} onChange={event => editLine(line.key, 'quantity', event.target.value)} /></label><label className="form-group">Prix unitaire FCFA de la ligne {index + 1}<input className="input" type="number" required min="0" step="1" value={line.unitAmount} onChange={event => editLine(line.key, 'unitAmount', event.target.value)} /></label></div>{lines.length > 1 && <button type="button" className="btn btn-outline" onClick={() => setLines(current => current.filter(item => item.key !== line.key))}>Retirer cette ligne</button>}</fieldset>)}<button type="button" className="btn btn-outline" disabled={lines.length >= 50} onClick={() => setLines(current => [...current, newLine()])}>Ajouter une ligne</button></>}
      {action.kind === 'receive' && <><p>Renseignez uniquement les quantités livrées maintenant. Laissez les autres lignes vides.</p>{purchaseLines.filter(line => remaining(line) > 0).map(line => <label className="form-group" key={line.id}>{String(line.description)} · reste {displayQuantity(remaining(line))}<input className="input" type="number" min="0" max={remaining(line)} step="0.001" value={quantities[line.id] || ''} onChange={event => setQuantities(current => ({ ...current, [line.id]: event.target.value }))} /></label>)}</>}
      <label className="form-group">Motif<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><DrawerActions><button type="submit" className="btn btn-primary">Vérifier les informations</button></DrawerActions>
    </ReviewedForm>{error && <button className="btn btn-outline" disabled={busy} onClick={() => setReload(value => value + 1)}>Actualiser les données avant de réessayer</button>}</WorkPage>}
  </div>;
}
