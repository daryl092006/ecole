'use client';
import { DrawerCloseButton, useDrawer } from '@/components/ui/DetailDrawer';
import { useEffect, useRef, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WorkflowStepper from '@/components/ui/WorkflowStepper';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { manageEvaluation } from '@/services/remoteCampusService';
import { connectedRecordName } from '@/services/connectedRecordDisplayService';
import {
  evaluationCandidateStatusLabel,
  evaluationGradeIsComplete,
  evaluationGradeNoteLabel,
  evaluationGradeValue,
} from '@/services/evaluationGradePolicy';
import type { DatabaseRow } from '@/types/persistence';
import type { GradeWorkflowStatus } from '@/types/academic';
import PersistentExamCopies from './PersistentExamCopies';

const STEPS = [
  { id: 'BROUILLON', label: 'Brouillon', owner: 'Enseignant' },
  { id: 'SAISIES', label: 'Saisie', owner: 'Enseignant' },
  { id: 'SOUMISES', label: 'Soumission', owner: 'Enseignant' },
  { id: 'A_CONTROLER', label: 'Contrôle', owner: 'Direction académique' },
  { id: 'VALIDEES', label: 'Validation', owner: 'Direction académique' },
  { id: 'PUBLIEES', label: 'Publication', owner: 'Résultats publiés' },
];

export default function EvaluationGradeDialog({
  evaluationId,
  evaluationIds,
  onClose,
}: {
  evaluationId: string;
  evaluationIds?: string[];
  onClose: () => void;
}) {
  const portal = usePortal();
  const availableIds = evaluationIds?.length ? evaluationIds : [evaluationId];
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(evaluationId);
  const evaluation = portal.relationalSnapshot.tables.evaluations?.find(row => row.id === selectedEvaluationId);
  const [busy, setBusy] = useState(false);
  return <WorkPage title={evaluation ? `Notes · ${String(evaluation.name)}` : 'Évaluation introuvable'} onClose={onClose} busy={busy}>
    {availableIds.length > 1 && (
      <div className="filter-bar mb-2">
        <label className="form-group">
          Offre de formation à corriger
          <select
            aria-label="Offre de formation à corriger"
            className="select-input"
            disabled={busy}
            value={selectedEvaluationId}
            onChange={e => setSelectedEvaluationId(e.target.value)}
          >
            {availableIds.map(id => {
              const ev = portal.relationalSnapshot.tables.evaluations?.find(row => row.id === id);
              const off = portal.relationalSnapshot.tables.academic_offerings?.find(row => row.id === ev?.offering_id);
              const offLabel = off ? connectedRecordName('academic_offerings', off, portal.relationalSnapshot) : id;
              const candCount = (portal.relationalSnapshot.tables.evaluation_candidates || []).filter(c => c.evaluation_id === id).length;
              return (
                <option key={id} value={id}>
                  {offLabel} ({candCount} candidat{candCount > 1 ? 's' : ''} · {String(ev?.status || '')})
                </option>
              );
            })}
          </select>
        </label>
      </div>
    )}
    {evaluation ? <EvaluationGrades key={selectedEvaluationId} evaluationId={selectedEvaluationId} busy={busy} setBusy={setBusy} /> : <p>L’évaluation demandée est introuvable.</p>}
  </WorkPage>;
}

function EvaluationGrades({ evaluationId, busy, setBusy }: { evaluationId: string; busy: boolean; setBusy: (busy: boolean) => void }) {
  const portal = usePortal();
  const drawer = useDrawer();
  const snapshot = portal.relationalSnapshot;
  const evaluation = snapshot.tables.evaluations!.find(e => e.id === evaluationId)!;
  const revision = useRef(snapshot.revision);
  useEffect(() => { revision.current = Math.max(revision.current, snapshot.revision); }, [snapshot.revision]);
  const candidates = (snapshot.tables.evaluation_candidates || []).filter(c => c.evaluation_id === evaluationId);
  const grades = snapshot.tables.grades || [];
  const gradeMap = new Map<string, DatabaseRow>();
  for (const g of grades) gradeMap.set(String(g.candidate_id), g);

  const transitions = (snapshot.tables.evaluation_transitions || [])
    .filter(t => t.evaluation_id === evaluationId)
    .sort((a, b) => String(b.happened_at || '').localeCompare(String(a.happened_at || '')));

  const candidateGradeIds = new Set(candidates.map(c => gradeMap.get(String(c.id))?.id).filter(Boolean));
  const revisions = (snapshot.tables.grade_revisions || []).filter(r => candidateGradeIds.has(String(r.grade_id)));

  const [inputGrades, setInputGrades] = useState<Record<string, { value: string; absence: string }>>(() => {
    const map: Record<string, { value: string; absence: string }> = {};
    for (const c of candidates) {
      const g = gradeMap.get(String(c.id));
      const lastAttempt = snapshot.tables.exam_attempts?.filter(attempt => attempt.candidate_id === c.id).sort((a, b) => Number(b.attempt_number) - Number(a.attempt_number))[0];
      const blankCopy = !g?.absence_status && g?.value == null && lastAttempt && ['REMISE', 'EXPIREE'].includes(String(lastAttempt.status)) && lastAttempt.completion_status === 'NON_TRAITE';
      const value = blankCopy ? 0 : evaluationGradeValue(g);
      map[String(c.id)] = {
        value: value != null ? String(value) : '',
        absence: blankCopy ? 'NON_TRAITE' : g?.absence_status && g.absence_status !== 'PRESENT' ? String(g.absence_status) : '',
      };
    }
    return map;
  });

  const [pendingTransition, setPendingTransition] = useState<GradeWorkflowStatus | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [correctingGradeId, setCorrectingGradeId] = useState<string | null>(null);
  const [correctionValue, setCorrectionValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [copyCandidateId, setCopyCandidateId] = useState('');
  const copyCandidateIds = new Set((snapshot.tables.exam_attempts || []).filter(attempt => attempt.evaluation_id === evaluationId).map(attempt => String(attempt.candidate_id)));

  const status = evaluation.status as GradeWorkflowStatus;
  const canEnter = portal.perms.permissions.includes('grade.enter') && ['BROUILLON', 'SAISIES'].includes(status) && !evaluation.cancelled_at;
  const canSubmit = portal.perms.permissions.includes('grade.submit') && ['BROUILLON', 'SAISIES'].includes(status) && !evaluation.cancelled_at;
  const canReview = portal.perms.permissions.includes('grade.review');
  const canApprove = portal.perms.permissions.includes('grade.approve');
  const canPublish = portal.perms.permissions.includes('grade.publish');

  const payloadGrades = () => candidates.map(candidate => {
    const item = inputGrades[String(candidate.id)] || { value: '', absence: '' };
    const value = item.absence === 'NON_TRAITE' ? 0 : item.absence || !item.value.trim() ? null : Number(item.value);
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 20)) throw new Error('Chaque note doit être un nombre compris entre 0 et 20.');
    return { candidateId: String(candidate.id), value, absenceStatus: (item.absence || null) as 'ABSENT' | 'JUSTIFIE' | 'NON_TRAITE' | null };
  });
  const saveCurrentGrades = async (advance = false) => {
    const saved = await manageEvaluation(portal.activeRole, {
      action: 'enter_grades', evaluationId: evaluation.id, advanceToSaisies: advance,
      grades: payloadGrades(), revision: revision.current,
    });
    revision.current = saved.revision;
    drawer?.markSaved();
    return saved;
  };
  const summaryRows = candidates.map(candidate => canEnter ? inputGrades[String(candidate.id)] : {
    value: String(evaluationGradeValue(gradeMap.get(String(candidate.id))) ?? ''), absence: gradeMap.get(String(candidate.id))?.absence_status === 'PRESENT' ? '' : String(gradeMap.get(String(candidate.id))?.absence_status || ''),
  });
  const numericGrades = summaryRows.map(item => evaluationGradeValue(item ? { value: item.value, absence_status: item.absence } : null)).filter((value): value is number => value !== null);
  const absenceCount = summaryRows.filter(item => item && ['ABSENT', 'JUSTIFIE'].includes(item.absence)).length;
  const unprocessedCount = summaryRows.filter(item => item?.absence === 'NON_TRAITE').length;
  const pendingCorrectionCount = candidates.length - numericGrades.length - absenceCount;
  const validCorrection = correctionValue.trim() !== '' && Number.isFinite(Number(correctionValue)) && Number(correctionValue) >= 0 && Number(correctionValue) <= 20;
  const transitionLabels: Partial<Record<GradeWorkflowStatus, string>> = {
    SOUMISES: 'Confirmer la soumission des notes', A_CONTROLER: 'Confirmer la prise en contrôle',
    VALIDEES: 'Confirmer la validation des notes', PUBLIEES: 'Confirmer la publication des résultats',
  };
  const transitionConsequences: Partial<Record<GradeWorkflowStatus, string>> = {
    SOUMISES: 'Les notes saisies seront enregistrées puis transmises à la direction académique. ABSENT et JUSTIFIE comptent comme traités ; toute copie NON_TRAITE ou en attente de correction bloque la soumission. La saisie sera verrouillée jusqu’à un éventuel retour à l’enseignant.',
    A_CONTROLER: 'Les notes passeront en contrôle académique. Elles ne seront pas encore publiées.',
    VALIDEES: 'Les notes seront validées par la direction académique. Leur publication reste une étape distincte.',
    PUBLIEES: 'Les résultats deviendront officiels et visibles par les étudiants autorisés. Toute correction ultérieure devra être motivée et tracée.',
  };

  const handleSaveGrades = async (advance = false) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await saveCurrentGrades(advance);

      portal.refreshCampus();
      setSuccess('Notes enregistrées avec succès.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d’enregistrement des notes.');
    } finally {
      setBusy(false);
    }
  };

  const handleTransition = async (toStatus: GradeWorkflowStatus, reason?: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      // Si on soumet, on s'assure d'abord d'enregistrer les notes actuelles
      let fromStatus = status;
      if (toStatus === 'SOUMISES' && canEnter) {
        const rows = payloadGrades();
        if (rows.some(row => row.absenceStatus === 'NON_TRAITE')) {
          throw new Error('Traitez toutes les copies NON_TRAITE avant de soumettre les notes.');
        }
        if (!rows.length || rows.some(row => !evaluationGradeIsComplete({ value: row.value, absence_status: row.absenceStatus }))) {
          throw new Error('Renseignez une note ou une absence ABSENT/JUSTIFIE pour chaque candidat.');
        }
        await saveCurrentGrades(status === 'BROUILLON');
        if (status === 'BROUILLON') fromStatus = 'SAISIES';
      }

      const saved = await manageEvaluation(portal.activeRole, {
        action: 'transition_workflow',
        evaluationId: evaluation.id,
        fromStatus,
        toStatus,
        reason: reason?.trim() || undefined,
        revision: revision.current,
      });
      revision.current = saved.revision;
      drawer?.markSaved();
      portal.refreshCampus();
      setPendingTransition(null);
      setReturnOpen(false);
      setReturnReason('');
      setSuccess(`Statut mis à jour avec succès : ${toStatus}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement d’état.');
    } finally {
      setBusy(false);
    }
  };

  const handleCorrectGradeSubmit = async (gradeId: string) => {
    if (busy || !validCorrection) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const val = Number(correctionValue);
      if (!correctionValue.trim() || !Number.isFinite(val) || val < 0 || val > 20) {
        throw new Error('La note doit être comprise entre 0 et 20.');
      }
      if (!correctionReason.trim()) {
        throw new Error('Un motif circonstancié est obligatoire pour corriger une note publiée.');
      }

      const saved = await manageEvaluation(portal.activeRole, {
        action: 'correct_grade',
        gradeId,
        newValue: val,
        reason: correctionReason.trim(),
        revision: revision.current,
      });
      revision.current = saved.revision;
      drawer?.markSaved();
      portal.refreshCampus();
      setCorrectingGradeId(null);
      setCorrectionValue('');
      setCorrectionReason('');
      setSuccess('Correction enregistrée avec succès dans l’historique des révisions.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la correction.');
    } finally {
      setBusy(false);
    }
  };

  return (
      <div className="evaluation-grade-workspace">
        {busy && !pendingTransition && !correctingGradeId && <LoadingState compact label="Enregistrement en cours…" />}
        <details className="context-details mb-2" open>
          <summary>Workflow de validation des notes</summary>
          <WorkflowStepper steps={STEPS} currentStep={status} title="Cycle d’évaluation" />
        </details>

        <div className="kpi-grid kpi-grid-3 mb-2">
          <div className="kpi-card">
            <span className="kpi-label">Copies corrigées (notées)</span>
            <strong className="kpi-value">{numericGrades.length - unprocessedCount} / {candidates.length}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">En attente de correction</span>
            <strong className="kpi-value">{pendingCorrectionCount + unprocessedCount}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Absents (injustifiés / justifiés)</span>
            <strong className="kpi-value">{absenceCount}</strong>
          </div>
        </div>

        {error && !pendingTransition && !correctingGradeId && <div className="restricted-box mb-2" role="alert">{error}</div>}
        {success && <div role="status" className="mb-2" style={{ color: 'var(--success)', fontWeight: 600 }}>{success}</div>}

        <form aria-label="Saisie des notes" aria-busy={busy} onSubmit={event => { event.preventDefault(); void handleSaveGrades(); }}>
        <fieldset className="permission-fieldset" disabled={busy || !!pendingTransition}>
        <div className="card mb-2">
          <div className="card-header">
            <div>
              <h3>Candidats ({candidates.length})</h3>
              <p className="cell-sub">
                {canEnter
                  ? 'Saisissez les notes (sur 20) pour les copies corrigées ou indiquez une absence. Une case vide sans motif d’absence correspond à une copie en attente de correction par l’enseignant (l’étudiant n’est pas compté absent).'
                  : status === 'PUBLIEES'
                  ? 'Résultats officiels publiés. Les corrections nécessitent une décision motivée.'
                  : 'Notes en cours de contrôle ou validation.'}
              </p>
            </div>
          </div>

          <ResponsiveTable className="data-table">
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Note / 20</th>
                <th>Présence & État de correction</th>
                {copyCandidateIds.size > 0 && <th>Copie en ligne</th>}
                {status === 'PUBLIEES' && canApprove && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => {
                const enrollment = snapshot.tables.enrollments?.find(e => e.id === c.enrollment_id);
                const studentName = connectedRecordName('enrollments', enrollment || { id: String(c.enrollment_id) }, snapshot);
                const grade = gradeMap.get(String(c.id));
                const gradeValue = evaluationGradeValue(grade);
                const item = inputGrades[String(c.id)] || { value: '', absence: '' };
                const lastAttempt = snapshot.tables.exam_attempts
                  ?.filter(attempt => attempt.candidate_id === c.id)
                  .sort((a, b) => Number(b.attempt_number) - Number(a.attempt_number))[0];
                const hasSubmittedOnlineCopy = lastAttempt && ['REMISE', 'EXPIREE'].includes(String(lastAttempt.status));
                const statusLabel = evaluationCandidateStatusLabel(grade, lastAttempt?.status);
                const noteLabel = evaluationGradeNoteLabel(grade, lastAttempt?.status);
                const candidateComplaint = (snapshot.tables.complaints || []).find(comp => comp.candidate_id === c.id || (grade && comp.grade_id === grade.id));
                const assignmentSessionIds = new Set(
                  (snapshot.tables.sessions || [])
                    .filter(s => s.assignment_id === evaluation.assignment_id)
                    .map(s => String(s.id)),
                );
                const candidateAttendances = (snapshot.tables.attendances || []).filter(
                  att => att.enrollment_id === c.enrollment_id && assignmentSessionIds.has(String(att.session_id)),
                );
                const candidateAttendanceIds = new Set(candidateAttendances.map(att => String(att.id)));
                const candidateJustifications = (snapshot.tables.absence_justifications || []).filter(j =>
                  candidateAttendanceIds.has(String(j.attendance_id)),
                );
                const hasValidatedJustification =
                  candidateAttendances.some(att => att.status === 'ABSENT_JUSTIFIE') ||
                  candidateJustifications.some(j => j.status === 'VALIDE');
                const hasPendingJustification = candidateJustifications.some(j => j.status === 'EN_ATTENTE');

                return (
                  <tr key={c.id}>
                    <td>
                      <strong>{studentName}</strong>
                      {(candidateComplaint || hasValidatedJustification || hasPendingJustification) && (
                        <div className="cell-sub" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {hasValidatedJustification && (
                            <span className="pill pill-success">Justificatif d’absence validé en séance</span>
                          )}
                          {!hasValidatedJustification && hasPendingJustification && (
                            <span className="pill pill-warning">Justificatif d’absence en attente</span>
                          )}
                          {candidateComplaint && (
                            <span className={`pill ${candidateComplaint.status === 'CLOTUREE' ? 'pill-default' : 'pill-warning'}`}>
                              Réclamation : {String(candidateComplaint.status)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {canEnter ? (
                        <input
                          aria-label={`Note de ${studentName}`}
                          className="input grade-input"
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          disabled={busy || !!item.absence}
                          value={item.absence === 'NON_TRAITE' ? '0' : item.absence ? '' : item.value}
                          onChange={e => {
                            const val = e.target.value;
                            setInputGrades(prev => ({ ...prev, [String(c.id)]: { ...prev[String(c.id)], value: val } }));
                          }}
                          placeholder={item.absence ? '—' : 'À corriger'}
                          style={{ width: '110px' }}
                        />
                      ) : (
                        <span>{noteLabel}</span>
                      )}
                    </td>
                    <td>
                      {canEnter ? (
                        <select
                          className="select-input"
                          aria-label={`Présence de ${studentName}`}
                          disabled={busy}
                          value={item.absence}
                          onChange={e => {
                            const abs = e.target.value;
                            setInputGrades(prev => ({
                              ...prev,
                              [String(c.id)]: { value: abs === 'NON_TRAITE' ? '0' : abs || prev[String(c.id)]?.absence === 'NON_TRAITE' ? '' : prev[String(c.id)]?.value || '', absence: abs },
                            }));
                          }}
                        >
                          <option value="">
                            {item.value.trim() !== ''
                              ? 'Présent · Copie corrigée (note chiffrée)'
                              : hasSubmittedOnlineCopy
                              ? 'Présent · Copie remise — en attente de correction'
                              : 'Présent / En attente de correction par l’enseignant'}
                          </option>
                          <option value="ABSENT">Absent injustifié</option>
                          <option value="JUSTIFIE">Absent justifié</option>
                          <option value="NON_TRAITE">Copie non traitée — soumission bloquée</option>
                        </select>
                      ) : (
                        <span className={`pill ${grade?.absence_status ? 'pill-warning' : gradeValue != null ? 'pill-success' : 'pill-default'}`}>
                          {statusLabel}
                        </span>
                      )}
                    </td>
                    {copyCandidateIds.size > 0 && <td>{copyCandidateIds.has(String(c.id)) ? <IconButton className="btn btn-outline" label={`Lire la copie de ${studentName}`} disabled={busy} onClick={() => setCopyCandidateId(String(c.id))} /> : 'Aucune copie en ligne'}</td>}
                    {status === 'PUBLIEES' && canApprove && (
                      <td>
                        {grade && gradeValue != null && (
                          <IconButton
                            className="btn btn-sm btn-outline"
                            label="Corriger"
                            onClick={() => {
                              setCorrectingGradeId(grade.id);
                              setCorrectionValue(String(gradeValue));
                              setCorrectionReason('');
                            }}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {!candidates.length && (
                <tr>
                  <td colSpan={3 + (status === 'PUBLIEES' && canApprove ? 1 : 0) + (copyCandidateIds.size > 0 ? 1 : 0)}>
                    Aucun candidat rattaché à cette évaluation.
                  </td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </div>
        </fieldset>
        </form>

        {/* Formulaire modal de correction de note publiée */}
        {correctingGradeId && (
          <ReviewedForm className="card mb-2" aria-label="Formulaire de correction de note" busy={busy} error={error}
            confirmLabel="Confirmer la révision de note" validate={() => validCorrection ? null : 'La note doit être un nombre compris entre 0 et 20.'}
            fields={[{ label: 'Note /20', previous: String(evaluationGradeValue(grades.find(grade => grade.id === correctingGradeId)) ?? ''), value: correctionValue }, { label: 'Motif', value: correctionReason }]}
            consequence="La note publiée sera corrigée. L’ancienne valeur, le motif et l’auteur resteront conservés dans l’historique."
            onConfirm={() => { void handleCorrectGradeSubmit(correctingGradeId); }}>
            <h3>Corriger une note publiée</h3>
            <p className="cell-sub">
              Conformément aux règles institutionnelles ESCEN, toute modification d’une note publiée doit être motivée et est conservée à vie dans le registre d’audit.
            </p>
            <div className="form-grid mb-2">
              <label className="form-group">
                Nouvelle note / 20
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.25"
                  required
                  className="input"
                  value={correctionValue}
                  onChange={e => setCorrectionValue(e.target.value)}
                />
              </label>
              <label className="form-group">
                Motif obligatoire de la correction
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={1000}
                  className="input"
                  placeholder="Ex : Erreur de report, réclamation admise…"
                  value={correctionReason}
                  onChange={e => setCorrectionReason(e.target.value)}
                />
              </label>
            </div>
            <DrawerActions>
              <button
                className="btn btn-primary"
                disabled={busy || !validCorrection || correctionReason.trim().length < 3}
                type="submit"
              >
                Valider la révision
              </button>
              <DrawerCloseButton className="btn btn-outline" onClose={() => setCorrectingGradeId(null)}>
                Annuler
              </DrawerCloseButton>
            </DrawerActions>
          </ReviewedForm>
        )}

        {/* Actions du workflow */}
        {!pendingTransition && !correctingGradeId && !returnOpen && <DrawerActions>
          {canEnter && (
            <>
              <button className="btn btn-outline" disabled={busy} onClick={() => handleSaveGrades(false)}>
                Enregistrer les notes
              </button>
              {status === 'BROUILLON' && (
                <button className="btn btn-outline" disabled={busy} onClick={() => handleSaveGrades(true)}>
                  Marquer comme en saisie
                </button>
              )}
            </>
          )}

          {canSubmit && (
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => { setError(''); setPendingTransition('SOUMISES'); }}
            >
              Soumettre à la direction académique
            </button>
          )}

          {canReview && status === 'SOUMISES' && (
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => { setError(''); setPendingTransition('A_CONTROLER'); }}
            >
              Prendre en contrôle
            </button>
          )}

          {canApprove && (status === 'SOUMISES' || status === 'A_CONTROLER') && (
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => { setError(''); setPendingTransition('VALIDEES'); }}
            >
              Valider les notes
            </button>
          )}

          {canPublish && status === 'VALIDEES' && (
            <button
              className="btn btn-success"
              disabled={busy}
              onClick={() => { setError(''); setPendingTransition('PUBLIEES'); }}
            >
              Publier les résultats
            </button>
          )}

          {canReview && (status === 'SOUMISES' || status === 'A_CONTROLER') && (
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => setReturnOpen(true)}
            >
              Renvoyer à l’enseignant
            </button>
          )}
        </DrawerActions>}

        {pendingTransition && <ReviewedForm key={pendingTransition} reviewInitially busy={busy} error={error}
          confirmLabel={transitionLabels[pendingTransition]!} consequence={transitionConsequences[pendingTransition]!}
          fields={[{ label: 'Évaluation', value: String(evaluation.name) }, { label: 'Notes chiffrées', value: String(numericGrades.length) },
            { label: 'Copies non traitées (soumission bloquée)', value: String(unprocessedCount) },
            { label: 'Absences', value: String(absenceCount) }, { label: 'Sans note', value: String(pendingCorrectionCount) },
            { label: 'Moyenne /20', value: numericGrades.length ? (numericGrades.reduce((sum, value) => sum + value, 0) / numericGrades.length).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : 'Aucune note chiffrée' }]}
          onCancelReview={() => setPendingTransition(null)} onConfirm={() => { void handleTransition(pendingTransition); }} />}

        {/* Panneau de renvoi à l'enseignant */}
        {returnOpen && (
          <form className="card mb-2" aria-label="Renvoyer à l'enseignant" aria-busy={busy} onSubmit={event => { event.preventDefault(); void handleTransition('SAISIES', returnReason); }}>
            <fieldset className="permission-fieldset" disabled={busy}>
            <h3>Motif du retour des notes</h3>
            <p className="cell-sub">
              Indiquez à l’enseignant les corrections ou vérifications requises avant nouvelle soumission.
            </p>
            <textarea
              aria-label="Motif du retour des notes"
              className="input mb-2"
              required
              minLength={3}
              maxLength={1000}
              rows={3}
              placeholder="Ex : Erreur de barème sur les questions 2 et 4, notes à vérifier."
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
            />
            <DrawerActions>
              <button
                className="btn btn-primary"
                disabled={busy || returnReason.trim().length < 3}
                type="submit"
              >
                Confirmer le retour
              </button>
              <DrawerCloseButton className="btn btn-outline" onClose={() => setReturnOpen(false)}>
                Annuler
              </DrawerCloseButton>
            </DrawerActions>
            </fieldset>
          </form>
        )}

        {/* Historique des transitions et révisions */}
        {(transitions.length > 0 || revisions.length > 0) && (
          <details className="mt-2">
            <summary>Historique et traçabilité ({transitions.length + revisions.length} événements)</summary>
            {revisions.map(r => (
              <p key={r.id} className="cell-sub" style={{ color: 'var(--primary)' }}>
                <strong>Révision de note :</strong> {Number(r.old_value)}/20 → {Number(r.new_value)}/20 · {String(r.actor_role)} · {String(r.reason)} · {new Date(String(r.happened_at || '')).toLocaleString('fr-FR')}
              </p>
            ))}
            {transitions.map(t => (
              <p key={t.id} className="cell-sub">
                {String(t.from_status)} → <strong>{String(t.to_status)}</strong>
                {t.reason ? ` · Motif : ${String(t.reason)}` : ''} · {new Date(String(t.happened_at || '')).toLocaleString('fr-FR')}
              </p>
            ))}
          </details>
        )}
        {copyCandidateId && <PersistentExamCopies evaluationId={evaluationId} candidateId={copyCandidateId} onClose={() => setCopyCandidateId('')} />}
      </div>
  );
}
