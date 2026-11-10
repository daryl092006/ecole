'use client';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import DrawerActions from '@/components/ui/DrawerActions';
import { manageEvaluation } from '@/services/remoteCampusService';
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
  const rooms = snapshot.tables.rooms || [];
  const availableRooms = rooms.filter(r => !r.archived_at && r.available !== false);

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
  const [scheduleNow, setScheduleNow] = useState(category === 'exam' || category === 'resit');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [deliveryMode, setDeliveryMode] = useState<'EN_LIGNE' | 'PAPIER'>(portal.activeRole === ROLES.SURV ? 'PAPIER' : 'EN_LIGNE');
  const [roomId, setRoomId] = useState(availableRooms[0]?.id ? String(availableRooms[0].id) : '');
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

  const validate = () => {
    if (!assignmentId) return 'Choisissez un enseignement.';
    if (name.trim().length < 2) return 'Le libellé doit contenir au moins deux caractères.';
    if (!candidateCount) return 'Aucun candidat éligible dans ce groupe.';
    if (kind === 'RATTRAPAGE' && !parentEvaluationId) return 'Choisissez l’évaluation d’origine.';
    if (scheduleNow) {
      if (!startsAt || !endsAt) return 'Renseignez la date et les heures de début et de fin.';
      const s = new Date(`${startsAt}:00Z`).getTime();
      const e = new Date(`${endsAt}:00Z`).getTime();
      if (isNaN(s) || isNaN(e) || s >= e) return 'L’heure de début doit précéder l’heure de fin.';
      if (deliveryMode === 'EN_LIGNE' && s <= Date.now()) {
        return 'Pour une épreuve en ligne, l’heure de début doit être dans le futur afin de permettre la composition et l’autorisation du sujet.';
      }
      if (durationMinutes < 1) return 'La durée de composition doit être d’au moins 1 minute.';
      if ((e - s) < durationMinutes * 60000) return 'La fenêtre horaire doit couvrir au moins la durée de l’épreuve.';
      if (deliveryMode === 'PAPIER' && !roomId) return 'Choisissez une salle pour l’épreuve sur papier.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const issue = validate();
    if (issue) {
      setError(issue);
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

      if (res.id && scheduleNow && startsAt && endsAt) {
        const iso = (v: string) => new Date(`${v}:00Z`).toISOString();
        await manageEvaluation(portal.activeRole, {
          action: 'schedule_delivery',
          evaluationId: res.id,
          sessionId: null,
          newSession: {
            mode: deliveryMode,
            roomId: deliveryMode === 'PAPIER' ? roomId : null,
            startsAt: iso(startsAt),
            endsAt: iso(endsAt),
          },
          accessOpensAt: iso(startsAt),
          accessClosesAt: iso(endsAt),
          durationMinutes: Number(durationMinutes),
          reason: 'Programmation lors de la création de l’épreuve',
          revision: Number(res.revision) || snapshot.revision,
        });
      }

      await portal.refreshCampus();
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
    <WorkPage title={scheduleNow ? 'Créer et programmer une épreuve' : 'Créer une nouvelle évaluation'} onClose={onClose} busy={busy}>
      <ReviewedForm onConfirm={handleSubmit} className="form-column" busy={busy} error={error}
        confirmLabel={scheduleNow ? 'Confirmer la création et la programmation' : 'Confirmer la création de l’évaluation'}
        fields={[
          { label: 'Évaluation', value: name.trim() },
          { label: 'Nature', value: kind },
          { label: 'Matière', value: String(selectedSubject?.name || selectedSubject?.code || '') },
          { label: 'Groupe', value: String(selectedGroup?.name || '') },
          { label: 'Candidats', value: `${candidateCount} étudiant(s)` },
          ...(scheduleNow && startsAt && endsAt ? [
            { label: 'Séance début', value: startsAt.replace('T', ' à ') },
            { label: 'Séance fin', value: endsAt.replace('T', ' à ') },
            { label: 'Durée', value: `${durationMinutes} minutes` },
            { label: 'Mode', value: deliveryMode === 'EN_LIGNE' ? 'En ligne' : `Sur table (${availableRooms.find(r => r.id === roomId)?.name || 'Salle'})` },
          ] : []),
          ...(kind === 'RATTRAPAGE' ? [{ label: 'Évaluation d’origine', value: String(parentOptions.find(row => row.id === parentEvaluationId)?.name || '') }] : []),
        ]}
        validate={validate}
        consequence={scheduleNow ? (deliveryMode === 'PAPIER' ? `L’épreuve sur table sera programmée le ${startsAt.replace('T', ' à ')} en salle ${availableRooms.find(r => r.id === roomId)?.name || 'sélectionnée'}. Le surveillant assurera l’émargement en salle, et l’enseignant saisira le bordereau de notes sur la plateforme une fois les copies physiques corrigées.` : `L’évaluation en ligne sera programmée le ${startsAt.replace('T', ' à ')}. Le sujet sera immédiatement débloqué pour la saisie des questions et du barème.`) : 'L’évaluation et ses candidats seront enregistrés sans horaire fixé (à programmer ultérieurement).'}
      >
        {error && <div className="restricted-box mb-2" role="alert">{error}</div>}

        {/* Étape 1 : Cadre pédagogique */}
        <div className="card mb-3" style={{ border: '1px solid var(--border)', background: 'var(--surface, #ffffff)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span className="page-eyebrow" style={{ color: 'var(--primary, #0284c7)', fontWeight: 700 }}>ÉTAPE 1 · CADRE PÉDAGOGIQUE</span>
            {selectedAssignment && (
              <span className="pill pill-default" style={{ fontSize: '0.82rem' }}>
                👥 {candidateCount} candidat(s) rattaché(s)
              </span>
            )}
          </div>

          <div className="form-grid mb-2">
            <label className="form-group">
              Groupe / Classe
              <select className="select-input" required value={groupId} onChange={event => {
                const id = event.target.value;
                setGroupId(id);
                setAssignmentId(filteredAssignments.find(row => row.group_id === id)?.id || '');
                setParentEvaluationId('');
              }}>
                {!groupId && <option value="">Choisir un groupe</option>}
                {groups.filter(group => filteredAssignments.some(row => row.group_id === group.id)).map(group => (
                  <option key={group.id} value={group.id}>{String(group.name || group.code || 'Groupe')}</option>
                ))}
              </select>
            </label>

            <label className="form-group">
              Matière enseignée
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
                  return (
                    <option key={a.id} value={a.id}>
                      {String(subj?.name || subj?.code || 'Matière')}
                    </option>
                  );
                })}
                {!filteredAssignments.length && (
                  <option value="">Aucun enseignement disponible</option>
                )}
              </select>
            </label>
          </div>

          <div className="form-grid mb-2">
            <label className="form-group">
              Nature de l’évaluation
              <select
                className="select-input"
                value={kind}
                onChange={e => setKind(e.target.value as typeof kind)}
              >
                <option value="EXAMEN">Examen sur table (Partiel / Final)</option>
                <option value="DEVOIR">Contrôle continu (Devoir sur table)</option>
                <option value="INTERROGATION">Interrogation écrite / orale</option>
                <option value="TP">Travaux Pratiques (TP)</option>
                <option value="PROJET">Projet / Étude de cas</option>
                <option value="EXPOSE">Exposé / Présentation</option>
                <option value="RATTRAPAGE">Session de rattrapage</option>
              </select>
            </label>

            <label className="form-group">
              Intitulé de l’épreuve
              <input
                type="text"
                required
                maxLength={160}
                className="input"
                placeholder="Ex : Examen final du 1er semestre, Devoir surveillé n°1…"
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
        </div>

        {/* Étape 2 : Modalités et Programmation */}
        <div className="card mb-3" style={{ border: '1px solid var(--border)', background: scheduleNow ? '#f0f9ff' : 'var(--surface-variant, #f8fafc)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="page-eyebrow" style={{ color: 'var(--primary, #0284c7)', fontWeight: 700 }}>ÉTAPE 2 · SÉANCE ET HORAIRE</span>
          </div>

          <label className="checkbox-field" style={{ marginBottom: scheduleNow ? '14px' : 0 }}>
            <input
              type="checkbox"
              checked={scheduleNow}
              onChange={e => setScheduleNow(e.target.checked)}
            />
            <strong>Programmer immédiatement la séance d’examen (date, heure et salle)</strong>
          </label>
          <p className="cell-sub" style={{ margin: '4px 0 0 0' }}>
            {scheduleNow
              ? 'Fixez la date, l’heure et la salle pour inscrire une nouvelle séance d’examen à l’emploi du temps.'
              : 'Pour un contrôle continu (devoir, interrogation, TP) réalisé pendant un cours existant ou déjà passé, laissez cette case décochée : l’évaluation sera créée directement pour la saisie des notes sans conflit d’emploi du temps.'}
          </p>

          {scheduleNow && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-grid">
                <label className="form-group">
                  Début de l’épreuve (Date et heure)
                  <input
                    type="datetime-local"
                    className="input"
                    required={scheduleNow}
                    value={startsAt}
                    onChange={e => {
                      setStartsAt(e.target.value);
                      if (e.target.value && !endsAt) {
                        const d = new Date(`${e.target.value}:00Z`);
                        if (!isNaN(d.getTime())) {
                          d.setUTCHours(d.getUTCHours() + 2);
                          setEndsAt(d.toISOString().slice(0, 16));
                        }
                      }
                    }}
                  />
                </label>
                <label className="form-group">
                  Fin de l’épreuve (Date et heure)
                  <input
                    type="datetime-local"
                    className="input"
                    required={scheduleNow}
                    value={endsAt}
                    onChange={e => setEndsAt(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-group">
                  Durée de composition (minutes)
                  <input
                    type="number"
                    min={1}
                    max={600}
                    className="input"
                    required={scheduleNow}
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                  />
                </label>

                <label className="form-group">
                  Mode de passage
                  <select
                    className="select-input"
                    value={deliveryMode}
                    onChange={e => setDeliveryMode(e.target.value as 'EN_LIGNE' | 'PAPIER')}
                  >
                    <option value="EN_LIGNE">Épreuve en ligne (sur le portail)</option>
                    <option value="PAPIER">Épreuve sur papier (en salle)</option>
                  </select>
                </label>
              </div>

              {deliveryMode === 'EN_LIGNE' && (
                <p className="info-box mb-1" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
                  <strong>Épreuve en ligne (sur le portail) :</strong> le sujet de l’épreuve sera immédiatement débloqué pour y rédiger les questions et barèmes. Les étudiants accèderont au sujet en ligne et composeront directement depuis leur espace personnel pendant la fenêtre horaire.
                </p>
              )}

              {deliveryMode === 'PAPIER' && (
                <>
                  <p className="info-box mb-1">
                    <strong>Épreuve sur table (en salle) :</strong> les étudiants composent sur papier en salle d’examen. Le surveillant effectue l’émargement en salle et ramasse les copies physiques. L’enseignant correcteur (ou le secrétariat d’examen) saisit ensuite les notes sur la plateforme à partir des copies corrigées.
                  </p>
                  <label className="form-group">
                    Salle d’examen
                    <select
                      className="select-input"
                      required={deliveryMode === 'PAPIER'}
                      value={roomId}
                      onChange={e => setRoomId(e.target.value)}
                    >
                      <option value="">-- Choisir une salle --</option>
                      {availableRooms.map(r => (
                        <option key={r.id} value={r.id}>
                          {String(r.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        <div className="card mb-2" style={{ background: 'var(--surface-variant, #f8fafc)' }}>
          <p className="cell-sub" style={{ margin: 0 }}>
            {selectedAssignment ? (
              <>
                <strong>Effectif convoqué :</strong> {candidateCount} étudiant(s) inscrit(s) dans le groupe{' '}
                <strong>{String(selectedGroup?.name ?? '')}</strong> pour la matière{' '}
                <strong>{String(selectedSubject?.name || 'Matière')}</strong> seront automatiquement enregistrés comme candidats éligibles.
              </>
            ) : (
              'Sélectionnez une affectation pour voir les candidats associés.'
            )}
          </p>
        </div>

        <DrawerActions>
          <DrawerCloseButton className="btn btn-outline" disabled={busy}>
            Annuler
          </DrawerCloseButton>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !assignmentId || !candidateCount}
          >
            {scheduleNow ? 'Confirmer et programmer l’épreuve' : 'Enregistrer l’évaluation (saisie directe des notes)'}
          </button>
        </DrawerActions>
      </ReviewedForm>
    </WorkPage>
  );
}
