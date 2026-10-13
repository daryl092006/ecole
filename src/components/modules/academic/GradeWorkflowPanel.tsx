import { FilePlus } from 'lucide-react';
import type { ClassItem, Evaluation, PermissionSchema } from '@/types';

interface Props {
  perms: PermissionSchema;
  classes: ClassItem[];
  selectedClass: ClassItem | null;
  onSelectClass: (value: ClassItem | null) => void;
  evaluations: Evaluation[];
  newEvalName: string;
  onEvalNameChange: (value: string) => void;
  newEvalType: string;
  onEvalTypeChange: (value: string) => void;
  onCreate: () => void;
  onGradeChange: (evaluationId: string, gradeIndex: number, value: number | null) => void;
  onSubmit: (evaluation: Evaluation) => void;
  onStatusChange: (evaluation: Evaluation, status: Evaluation['status'], comment?: string) => void;
}

export default function GradeWorkflowPanel(props: Props) {
  if (!props.selectedClass) return (
    <div className="card card-full">
      <div className="card-header"><h2>Sélectionner un enseignement</h2></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Matière</th><th>Niveau</th><th>Enseignant</th><th>Action</th></tr></thead>
        <tbody>{props.classes.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.level}</td><td>{item.teacher}</td><td><button className="btn btn-sm" onClick={() => props.onSelectClass(item)}>Ouvrir →</button></td></tr>)}</tbody>
      </table></div>
    </div>
  );

  return <div className="card card-full">
    <div className="card-header"><h2>Notes : {props.selectedClass.name}</h2><button className="btn btn-sm btn-outline" onClick={() => props.onSelectClass(null)}>← Retour</button></div>
    {props.perms.permissions.includes('evaluation.create') && <div className="form-row mt-2">
      <div className="form-group" style={{ flex: 1 }}><label className="form-label">Évaluation</label><input className="input" value={props.newEvalName} onChange={event => props.onEvalNameChange(event.target.value)} /></div>
      <select className="select-input" value={props.newEvalType} onChange={event => props.onEvalTypeChange(event.target.value)}><option>Devoir</option><option>Examen</option><option>Projet</option><option>TP</option></select>
      <button className="btn btn-primary" onClick={props.onCreate}><FilePlus size={14} /> Créer</button>
    </div>}
    {props.evaluations.map(evaluation => <div key={evaluation.id} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
      <div className="card-header"><strong>{evaluation.name}</strong><span className={`pill ${evaluation.status === 'PUBLIEES' ? 'pill-success' : 'pill-warning'}`}>{evaluation.status}</span></div>
      {evaluation.grades.map((grade, index) => <div key={grade.matricule} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0' }}><code>{grade.matricule}</code><input className="input" style={{ width: 80 }} type="number" min="0" max="20" step="0.5" value={grade.value ?? ''} disabled={!props.perms.permissions.includes('grade.enter') || !['BROUILLON', 'SAISIES'].includes(evaluation.status)} onChange={event => props.onGradeChange(evaluation.id, index, event.target.value === '' ? null : Number(event.target.value))} /></div>)}
      <div className="btn-group mt-2">
        {props.perms.permissions.includes('grade.submit') && ['BROUILLON', 'SAISIES'].includes(evaluation.status) && <button className="btn btn-sm btn-primary" onClick={() => props.onSubmit(evaluation)}>Soumettre</button>}
        {props.perms.permissions.includes('grade.review') && evaluation.status === 'SOUMISES' && <><button className="btn btn-sm btn-primary" onClick={() => props.onStatusChange(evaluation, 'A_CONTROLER')}>Prendre en contrôle</button><button className="btn btn-sm btn-outline" onClick={() => { const motif = prompt('Motif du retour à l’enseignant'); if (motif) props.onStatusChange(evaluation, 'SAISIES', motif); }}>Retourner</button></>}
        {props.perms.permissions.includes('grade.approve') && evaluation.status === 'A_CONTROLER' && <><button className="btn btn-sm btn-success" onClick={() => props.onStatusChange(evaluation, 'VALIDEES')}>Valider</button><button className="btn btn-sm btn-outline" onClick={() => { const motif = prompt('Motif du retour à l’enseignant'); if (motif) props.onStatusChange(evaluation, 'SAISIES', motif); }}>Retourner</button></>}
        {props.perms.permissions.includes('grade.publish') && evaluation.status === 'VALIDEES' && <button className="btn btn-sm btn-success" onClick={() => props.onStatusChange(evaluation, 'PUBLIEES')}>Publier</button>}
      </div>
      {evaluation.history.length > 0 && <details className="mt-2"><summary>Historique ({evaluation.history.length})</summary>{evaluation.history.map(entry => <div key={entry.id} className="text-muted" style={{ fontSize: '0.78rem', paddingTop: 4 }}>{new Date(entry.date).toLocaleString('fr-FR')} · {entry.role} · {entry.from} → {entry.to}{entry.comment ? ` · ${entry.comment}` : ''}</div>)}</details>}
    </div>)}
  </div>;
}
