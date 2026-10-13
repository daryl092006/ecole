import { useState } from 'react';
import type { Announcement, RoleName, Student, ClassItem, Evaluation, Session, Reclamation } from '@/types';

interface EspaceModuleProps {
  students: Student[];
  classes: ClassItem[];
  evaluations: Evaluation[];
  sessions: Session[];
  reclamations: Reclamation[];
  ownDataOnly: boolean;
  addReclamation: (studentId: string, evaluationId: string, reason: string) => void;
  activeRole: RoleName;
  currentSubTab: string;
  announcements: Announcement[];
}

export default function EspaceModule({ activeRole, currentSubTab, announcements, students, classes, evaluations, sessions, reclamations, ownDataOnly, addReclamation }: EspaceModuleProps) {
  const [reason, setReason] = useState('');
  const [evaluationId, setEvaluationId] = useState('');
  const [feedback, setFeedback] = useState('');
  const student = ownDataOnly ? students[0] : undefined;
  return (
    <div>
      {currentSubTab === 'espace_dashboard' && (
        <>
          <div className="module-header">
            <h1>Mon Espace Personnel</h1>
            <p>Tableau de bord adapté à votre rôle. Bienvenue, <strong>{activeRole}</strong>.</p>
          </div>
          <div className="card card-full" style={{ marginTop: '1rem' }}>
            {student ? <><h2>{student.firstname} {student.lastname}</h2><p>{student.matricule} · {student.filiere} · {student.niveau} · {student.groupe}</p></> : <p>{classes.length} enseignement(s) visible(s) · {sessions.length} séance(s) visible(s).</p>}
            {sessions.map(session => <p key={session.id}>{session.date} · {session.startTime}–{session.endTime} · {classes.find(item => item.id === session.classId)?.name} · Salle {session.roomCode}</p>)}
            {student && <>
              <h2>Mes notes publiées</h2>
              {evaluations.filter(item => item.status === 'PUBLIEES').map(item => <p key={item.id}>{item.name} : {item.grades.find(grade => grade.matricule === student.matricule)?.value ?? '—'}/20</p>)}
              <form onSubmit={event => { event.preventDefault(); try { addReclamation(student.matricule, evaluationId, reason); setReason(''); setEvaluationId(''); setFeedback('Réclamation déposée.'); } catch (error) { setFeedback(error instanceof Error ? error.message : 'Dépôt impossible.'); } }}>
                <h3>Déposer une réclamation</h3><select className="select-input" required value={evaluationId} onChange={event => setEvaluationId(event.target.value)}><option value="">Choisir une note publiée</option>{evaluations.filter(item => item.status === 'PUBLIEES').map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <label>Motif<textarea className="input" required value={reason} onChange={event => setReason(event.target.value)} /></label><button className="btn btn-primary">Déposer</button>{feedback && <p role="status">{feedback}</p>}
              </form>
              <h3>Mes réclamations</h3>{reclamations.map(item => <p key={item.id}>{item.id} · {item.status} · {item.response || item.reason}</p>)}
            </> }
          </div>
        </>
      )}

      {currentSubTab === 'espace_announcements' && (
        <>
          <div className="module-header">
            <h1>Annonces &amp; Actualités</h1>
            <p>Retrouvez ici toutes les notes opérationnelles et informations officielles d'ESCEN.</p>
          </div>
          <div className="ann-grid">
            {announcements.length === 0 && <div className="empty-state"><strong>Aucune annonce</strong><span>Les annonces publiées apparaîtront ici.</span></div>}
            {announcements.map(a => (
              <div key={a.id} className="ann-card">
                <div className="ann-meta">
                  <span className="ann-tag">{a.audience}</span>
                  <span className="ann-date">{a.date}</span>
                </div>
                <h3>{a.title}</h3>
                <p>{a.content}</p>
                <div className="ann-author">Auteur : {a.author}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
