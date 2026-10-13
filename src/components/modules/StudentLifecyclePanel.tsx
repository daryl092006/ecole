import FormFeedback from '@/components/ui/FormFeedback';
import { useFeedback } from '@/hooks/useFeedback';
import { displayLabel } from '@/utils/display';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { ROLES } from '@/types/permissions';
import { workflowError } from '@/utils/workflowError';

export default function StudentLifecyclePanel() {
  const state = usePortal(); const { data, runWorkflow } = state.campus;
  const [studentId, setStudentId] = useState(''); const [action, setAction] = useState('reenroll');
  const [groupId, setGroupId] = useState(''); const [reason, setReason] = useState(''); const [feedback, setFeedback, feedbackError] = useFeedback();
  const selected = state.students.find(item => item.matricule === studentId);
  const allowed = state.perms.permissions.includes('student.lifecycle.manage');
  return <div><div className="module-header"><h1>Réinscriptions et statuts</h1><p>Un dossier par étudiant, avec les inscriptions et décisions conservées pour chaque année.</p></div>
    {allowed && <form className="card card-full mb-2" onSubmit={event => {
      event.preventDefault(); try {
        runWorkflow(action === 'reenroll' ? 'student.reenroll' : 'student.status', action === 'reenroll' ? { studentId, groupId, reason } : { studentId, status: action, reason });
        setReason(''); setGroupId(''); setFeedback('Le parcours a été mis à jour. L’historique est conservé.');
      } catch (error) { setFeedback(workflowError(error), true); }
    }}><h2>Mettre à jour le parcours</h2><div className="form-row"><label className="form-group">Étudiant<select required className="select-input" value={studentId} onChange={event => { setStudentId(event.target.value); setGroupId(''); setFeedback(''); }}><option value="">Sélectionner</option>{state.students.map(item => <option key={item.matricule} value={item.matricule}>{item.firstname} {item.lastname} · {item.matricule}</option>)}</select></label>
      <label className="form-group">Opération<select className="select-input" value={action} onChange={event => { setAction(event.target.value); setFeedback(''); }}><option value="reenroll">Réinscrire dans une nouvelle année</option><option value="Abandonné">Déclarer un abandon</option><option value="Suspendu">Suspendre la scolarité</option><option value="Inscrit">Reprendre la scolarité</option>{state.activeRole === ROLES.DA && <option value="Diplômé">Déclarer le diplôme</option>}</select></label>
      {action === 'reenroll' && <label className="form-group">Groupe de la nouvelle année<select required className="select-input" value={groupId} onChange={event => setGroupId(event.target.value)}><option value="">Sélectionner un groupe compatible</option>{data.groups.filter(item => item.academicYearId !== selected?.academicYearId && item.filieres.includes(selected?.filiere || '') && data.academicYears.some(year => year.id === item.academicYearId && year.status === 'OUVERTE')).map(item => <option key={item.id} value={item.id}>{item.academicYear} · {item.niveau} · {item.name}</option>)}</select></label>}
    </div><label className="form-group">Motif<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><button className="btn btn-primary" disabled={!selected}>Confirmer l’opération</button><p className="cell-sub">Le passage au niveau suivant exige une admission aux deux semestres. Les anciennes notes et créances restent rattachées à leur année.</p><FormFeedback message={feedback} error={feedbackError} /></form>}
    <div className="card card-full"><h2>Historique des inscriptions</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Étudiant</th><th>Année</th><th>Niveau / Groupe</th><th>Statut</th><th>Historique</th></tr></thead><tbody>{state.students.map(student => <tr key={student.matricule}><td><strong>{student.firstname} {student.lastname}</strong><div className="cell-sub">{student.matricule}</div></td><td colSpan={2}>{data.enrollments.filter(item => item.studentId === student.matricule).map(item => <div key={item.id} className="mb-2">{data.academicYears.find(year => year.id === item.academicYearId)?.label || item.academicYearId} · {item.level} · {data.groups.find(group => group.id === item.groupId)?.name}<div className="cell-sub">{displayLabel(item.status)} · {item.reason}</div></div>)}</td><td><span className="pill pill-default">{student.status}</span></td><td><details><summary>{student.history.length} événement(s)</summary>{[...student.history].reverse().map((item, index) => <p className="cell-sub" key={index}>{new Date(item.date).toLocaleDateString('fr-FR')} · {item.text}</p>)}</details></td></tr>)}{!state.students.length && <tr><td colSpan={5}>Aucun dossier étudiant. Créez d’abord les dossiers depuis la liste des étudiants.</td></tr>}</tbody></table></div></div>
  </div>;
}
