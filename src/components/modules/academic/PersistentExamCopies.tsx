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
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, Record<string, string>>>({});
  const [generalFeedback, setGeneralFeedback] = useState<Record<string, string>>({});
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
  const countWords = (text: string) => {
    const trimmed = (text || '').trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };

  // Navigation séquentielle entre les copies
  const currentSelectedIndex = attempts.findIndex(a => a.id === selected);
  const goToNextAttempt = () => {
    if (currentSelectedIndex >= 0 && currentSelectedIndex < attempts.length - 1) {
      setSelected(String(attempts[currentSelectedIndex + 1].id));
    }
  };
  const goToPrevAttempt = () => {
    if (currentSelectedIndex > 0) {
      setSelected(String(attempts[currentSelectedIndex - 1].id));
    }
  };

  return <WorkPage title="Copies et corrections en ligne" onClose={onClose}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
      <div className="btn-group">
        <button type="button" className="btn btn-outline" onClick={() => portal.refreshCampus()}>
          Actualiser les copies
        </button>
      </div>
      <div style={{ fontSize: '13px', color: '#64748b' }}>
        <strong>{allAttempts.length}</strong> copie(s) au total · <strong>{allAttempts.filter(a => evaluationGradeIsComplete(tables.grades?.find(g => g.candidate_id === a.candidate_id))).length}</strong> corrigée(s)
      </div>
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
            <option value="TO_GRADE">À corriger ({allAttempts.filter(a => a.status !== 'EN_COURS' && !evaluationGradeIsComplete(tables.grades?.find(g => g.candidate_id === a.candidate_id))).length})</option>
            <option value="GRADED">Corrigées ({allAttempts.filter(a => evaluationGradeIsComplete(tables.grades?.find(g => g.candidate_id === a.candidate_id))).length})</option>
            <option value="IN_PROGRESS">En cours de composition ({allAttempts.filter(a => a.status === 'EN_COURS').length})</option>
          </select>
        </label>
      </div>
    )}

    {!attempts.length && <p className="cell-sub" style={{ padding: '20px 0' }}>Aucune copie trouvée pour ces critères.</p>}

    {attempts.map((attempt, attemptIndex) => {
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
      const feedbackMap = questionFeedback[String(attempt.id)] || {};

      // Calcul intelligent du barème et auto-score selon le type de question
      const getQuestionAutoInfo = (questionId: string): { points: number | null; label: string; isAuto: boolean } => {
        const q = questions.find(item => item.id === questionId);
        if (!q) return { points: null, label: '', isAuto: false };
        const config = (q.configuration || {}) as { presentation?: string; requiresJustification?: boolean; correction?: string };
        const max = Number(q.points) || 0;
        const isTrueFalse = config.presentation === 'TRUE_FALSE';
        const isQcm = ['QCM_SIMPLE', 'QCM_MULTIPLE'].includes(String(q.kind)) || isTrueFalse;

        if (!isQcm) {
          return { points: null, label: 'Rédaction / Développement', isAuto: false };
        }

        const opts = (tables.exam_options || []).filter(row => row.question_id === questionId);
        const correctIds = opts.filter(row => row.is_correct === true).map(row => String(row.id)).sort();
        if (!correctIds.length) return { points: null, label: 'Corrigé non paramétré', isAuto: false };

        const resp = answers.find(row => row.question_id === questionId)?.response as OnlineExamAnswer | undefined;
        const chosenIds = [...new Set((resp?.option_ids || []).map(String))].sort();

        if (!chosenIds.length) {
          return { points: 0, label: 'Sans réponse (0 pt)', isAuto: true };
        }

        if (isTrueFalse) {
          const isCorrectChoice = chosenIds.length === 1 && correctIds.includes(chosenIds[0]);
          if (config.requiresJustification) {
            return {
              points: isCorrectChoice ? roundMark(max * 0.5) : 0,
              label: isCorrectChoice ? 'Choix exact · Justification à évaluer' : 'Choix incorrect',
              isAuto: false,
            };
          }
          return {
            points: isCorrectChoice ? max : 0,
            label: isCorrectChoice ? '✓ Vrai/Faux exact' : '✗ Vrai/Faux incorrect',
            isAuto: true,
          };
        }

        if (q.kind === 'QCM_SIMPLE') {
          const exact = chosenIds.length === 1 && chosenIds[0] === correctIds[0];
          return {
            points: exact ? max : 0,
            label: exact ? '✓ QCM exact' : '✗ QCM incorrect',
            isAuto: true,
          };
        }

        if (q.kind === 'QCM_MULTIPLE') {
          const correctChosen = chosenIds.filter(id => correctIds.includes(id)).length;
          const wrongChosen = chosenIds.filter(id => !correctIds.includes(id)).length;
          const ratio = Math.max(0, (correctChosen - wrongChosen) / correctIds.length);
          const calculated = roundMark(ratio * max);
          return {
            points: calculated,
            label: ratio === 1 ? '✓ QCM intégralement exact' : ratio > 0 ? `QCM partiel (${correctChosen}/${correctIds.length})` : '✗ QCM incorrect',
            isAuto: true,
          };
        }

        return { points: null, label: '', isAuto: false };
      };

      const rawTotal = questions.reduce((sum, q) => {
        const raw = attemptScores[String(q.id)];
        if (raw !== undefined && raw !== '' && Number.isFinite(Number(raw))) {
          return sum + Number(raw);
        }
        const auto = getQuestionAutoInfo(String(q.id)).points;
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

      const studentInitials = studentName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'ET';
      const statusPillClass = attempt.status === 'EN_COURS' ? 'pill-warning' : attempt.status === 'REMISE' ? 'pill-success' : 'pill-info';
      const gradeVal = existingNumericGrade !== null ? `${existingNumericGrade} / 20` : null;

      // Fonction d'auto-notation en 1 clic de tous les QCMs pour cette copie
      const autoGradeAllQuestions = () => {
        const nextScores: Record<string, string> = { ...attemptScores };
        questions.forEach(q => {
          const info = getQuestionAutoInfo(String(q.id));
          if (info.points !== null) {
            nextScores[String(q.id)] = String(info.points);
          }
        });
        setQuestionScores(prev => ({ ...prev, [String(attempt.id)]: nextScores }));
        const nextSum = questions.reduce((sum, q) => {
          const val = nextScores[String(q.id)];
          return sum + (val !== undefined && val !== '' && Number.isFinite(Number(val)) ? Number(val) : 0);
        }, 0);
        const nextMark = totalPaperPoints > 0 ? roundMark((nextSum / totalPaperPoints) * 20) : roundMark(nextSum);
        setManualFinals(prev => ({ ...prev, [String(attempt.id)]: String(nextMark) }));
      };

      return (
        <article className="online-exam-entry" key={attempt.id} style={{ marginBottom: '16px' }}>
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
                  {(() => {
                    const raw = typeof window !== 'undefined' ? localStorage.getItem(`escen:anticheat:${attempt.id}`) : null;
                    const count = raw ? Number(JSON.parse(raw).count) || 0 : 0;
                    return count > 0 ? (
                      <span className="pill pill-danger" style={{ fontWeight: 600 }}>
                        {count} incident(s) anti-triche
                      </span>
                    ) : (
                      <span className="pill pill-success" style={{ fontSize: '11px' }}>
                        Intégrité conforme
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="online-exam-score-box">
              {gradeVal ? (
                <span className="online-exam-grade-badge">Note retenue : {gradeVal}</span>
              ) : (
                <span className="pill pill-warning">À corriger</span>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setSelected(selected === attempt.id ? '' : attempt.id)}
              >
                {selected === attempt.id ? 'Masquer la copie' : 'Consulter et noter'}
              </button>
            </div>
          </div>

          {selected === attempt.id && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
              {/* Barre de navigation rapide entre les copies */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={attemptIndex === 0}
                    onClick={goToPrevAttempt}
                  >
                    ← Copie précédente
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Copie {attemptIndex + 1} sur {attempts.length}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={attemptIndex === attempts.length - 1}
                    onClick={goToNextAttempt}
                  >
                    Copie suivante →
                  </button>
                </div>

                {canGradeThisAttempt && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={autoGradeAllQuestions}
                    title="Attribue les points calculés pour toutes les questions QCM"
                  >
                    Pré-noter tous les QCM
                  </button>
                )}
              </div>

              {/* Encadré d'audit anti-triche */}
              {(() => {
                const raw = typeof window !== 'undefined' ? localStorage.getItem(`escen:anticheat:${attempt.id}`) : null;
                let data = { count: 0, events: [] };
                try { if (raw) data = JSON.parse(raw); } catch {}
                const events: { type: string; time: string; message: string }[] = data.events || [];
                return (
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                        Audit de composition & Surveillance anti-triche
                      </strong>
                      <span className={`pill ${data.count > 0 ? 'pill-danger' : 'pill-success'}`}>
                        {data.count > 0 ? `${data.count} alerte(s) consignée(s)` : 'Session 100% conforme'}
                      </span>
                    </div>
                    <div className="record-details-grid" style={{ fontSize: '12px', gap: '8px' }}>
                      <div><dt>Début d’épreuve :</dt><dd>{attempt.started_at ? new Date(String(attempt.started_at)).toLocaleString('fr-FR') : '—'}</dd></div>
                      <div><dt>Échéance limite :</dt><dd>{attempt.deadline_at ? new Date(String(attempt.deadline_at)).toLocaleString('fr-FR') : '—'}</dd></div>
                      <div><dt>Remise effective :</dt><dd>{attempt.submitted_at ? new Date(String(attempt.submitted_at)).toLocaleString('fr-FR') : 'En attente'}</dd></div>
                      <div><dt>Type de remise :</dt><dd>{attempt.submission_kind === 'AUTO_DEADLINE' ? 'Automatique à échéance de la minuterie' : 'Remise volontaire par l’étudiant'}</dd></div>
                    </div>
                    {events.length > 0 && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                        <span className="cell-sub" style={{ fontWeight: 600, color: '#b91c1c' }}>Détail des infractions détectées pendant la composition :</span>
                        <ul style={{ margin: '4px 0 0', paddingLeft: '18px', fontSize: '12px', color: '#b91c1c' }}>
                          {events.map((ev, i) => (
                            <li key={i}>
                              <strong>{new Date(ev.time).toLocaleTimeString('fr-FR')}</strong> : {ev.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Questions et réponses de la copie */}
              {questions.map((question, qIndex) => {
                const response = answers.find(row => row.question_id === question.id)?.response as OnlineExamAnswer | undefined;
                const choices = response?.option_ids || [];
                const optionsForQuestion = (tables.exam_options || []).filter(row => row.question_id === question.id);
                const choiceLabels = optionsForQuestion.filter(row => choices.includes(row.id)).map(row => String(row.label));
                const correctLabels = optionsForQuestion.filter(row => row.is_correct === true).map(row => String(row.label));
                const maxPts = Number(question.points) || 0;
                const config = (question.configuration || {}) as { correction?: string; presentation?: string; requiresJustification?: boolean };
                const autoInfo = getQuestionAutoInfo(String(question.id));
                const currentScore =
                  attemptScores[String(question.id)] !== undefined
                    ? attemptScores[String(question.id)]
                    : autoInfo.points !== null
                    ? String(autoInfo.points)
                    : '';

                const isTrueFalse = config.presentation === 'TRUE_FALSE';
                const isShortText = config.presentation === 'SHORT_TEXT';
                const isLongText = question.kind === 'TEXTE' || config.presentation === 'LONG_TEXT';
                const currentFeedback = feedbackMap[String(question.id)] || '';

                const setQuestionScoreVal = (val: string) => {
                  const nextScores = { ...attemptScores, [String(question.id)]: val };
                  setQuestionScores(prev => ({ ...prev, [String(attempt.id)]: nextScores }));
                  const nextSum = questions.reduce((sum, q) => {
                    const v = nextScores[String(q.id)];
                    if (v !== undefined && v !== '' && Number.isFinite(Number(v))) return sum + Number(v);
                    const a = getQuestionAutoInfo(String(q.id)).points;
                    return sum + (a ?? 0);
                  }, 0);
                  const nextMark = totalPaperPoints > 0 ? roundMark((nextSum / totalPaperPoints) * 20) : roundMark(nextSum);
                  setManualFinals(prev => ({ ...prev, [String(attempt.id)]: String(nextMark) }));
                };

                return (
                  <section className="online-exam-question" key={question.id} style={{ marginBottom: '16px' }}>
                    <div className="online-exam-question-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong>Question {qIndex + 1}</strong>
                        <span className="pill pill-default">Barème : {maxPts} pt{maxPts > 1 ? 's' : ''}</span>
                        <span className="pill pill-subtle" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                          {isTrueFalse
                            ? 'Vrai / Faux'
                            : question.kind === 'QCM_SIMPLE'
                            ? 'QCM Unique'
                            : question.kind === 'QCM_MULTIPLE'
                            ? 'QCM Multiple'
                            : isShortText
                            ? 'Réponse courte'
                            : 'Rédaction'}
                        </span>
                        {autoInfo.label && (
                          <span
                            className={`pill ${
                              autoInfo.points !== null && autoInfo.points > 0
                                ? 'pill-success'
                                : autoInfo.points === 0
                                ? 'pill-warning'
                                : 'pill-info'
                            }`}
                            style={{ fontSize: '11px' }}
                          >
                            {autoInfo.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Énoncé */}
                    <div className="subject-text" style={{ fontSize: '1rem', fontWeight: 600, margin: '8px 0', color: '#1e293b' }}>
                      <SubjectRichText value={String(question.prompt)} />
                    </div>

                    {/* Réponse de l'étudiant */}
                    <div className="online-exam-answer-box" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <div className="cell-sub" style={{ marginBottom: '6px', fontWeight: 700, color: '#334155' }}>
                        Réponse de l’étudiant :
                      </div>

                      {choiceLabels.length > 0 && (
                        <div style={{ margin: '4px 0', fontSize: '14px' }}>
                          Choix retenu(s) :{' '}
                          <strong style={{ color: '#1e40af' }}>{choiceLabels.join(' ; ')}</strong>
                        </div>
                      )}

                      {Boolean(response?.text) && (
                        <div style={{ marginTop: '6px', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#0f172a' }}>
                          {isTrueFalse ? <em>Justification rédigée : </em> : isLongText ? null : <strong>Texte : </strong>}
                          {response?.text}
                        </div>
                      )}

                      {Boolean(response?.text) && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                          {countWords(response?.text || '')} mot(s) rédigé(s)
                        </div>
                      )}

                      {!choiceLabels.length && !response?.text && (
                        <p style={{ color: 'var(--text-subtle)', fontStyle: 'italic', margin: '4px 0' }}>
                          Sans réponse
                        </p>
                      )}
                    </div>

                    {/* Réponse attendue et corrigé indicatif */}
                    {correctLabels.length > 0 && (
                      <div className="online-exam-expected-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534', padding: '8px 12px', borderRadius: '6px', marginTop: '8px' }}>
                        <strong>Réponse(s) attendue(s) :</strong> {correctLabels.join(' ; ')}
                      </div>
                    )}
                    {Boolean(config.correction) && (
                      <div className="online-exam-expected-box" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af', padding: '10px 14px', borderRadius: '6px', marginTop: '8px' }}>
                        <div style={{ fontWeight: 700, marginBottom: '4px' }}>Corrigé indicatif & grille d’évaluation :</div>
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>{config.correction}</div>
                      </div>
                    )}

                    {/* Notation et feedback sur la question */}
                    {canGradeThisAttempt && maxPts > 0 && (
                      <div style={{ marginTop: '12px', padding: '12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                            Points attribués (sur {maxPts}) :
                          </label>

                          {/* Raccourcis de barème en un clic */}
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setQuestionScoreVal('0')}
                              style={{ fontSize: '11px', padding: '2px 8px' }}
                            >
                              0 pt
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setQuestionScoreVal(String(roundMark(maxPts * 0.25)))}
                              style={{ fontSize: '11px', padding: '2px 8px' }}
                            >
                              25%
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setQuestionScoreVal(String(roundMark(maxPts * 0.5)))}
                              style={{ fontSize: '11px', padding: '2px 8px' }}
                            >
                              50%
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setQuestionScoreVal(String(roundMark(maxPts * 0.75)))}
                              style={{ fontSize: '11px', padding: '2px 8px' }}
                            >
                              75%
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setQuestionScoreVal(String(maxPts))}
                              style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 700 }}
                            >
                              100% ({maxPts} pts)
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            max={maxPts}
                            step="0.25"
                            value={currentScore}
                            onChange={event => setQuestionScoreVal(event.target.value)}
                            placeholder={`0 à ${maxPts}`}
                            style={{ maxWidth: '120px', fontWeight: 700 }}
                          />

                          {/* Annotation du correcteur par question */}
                          <input
                            className="input"
                            type="text"
                            placeholder="Remarque / appréciation sur cette question (optionnel)…"
                            value={currentFeedback}
                            onChange={e => {
                              const val = e.target.value;
                              setQuestionFeedback(prev => ({
                                ...prev,
                                [String(attempt.id)]: { ...(prev[String(attempt.id)] || {}), [String(question.id)]: val },
                              }));
                            }}
                            style={{ flex: 1, minWidth: '220px', fontSize: '13px' }}
                          />
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}

              {/* Bilan et Enregistrement officiel de la note */}
              {canGradeThisAttempt && candidate && (
                <div className="card mt-2" style={{ backgroundColor: 'var(--surface-sunken)', padding: '18px 20px', borderRadius: '10px' }}>
                  {savedByAttempt[String(attempt.id)] && (
                    <p role="status" style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '12px' }}>
                      ✓ {savedByAttempt[String(attempt.id)]}
                    </p>
                  )}

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Appréciation globale du correcteur sur la copie :
                    </label>
                    <textarea
                      className="input"
                      rows={2}
                      maxLength={2000}
                      placeholder="Commentaire de synthèse sur l’ensemble de la copie (optionnel)…"
                      value={generalFeedback[String(attempt.id)] || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setGeneralFeedback(prev => ({ ...prev, [String(attempt.id)]: val }));
                      }}
                      style={{ width: '100%', resize: 'vertical', fontSize: '13px' }}
                    />
                  </div>

                  <ReviewedForm
                    busy={busyAttemptId === String(attempt.id)}
                    error={errorByAttempt[String(attempt.id)] || ''}
                    confirmLabel="Confirmer et enregistrer la note"
                    fields={[
                      { label: 'Candidat', value: studentName },
                      { label: 'Total brut épreuve', value: `${roundMark(rawTotal)} / ${totalPaperPoints} pts` },
                      { label: 'Note finale retenue (/20)', value: finalInput ? `${finalInput} / 20` : 'Non renseignée' },
                    ]}
                    validate={() => {
                      if (!finalInput.trim()) return 'Veuillez saisir ou calculer une note sur 20 avant d’enregistrer.';
                      const val = Number(finalInput);
                      if (!Number.isFinite(val) || val < 0 || val > 20) return 'La note doit être comprise entre 0 et 20.';
                      return null;
                    }}
                    consequence="La note chiffrée de ce candidat sera enregistrée de manière permanente dans le relevé officiel de l’évaluation."
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
                          [String(attempt.id)]: `Note de ${val}/20 enregistrée avec succès pour ${studentName}.`,
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
                          style={{ fontWeight: 800, fontSize: '15px' }}
                        />
                      </label>
                    </div>
                    <div className="btn-group mt-2">
                      <button type="submit" className="btn btn-primary" disabled={busyAttemptId === String(attempt.id)}>
                        Enregistrer la note officielle
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
  </WorkPage>;
}
