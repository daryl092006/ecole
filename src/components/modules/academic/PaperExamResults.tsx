import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { useState } from 'react';
import type { Evaluation, Student } from '@/types';
import type { ExamAction } from '@/services/examService';

interface Props {
  evaluation: Evaluation;
  students: Student[];
  ended: boolean;
  onAction: (action: ExamAction, payload?: Record<string, unknown>) => boolean;
}

export default function PaperExamResults({ evaluation, students, ended, onAction }: Props) {
  const [rows, setRows] = useState(evaluation.grades.map(grade => ({ ...grade, absent: grade.absent ?? false })));
  const editable = ended && !evaluation.examCancelled && ['BROUILLON', 'SAISIES'].includes(evaluation.status);
  return (
    <form onSubmit={event => { event.preventDefault(); onAction('exam.results', { rows }); }}>
      <p>Après correction sur papier, saisissez les notes sur 20. Une absence reste sans note et bloque la soumission tant que son traitement n’est pas défini.</p>
      <div className="table-wrap">
        <ResponsiveTable className="data-table">
          <thead><tr><th>Étudiant</th><th>Absence constatée</th><th>Note /20</th></tr></thead>
          <tbody>{rows.map((grade, index) => {
            const student = students.find(item => item.matricule === grade.matricule);
            return (
              <tr key={grade.matricule}>
                <td>{student ? `${student.firstname} ${student.lastname}` : grade.matricule}<div className="cell-sub">{grade.matricule}</div></td>
                <td><input aria-label={`Absent ${grade.matricule}`} type="checkbox" checked={grade.absent} disabled={!editable}
                  onChange={event => setRows(previous => previous.map((item, i) => i === index
                    ? { ...item, absent: event.target.checked, value: event.target.checked ? null : item.value } : item))} /></td>
                <td><input aria-label={`Résultat ${grade.matricule}`} className="input" type="number" min="0" max="20" step="0.01"
                  disabled={!editable || grade.absent} value={grade.value ?? ''}
                  onChange={event => setRows(previous => previous.map((item, i) => i === index
                    ? { ...item, value: event.target.value === '' ? null : Number(event.target.value) } : item))} /></td>
              </tr>
            );
          })}</tbody>
        </ResponsiveTable>
      </div>
      <button className="btn btn-primary" disabled={!editable}>Enregistrer les résultats papier</button>
      {!ended && <p>La saisie sera ouverte après la fin de l’épreuve.</p>}
      {ended && !editable && <p>Les résultats sont verrouillés. La direction académique peut retourner les notes à la saisie avant leur validation.</p>}
    </form>
  );
}
