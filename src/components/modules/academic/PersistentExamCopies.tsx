'use client';
import SubjectRichText from '@/components/ui/SubjectRichText';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import { connectedRecordName } from '@/services/connectedRecordDisplayService';
import {
  evaluationGradeIsComplete,
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

  return (
    <WorkPage title="Copies en ligne" onClose={onClose}>
      <div className="btn-group mb-2">
        <button type="button" className="btn btn-outline" onClick={() => portal.refreshCampus()}>
          Actualiser les copies
        </button>
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
              <option value="GRADED">Notées</option>
              <option value="IN_PROGRESS">En cours de composition</option>
            </select>
          </label>
        </div>
      )}
      {!attempts.length && <p>Aucune copie trouvée pour ces critères.</p>}
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

        const getDefaultQuestionScore = (questionId: string): number | null => {
          const q = questions.find(item => item.id === questionId);
          if (!q || !['QCM_SIMPLE', 'QCM_MULTIPLE'].includes(String(q.kind))) return null;
          const opts = (tables.exam_options || []).filter(row => row.question_id === questionId);
          const correctIds = opts.filter(row => row.is_correct === true).map(row => String(row.id)).sort();
          if (!correctIds.length) return null;
          const resp = answers.find(row => row.question_id === questionId)?.response as OnlineExamAnswer | undefined;
          const chosenIds = [...new Set((resp?.option_ids || []).map(String))].sort();
          const exact =
            chosenIds.length === correctIds.length && chosenIds.every((id, index) => id === correctIds[index]);
          return exact ? Number(q.points) || 0 : 0;
        };

        const rawTotal = questions.reduce((sum, q) => {
          const raw = attemptScores[String(q.id)];
          if (raw !== undefined && raw !== '' && Number.isFinite(Number(raw))) {
            return sum + Number(raw);
          }
          const def = getDefaultQuestionScore(String(q.id));
          return sum + (def ?? 0);
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

        const studentInitials = studentName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'ET';
        const statusPillClass = attempt.status === 'EN_COURS' ? 'pill-warning' : attempt.status === 'REMISE' ? 'pill-success' : 'pill-info';

        return (
          <article className="online-exam-entry" key={attempt.id}>
            <div className="online-exam-entry-header">
              <div className="online-exam-student">
                <div className="online-exam-avatar">{studentInitials}</div>
                <div className="online-exam-info">
                  <h2>{studentName}</h2>
                  <div className="online-exam-badges">
                    <span className={`pill ${statusPillClass}`}>
                      {attempt.status === 'EN_COURS' ? 'En cours' : attempt.status === 'EXPIREE' ? 'Remise automatique' : attempt.status === 'INTERROMPUE' ? 'Interrompue' : 'Remise volontaire'}
                    </span>
                    <span className="pill pill-subtle">
                      {attempt.completion_status === 'NON_TRAITE' ? 'Non traitée' : attempt.completion_status === 'PARTIELLE' ? 'Partielle' : attempt.completion_status === 'COMPLETE' ? 'Complète' : 'En cours'}
                    </span>
                    {Boolean(attempt.submitted_at) && (
                      <span className="cell-sub">
                        Remise : {new Date(String(attempt.submitted_at)).toLocaleString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="online-exam-score-box">
                {existingNumericGrade !== null ? (
                  <span className="online-exam-grade-badge">Note : {existingNumericGrade} / 20</span>
                ) : (
                  <span className="pill pill-warning">
                    {attempt.status === 'EN_COURS' ? 'En cours de composition' : 'Copie remise · À corriger'}
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setSelected(selected === attempt.id ? '' : attempt.id)}
                >
                  {selected === attempt.id ? 'Masquer les réponses' : 'Lire les réponses'}
                </button>
              </div>
            </div>

            {selected === attempt.id && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                {questions.map((question, qIndex) => {
                  const response = answers.find(row => row.question_id === question.id)?.response as OnlineExamAnswer | undefined;
                  const choices = response?.option_ids || [];
                  const optionsForQuestion = (tables.exam_options || []).filter(row => row.question_id === question.id);
                  const choiceLabels = optionsForQuestion.filter(row => choices.includes(row.id)).map(row => String(row.label));
                  const correctLabels = optionsForQuestion.filter(row => row.is_correct === true).map(row => String(row.label));
                  const maxPts = Number(question.points) || 0;
                  const config = (question.configuration || {}) as { correction?: string; presentation?: string; requiresJustification?: boolean };
                  const defaultScore = getDefaultQuestionScore(String(question.id));
                  const currentScore =
                    attemptScores[String(question.id)] !== undefined
                      ? attemptScores[String(question.id)]
                      : defaultScore !== null
                      ? String(defaultScore)
                      : '';
                  const isTrueFalse = config.presentation === 'TRUE_FALSE';

                  return (
                    <section className="online-exam-question" key={question.id}>
                      <div className="online-exam-question-header">
                        <strong>Question {qIndex + 1}</strong>
                        <span className="pill pill-default">Barème : {maxPts} pt{maxPts > 1 ? 's' : ''}</span>
                      </div>
                      <div className="subject-text">
                        <SubjectRichText value={String(question.prompt)} />
                      </div>
                      <div className="online-exam-answer-box">
                        {choiceLabels.length > 0 && (
                          <p style={{ margin: '0.2rem 0' }}>
                            Choix : <strong>{choiceLabels.join(', ')}</strong>
                          </p>
                        )}
                        {Boolean(response?.text) && (
                          <p className="subject-text" style={{ margin: '0.2rem 0' }}>
                            {choiceLabels.length > 0 || isTrueFalse ? <>Justification : {response?.text}</> : response?.text}
                          </p>
                        )}
                        {!choiceLabels.length && !response?.text && (
                          <p style={{ color: 'var(--text-subtle)', fontStyle: 'italic', margin: '0.2rem 0' }}>
                            Sans réponse
                          </p>
                        )}
                      </div>
                      {correctLabels.length > 0 && (
                        <div className="online-exam-expected-box">
                          <strong>Réponse(s) attendue(s) :</strong> {correctLabels.join(', ')}
                        </div>
                      )}
                      {Boolean(config.correction) && (
                        <div className="online-exam-expected-box">
                          <strong>Corrigé indicatif :</strong> {config.correction}
                        </div>
                      )}
                      {canGradeThisAttempt && maxPts > 0 && (
                        <label className="form-group" style={{ maxWidth: 220, marginTop: '0.65rem' }}>
                          Points attribués (sur {maxPts})
                          <input
                            className="input"
                            type="number"
                            min={0}
                            max={maxPts}
                            step="0.25"
                            value={currentScore}
                            onChange={event => {
                              const nextScores = { ...attemptScores, [String(question.id)]: event.target.value };
                              setQuestionScores(prev => ({ ...prev, [String(attempt.id)]: nextScores }));
                              const nextSum = questions.reduce((sum, q) => {
                                const val = nextScores[String(q.id)];
                                if (val !== undefined && val !== '' && Number.isFinite(Number(val))) return sum + Number(val);
                                const def = getDefaultQuestionScore(String(q.id));
                                return sum + (def ?? 0);
                              }, 0);
                              const nextMark = totalPaperPoints > 0 ? roundMark((nextSum / totalPaperPoints) * 20) : roundMark(nextSum);
                              setManualFinals(prev => ({ ...prev, [String(attempt.id)]: String(nextMark) }));
                            }}
                            placeholder={`0 à ${maxPts}`}
                          />
                        </label>
                      )}
                    </section>
                  );
                })}

                {canGradeThisAttempt && candidate && (
                  <div className="card mt-2" style={{ backgroundColor: 'var(--surface-sunken)' }}>
                    {savedByAttempt[String(attempt.id)] && (
                      <p role="status" style={{ color: 'var(--success)' }}>
                        {savedByAttempt[String(attempt.id)]}
                      </p>
                    )}
                    <ReviewedForm
                      busy={busyAttemptId === String(attempt.id)}
                      error={errorByAttempt[String(attempt.id)] || ''}
                      confirmLabel="Confirmer la note de cette copie"
                      fields={[
                        { label: 'Candidat', value: studentName },
                        { label: 'Total points épreuve', value: `${roundMark(rawTotal)} / ${totalPaperPoints} pts` },
                        { label: 'Note finale retenue (/20)', value: finalInput ? `${finalInput} / 20` : 'Non renseignée' },
                      ]}
                      validate={() => {
                        if (!finalInput.trim()) return 'Renseignez une note sur 20 avant d’enregistrer.';
                        const val = Number(finalInput);
                        if (!Number.isFinite(val) || val < 0 || val > 20) return 'La note doit être comprise entre 0 et 20.';
                        return null;
                      }}
                      consequence="La note chiffrée de ce candidat sera enregistrée sur le relevé de l’épreuve."
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
                            [String(attempt.id)]: cause instanceof Error ? cause.message : 'Enregistrement impossible.',
                          }));
                        } finally {
                          setBusyAttemptId('');
                        }
                      }}
                    >
                      <div className="form-grid">
                        <label className="form-group">
                          Note finale sur 20 pour {studentName}
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
                            placeholder={totalPaperPoints > 0 ? `Suggérée : ${suggestedMarkOn20}` : '0 à 20'}
                          />
                        </label>
                      </div>
                      <div className="btn-group mt-1">
                        <button type="submit" className="btn btn-primary" disabled={busyAttemptId === String(attempt.id)}>
                          Enregistrer la note de cette copie
                        </button>
                      </div>
                    </ReviewedForm>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </WorkPage>
  );
}
