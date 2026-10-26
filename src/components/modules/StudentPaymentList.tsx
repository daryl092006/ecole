'use client';

import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkPage from '@/components/ui/WorkPage';
import PaymentAdjustmentsPanel from './PaymentAdjustmentsPanel';
import PaymentAllocationsPanel from './PaymentAllocationsPanel';
import { connectedRecordValue } from '@/services/connectedRecordDisplayService';
import type { PaymentAdjustmentDirectory } from '@/types/paymentAdjustments';
import type { PaymentAllocationDirectory } from '@/types/paymentAllocations';

interface Payment {
  id: string; reference: string; amount: number; paidOn: string;
  cancelled: boolean; pending?: boolean;
}

export default function StudentPaymentList({ matricule, payments, revision, adjustmentDirectory, allocationDirectory, onSaved }: {
  matricule: string;
  payments: Payment[];
  revision: number;
  adjustmentDirectory?: PaymentAdjustmentDirectory;
  allocationDirectory?: PaymentAllocationDirectory;
  onSaved: (message: string) => void;
}) {
  const { relationalSnapshot: snapshot } = usePortal();
  const [selectedId, setSelectedId] = useState('');
  const selected = payments.find(payment => payment.id === selectedId);
  const adjustment = adjustmentDirectory?.payments.find(payment => payment.id === selectedId);
  const onChanged = (message: string) => { setSelectedId(''); onSaved(message); };
  return <>
    {!payments.length ? <p>Aucun versement enregistré pour l’année consultée.</p> : <div className="table-wrap"><ResponsiveTable className="data-table">
      <thead><tr><th>Date</th><th>Montant</th><th>Mode</th><th>Référence</th></tr></thead>
      <tbody>{payments.map(payment => {
        const row = snapshot.tables.payments?.find(item => item.id === payment.id);
        return <tr key={payment.id}>
          <td>{connectedRecordValue('payments', 'paid_on', payment.paidOn, snapshot)}</td>
          <td><strong>{payment.amount.toLocaleString('fr-FR')} FCFA</strong>
            {(payment.cancelled || payment.pending) && <div className="cell-sub">{payment.cancelled ? 'Annulé' : 'En attente'}</div>}
          </td>
          <td>{connectedRecordValue('payments', 'method', row?.method, snapshot)}</td>
          <td><button type="button" className="payment-reference" aria-haspopup="dialog" aria-label={`Versement ${payment.reference}`} onClick={() => setSelectedId(payment.id)}>{payment.reference}</button></td>
        </tr>;
      })}</tbody>
    </ResponsiveTable></div>}
    {selected && <WorkPage title={`Versement ${selected.reference}`} onClose={() => setSelectedId('')}>
      <p>{connectedRecordValue('payments', 'paid_on', selected.paidOn, snapshot)} · {selected.amount.toLocaleString('fr-FR')} FCFA</p>
      {adjustmentDirectory && <PaymentAdjustmentsPanel inline matricule={matricule} revision={revision}
        directory={{ payments: adjustment ? [adjustment] : [], lines: adjustmentDirectory.lines.filter(line => line.enrollmentId === adjustment?.enrollmentId) }} onSaved={onChanged} />}
      {allocationDirectory && <PaymentAllocationsPanel inline matricule={matricule} revision={revision}
        directory={{ payments: allocationDirectory.payments.filter(payment => payment.id === selected.id), installments: allocationDirectory.installments }} onSaved={onChanged} />}
    </WorkPage>}
  </>;
}
