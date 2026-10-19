'use client';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import { connectedRecordName } from '@/services/connectedRecordDisplayService';
import type { OnlineExamAnswer } from '@/types/onlineExam';

export default function PersistentExamCopies({ evaluationId, onClose }: { evaluationId: string; onClose: () => void }) {
  const portal = usePortal();
  const tables = portal.relationalSnapshot.tables;
  const [selected, setSelected] = useState('');
  const attempts = (tables.exam_attempts || []).filter(row => row.evaluation_id === evaluationId);
  return <WorkPage title="Copies en ligne" onClose={onClose}>
    <button className="btn btn-outline" onClick={() => portal.refreshCampus()}>Actualiser les copies</button>
    {!attempts.length && <p>Aucune copie commencée.</p>}
    {attempts.map(attempt => {
      const candidate = tables.evaluation_candidates?.find(row => row.id === attempt.candidate_id);
      const enrollment = tables.enrollments?.find(row => row.id === candidate?.enrollment_id);
      const answers = (tables.exam_answers || []).filter(row => row.attempt_id === attempt.id);
      const questions = (tables.exam_questions || []).filter(row => row.paper_id === attempt.paper_id);
      return <article className="online-exam-entry" key={attempt.id}>
        <h2>{enrollment ? connectedRecordName('enrollments', enrollment, portal.relationalSnapshot) : 'Candidat'}</h2>
        <p>{attempt.status === 'EN_COURS' ? 'En cours' : attempt.status === 'EXPIREE' ? 'Remise automatique à l’échéance' : attempt.status === 'INTERROMPUE' ? 'Interrompue' : 'Remise volontaire'} · {attempt.completion_status === 'NON_TRAITE' ? 'Non traitée · 0/20 à enregistrer' : attempt.completion_status === 'PARTIELLE' ? 'Partielle' : attempt.completion_status === 'COMPLETE' ? 'Complète' : 'Traitement en cours'}</p>
        {!!attempt.submitted_at && <p>Remise : {new Date(String(attempt.submitted_at)).toLocaleString('fr-FR')}</p>}
        <button className="btn btn-outline" onClick={() => setSelected(selected === attempt.id ? '' : attempt.id)}>{selected === attempt.id ? 'Masquer les réponses' : 'Lire les réponses'}</button>
        {selected === attempt.id && questions.map(question => {
          const response = answers.find(row => row.question_id === question.id)?.response as OnlineExamAnswer | undefined;
          const choices = response?.option_ids || [];
          return <section className="online-exam-question" key={question.id}><h3>{String(question.prompt)}</h3><p>{response?.text || (choices.length ? (tables.exam_options || []).filter(row => choices.includes(row.id)).map(row => String(row.label)).join(' ; ') : 'Sans réponse')}</p></section>;
        })}
      </article>;
    })}
  </WorkPage>;
}
