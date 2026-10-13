'use client';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import StudentProfilePanel from '@/components/modules/StudentProfilePanel';
export default function StudentRecordPanel({ studentId }: { studentId: string }) {
  const state = usePortal(); const student = state.students.find(item => item.matricule === studentId);
  if (!student) return <div><div className="module-header"><h1>Dossier indisponible</h1><p>Ce matricule n’existe pas dans les données de la session ou n’est pas accessible à votre rôle.</p></div><Link className="btn btn-outline" href="/etudiants">Revenir aux étudiants</Link></div>;
  return <div><div className="module-header"><h1>{student.firstname} {student.lastname}</h1><p>{student.matricule} · {student.filiere} · {student.niveau} · {student.groupe}</p></div><div className="card card-full"><div className="card-header"><h2>Dossier individuel</h2><Link href="/etudiants" className="btn btn-outline">Revenir aux étudiants</Link></div><StudentProfilePanel student={student} /></div></div>;
}
