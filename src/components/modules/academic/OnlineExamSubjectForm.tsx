import { useState } from 'react';
import type { ExamPaper, ExamQuestion } from '@/types/exam';
import type { ExamAction } from '@/services/examService';
import { createMockId } from '@/utils/createMockId';

interface Props {
  paper?: ExamPaper;
  windowMinutes: number;
  onAction: (action: ExamAction, payload?: Record<string, unknown>) => boolean;
}

export default function OnlineExamSubjectForm({ paper, windowMinutes, onAction }: Props) {
  const [questions, setQuestions] = useState<ExamQuestion[]>(paper?.questions ?? []);
  const [duration, setDuration] = useState(paper?.durationMinutes ?? Math.min(60, windowMinutes));
  function updateQuestion(id: string, values: Partial<ExamQuestion>) {
    setQuestions(previous => previous.map(question => question.id === id ? { ...question, ...values } : question));
  }
  return (
    <form onSubmit={event => { event.preventDefault(); onAction('exam.paper', { questions, durationMinutes: duration }); }}>
      <label className="form-group">Durée de la tentative en minutes
        <input className="input" required type="number" min="1" max={windowMinutes} value={duration} onChange={event => setDuration(Number(event.target.value))} />
      </label>
      {questions.map((question, index) => (
        <fieldset key={question.id} className="mb-2">
          <legend>Question {index + 1}</legend>
          <label className="form-group">Énoncé
            <textarea className="input" required maxLength={4000} value={question.prompt} onChange={event => updateQuestion(question.id, { prompt: event.target.value })} />
          </label>
          <label className="form-group">Type
            <select className="select-input" value={question.kind} onChange={event => updateQuestion(question.id, { kind: event.target.value as ExamQuestion['kind'] })}>
              <option value="TEXTE">Réponse ouverte</option><option value="QCM">QCM à choix unique</option>
            </select>
          </label>
          <label className="form-group">Points
            <input className="input" required type="number" min="0.01" max="20" step="0.01" value={question.points} onChange={event => updateQuestion(question.id, { points: Number(event.target.value) })} />
          </label>
          {question.kind === 'QCM' && <>
            <label className="form-group">Choix, un par ligne
              <textarea className="input" required value={question.options.join('\n')} onChange={event => updateQuestion(question.id, { options: event.target.value.split('\n') })} />
            </label>
            <label className="form-group">Bonne réponse
              <select className="select-input" required value={question.correctOption ?? ''} onChange={event => updateQuestion(question.id, { correctOption: Number(event.target.value) })}>
                <option value="" disabled>Choisir la bonne réponse</option>
                {question.options.map((option, i) => <option key={i} value={i}>{option || `Choix ${i + 1}`}</option>)}
              </select>
            </label>
          </>}
          <button className="btn btn-outline" type="button" onClick={() => setQuestions(previous => previous.filter(item => item.id !== question.id))}>Retirer la question {index + 1}</button>
        </fieldset>
      ))}
      <p>Total : {Math.round(questions.reduce((sum, question) => sum + question.points, 0) * 100) / 100} /20</p>
      <div className="btn-group">
        <button type="button" className="btn btn-outline" disabled={questions.length >= 100} onClick={() => setQuestions(previous => [...previous, {
          id: createMockId('Q'), prompt: '', kind: 'TEXTE', points: 1, options: ['Choix A', 'Choix B'],
        }])}>Ajouter une question</button>
        <button className="btn btn-primary" disabled={!questions.length}>Enregistrer le sujet</button>
      </div>
    </form>
  );
}
