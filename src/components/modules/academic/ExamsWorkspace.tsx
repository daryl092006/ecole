'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePortal } from '@/hooks/usePortal';
import HistoricalExamsWorkspace from '@/components/modules/history/HistoricalExamsWorkspace';
import NativeAssessmentWorkspace from './NativeAssessmentWorkspace';

export default function ExamsWorkspace() {
  const state = usePortal();
  const params = useSearchParams();
  const canExams = state.perms.permissions.includes('schedule.view');
  const canControls = state.perms.permissions.some(permission => permission === 'academic.view' || permission === 'grade.view');
  const category = params.get('session') === 'controle' ? 'control' : params.get('session') === 'rattrapage' ? 'resit' : canExams ? 'exam' : 'control';
  const authorized = category === 'control' ? canControls : canExams;
  const historic = state.history.enabled && !state.relationalSnapshot.tables.evaluations?.length;
  const href = (session: string) => {
    const query = new URLSearchParams(params.toString());
    query.delete('epreuve');
    if (session) query.set('session', session);
    else query.delete('session');
    return `/academique/examens${query.size ? `?${query}` : ''}`;
  };
  return <>
    <nav className="exam-session-tabs" aria-label="Type d’évaluation">
      {canControls && <Link className={`btn ${category === 'control' ? 'btn-primary' : 'btn-outline'}`} href={href('controle')} aria-current={category === 'control' ? 'page' : undefined}>Contrôles continus</Link>}
      {canExams && <Link className={`btn ${category === 'exam' ? 'btn-primary' : 'btn-outline'}`} href={href('')} aria-current={category === 'exam' ? 'page' : undefined}>Session normale</Link>}
      {canExams && <Link className={`btn ${category === 'resit' ? 'btn-primary' : 'btn-outline'}`} href={href('rattrapage')} aria-current={category === 'resit' ? 'page' : undefined}>Rattrapages</Link>}
    </nav>
    {!authorized ? <section className="card"><h1>Accès refusé</h1><p>Ce type d’évaluation n’est pas disponible pour votre rôle.</p></section> : historic ? <HistoricalExamsWorkspace key={`${category}:${state.academicYearSelection}`} category={category} /> : <NativeAssessmentWorkspace key={`${category}:${state.academicYearSelection}`} category={category} />}
  </>;
}
