import { useEffect, useRef } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { useFeedback } from '@/hooks/useFeedback';
import { ROLES } from '@/types/permissions';
import type { Exam } from '@/types/application';
import type { ExamAction } from '@/services/examService';
import { examTime } from '@/services/examQueryService';
import { displayDate } from '@/utils/display';
import { workflowError } from '@/utils/workflowError';
import FormFeedback from '@/components/ui/FormFeedback';
import PaperExamResults from '@/components/modules/academic/PaperExamResults';
import OnlineExamSubjectForm from '@/components/modules/academic/OnlineExamSubjectForm';
import OnlineExamAttemptPanel from '@/components/modules/academic/OnlineExamAttemptPanel';
import OnlineExamCorrectionPanel from '@/components/modules/academic/OnlineExamCorrectionPanel';

export default function ExamDeliveryPanel({ exam }: { exam: Exam }) {
  const state = usePortal();
  const { data, runWorkflow } = state.campus;
  const paper = data.examPapers.find(item => item.id === exam.id);
  const evaluation = data.evaluations.find(item => item.id === exam.evaluationId);
  const teacher = state.activeRole === ROLES.ENS || state.activeRole === ROLES.IT;
  const own = state.activeRole === ROLES.STUD || state.activeRole === ROLES.DEL;
  const eligible = state.students.some(student => student.matricule === state.demoIdentity && ['Inscrit', 'Réinscrit', 'Actif'].includes(student.status));
  const attempt = data.examAttempts.find(item => item.examId === exam.id && item.studentId === state.demoIdentity);
  const [feedback, setFeedback, error] = useFeedback();
  const now = state.examNow;
  const expiredAttempt = useRef('');
  const ended = now >= examTime(exam, 'end');
  const opened = now >= examTime(exam, 'start');
  const editable = !!evaluation && !evaluation.examCancelled && ['BROUILLON', 'SAISIES'].includes(evaluation.status);

  function run(action: ExamAction, values: Record<string, unknown> = {}): boolean {
    try {
      runWorkflow(action, { examId: exam.id, ...values });
      if (action !== 'exam.answer') setFeedback('Opération enregistrée.');
      else if (error) setFeedback('');
      return true;
    } catch (cause) { setFeedback(workflowError(cause), true); return false; }
  }

  useEffect(() => {
    if (exam.status === 'ANNULE' || !own || attempt?.status !== 'EN_COURS'
      || now < Date.parse(attempt.deadline) || expiredAttempt.current === attempt.id) return;
    expiredAttempt.current = attempt.id;
    try {
      runWorkflow('exam.submit', { examId: exam.id });
      setFeedback('Temps écoulé : votre copie a été remise automatiquement.');
    } catch (cause) { setFeedback(workflowError(cause), true); }
  }, [now, own, attempt, exam.id, exam.status, runWorkflow, setFeedback]);

  if (exam.status === 'ANNULE') return <p>Épreuve annulée.</p>;
  return (
    <section className="card card-full mt-2">
      <h3>{exam.mode === 'EN_LIGNE' ? own ? 'Mon épreuve en ligne' : 'Passage et correction en ligne' : 'Résultats des copies papier'}</h3>
      <p className="cell-sub">{state.classes.find(item => item.id === exam.assignmentId)?.name} · {displayDate(exam.date)} · {exam.startTime}–{exam.endTime} · Horaires de Lomé</p>
      {exam.mode !== 'EN_LIGNE' && teacher && evaluation && <PaperExamResults evaluation={evaluation} students={state.students} ended={ended} onAction={run} />}
      {exam.mode === 'EN_LIGNE' && teacher && (!paper || paper.status === 'BROUILLON') && !opened
        && <OnlineExamSubjectForm paper={paper} windowMinutes={(examTime(exam, 'end') - examTime(exam, 'start')) / 60000} onAction={run} />}
      {exam.mode === 'EN_LIGNE' && teacher && opened && paper?.status !== 'AUTORISE'
        && <p>Le sujet n’a pas été autorisé avant l’ouverture. Le passage en ligne est bloqué.</p>}
      {paper && !own && <p>Sujet : {paper.status === 'AUTORISE' ? 'Autorisé' : 'Brouillon'} · {paper.questions.length} questions · {paper.durationMinutes} minutes</p>}
      {(state.activeRole === ROLES.DA || state.activeRole === ROLES.IT) && paper?.status === 'BROUILLON' && <>
        <ol>{paper.questions.map(question => <li key={question.id}>
          {question.prompt} · {question.points} points
          {question.kind === 'QCM' && <><ul>{question.options.map((option, index) => <li key={index}>{option}</li>)}</ul><p>Réponse attendue : {question.options[question.correctOption ?? 0]}</p></>}
        </li>)}</ol>
        <button className="btn btn-primary" disabled={opened} onClick={() => run('exam.authorize')}>Autoriser le sujet</button>
      </>}
      {own && exam.mode === 'EN_LIGNE' && !attempt && <>
        <button className="btn btn-primary" disabled={!eligible || !paper || !opened || ended} onClick={() => run('exam.start')}>Commencer l’épreuve</button>
        {!eligible && <p>Votre statut ne permet pas de démarrer l’épreuve.</p>}
        {ended && <p>La fenêtre de passage est fermée.</p>}
        {!paper && <p>Le sujet n’est pas encore autorisé.</p>}
      </>}
      {own && attempt && paper && <OnlineExamAttemptPanel attempt={attempt} paper={paper} now={now} onAction={run} />}
      {teacher && paper && data.examAttempts.filter(item => item.examId === exam.id).map(copy => (
        <OnlineExamCorrectionPanel key={copy.id} attempt={copy} paper={paper} now={now} ended={ended} editable={editable} onAction={run} />
      ))}
      {teacher && evaluation && <button className="btn btn-outline mt-2" onClick={() => {
        state.setSelectedClassForGrades(state.classes.find(item => item.id === exam.assignmentId) ?? null);
        state.navigateTo('academique', 'acad_grades');
      }}>Ouvrir le circuit de validation des notes</button>}
      <FormFeedback message={feedback} error={error} />
    </section>
  );
}
