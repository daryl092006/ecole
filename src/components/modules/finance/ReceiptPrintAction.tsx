'use client';

import { useState } from 'react';
import { loadStudentReceipt } from '@/services/remoteCampusService';
import { usePortal } from '@/hooks/usePortal';
import { printDocument } from '@/utils/printDocument';
import { paymentReceiptMarkup } from '@/services/paymentReceiptService';

export default function ReceiptPrintAction({ matricule, receiptId }: { matricule: string; receiptId: string }) {
  const portal = usePortal();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy}
        onClick={() => {
          setError('');
          setBusy(true);
          void loadStudentReceipt(matricule, receiptId, portal.activeRole)
            .then(({ receipt }) => {
              printDocument(`Recu-${receipt.reference}`, paymentReceiptMarkup(receipt));
            })
            .catch(cause => setError(cause instanceof Error ? cause.message : 'Impression du reçu impossible.'))
            .finally(() => setBusy(false));
        }}
      >
        {busy ? 'Préparation de la quittance…' : 'Imprimer la quittance officielle · A4'}
      </button>
      {error && <p role="alert" className="cell-sub" style={{ color: '#b91c1c', marginTop: '0.25rem' }}>{error}</p>}
    </div>
  );
}
