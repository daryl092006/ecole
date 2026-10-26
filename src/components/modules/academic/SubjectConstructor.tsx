'use client';
import { useState } from 'react';
import type { SubjectInput, SubjectPart, SubjectQuestion } from '@/types/subject';
import { changeQuestionType, questionType, questionTypes, questionCompletionIssue, subjectCompletion, subjectPlainText } from '@/services/subjectContentService';
import { subjectPoints } from '@/services/subjectCompositionService';
import SubjectRichEditor from '@/components/ui/SubjectRichEditor';

export default function SubjectConstructor({ subject, onChange, disabled }: { subject: SubjectInput; onChange: (subject: SubjectInput) => void; disabled: boolean }) {
  const [partIndex, setPartIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [removal, setRemoval] = useState<'part' | 'question' | null>(null);
  const part = subject.parts[partIndex];
  const question = part?.questions[questionIndex];
  const completion = subjectCompletion(subject);
  const updatePart = (values: Partial<SubjectPart>) => onChange({ ...subject, parts: subject.parts.map((row, index) => index === partIndex ? { ...row, ...values } : row) });
  const updateQuestion = (values: Partial<SubjectQuestion>) => updatePart({ questions: part.questions.map((row, index) => index === questionIndex ? { ...row, ...values } : row) });
  return <div className="subject-constructor">
    <dl className="subject-constructor-stats">
      <div><dt>Parties</dt><dd>{subject.parts.length}</dd></div><div><dt>Questions</dt><dd>{completion.questions}</dd></div>
      <div><dt>Points</dt><dd>{subjectPoints(subject)}</dd></div><div><dt>Questions complètes</dt><dd>{completion.percent} %</dd></div>
    </dl>
    {removal && <section role="alert" className="restricted-box"><h3>{removal === 'part' ? 'Retirer la partie et ses questions ?' : 'Retirer cette question ?'}</h3><p>Le contenu sera retiré du brouillon. La version enregistrée restera conservée.</p><div className="btn-group">
      <button type="button" className="btn btn-outline" onClick={() => setRemoval(null)}>Conserver le contenu</button>
      <button type="button" className="btn btn-danger" onClick={() => { if (removal === 'part') { onChange({ ...subject, parts: subject.parts.filter((_, index) => index !== partIndex) }); setPartIndex(0); } else updatePart({ questions: part.questions.filter((_, index) => index !== questionIndex) }); setQuestionIndex(0); setRemoval(null); }}>Confirmer le retrait du contenu</button>
    </div></section>}
    <div className="subject-constructor-columns">
      <aside className="subject-constructor-parts">
        <h2>Parties de l’épreuve</h2>
        <button className="btn btn-outline" type="button" disabled={disabled || subject.parts.length >= 20} onClick={() => { onChange({ ...subject, parts: [...subject.parts, { title: `Partie ${subject.parts.length + 1}`, instructions: '', questions: [] }] }); setPartIndex(subject.parts.length); setQuestionIndex(0); }}>Ajouter une partie</button>
        <nav aria-label="Parties et questions" className="subject-constructor-outline">{subject.parts.map((item, index) => <div key={index}>
          <button type="button" aria-current={index === partIndex ? 'true' : undefined} onClick={() => { setPartIndex(index); setQuestionIndex(0); setRemoval(null); }}><strong>{item.title || `Partie ${index + 1}`}</strong><span>{item.questions.length} question(s) · {item.questions.reduce((sum, q) => sum + q.points, 0)} pts</span></button>
          {index === partIndex && item.questions.map((q, qIndex) => <button className="subject-constructor-outline-question" type="button" key={qIndex} aria-current={qIndex === questionIndex ? 'true' : undefined} onClick={() => { setQuestionIndex(qIndex); setRemoval(null); }}>Question {qIndex + 1} · {q.points} pts<span>{subjectPlainText(q.prompt).slice(0, 70) || 'Énoncé à rédiger'}</span></button>)}
        </div>)}</nav>
        {part && <section className="subject-constructor-part-form">
          <label className="form-group">Titre de la partie<input className="input" required maxLength={160} value={part.title} onChange={event => updatePart({ title: event.target.value })} /></label>
          <label className="checkbox-field"><input type="checkbox" checked={!!part.caseStudy} onChange={event => updatePart({ caseStudy: event.target.checked })} />C’est une étude de cas</label>
          <label className="form-group">{part.caseStudy ? 'Présentation du cas' : 'Consignes de la partie'}<textarea className="input" maxLength={8000} value={part.instructions} onChange={event => updatePart({ instructions: event.target.value })} /></label>
          <button type="button" className="btn btn-outline" onClick={() => setRemoval('part')}>Retirer cette partie</button>
        </section>}
      </aside>
      <div className="subject-constructor-main">
        {!part ? <section className="card"><h2>Commencez par une partie</h2><p>Ajoutez une première partie, puis rédigez ses questions.</p></section> : <>
          <section className="subject-constructor-question">
            <header><h2>{question ? `Question ${questionIndex + 1}` : 'Questions de la partie'}</h2><button type="button" className="btn btn-outline" disabled={disabled || part.questions.length >= 100} onClick={() => { updatePart({ questions: [...part.questions, { prompt: '', kind: 'TEXTE', presentation: 'LONG_TEXT', points: 1, options: [], correction: '' }] }); setQuestionIndex(part.questions.length); }}>Ajouter une question</button></header>
            {question ? <div className="subject-constructor-question-body">
              <div className="subject-question-types" role="group" aria-label="Type de réponse">{questionTypes.map(type => <button type="button" key={type.id} aria-pressed={questionType(question) === type.id} onClick={() => updateQuestion(changeQuestionType(question, type.id))}>{type.label}</button>)}</div>
              <SubjectRichEditor key={`${partIndex}:${questionIndex}`} label="Énoncé" value={question.prompt} onChange={prompt => updateQuestion({ prompt })} disabled={disabled} />
              <label className="form-group">Points<input className="input" type="number" min={0.001} max={99999.999} step={0.001} required value={question.points} onChange={event => updateQuestion({ points: Number(event.target.value) })} /></label>
              {question.kind !== 'TEXTE' && <section><h3>Réponses proposées</h3><p className="cell-sub">{question.kind === 'QCM_SIMPLE' ? 'Cochez la seule bonne réponse.' : 'Cochez toutes les bonnes réponses.'}</p>
                {question.options.map((option, index) => <div className="subject-constructor-option" key={index}>
                  <label className="checkbox-field"><input type={question.kind === 'QCM_SIMPLE' ? 'radio' : 'checkbox'} name={`correct-${partIndex}-${questionIndex}`} aria-label={`Bonne réponse ${index + 1}`} checked={option.correct} onChange={event => updateQuestion({ options: question.options.map((row, i) => ({ ...row, correct: i === index ? event.target.checked : question.kind === 'QCM_SIMPLE' ? false : row.correct })) })} /></label>
                  <label className="form-group">Choix {index + 1}<input className="input" required maxLength={1000} readOnly={question.presentation === 'TRUE_FALSE'} value={option.label} onChange={event => updateQuestion({ options: question.options.map((row, i) => i === index ? { ...row, label: event.target.value } : row) })} /></label>
                  {question.presentation !== 'TRUE_FALSE' && <button type="button" className="btn btn-outline" disabled={question.options.length <= 2} onClick={() => updateQuestion({ options: question.options.filter((_, i) => i !== index) })}>Retirer le choix {index + 1}</button>}
                </div>)}
                {question.presentation !== 'TRUE_FALSE' && <button type="button" className="btn btn-outline" disabled={question.options.length >= 8} onClick={() => updateQuestion({ options: [...question.options, { label: '', correct: false }] })}>Ajouter un choix</button>}
              </section>}
              <label className="form-group">Corrigé et indications de correction<textarea className="input" maxLength={8000} value={question.correction} onChange={event => updateQuestion({ correction: event.target.value })} /></label>
              {questionCompletionIssue(question) && <p className="subject-question-hint">{questionCompletionIssue(question)}</p>}
              <button type="button" className="btn btn-outline" onClick={() => setRemoval('question')}>Retirer la question</button>
            </div> : <p>Ajoutez une question pour choisir son type et rédiger son énoncé.</p>}
          </section>
          <section className="subject-constructor-question-list"><h2>Questions de cette partie</h2>{part.questions.map((q, index) => <article key={index}><div><strong>{index + 1}. {questionTypes.find(type => type.id === questionType(q))?.label}</strong><span>{q.points} pts</span></div><p>{subjectPlainText(q.prompt).slice(0, 220) || 'Énoncé à rédiger'}</p><button type="button" className="btn btn-outline" onClick={() => setQuestionIndex(index)}>Ouvrir la question {index + 1}</button></article>)}</section>
        </>}
      </div>
    </div>
  </div>;
}
