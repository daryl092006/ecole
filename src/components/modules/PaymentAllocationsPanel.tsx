'use client';
import SecondaryDetails from '@/components/ui/SecondaryDetails';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { studentOperations } from '@/services/remoteCampusService';
import type { AllocatablePayment, PaymentAllocationDirectory } from '@/types/paymentAllocations';
import { ROLES } from '@/types/permissions';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';

const money = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;
export default function PaymentAllocationsPanel({ matricule, revision, directory, onSaved }: {
  matricule: string; revision: number; directory: PaymentAllocationDirectory; onSaved: (message: string) => void;
}) {
  const portal = usePortal();
  const [selected, setSelected] = useState<AllocatablePayment | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const installments = selected ? directory.installments.filter(row => row.enrollmentId === selected.enrollmentId) : [];
  const targets = installments.filter(row => Number(amounts[row.id] || 0) > 0).map(row => ({ installmentId: row.id, amount: Number(amounts[row.id]) }));
  const total = targets.reduce((sum, row) => sum + row.amount, 0);
  const canReallocate = portal.perms.permissions.includes('payment.record') && (portal.activeRole === ROLES.RAF || portal.activeRole === ROLES.IT);
  function open(payment: AllocatablePayment) {
    setSelected(payment); setReason(''); setError('');
    setAmounts(Object.fromEntries(payment.allocations.map(row => [row.installmentId, String(row.amount)])));
  }
  async function save() {
    if (!selected) return;
    if (!targets.length || total > selected.available) { setError('Affectez un montant positif sans dépasser le paiement disponible.'); return; }
    setBusy(true); setError('');
    try {
      const result = await studentOperations(matricule, portal.activeRole, { action: 'reallocate_payment', revision, enrollmentId: selected.enrollmentId, paymentId: selected.id, reason, targets });
      setSelected(null);
      portal.refreshCampus(); onSaved(`Réaffectation enregistrée. Montant restant à affecter : ${money(result.unallocated)}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Réaffectation indisponible.'); }
    finally { setBusy(false); }
  }
  return <div>
    <SecondaryDetails title="Affectations aux échéances">
      <p>Les nouveaux paiements règlent les échéances les plus anciennes. Les montants sans contrat approuvé ou excédentaires restent à affecter.</p>
      {directory.payments.map(payment => <div className="card" key={payment.id}>
        <p><strong>{payment.reference}</strong> · Affecté : {money(payment.allocated)} · Reste à affecter : {money(payment.unallocated)}{payment.cancelled ? ' · Annulé' : payment.pending ? ' · En attente' : ''}</p>
        {payment.allocations.map(allocation => {
          const installment = directory.installments.find(row => row.id === allocation.installmentId);
          return <p className="cell-sub" key={allocation.installmentId}>{installment ? `${installment.description} · ${installment.dueOn}` : 'Échéance historique'} : {money(allocation.amount)}</p>;
        })}
        {canReallocate && !payment.pending && !payment.cancelled && payment.available > 0 && directory.installments.some(row => row.enrollmentId === payment.enrollmentId) && <button className="btn btn-outline" onClick={() => open(payment)}>Réaffecter {payment.reference}</button>}
      </div>)}
    </SecondaryDetails>
    {selected && <WorkPage title={`Réaffecter · ${selected.reference}`} busy={busy} onClose={() => setSelected(null)}>
      <ReviewedForm busy={busy} error={error} confirmLabel="Confirmer la réaffectation"
        fields={[{ label: 'Paiement', value: selected.reference }, ...installments.map(row => ({ label: `${row.description} · ${row.dueOn}`, previous: money(selected.allocations.find(allocation => allocation.installmentId === row.id)?.amount || 0), value: money(Number(amounts[row.id] || 0)) })), { label: 'Reste à affecter', value: money(selected.available - total) }, { label: 'Motif', value: reason }]}
        consequence="Les anciennes affectations seront contrepassées et les nouvelles enregistrées ensemble. Le paiement et le reçu conservent leur montant et leur historique."
        validate={() => !targets.length ? 'Affectez au moins un montant positif.' : total > selected.available ? 'Le montant affecté dépasse le paiement disponible.' : null}
        onConfirm={save}>
        <p>Disponible après remboursements : <strong>{money(selected.available)}</strong>. Répartition entre lignes de frais au prorata de leurs soldes.</p>
        {installments.map(row => {
          const previous = selected.allocations.find(allocation => allocation.installmentId === row.id)?.amount || 0;
          const maximum = Math.max(0, row.amount - row.settled + previous);
          return <label className="form-group" key={row.id}>{row.description} · {row.dueOn} · Disponible {money(maximum)}
            <input className="input" aria-label={`Affectation ${row.description}`} type="number" min="0" max={maximum} step="1" value={amounts[row.id] || ''} onChange={event => setAmounts(current => ({ ...current, [row.id]: event.target.value }))} />
          </label>;
        })}
        <p>Total à affecter : {money(total)} · Reste à affecter : {money(selected.available - total)}</p>
        <label className="form-group">Motif de réaffectation<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
        <DrawerActions><button className="btn btn-primary">Vérifier la réaffectation</button><DrawerCloseButton className="btn btn-outline">Annuler</DrawerCloseButton></DrawerActions>
      </ReviewedForm>
    </WorkPage>}
  </div>;
}
