'use client';
import IconButton from '@/components/ui/IconButton';
import Link from 'next/link';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { HISTORY_TABLES } from '@/data/historyCatalog';
import { historyValue } from '@/services/historyDisplayService';
import { loadHistoryDocument } from '@/services/historyService';
import { studentPath } from '@/constants/portalRoutes';
import type { HistoryRecord } from '@/types/history';
import WorkPage from '@/components/ui/WorkPage';

export default function HistoryRecordDetails({ table, record, onClose }: { table: string; record: HistoryRecord; onClose: () => void }) {
  const portal = usePortal(); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const catalog = portal.history.catalog; const spec = HISTORY_TABLES.find(item => item.table === table)!;
  const student = portal.students.find(student => student.historical?.sourceId === String(record.values.etudiant_id) && student.historical?.batchId === record.batchId);
  if (!catalog) return null;
  return <WorkPage title={`${spec.title} · ${student ? student.firstname + ' ' + student.lastname : 'Référence #' + record.sourceId}`} onClose={onClose}>
    {!!record.issues.length && <section className="review-notice"><div><strong>Informations à vérifier</strong><p>{record.issues.join(' · ')}</p></div></section>}
    <dl className="record-details-grid">{Object.entries(record.values).map(([key, value]) => <div key={key}><dt>{spec.fields[key] || key.replace(/_/g, ' ')}</dt><dd>{historyValue(key, value, record, catalog)}{typeof value === 'string' && /\.(pdf|jpe?g|png)$/i.test(value) && (record.files?.[key] === false ? <span className="missing-file-label">Fichier indisponible</span> : <IconButton className="btn btn-outline" disabled={loading} onClick={() => {
      setLoading(true); setError('');
      void loadHistoryDocument(record.id, key, portal.activeRole).then(url => { const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.click(); }).catch(cause => setError(cause instanceof Error ? cause.message : 'Téléchargement impossible.')).finally(() => setLoading(false));
    }} label="Télécharger la pièce" />)}</dd></div>)}</dl>
    {error && <p role="alert">{error}</p>}{student && <Link className="btn btn-primary" href={studentPath(student.matricule)}>Ouvrir le dossier de {student.firstname} {student.lastname}</Link>}
    
  </WorkPage>;
}
