'use client';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import { connectedRecordName } from '@/services/connectedRecordDisplayService';
import { evaluationCandidateStatusLabel, evaluationGradeNoteLabel } from '@/services/evaluationGradePolicy';
import type { OnlineExamAnswer } from '@/types/onlineExam';

export default function PersistentExamCopies({ evaluationId, candidateId, onClose }: { evaluationId: string; candidateId?: string; onClose: () => void }) {
  const portal = usePortal();
  const tables = portal.relationalSnapshot.tables;
  const [selected, setSelected] = useState('');
  const attempts = (tables.exam_attempts || []).filter(row => row.evaluation_id === evaluationId && (!candidateId || row.candidate_id === candidateId));
  return <WorkPage title="Copies en ligne" onClose={onClose}>
    <button className="btn btn-outline" onClick={() => portal.refreshCampus()}>Actualiser les copies</button>
    {!attempts.length && <p>Aucune copie commencée.</p>}
    {attempts.map(attempt => {
      const candidate = tables.evaluation_candidates?.find(row => row.id === attempt.candidate_id);
      const enrollment = tables.enrollments?.find(row => row.id === candidate?.enrollment_id);
      const grade = tables.grades?.find(row => row.candidate_id === attempt.candidate_id);
      const answers = (tables.exam_answers || []).filter(row => row.attempt_id === attempt.id);
      const questions = (tables.exam_questions || []).filter(row => row.paper_id === attempt.paper_id);
      return <article className="online-exam-entry" key={attempt.id}>
        <h2>{enrollment ? connectedRecordName('enrollments', enrollment, portal.relationalSnapshot) : 'Candidat'}</h2>
        <p>{attempt.status === 'EN_COURS' ? 'En cours' : attempt.status === 'EXPIREE' ? 'Remise automatique à l’échéance' : attempt.status === 'INTERROMPUE' ? 'Interrompue' : 'Remise volontaire'} · {attempt.completion_status === 'NON_TRAITE' ? 'Non traitée · 0/20 à enregistrer' : attempt.completion_status === 'PARTIELLE' ? 'Réponses partielles' : attempt.completion_status === 'COMPLETE' ? 'Toutes les questions répondues' : 'Composition en cours'}</p>
        <p className="cell-sub">Correction enseignant : <strong>{evaluationCandidateStatusLabel(grade, attempt.status)}</strong> · Note : <strong>{evaluationGradeNoteLabel(grade, attempt.status)}</strong></p>
        {!!attempt.submitted_at && <p>Remise : {new Date(String(attempt.submitted_at)).toLocaleString('fr-FR')}</p>}
        <button className="btn btn-outline" onClick={() => setSelected(selected === attempt.id ? '' : attempt.id)}>{selected === attempt.id ? 'Masquer les réponses' : 'Lire les réponses'}</button>
        {selected === attempt.id && questions.map(question => {
          const response = answers.find(row => row.question_id === question.id)?.response as OnlineExamAnswer | undefined;
          const choices = response?.option_ids || [];
          return <section className="online-exam-question" key={question.id}><h3 className="subject-text">{String(question.prompt)}</h3><p className="subject-text">{response?.text || (choices.length ? (tables.exam_options || []).filter(row => choices.includes(row.id)).map(row => String(row.label)).join(' ; ') : 'Sans réponse')}</p></section>;
        })}
      </article>;
    })}
  </WorkPage>;
}
