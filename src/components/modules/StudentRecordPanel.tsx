'use client';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import HistoricalWorkspace from '@/components/modules/history/HistoricalWorkspace';
import StudentCrudActions from './StudentCrudActions';
import StudentProfilePanel from '@/components/modules/StudentProfilePanel';
export default function StudentRecordPanel({ studentId }: { studentId: string }) {
  const state = usePortal(); const student = state.students.find(item => item.matricule === studentId);
  if (!student) return <div><div className="module-header"><h1>Dossier indisponible</h1><p>Matricule inconnu ou accès non autorisé.</p></div><Link className="btn btn-outline" href="/etudiants">Revenir aux étudiants</Link></div>;
  return <div><div className="module-header"><h1>{student.firstname} {student.lastname}</h1><StudentCrudActions matricule={student.matricule} /><p>{student.matricule} · {student.filiere} · {student.niveau} · {student.groupe}</p></div><div className="card card-full"><div className="card-header"><h2>Dossier individuel</h2><Link href="/etudiants" className="btn btn-outline">Revenir aux étudiants</Link></div><StudentProfilePanel key={student.matricule} student={student} /></div>{student.historical && <div className="mt-2"><HistoricalWorkspace key={student.matricule} section="student_detail" studentId={student.historical.sourceId} batchId={student.historical.batchId} /></div>}</div>;
}
