'use client';
import SubjectRichText from '@/components/ui/SubjectRichText';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import { connectedRecordName } from '@/services/connectedRecordDisplayService';
import {
  evaluationCandidateStatusLabel,
  evaluationGradeIsComplete,
  evaluationGradeNoteLabel,
  evaluationGradeValue,
} from '@/services/evaluationGradePolicy';
import { manageEvaluation } from '@/services/remoteCampusService';
import type { OnlineExamAnswer } from '@/types/onlineExam';

export default function PersistentExamCopies({ evaluationId, candidateId, onClose }: { evaluationId: string; candidateId?: string; onClose: () => void }) {
  const portal = usePortal();
  const snapshot = portal.relationalSnapshot;
  const tables = snapshot.tables;
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TO_GRADE' | 'GRADED' | 'IN_PROGRESS'>('ALL');
  const [questionScores, setQuestionScores] = useState<Record<string, Record<string, string>>>({});
  const [manualFinals, setManualFinals] = useState<Record<string, string>>({});
  const [busyAttemptId, setBusyAttemptId] = useState('');
  const [errorByAttempt, setErrorByAttempt] = useState<Record<string, string>>({});
  const [savedByAttempt, setSavedByAttempt] = useState<Record<string, string>>({});

  const evaluation = (tables.evaluations || []).find(row => row.id === evaluationId);
  const canGrade =
    portal.perms.permissions.includes('grade.enter') &&
    evaluation &&
    ['BROUILLON', 'SAISIES'].includes(String(evaluation.status)) &&
    !evaluation.cancelled_at;

  const allAttempts = (tables.exam_attempts || []).filter(row => row.evaluation_id === evaluationId && (!candidateId || row.candidate_id === candidateId));

  const attempts = allAttempts.filter(attempt => {
    const candidate = tables.evaluation_candidates?.find(row => row.id === attempt.candidate_id);
    const enrollment = tables.enrollments?.find(row => row.id === candidate?.enrollment_id);
    const grade = tables.grades?.find(row => row.candidate_id === attempt.candidate_id);
    const studentName = enrollment ? connectedRecordName('enrollments', enrollment, snapshot) : 'Candidat';
    if (search.trim() && !studentName.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr'))) {
      return false;
    }
    if (statusFilter === 'IN_PROGRESS') return attempt.status === 'EN_COURS';
    if (statusFilter === 'GRADED') return evaluationGradeIsComplete(grade);
    if (statusFilter === 'TO_GRADE') return attempt.status !== 'EN_COURS' && !evaluationGradeIsComplete(grade);
    return true;
  });

  const roundMark = (value: number) => Math.round(Math.min(20, Math.max(0, value)) * 100) / 100;

  return <WorkPage title="Copies en ligne" onClose={onClose}>
    <div className="btn-group mb-2">
      <button className="btn btn-outline" onClick={() => portal.refreshCampus()}>Actualiser les copies</button>
    </div>
    {allAttempts.length > 1 && (
      <div className="form-grid mb-2">
        <label className="form-group">
          Rechercher un candidat
          <input
            className="input"
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Nom ou matricule…"
          />
        </label>
        <label className="form-group">
          Filtrer les copies
          <select
            className="select-input"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="ALL">Toutes les copies ({allAttempts.length})</option>
            <option value="TO_GRADE">À corriger</option>
            <option value="GRADED">Corrigées</option>
            <option value="IN_PROGRESS">En cours de composition</option>
          </select>
        </label>
      </div>
    )}
    {!attempts.length && <p>Aucune copie commencée.</p>}
    {attempts.map(attempt => {
      const candidate = tables.evaluation_candidates?.find(row => row.id === attempt.candidate_id);
      const enrollment = tables.enrollments?.find(row => row.id === candidate?.enrollment_id);
      const studentName = enrollment ? connectedRecordName('enrollments', enrollment, snapshot) : 'Candidat';
      const grade = tables.grades?.find(row => row.candidate_id === attempt.candidate_id);
      const answers = (tables.exam_answers || []).filter(row => row.attempt_id === attempt.id);
      const questions = [...(tables.exam_questions || []).filter(row => row.paper_id === attempt.paper_id)].sort(
        (a, b) => Number(a.position || 0) - Number(b.position || 0)
      );
      const totalPaperPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
      const attemptScores = questionScores[String(attempt.id)] || {};

      const autoQcmPoints = (questionId: string): number | null => {
        const q = questions.find(item => item.id === questionId);
        if (!q || !['QCM_SIMPLE', 'QCM_MULTIPLE'].includes(String(q.kind))) return null;
        const opts = (tables.exam_options || []).filter(row => row.question_id === questionId);
        const correctIds = opts.filter(row => row.is_correct === true).map(row => String(row.id)).sort();
        if (!correctIds.length) return null;
        const resp = answers.find(row => row.question_id === questionId)?.response as OnlineExamAnswer | undefined;
        const chosenIds = [...new Set((resp?.option_ids || []).map(String))].sort();
        const exact = chosenIds.length === correctIds.length && chosenIds.every((id, idx) => id === correctIds[idx]);
        return exact ? Number(q.points) || 0 : 0;
      };

      const rawTotal = questions.reduce((sum, q) => {
        const raw = attemptScores[String(q.id)];
        if (raw !== undefined && raw !== '' && Number.isFinite(Number(raw))) {
          return sum + Number(raw);
        }
        const auto = autoQcmPoints(String(q.id));
        return sum + (auto ?? 0);
      }, 0);

      const suggestedMarkOn20 = totalPaperPoints > 0 ? roundMark((rawTotal / totalPaperPoints) * 20) : roundMark(rawTotal);
      const existingNumericGrade = evaluationGradeValue(grade);
      const finalInput =
        manualFinals[String(attempt.id)] !== undefined
          ? manualFinals[String(attempt.id)]
          : existingNumericGrade !== null
          ? String(existingNumericGrade)
          : totalPaperPoints > 0 && Object.keys(attemptScores).length > 0
          ? String(suggestedMarkOn20)
          : '';

      const canGradeThisAttempt = Boolean(
        canGrade && candidate && ['REMISE', 'EXPIREE'].includes(String(attempt.status))
      );

      return <article className="online-exam-entry" key={attempt.id}>
        <h2>{studentName}</h2>
        <p>{attempt.status === 'EN_COURS' ? 'En cours' : attempt.status === 'EXPIREE' ? 'Remise automatique à l’échéance' : attempt.status === 'INTERROMPUE' ? 'Interrompue' : 'Remise volontaire'} · {attempt.completion_status === 'NON_TRAITE' ? 'Non traitée · 0/20 à enregistrer' : attempt.completion_status === 'PARTIELLE' ? 'Réponses partielles' : attempt.completion_status === 'COMPLETE' ? 'Toutes les questions répondues' : 'Composition en cours'}</p>
        <p className="cell-sub">Correction enseignant : <strong>{evaluationCandidateStatusLabel(grade, attempt.status)}</strong> · Note : <strong>{evaluationGradeNoteLabel(grade, attempt.status)}</strong></p>
        {!!attempt.submitted_at && <p>Remise : {new Date(String(attempt.submitted_at)).toLocaleString('fr-FR')}</p>}
        <button className="btn btn-outline" onClick={() => setSelected(selected === attempt.id ? '' : attempt.id)}>{selected === attempt.id ? 'Masquer les réponses' : 'Lire les réponses'}</button>
        {selected === attempt.id && (
          <div>
            {questions.map((question, qIndex) => {
              const response = answers.find(row => row.question_id === question.id)?.response as OnlineExamAnswer | undefined;
              const choices = response?.option_ids || [];
              const optionsForQuestion = (tables.exam_options || []).filter(row => row.question_id === question.id);
              const choiceLabels = optionsForQuestion.filter(row => choices.includes(row.id)).map(row => String(row.label));
              const correctLabels = optionsForQuestion.filter(row => row.is_correct === true).map(row => String(row.label));
              const maxPts = Number(question.points) || 0;
              const config = (question.configuration || {}) as { correction?: string };
              const autoPts = autoQcmPoints(String(question.id));
              const currentScore =
                attemptScores[String(question.id)] !== undefined
                  ? attemptScores[String(question.id)]
                  : autoPts !== null
                  ? String(autoPts)
                  : '';

              return <section className="online-exam-question" key={question.id}>
                {maxPts > 0 && (
                  <div className="cell-sub">
                    <strong>Question {qIndex + 1}</strong> · Barème : {maxPts} pt(s)
                    {autoPts !== null && (
                      <span> · {autoPts > 0 ? 'QCM exact' : 'QCM incorrect'}</span>
                    )}
                  </div>
                )}
                <h3 className="subject-text"><SubjectRichText value={String(question.prompt)} /></h3>
                {choiceLabels.length > 0 && <p className="subject-text">Choix : {choiceLabels.join(' ; ')}</p>}
                {!!response?.text && <p className="subject-text">{question.kind === 'TEXTE' ? response.text : `Justification : ${response.text}`}</p>}
                {!choiceLabels.length && !response?.text && <p>Sans réponse</p>}
                {correctLabels.length > 0 && (
                  <div className="cell-sub">Réponse attendue : {correctLabels.join(' ; ')}</div>
                )}
                {!!config.correction && (
                  <div className="cell-sub">Corrigé indicatif : {config.correction}</div>
                )}
                {canGradeThisAttempt && maxPts > 0 && (
                  <label className="form-group mt-2" style={{ maxWidth: '16rem' }}>
                    Points attribués (sur {maxPts})
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={maxPts}
                      step="0.25"
                      value={currentScore}
                      onChange={event => {
                        const val = event.target.value;
                        const nextScores = { ...attemptScores, [String(question.id)]: val };
                        setQuestionScores(prev => ({ ...prev, [String(attempt.id)]: nextScores }));
                        const nextSum = questions.reduce((sum, q) => {
                          const v = nextScores[String(q.id)];
                          if (v !== undefined && v !== '' && Number.isFinite(Number(v))) return sum + Number(v);
                          const a = autoQcmPoints(String(q.id));
                          return sum + (a ?? 0);
                        }, 0);
                        const nextMark = totalPaperPoints > 0 ? roundMark((nextSum / totalPaperPoints) * 20) : roundMark(nextSum);
                        setManualFinals(prev => ({ ...prev, [String(attempt.id)]: String(nextMark) }));
                      }}
                    />
                  </label>
                )}
              </section>;
            })}

            {canGradeThisAttempt && candidate && (
              <div className="card mt-2" style={{ backgroundColor: 'var(--surface-sunken)' }}>
                {savedByAttempt[String(attempt.id)] && (
                  <p role="status" style={{ color: 'var(--success)', fontWeight: 600 }}>
                    {savedByAttempt[String(attempt.id)]}
                  </p>
                )}
                <ReviewedForm
                  busy={busyAttemptId === String(attempt.id)}
                  error={errorByAttempt[String(attempt.id)] || ''}
                  confirmLabel="Confirmer la note de cette copie"
                  fields={[
                    { label: 'Candidat', value: studentName },
                    { label: 'Note retenue (/20)', value: finalInput ? `${finalInput} / 20` : 'Non renseignée' },
                  ]}
                  validate={() => {
                    if (!finalInput.trim()) return 'Veuillez saisir ou calculer une note sur 20 avant d’enregistrer.';
                    const val = Number(finalInput);
                    if (!Number.isFinite(val) || val < 0 || val > 20) return 'La note doit être comprise entre 0 et 20.';
                    return null;
                  }}
                  consequence="La note chiffrée de ce candidat sera enregistrée dans le relevé de l’évaluation."
                  onConfirm={async event => {
                    event.preventDefault();
                    const val = Number(finalInput);
                    if (!finalInput.trim() || !Number.isFinite(val) || val < 0 || val > 20) return;
                    setBusyAttemptId(String(attempt.id));
                    setErrorByAttempt(prev => ({ ...prev, [String(attempt.id)]: '' }));
                    setSavedByAttempt(prev => ({ ...prev, [String(attempt.id)]: '' }));
                    try {
                      await manageEvaluation(portal.activeRole, {
                        action: 'enter_grades',
                        evaluationId,
                        advanceToSaisies: evaluation?.status === 'BROUILLON',
                        grades: [{ candidateId: String(candidate.id), value: val, absenceStatus: null }],
                        revision: snapshot.revision,
                      });
                      portal.refreshCampus();
                      setSavedByAttempt(prev => ({
                        ...prev,
                        [String(attempt.id)]: `Note de ${val}/20 enregistrée pour ${studentName}.`,
                      }));
                    } catch (cause) {
                      setErrorByAttempt(prev => ({
                        ...prev,
                        [String(attempt.id)]: cause instanceof Error ? cause.message : 'Erreur lors de l’enregistrement de la note.',
                      }));
                    } finally {
                      setBusyAttemptId('');
                    }
                  }}
                >
                  <div className="form-grid">
                    <label className="form-group">
                      Note finale sur 20 à enregistrer pour {studentName}
                      <input
                        className="input"
                        type="number"
                        min={0}
                        max={20}
                        step="0.25"
                        value={finalInput}
                        onChange={event =>
                          setManualFinals(prev => ({ ...prev, [String(attempt.id)]: event.target.value }))
                        }
                        placeholder="Ex. : 14.5"
                      />
                    </label>
                  </div>
                  <div className="btn-group mt-2">
                    <button type="submit" className="btn btn-primary" disabled={busyAttemptId === String(attempt.id)}>
                      Enregistrer la note de la copie
                    </button>
                  </div>
                </ReviewedForm>
              </div>
            )}
          </div>
        )}
      </article>;
    })}
  </WorkPage>;
}
