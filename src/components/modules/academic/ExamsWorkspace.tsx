'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePortal } from '@/hooks/usePortal';
import HistoricalExamsWorkspace from '@/components/modules/history/HistoricalExamsWorkspace';
import NativeAssessmentWorkspace from './NativeAssessmentWorkspace';

export default function ExamsWorkspace() {
  const state = usePortal();
  const params = useSearchParams();
  const category = params.get('session') === 'rattrapage' ? 'resit' : 'exam';
  const historic = state.history.enabled && !state.relationalSnapshot.tables.evaluations?.length;
  const href = (resit: boolean) => {
    const query = new URLSearchParams(params.toString());
    query.delete('epreuve');
    if (resit) query.set('session', 'rattrapage');
    else query.delete('session');
    return `/academique/examens${query.size ? `?${query}` : ''}`;
  };
  return <>
    <nav className="btn-group mb-2" aria-label="Session d’examen">
      <Link className={`btn ${category === 'exam' ? 'btn-primary' : 'btn-outline'}`} href={href(false)} aria-current={category === 'exam' ? 'page' : undefined}>Session normale</Link>
      <Link className={`btn ${category === 'resit' ? 'btn-primary' : 'btn-outline'}`} href={href(true)} aria-current={category === 'resit' ? 'page' : undefined}>Rattrapages</Link>
    </nav>
    {historic ? <HistoricalExamsWorkspace key={`${category}:${state.academicYearSelection}`} category={category} /> : <NativeAssessmentWorkspace key={`${category}:${state.academicYearSelection}`} category={category} />}
  </>;
}
