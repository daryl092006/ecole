'use client';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
import HistoricalWorkspace from '@/components/modules/history/HistoricalWorkspace';
import StudentCrudActions from './StudentCrudActions';
import StudentProfilePanel from '@/components/modules/StudentProfilePanel';
import { useState } from 'react';
export default function StudentRecordPanel({ studentId }: { studentId: string }) {
  const state = usePortal(); const student = state.students.find(item => item.matricule === studentId);
  const [section, setSection] = useState('identity');
  if (!student) return <div><div className="module-header"><h1>Dossier indisponible</h1><p>Matricule inconnu ou accès non autorisé.</p></div><Link className="btn btn-outline" href="/etudiants">Revenir aux étudiants</Link></div>;
  const sections = [{ id: 'identity', name: 'Identité et contacts', table: '' }, ...(student.historical && state.history.enabled ? [{ id: 'parcours', name: 'Années et groupes', table: 'etudiant_group' }, ...(state.perms.permissions.includes('finance.view') ? [{ id: 'finance', name: 'Frais et versements', table: 'frais_etudiants' }] : []), { id: 'notes', name: 'Notes', table: 'notes' }, { id: 'documents', name: 'Pièces du dossier', table: 'documents' }] : [])];
  return <div><Link href="/etudiants" className="btn btn-outline">← Revenir aux étudiants</Link><div className="page-intro"><div><span className="page-eyebrow">DOSSIER ÉTUDIANT · {student.matricule}</span><h1>{student.firstname} {student.lastname}</h1><p>{student.filiere} · {student.niveau} · {student.groupe}</p></div></div>
    <nav className="record-sections" aria-label="Sections du dossier étudiant">{sections.map(item => <button className={section === item.id ? 'selected' : ''} key={item.id} aria-pressed={section === item.id} onClick={() => setSection(item.id)}>{item.name}</button>)}</nav>
    {section === 'identity' ? <><section className="card card-full"><h2>Identité et contacts</h2><StudentProfilePanel key={student.matricule} student={student} /></section><details className="card mt-2"><summary>Retirer ce dossier de l’annuaire</summary><p>L’archivage conserve les données historiques et révoque l’accès. Il demande un motif et une confirmation.</p><StudentCrudActions matricule={student.matricule} /></details></> : student.historical && <HistoricalWorkspace key={section} section="student_detail" initialTable={sections.find(item => item.id === section)?.table} studentId={student.historical.sourceId} batchId={student.historical.batchId} />}
  </div>;
}
