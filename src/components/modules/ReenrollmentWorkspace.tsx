'use client';
import IconButton from '@/components/ui/IconButton';
import EnrollmentDialog from './EnrollmentDialog';
import LoadingState from '@/components/ui/LoadingState';
import { useEffect, useState } from 'react';
import StudentRecordDialog from './StudentRecordDialog';
import { usePortal } from '@/hooks/usePortal';
import { loadReenrollmentCandidates } from '@/services/remoteCampusService';
import type { ReenrollmentDirectory } from '@/services/reenrollmentService';
import ResponsiveTable from '@/components/ui/ResponsiveTable';

export default function ReenrollmentWorkspace() {
  const [enrolling,setEnrolling]=useState(false);
  const portal = usePortal(); const [selected,setSelected]=useState<string | null>(null);
  const [data,setData] = useState<ReenrollmentDirectory | null>(null);
  const [error,setError] = useState(''); const [retry,setRetry] = useState(0); const [query,setQuery] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    loadReenrollmentCandidates(portal.activeRole,controller.signal).then(value => {if (!controller.signal.aborted) setData(value);}).catch(cause => {if (!controller.signal.aborted) setError(cause.message);});
    return () => controller.abort();
  },[portal.activeRole,portal.academicYearSelection,portal.academicYearContext?.selectedYearId,retry]);
  const rows = data?.students.filter(student => `${student.firstname} ${student.lastname} ${student.matricule}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))) || [];
  return <div>{enrolling && <EnrollmentDialog kind="reenroll" onClose={()=>{setEnrolling(false);setRetry(value=>value+1);}} />}{selected && <StudentRecordDialog matricule={selected} onClose={()=>setSelected(null)} />}<div className="page-intro"><h1>Réinscriptions</h1>{portal.perms.permissions.includes('student.lifecycle.manage') && portal.perms.permissions.includes('payment.record') && <button className="btn btn-primary" onClick={()=>setEnrolling(true)}>Réinscrire un ancien étudiant</button>}</div>{error ? <section className="card" role="alert"><p>{error}</p><IconButton className="btn btn-outline" onClick={() => setRetry(value => value+1)} label="Réessayer" /></section> : !data ? <LoadingState label="Vérification des inscriptions annuelles…" /> : <section className="card card-full"><h2>À réinscrire en {data.target.name}</h2>{!data.previous ? <p role="status">L’année scolaire immédiatement précédente n’est pas renseignée de manière certaine. Complétez le référentiel avant d’établir cette liste.</p> : <><p>Étudiants inscrits en {data.previous.name}, sans inscription enregistrée en {data.target.name}.</p><label className="form-group">Rechercher un étudiant<input className="input" type="search" placeholder="Nom ou matricule" value={query} onChange={event => setQuery(event.target.value)} /></label><ResponsiveTable className="data-table"><thead><tr><th>Matricule</th><th>Étudiant</th><th>Année précédente</th><th>Dossier</th></tr></thead><tbody>{rows.map(student => <tr key={student.id}><td>{student.matricule}</td><td>{student.firstname} {student.lastname}</td><td>{data.previous!.name}</td><td><IconButton className="btn btn-outline" onClick={()=>setSelected(student.matricule)} label="Consulter le dossier" /></td></tr>)}{!rows.length && <tr><td colSpan={4}>Aucun étudiant à réinscrire dans les inscriptions vérifiées pour ces années et votre périmètre.</td></tr>}</tbody></ResponsiveTable></>}</section>}</div>;
}
