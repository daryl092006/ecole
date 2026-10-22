'use client';
import { useState } from 'react';
import type { DatabaseRow } from '@/types/persistence';
import { loadTranscriptDocument } from '@/services/remoteCampusService';
import { usePortal } from '@/hooks/usePortal';
import { printTranscript } from '@/utils/printTranscript';

export default function TranscriptPrintAction({ document }: { document: DatabaseRow }) {
  const portal = usePortal();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <div><button className="btn btn-primary" disabled={busy} onClick={() => {
    setError(''); setBusy(true);
    void loadTranscriptDocument(document.id, portal.activeRole).then(printTranscript).catch(cause => setError(cause instanceof Error ? cause.message : 'Impression impossible.')).finally(() => setBusy(false));
  }}>{busy ? 'Préparation du relevé…' : 'Imprimer le relevé · A4, une page'}</button>{error && <p role="alert">{error}</p>}</div>;
}
