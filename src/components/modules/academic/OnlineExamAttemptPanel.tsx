import { useState } from 'react';
import type { ExamAttempt, ExamPaper } from '@/types/exam';
import type { ExamAction } from '@/services/examService';

interface Props {
  attempt: ExamAttempt;
  paper: ExamPaper;
  now: number;
  onAction: (action: ExamAction, payload?: Record<string, unknown>) => boolean;
}

export default function OnlineExamAttemptPanel({ attempt, paper, now, onAction }: Props) {
  const [confirming, setConfirming] = useState(false);
  const locked = attempt.status === 'REMISE' || now >= Date.parse(attempt.deadline);
  const remaining = Math.max(0, Math.ceil((Date.parse(attempt.deadline) - now) / 1000));
  const answered = paper.questions.filter(question => attempt.answers[question.id]?.trim()).length;
  return (
    <div>
      <p>{attempt.status === 'REMISE'
        ? 'Copie remise et verrouillée. Les résultats seront disponibles après validation et publication.'
        : `Temps restant : ${Math.floor(remaining / 60)} min ${String(remaining % 60).padStart(2, '0')} s`}</p>
      {paper.questions.map(question => (
        <label className="form-group" key={question.id}>{question.prompt} · {question.points} points
          {question.kind === 'TEXTE'
            ? <textarea className="input" maxLength={20000} disabled={locked} value={attempt.answers[question.id] ?? ''}
              onChange={event => onAction('exam.answer', { questionId: question.id, answer: event.target.value })} />
            : <select className="select-input" disabled={locked} value={attempt.answers[question.id] ?? ''}
              onChange={event => onAction('exam.answer', { questionId: question.id, answer: event.target.value })}>
              <option value="">Choisir</option>
              {question.options.map((option, i) => <option key={i} value={i}>{option}</option>)}
            </select>}
        </label>
      ))}
      {!locked && !confirming && <button className="btn btn-primary" onClick={() => setConfirming(true)}>Remettre définitivement ma copie</button>}
      {!locked && confirming && <div className="mt-2" role="group" aria-label="Confirmer la remise">
        <p>{answered} réponse(s) sur {paper.questions.length}. Après confirmation, vous ne pourrez plus modifier votre copie.</p>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => { if (onAction('exam.submit')) setConfirming(false); }}>Confirmer la remise de ma copie</button>
          <button className="btn btn-outline" onClick={() => setConfirming(false)}>Continuer l’épreuve</button>
        </div>
      </div>}
    </div>
  );
}
