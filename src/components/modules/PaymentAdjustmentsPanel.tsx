'use client';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { ROLES } from '@/types/permissions';
import type { AdjustmentPayment, CreditableLine, PaymentAdjustmentDirectory } from '@/types/paymentAdjustments';
import { loadStudentReceipt, studentOperations } from '@/services/remoteCampusService';
import { paymentReceiptMarkup } from '@/services/paymentReceiptService';
import { printDocument } from '@/utils/printDocument';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';

const money = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;
type Selection = { action: 'cancel_payment' | 'refund_payment'; payment: AdjustmentPayment } | { action: 'credit_note'; line: CreditableLine };
export default function PaymentAdjustmentsPanel({ matricule, revision, directory, onSaved }: {
  matricule: string; revision: number; directory: PaymentAdjustmentDirectory; onSaved: (message: string) => void;
}) {
  const portal = usePortal();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [amount, setAmount] = useState(''), [reference, setReference] = useState(''), [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [printing, setPrinting] = useState<string | null>(null), [printError, setPrintError] = useState('');
  const canCancel = portal.perms.permissions.includes('payment.cancel') && (portal.activeRole === ROLES.DG || portal.activeRole === ROLES.IT);
  const canAdjust = portal.perms.permissions.includes('payment.record') && (portal.activeRole === ROLES.RAF || portal.activeRole === ROLES.IT);
  function open(value: Selection) { setSelection(value); setAmount(''); setReference(''); setReason(''); setError(''); }
  const target = selection ? selection.action === 'credit_note' ? selection.line : selection.payment : null;
  const cancelling = selection?.action === 'cancel_payment';
  const crediting = selection?.action === 'credit_note';
  const operation = cancelling ? 'Annulation' : crediting ? 'Avoir' : 'Remboursement';
  const label = selection ? selection.action === 'credit_note' ? selection.line.description : selection.payment.reference : '';
  const maximum = target?.available || 0;
  const after = maximum - Number(amount || 0);
  async function printReceipt(receiptId: string) {
    setPrinting(receiptId); setPrintError('');
    try {
      const { receipt } = await loadStudentReceipt(matricule, receiptId, portal.activeRole);
      printDocument(`Recu-${receipt.reference}`, paymentReceiptMarkup(receipt));
    } catch (cause) { setPrintError(cause instanceof Error ? cause.message : 'Reçu indisponible pour l’impression.'); }
    finally { setPrinting(null); }
  }
  async function save() {
    if (!selection || !target) return;
    setBusy(true); setError('');
    try {
      await studentOperations(matricule, portal.activeRole, { revision, enrollmentId: target.enrollmentId, action: selection.action, reason,
        ...(selection.action === 'credit_note' ? { lineId: selection.line.id, amount: Number(amount) } : { paymentId: selection.payment.id, ...(selection.action === 'refund_payment' ? { amount: Number(amount), reference } : {}) }) });
      setSelection(null); portal.refreshCampus();
      onSaved(cancelling ? 'Paiement annulé. Le reçu est marqué annulé.' : crediting ? 'Avoir enregistré.' : 'Remboursement enregistré et affectations ajustées.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Opération financière indisponible.'); }
    finally { setBusy(false); }
  }
  return <details><summary>Annulations, remboursements et avoirs</summary>
    {printError && <p role="alert">{printError}</p>}
    {directory.payments.map(payment => <div className="card" key={payment.id}>
      <p><strong>{payment.reference}</strong> · {money(payment.amount)} · Remboursé : {money(payment.refunded)}{payment.cancelled ? ' · Annulé' : payment.pending ? ' · En attente' : ''}</p>
      {payment.receipt && <p>Reçu {payment.receipt.reference} · <strong>{payment.receipt.status === 'ANNULE' ? 'Annulé' : 'Valide'}</strong></p>}
      {payment.cancellation && <p>Motif d’annulation : {payment.cancellation.reason} · {payment.cancellation.reversedAt}</p>}
      {payment.refunds.map(refund => <p className="cell-sub" key={refund.id}>Remboursement {refund.reference} · {money(refund.amount)} · {refund.reason} · {refund.refundedAt}</p>)}
      <div className="btn-group">
        {payment.receipt && <button className="btn btn-outline" disabled={printing !== null} onClick={() => printReceipt(payment.receipt!.id)}>{printing === payment.receipt.id ? 'Préparation du reçu…' : `Imprimer ${payment.receipt.reference}`}</button>}
        {canCancel && !payment.cancelled && payment.refunded === 0 && <button className="btn btn-outline" onClick={() => open({ action: 'cancel_payment', payment })}>Annuler {payment.reference}</button>}
        {canAdjust && !payment.cancelled && !payment.pending && payment.available > 0 && <button className="btn btn-outline" onClick={() => open({ action: 'refund_payment', payment })}>Rembourser {payment.reference}</button>}
      </div>
    </div>)}
    {directory.lines.map(line => <div className="card" key={line.id}>
      <p><strong>{line.description}</strong> · {line.contractReference} · Avoirs : {money(line.credits)} · Disponible pour un avoir : {money(line.available)}</p>
      {line.notes.map(note => <p className="cell-sub" key={note.id}>Avoir · {money(note.amount)} · {note.reason} · {note.issuedAt}</p>)}
      {canAdjust && line.available > 0 && <button className="btn btn-outline" onClick={() => open({ action: 'credit_note', line })}>Créer un avoir · {line.description}</button>}
    </div>)}
    {selection && target && <WorkPage title={`${operation} · ${label}`} busy={busy} onClose={() => setSelection(null)}>
      <ReviewedForm busy={busy} error={error} danger={cancelling} confirmLabel={cancelling ? 'Confirmer l’annulation' : crediting ? 'Confirmer l’avoir' : 'Confirmer le remboursement'}
        fields={[{ label: 'Dossier', value: matricule }, { label: 'Opération', value: operation }, { label: 'Référence', value: label }, ...(cancelling ? [{ label: 'État du paiement', previous: selection.action === 'cancel_payment' && selection.payment.pending ? 'En attente' : 'Enregistré', value: 'Annulé' }, { label: 'État du reçu', previous: 'Valide', value: 'Annulé' }] : [{ label: 'Montant FCFA', value: amount }, { label: crediting ? 'Solde disponible de la ligne' : 'Paiement net disponible', previous: money(maximum), value: money(after) }, ...(!crediting ? [{ label: 'Référence du remboursement', value: reference }] : [])]), { label: 'Motif', value: reason }]}
        consequence={cancelling ? 'Une contre-opération motivée sera enregistrée. Les affectations du paiement cesseront de compter et son reçu sera marqué annulé.' : crediting ? 'L’avoir réduira le montant attendu du contrat. Son montant est limité au solde de la ligne après remises, avoirs précédents et affectations actives.' : 'Le remboursement sera enregistré avec son motif. Si nécessaire, les affectations seront libérées depuis les échéances les plus récentes ; les reliquats seront conservés et toutes les écritures seront atomiques.'}
        validate={() => !cancelling && (!Number.isSafeInteger(Number(amount)) || Number(amount) <= 0 || Number(amount) > maximum) ? 'Saisissez un montant entier positif dans la limite disponible.' : null}
        onConfirm={save}>
        <p>{label}</p>
        {!cancelling && <><p>Montant disponible : {money(maximum)}</p><label className="form-group">Montant FCFA<input className="input" required type="number" min="1" max={maximum} step="1" value={amount} onChange={event => setAmount(event.target.value)} /></label></>}
        {selection.action === 'refund_payment' && <label className="form-group">Référence du remboursement<input className="input" required minLength={2} maxLength={160} value={reference} onChange={event => setReference(event.target.value)} /></label>}
        <label className="form-group">Motif de l’opération<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
        <DrawerActions><button className="btn btn-primary">Vérifier l’opération financière</button><DrawerCloseButton className="btn btn-outline">Fermer</DrawerCloseButton></DrawerActions>
      </ReviewedForm>
    </WorkPage>}
  </details>;
}
