'use client';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { manageEvaluation } from '@/services/remoteCampusService';
import { connectedRecordValue } from '@/services/connectedRecordDisplayService';
import { ROLES } from '@/types/permissions';
import { isEvaluationEnrollmentStatus } from '@/services/evaluationCandidateService';

export default function EvaluationCreateDialog({
  onClose,
  onCreated,
  preselectedAssignmentId,
  category = 'control',
}: {
  onClose: () => void;
  onCreated: (evalId: string) => void;
  preselectedAssignmentId?: string;
  category?: 'control' | 'exam' | 'resit';
}) {
  const portal = usePortal();
  const snapshot = portal.relationalSnapshot;
  const assignments = snapshot.tables.teaching_assignments || [];
  const groups = snapshot.tables.groups || [];
  const subjects = snapshot.tables.subjects || [];
  const components = snapshot.tables.curriculum_components || [];
  const enrollmentGroups = snapshot.tables.enrollment_groups || [];
  const enrollments = snapshot.tables.enrollments || [];
  const evaluations = snapshot.tables.evaluations || [];

  // Filtrer les affectations accessibles pour l'utilisateur
  const filteredAssignments = assignments.filter(a => {
    if (portal.activeRole === ROLES.ENS) {
      if (portal.session?.teacherId && a.teacher_id !== portal.session.teacherId) return false;
    }
    return true;
  });

  const [assignmentId, setAssignmentId] = useState(preselectedAssignmentId || filteredAssignments[0]?.id || '');
  const [groupId, setGroupId] = useState(() => String(filteredAssignments.find(row => row.id === preselectedAssignmentId)?.group_id || filteredAssignments[0]?.group_id || ''));
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'DEVOIR' | 'EXAMEN' | 'INTERROGATION' | 'TP' | 'EXPOSE' | 'PROJET' | 'RATTRAPAGE'>(category === 'exam' ? 'EXAMEN' : category === 'resit' ? 'RATTRAPAGE' : 'DEVOIR');
  const [parentEvaluationId, setParentEvaluationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedAssignment = assignments.find(a => a.id === assignmentId);
  const selectedGroup = selectedAssignment ? groups.find(g => g.id === selectedAssignment.group_id) : null;
  const selectedComponent = selectedAssignment ? components.find(c => c.id === selectedAssignment.component_id) : null;
  const selectedSubject = selectedComponent ? subjects.find(s => s.id === selectedComponent.subject_id) : null;

  // Calcul du nombre d'étudiants rattachés
  const groupEnrollmentIds = new Set(
    enrollmentGroups
      .filter(eg => eg.group_id === selectedAssignment?.group_id && (!eg.valid_until || new Date(String(eg.valid_until)).getTime() >= Date.now()))
      .map(eg => String(eg.enrollment_id))
  );
  const candidateCount = enrollments.filter(e => groupEnrollmentIds.has(String(e.id)) && e.offering_id === selectedAssignment?.offering_id && isEvaluationEnrollmentStatus(e.status)).length;

  const parentOptions = evaluations.filter(e => e.assignment_id === assignmentId && e.kind !== 'RATTRAPAGE' && e.session_type !== 'RATTRAPAGE' && !e.cancelled_at && !e.archived_at);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentId) {
      setError('Veuillez sélectionner un enseignement.');
      return;
    }
    if (!name.trim()) {
      setError('Veuillez renseigner un libellé pour l’évaluation.');
      return;
    }
    if (kind === 'RATTRAPAGE' && !parentEvaluationId) {
      setError('Une session de rattrapage doit être rattachée à une évaluation normale.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const res = await manageEvaluation(portal.activeRole, {
        action: 'create',
        assignmentId,
        name: name.trim(),
        kind,
        parentEvaluationId: kind === 'RATTRAPAGE' ? parentEvaluationId : null,
        revision: snapshot.revision,
      });

      portal.refreshCampus();
      if (res.id) {
        onCreated(res.id);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de l’évaluation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <WorkPage title="Créer une nouvelle évaluation" onClose={onClose} busy={busy}>
      <ReviewedForm onConfirm={handleSubmit} className="form-column" busy={busy} error={error}
        confirmLabel="Confirmer la création de l’évaluation"
        fields={[
          { label: 'Évaluation', value: name.trim() },
          { label: 'Nature', value: kind },
          { label: 'Matière', value: String(selectedSubject?.name || selectedSubject?.code || '') },
          { label: 'Groupe', value: String(selectedGroup?.name || '') },
          { label: 'Candidats', value: `${candidateCount} étudiant(s)` },
          ...(kind === 'RATTRAPAGE' ? [{ label: 'Évaluation d’origine', value: String(parentOptions.find(row => row.id === parentEvaluationId)?.name || '') }] : []),
        ]}
        validate={() => !assignmentId ? 'Choisissez un enseignement.' : name.trim().length < 2 ? 'Le libellé doit contenir au moins deux caractères.' : !candidateCount ? 'Aucun candidat éligible dans ce groupe.' : kind === 'RATTRAPAGE' && !parentEvaluationId ? 'Choisissez l’évaluation d’origine.' : null}
        consequence="L’évaluation et ses candidats seront enregistrés ensemble en brouillon. Vous pourrez ensuite programmer la séance et préparer le sujet. Aucune note ni ouverture aux étudiants n’est créée par cette étape.">
        {error && <div className="restricted-box mb-2" role="alert">{error}</div>}

        <label className="form-group mb-2">Groupe concerné
          <select className="select-input" required value={groupId} onChange={event => {
            const id = event.target.value;
            setGroupId(id); setAssignmentId(filteredAssignments.find(row => row.group_id === id)?.id || ''); setParentEvaluationId('');
          }}>
            {!groupId && <option value="">Choisir un groupe</option>}
            {groups.filter(group => filteredAssignments.some(row => row.group_id === group.id)).map(group => <option key={group.id} value={group.id}>{String(group.name || group.code || 'Groupe')}</option>)}
          </select>
        </label>

        <label className="form-group mb-2">
          Enseignement (Matière &amp; Groupe)
          <select
            className="select-input"
            required
            value={assignmentId}
            onChange={e => {
              setAssignmentId(e.target.value);
              setParentEvaluationId('');
            }}
          >
            {filteredAssignments.filter(row => !groupId || row.group_id === groupId).map(a => {
              const comp = components.find(c => c.id === a.component_id);
              const subj = comp && subjects.find(s => s.id === comp.subject_id);
              const grp = groups.find(g => g.id === a.group_id);
              const offName = connectedRecordValue('teaching_assignments', 'offering_id', a.offering_id, snapshot);
              return (
                <option key={a.id} value={a.id}>
                  {String(subj?.name || subj?.code || 'Matière')} · {String(grp?.name || 'Groupe')} ({offName})
                </option>
              );
            })}
            {!filteredAssignments.length && (
              <option value="">Aucun enseignement affecté disponible</option>
            )}
          </select>
        </label>

        <div className="form-grid mb-2">
          <label className="form-group">
            Nature de l’évaluation
            <select
              className="select-input"
              value={kind}
              onChange={e => setKind(e.target.value as typeof kind)}
            >
              <option value="DEVOIR">Contrôle continu (Devoir)</option>
              <option value="EXAMEN">Examen sur table</option>
              <option value="INTERROGATION">Interrogation écrite / orale</option>
              <option value="TP">Travaux Pratiques (TP)</option>
              <option value="PROJET">Projet / Étude de cas</option>
              <option value="EXPOSE">Exposé / Présentation</option>
              <option value="RATTRAPAGE">Session de rattrapage</option>
            </select>
          </label>

          <label className="form-group">
            Intitulé de l’évaluation
            <input
              type="text"
              required
              maxLength={160}
              className="input"
              placeholder="Ex : Contrôle continu n°1, Examen partiel…"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>
        </div>

        {kind === 'RATTRAPAGE' && (
          <label className="form-group mb-2">
            Évaluation parente à rattraper
            <select
              className="select-input"
              required
              value={parentEvaluationId}
              onChange={e => setParentEvaluationId(e.target.value)}
            >
              <option value="">-- Choisir l’évaluation d’origine --</option>
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>
                  {String(p.name)} ({String(p.kind)})
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="card mb-2" style={{ background: 'var(--surface-variant, #f8fafc)' }}>
          <p className="cell-sub" style={{ margin: 0 }}>
            {selectedAssignment ? (
              <>
                <strong>Effectif rattaché :</strong> {candidateCount} étudiant(s) inscrit(s) dans le groupe{' '}
                <strong>{String(selectedGroup?.name ?? '')}</strong> pour la matière{' '}
                <strong>{String(selectedSubject?.name || 'Matière')}</strong> seront automatiquement enregistrés comme candidats éligibles.
              </>
            ) : (
              'Sélectionnez une affectation pour voir les candidats associés.'
            )}
          </p>
        </div>

        <DrawerActions>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !assignmentId || !candidateCount}
          >
            Créer l’évaluation en brouillon
          </button>
          <DrawerCloseButton className="btn btn-outline" disabled={busy}>
            Annuler
          </DrawerCloseButton>
        </DrawerActions>
      </ReviewedForm>
    </WorkPage>
  );
}
