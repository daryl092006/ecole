import { useState } from 'react';
import type { ExamAttempt, ExamPaper } from '@/types/exam';
import type { ExamAction } from '@/services/examService';
import { displayExamAnswer } from '@/services/examQueryService';

interface Props {
  attempt: ExamAttempt;
  paper: ExamPaper;
  ended: boolean;
  editable: boolean;
  now: number;
  onAction: (action: ExamAction, payload?: Record<string, unknown>) => boolean;
}

export default function OnlineExamCorrectionPanel({ attempt, paper, ended, editable, now, onAction }: Props) {
  const [scores, setScores] = useState<Record<string, number | ''>>({});
  const handedIn = attempt.status === 'REMISE' || now >= Date.parse(attempt.deadline);
  return (
    <form className="mt-2" onSubmit={event => {
      event.preventDefault();
      onAction('exam.correct', {
        attemptId: attempt.id,
        scores: Object.fromEntries(paper.questions.filter(question => question.kind === 'TEXTE')
          .map(question => [question.id, scores[question.id] ?? attempt.scores[question.id]])),
      });
    }}>
      <h4>Copie {attempt.studentId} · {handedIn ? 'Remise' : 'En cours'}</h4>
      {ended && paper.questions.map(question => (
        <div key={question.id}>
          <p>{question.prompt}</p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{displayExamAnswer(question, attempt.answers[question.id])}</p>
          {question.kind === 'TEXTE'
            ? <label className="form-group">Points attribués /{question.points}
              <input className="input" type="number" required min="0" max={question.points} step="0.01" disabled={!editable}
                value={scores[question.id] ?? attempt.scores[question.id] ?? ''}
                onChange={event => setScores(previous => ({ ...previous, [question.id]: event.target.value === '' ? '' : Number(event.target.value) }))} />
            </label>
            : <p className="cell-sub">Correction automatique : {attempt.scores[question.id] ?? 'À calculer'} /{question.points}</p>}
        </div>
      ))}
      {!ended && <p className="cell-sub">Les réponses seront consultables après fermeture de l’épreuve.</p>}
      <button className="btn btn-primary" disabled={!ended || !editable || !handedIn}>Enregistrer la correction dans les notes</button>
    </form>
  );
}
