'use client';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadHistoricalExam } from '@/services/historyService';
import { historyValue } from '@/services/historyDisplayService';
import { decodeArchivedAnswer, orderedQuestions } from '@/services/examCopyDisplayService';
import Link from 'next/link';
import {assessmentCategory} from '@/services/assessmentDisplayService';
import type { HistoryRecord } from '@/types/history';
import ExamRichText from './ExamRichText';
export default function ExamCopies({ exam, onBack, backLabel='Tous les examens' }: { exam: HistoryRecord; onBack?: () => void; backLabel?:string }) {
  const { activeRole, history } = usePortal();
  const [tables, setTables] = useState<Record<string, HistoryRecord[]> | null>(null);
  const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const [student, setStudent] = useState(''); const [query, setQuery] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setTables(null); setStudent(''); setQuery(''); setError('');
    void loadHistoricalExam(exam.id, activeRole, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setTables(result.tables);
      const first = result.tables.exam_submissions?.[0] || result.tables.notes?.[0];
      if (first?.values.etudiant_id != null) setStudent(String(first.values.etudiant_id));
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [exam.id, activeRole, retry]);
  const catalog = history.catalog;
  if (!catalog) return <LoadingState label="Chargement de l’examen…" />;
  const category=assessmentCategory(exam);
  const parent=catalog.references.evaluations?.find(row=>row.batchId===exam.batchId && row.sourceId===String(exam.values.parent_id));
  const title = historyValue('unite_valeur_id', exam.values.unite_valeur_id, exam, catalog);
  const submissions = tables?.exam_submissions || []; const notes = tables?.notes || [];
  const students = [...new Set([...submissions,...notes].filter(row => row.values.etudiant_id != null).map(row => String(row.values.etudiant_id)))];
  const name = (id: string) => historyValue('etudiant_id', id, exam, catalog);
  students.sort((a,b) => name(a).localeCompare(name(b),'fr'));
  const visible = students.filter(id => name(id).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
  const answers = submissions.filter(row => String(row.values.etudiant_id) === student);
  const results = notes.filter(row => String(row.values.etudiant_id) === student);
  const questions = tables ? orderedQuestions(tables) : [];
  const partFor = (question: HistoryRecord) => tables?.exam_parts?.find(part => part.sourceId === String(question.values.part_id));
  return <div className="exam-copy-workspace">
    <div className="exam-copy-top"><div>{onBack && <button className="btn btn-outline" onClick={onBack}>← {backLabel}</button>}<span className="page-eyebrow">CONSULTATION DES COPIES</span><h1>{title}</h1><p>{historyValue('group_id',exam.values.group_id,exam,catalog)} · {String(exam.values.date || 'Date non renseignée')} · {category==='resit'?'Rattrapage':String(exam.values.type || 'Évaluation')}</p>{category==='resit' && (parent?<Link className="btn btn-outline" href={`/academique/examens?epreuve=${encodeURIComponent(parent.id)}`}>Voir l’examen initial</Link>:<p>Épreuve initiale non renseignée ou non retrouvée.</p>)}</div><span className="source-badge">{students.length} étudiant(s)</span></div>
    {error ? <section className="card" role="alert"><p>{error}</p><IconButton className="btn btn-outline" onClick={() => setRetry(value => value + 1)} label="Réessayer les copies" /></section> : !tables ? <LoadingState label="Chargement des copies…" /> : !students.length ? <section className="card"><h2>Aucune copie disponible</h2><p>Aucune réponse ni note conservée pour cet examen. Les copies papier doivent être numérisées pour pouvoir être consultées.</p></section> : <div className="exam-copy-layout">
      <aside className="exam-copy-roster"><h2>Étudiants ({students.length})</h2><label className="form-group">Rechercher un étudiant<input className="input" type="search" placeholder="Nom de l’étudiant" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="exam-mobile-selector form-group">Copie de l’étudiant<select className="select-input" value={visible.includes(student) ? student : ''} onChange={event => { if (event.target.value) setStudent(event.target.value); }}><option value="">Choisir une copie</option>{visible.map(id => <option key={id} value={id}>{name(id)}</option>)}</select></label><div className="exam-roster-list">{visible.map(id => { const rows = submissions.filter(row => String(row.values.etudiant_id) === id); return <button className={id === student ? 'selected' : ''} key={id} aria-pressed={id === student} onClick={() => setStudent(id)}><strong>{name(id)}</strong><span>{rows.length ? `${rows.length} réponse(s)` : 'Résultat uniquement'}</span></button>; })}{!visible.length && <p>Aucun étudiant pour cette recherche.</p>}</div></aside>
      <section className="exam-copy-paper" aria-label="Copie sélectionnée" key={student}>
        <header className="exam-student-header"><div><span className="page-eyebrow">COPIE DE L’ÉTUDIANT</span><h2>{name(student)}</h2><p>{answers.length} réponse(s) conservée(s) · {questions.length} question(s) dans le sujet</p></div><div className="exam-result">{results.length ? results.map(note => <div key={note.id}><span>Note enregistrée</span><strong>{note.values.note == null ? 'En attente de correction' : `${note.values.note} / 20`}</strong></div>) : <div><span>Note finale</span><strong>En attente de correction</strong></div>}</div></header>
        {!answers.length && <p className="exam-copy-notice">Le résultat est enregistré, mais les réponses de cette copie ne sont pas disponibles.</p>}
        {questions.map((question,index) => {
          const part = partFor(question); const previousPart = index > 0 ? partFor(questions[index-1]) : null;
          const rows = answers.filter(row => String(row.values.question_id) === question.sourceId);
          const options = (tables.exam_question_options || []).filter(option => String(option.values.question_id) === question.sourceId).sort((a,b) => Number(a.values.order || 0)-Number(b.values.order || 0));
          return <div key={question.id}>{part && part.id !== previousPart?.id && <section className="exam-part-heading"><h3>{String(part.values.titre || 'Partie du sujet')}</h3>{part.values.contexte != null && <ExamRichText value={part.values.contexte} />}{part.values.description != null && <ExamRichText value={part.values.description} />}</section>}<article className="exam-question"><header><h3>Question {index+1}</h3><span>{question.values.points != null ? `${question.values.points} point(s)` : 'Barème non renseigné'}</span></header><ExamRichText value={question.values.content} />
            {!rows.length && <p className="exam-copy-notice">Réponse non retrouvée dans les données conservées.</p>}
            {rows.map((answer,answerIndex) => { const decoded = decodeArchivedAnswer(answer.values.reponse); return <div key={answer.id} className="exam-answer">{rows.length > 1 && <p>Enregistrement {answerIndex+1} sur {rows.length}</p>}<h4>Réponse de l’étudiant</h4>
              {options.length > 0 && <ul className="exam-answer-options">{options.map(option => <li className={decoded.optionIds.includes(option.sourceId) ? 'chosen' : ''} key={option.id}><span className="exam-option-marker">{decoded.optionIds.includes(option.sourceId) ? '✓' : '○'}</span><ExamRichText value={option.values.text} />{decoded.optionIds.includes(option.sourceId) && <span className="exam-choice-label">Choix de l’étudiant</span>}</li>)}</ul>}
              {decoded.optionIds.filter(id => !options.some(option => option.sourceId === id)).map(id => <p key={id}>Choix #{id} : texte de l’option non retrouvé.</p>)}
              {decoded.text && <ExamRichText value={decoded.text} />}
              {!decoded.text && !decoded.optionIds.length && <p>Réponse non renseignée.</p>}
              {decoded.justification && <div className="exam-justification"><h4>Justification</h4><ExamRichText value={decoded.justification} /></div>}
              <div className="exam-correction"><div><h4>Correction enregistrée</h4><p>{answer.values.points_obtenus == null ? 'Points en attente de correction' : `${answer.values.points_obtenus}${question.values.points != null ? ` / ${question.values.points}` : ''} point(s)`}</p></div>{decoded.correction && <ExamRichText value={decoded.correction} />}{decoded.correctedAt && <p className="cell-sub">Corrigé le {decoded.correctedAt}</p>}</div>
            </div>; })}</article></div>;
        })}
        {answers.filter(answer => !questions.some(question => question.sourceId === String(answer.values.question_id))).map(answer => <article className="exam-question" key={answer.id}><h3>Question non retrouvée</h3><ExamRichText value={decodeArchivedAnswer(answer.values.reponse).text || 'Le sujet correspondant à cette réponse est absent.'} /></article>)}
      </section>
    </div>}
  </div>;
}
