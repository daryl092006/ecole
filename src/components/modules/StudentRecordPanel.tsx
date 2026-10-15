'use client';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import ConnectedDomainWorkspace from './ConnectedDomainWorkspace';
import HistoricalWorkspace from '@/components/modules/history/HistoricalWorkspace';
import StudentOperationsPanel from './StudentOperationsPanel';
import StudentCrudActions from './StudentCrudActions';
import StudentProfilePanel from '@/components/modules/StudentProfilePanel';
import LoadingState from '@/components/ui/LoadingState';
import { loadStudentRecord } from '@/services/remoteCampusService';
import type { Student } from '@/types/student';
import { useEffect, useState } from 'react';
export default function StudentRecordPanel({ studentId, embedded = false }: { studentId: string; embedded?: boolean }) {
  const state = usePortal();
  const current = state.students.find(item => item.matricule === studentId);
  const [loaded,setLoaded] = useState<Student | null>(null); const [error,setError] = useState(''); const [retry,setRetry] = useState(0);
  useEffect(() => {
    const controller=new AbortController(); setLoaded(null); setError('');
    void loadStudentRecord(studentId,state.activeRole,controller.signal).then(result=>{if(!controller.signal.aborted)setLoaded(result.student);}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});
    return ()=>controller.abort();
  },[studentId,state.activeRole,state.academicYearSelection,current,retry]);
  const student=loaded || current;
  const [section, setSection] = useState('identity');
  if (!student && !error) return <LoadingState label="Chargement du dossier étudiant…" />;
  if (!student) return <div><div className="module-header"><h1>Dossier indisponible</h1><p>{error}</p></div><button className="btn btn-outline" onClick={()=>setRetry(value=>value+1)}>Réessayer</button></div>;
  const annualEnrollments=state.campus.data.enrollments.filter(item=>item.studentId===student.matricule);
  const selectedYear=state.academicYearContext?.years.find(item=>item.id===state.academicYearContext?.selectedYearId);
  const sections = [{ id: 'identity', name: 'Identité et contacts', table: '', native: '' },
    { id: 'parcours', name: 'Années et groupes', table: 'etudiant_group', native: 'stud_status' },
    ...(state.perms.permissions.includes('finance.view') ? [{ id: 'finance', name: 'Frais et versements', table: 'frais_etudiants', native: 'fin_payments' }] : []),
    ...(state.perms.permissions.includes('grade.view') ? [{ id: 'notes', name: 'Notes', table: 'notes', native: 'acad_grades' }] : []),
    { id: 'documents', name: 'Pièces du dossier', table: 'documents', native: 'stud_cards' }];
  return <div>{!embedded && <Link href="/etudiants" className="btn btn-outline">← Revenir aux étudiants</Link>}<div className="page-intro"><div><span className="page-eyebrow">DOSSIER ÉTUDIANT · {student.matricule}</span><h1>{student.firstname} {student.lastname}</h1><p>{[student.filiere,student.niveau,student.groupe].filter(value=>value && !['À reprendre','Non affecté'].includes(value)).join(' · ') || 'Formation et groupe non confirmés pour l’année consultée'}</p></div></div>
    <section className="card card-full" aria-label="Situation scolaire et financière"><h2>Situation {selectedYear ? `en ${selectedYear.name}` : 'dans les années consultées'}</h2><dl className="data-summary"><div><dt>Inscription annuelle</dt><dd>{annualEnrollments.length ? annualEnrollments.map(item=><p key={item.id}>{state.campus.data.academicYears.find(year=>year.id===item.academicYearId)?.label} · {item.status === 'REINSCRIT' ? 'Réinscrit' : item.status === 'INSCRIT' ? 'Inscrit' : item.status}</p>) : 'Aucune inscription enregistrée pour l’année consultée'}</dd></div>{state.perms.permissions.includes('finance.view') && <><div><dt>Montant payé</dt><dd>{student.financials?.available === true ? `${student.financials.paid.toLocaleString('fr-FR')} FCFA` : 'Montant non établi : paiements et rattachements à vérifier'}</dd></div><div><dt>Reste à payer</dt><dd>{student.financials?.available === true ? `${student.financials.remaining.toLocaleString('fr-FR')} FCFA` : 'Solde non établi'}</dd></div></>}</dl><p className="cell-sub">Le statut « Réinscrit » résulte d’une inscription enregistrée dans cette année. Un paiement enregistré produit le montant payé et son reçu ; il ne change pas à lui seul le statut scolaire.</p>{!annualEnrollments.length && <p>L’inscription de cette année doit être régularisée avant un encaissement. Consultez le parcours et les actions de gestion ci-dessous.</p>}{state.history.error && <p role="alert">{state.history.error}<button className="btn btn-outline" onClick={state.history.retry}>Réessayer l’historique</button></p>}{error && <p role="alert">{error}<button className="btn btn-outline" onClick={()=>setRetry(value=>value+1)}>Réessayer le dossier</button></p>}</section>
    {section === 'identity' && <StudentOperationsPanel matricule={student.matricule} />}
    <nav className="record-sections" aria-label="Sections du dossier étudiant">{sections.map(item => <button className={section === item.id ? 'selected' : ''} key={item.id} aria-pressed={section === item.id} onClick={() => setSection(item.id)}>{item.name}</button>)}</nav>
    {section === 'identity' ? <><section className="card card-full"><h2>Identité et contacts</h2><StudentProfilePanel key={student.matricule} student={student} /></section><details className="card mt-2"><summary>Retirer ce dossier de l’annuaire</summary><p>L’archivage conserve les données historiques et révoque l’accès. Il demande un motif et une confirmation.</p><StudentCrudActions matricule={student.matricule} /></details></> : !annualEnrollments.length && student.historical && state.history.enabled ? <HistoricalWorkspace embedded key={section} section={`student_${section}`} initialTable={sections.find(item => item.id === section)?.table} studentId={student.historical.sourceId} batchId={student.historical.batchId} /> : <ConnectedDomainWorkspace key={section} section={sections.find(item => item.id === section)!.native} studentMatricule={student.matricule} />}
  </div>;
}
