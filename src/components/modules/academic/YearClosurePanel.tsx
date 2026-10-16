'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/hooks/usePortal';
import { loadYearClosureReview } from '@/services/remoteCampusService';
import type { YearClosureReview } from '@/services/academicYearClosureService';
import LoadingState from '@/components/ui/LoadingState';
import WorkPage from '@/components/ui/WorkPage';

export default function YearClosurePanel({ yearId, yearName, canClose, onClose, onConfirm }: {
  yearId: string; yearName: string; canClose: boolean; onClose: () => void; onConfirm: (revision: number) => void;
}) {
  const portal = usePortal();
  const router = useRouter();
  const [review, setReview] = useState<YearClosureReview | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setReview(null); setError('');
    void loadYearClosureReview(yearId, portal.activeRole, controller.signal).then(result => {
      if (!controller.signal.aborted) setReview(result);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Bilan indisponible.'); });
    return () => controller.abort();
  }, [yearId, portal.activeRole, retry]);
  return <WorkPage title={`Bilan avant clôture · ${yearName}`} onClose={onClose}>
    <p>Ces contrôles portent sur les données enregistrées de {yearName}. Le serveur les vérifie à nouveau au moment de la clôture.</p>
    {error ? <div role="alert"><p>{error}</p><button className="btn btn-outline" onClick={() => setRetry(value => value + 1)}>Réessayer le bilan</button></div> : !review ? <LoadingState label="Vérification des évaluations, réclamations et tentatives…" /> : <>
      <ul>{review.checks.map(check => <li key={check.key}><strong>{check.count}</strong> — {check.label}{check.count > 0 && portal.availableTabs.some(tab => tab.subTabs?.some(page => page.href === check.href)) && <> <button className="btn btn-outline" onClick={() => { portal.changeAcademicYearSelection(yearId); router.push(check.href); }}>Consulter</button></>}</li>)}</ul>
      <p>Les obligations de jury, de relevés et de clôture comptable restent à préciser avec l’établissement. Elles ne sont pas certifiées par ce bilan. Les dettes restent conservées dans leur année d’origine.</p>
      {!canClose && <p>Pour clôturer, retirez d’abord la désignation d’année de travail, puis préparez la clôture.</p>}
      <div className="btn-group"><button className="btn btn-outline" onClick={() => setRetry(value => value + 1)}>Actualiser le bilan</button>{canClose && <button className="btn btn-primary" disabled={!review.ready} onClick={() => onConfirm(review.revision)}>Vérifier la clôture définitive</button>}</div>
    </>}
  </WorkPage>;
}
