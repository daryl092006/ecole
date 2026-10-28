'use client';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import DrawerActions from '@/components/ui/DrawerActions';
import { manageEvaluation } from '@/services/remoteCampusService';
import type { DatabaseRow } from '@/types/persistence';

const localTime = (value: string) => (value ? new Date(value).toISOString().slice(0, 16) : '');
const iso = (value: string) => new Date(`${value}:00Z`).toISOString();
const displayTime = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Africa/Lome',
  }).format(new Date(value));

export default function ExamDeliveryScheduleDialog({
  evaluation,
  onClose,
  onScheduled,
}: {
  evaluation: DatabaseRow;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const portal = usePortal();
  const snapshot = portal.relationalSnapshot;
  const sessions = (snapshot.tables.sessions || []).filter(
    s => s.assignment_id === evaluation.assignment_id && s.mode !== 'COURS' && !s.cancelled_at && !s.archived_at && !['ANNULE', 'ANNULEE'].includes(String(s.status))
  );
  const existingDelivery = (snapshot.tables.exam_deliveries || []).find(
    d => d.evaluation_id === evaluation.id
  );
  const authorizedPaper = (snapshot.tables.exam_papers || []).find(
    p => p.evaluation_id === evaluation.id && p.status === 'AUTORISE' && !p.archived_at
  );

  const canCreateSchedule = portal.perms.permissions.includes('schedule.create');
  const assignment = (snapshot.tables.teaching_assignments || []).find(a => a.id === evaluation.assignment_id);
  const offering = (snapshot.tables.academic_offerings || []).find(o => o.id === (assignment?.offering_id || evaluation.offering_id));
  const availableRooms = (snapshot.tables.rooms || []).filter(
    r => !r.archived_at && r.available !== false && (!r.site_id || !offering?.site_id || r.site_id === offering.site_id)
  );

  const initialSession = existingDelivery
    ? sessions.find(s => s.id === existingDelivery.session_id) || sessions[0]
    : sessions[0];

  const [sessionId, setSessionId] = useState<string>(
    initialSession ? String(initialSession.id) : canCreateSchedule ? '__new__' : ''
  );
  const [newSessionMode, setNewSessionMode] = useState<'EN_LIGNE' | 'PAPIER'>('EN_LIGNE');
  const [newRoomId, setNewRoomId] = useState<string>(availableRooms[0] ? String(availableRooms[0].id) : '');
  const [accessOpensAt, setAccessOpensAt] = useState<string>(
    existingDelivery
      ? localTime(String(existingDelivery.access_opens_at))
      : initialSession
      ? localTime(String(initialSession.starts_at))
      : ''
  );
  const [accessClosesAt, setAccessClosesAt] = useState<string>(
    existingDelivery
      ? localTime(String(existingDelivery.access_closes_at))
      : initialSession
      ? localTime(String(initialSession.ends_at))
      : ''
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    existingDelivery
      ? Number(existingDelivery.duration_minutes) || 60
      : authorizedPaper
      ? Number(authorizedPaper.duration_minutes) || 60
      : 60
  );
  const [reason, setReason] = useState<string>(
    existingDelivery?.reason ? String(existingDelivery.reason) : ''
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isCreatingSession = sessionId === '__new__';
  const selectedSession = isCreatingSession ? undefined : sessions.find(s => s.id === sessionId);

  const handleSessionChange = (id: string) => {
    setSessionId(id);
    if (id === '__new__') return;
    const target = sessions.find(s => s.id === id);
    if (target) {
      setAccessOpensAt(localTime(String(target.starts_at)));
      setAccessClosesAt(localTime(String(target.ends_at)));
    }
  };

  const validate = (): string | null => {
    if (!sessionId) return 'Veuillez sélectionner une séance d’examen.';
    if (!accessOpensAt || !accessClosesAt) return 'Veuillez renseigner les heures d’ouverture et de fermeture.';
    const opens = new Date(`${accessOpensAt}:00Z`).getTime();
    const closes = new Date(`${accessClosesAt}:00Z`).getTime();
    if (isNaN(opens) || isNaN(closes) || opens >= closes) {
      return 'L’ouverture de l’accès doit être antérieure à la fermeture.';
    }
    if (isCreatingSession) {
      if (newSessionMode === 'PAPIER' && !newRoomId) {
        return 'Veuillez sélectionner une salle pour la séance d’examen sur papier.';
      }
    } else if (selectedSession) {
      const sStart = new Date(String(selectedSession.starts_at)).getTime();
      const sEnd = new Date(String(selectedSession.ends_at)).getTime();
      if (opens < sStart || closes > sEnd) {
        return 'La fenêtre de composition doit être comprise dans les limites de la séance d’examen.';
      }
    }
    if (durationMinutes < 1) return 'La durée de composition doit être d’au moins 1 minute.';
    if ((closes - opens) < durationMinutes * 60000) {
      return 'La fenêtre d’accès doit couvrir au moins la durée allouée à l’épreuve.';
    }
    if (!reason.trim() || reason.trim().length < 3) {
      return 'Un motif d’au moins 3 caractères est obligatoire pour la traçabilité.';
    }
    return null;
  };

  return (
    <WorkPage
      title={existingDelivery ? 'Modifier la programmation d’épreuve' : 'Programmer la diffusion d’épreuve'}
      onClose={onClose}
    >
      {!sessions.length && !canCreateSchedule ? (
        <section className="prerequisite-panel" role="alert">
          <h3>Aucune séance d’examen disponible</h3>
          <p>
            Pour programmer la diffusion en ligne de cette épreuve, une séance d’examen (mode « En ligne » ou « Épreuve
            sur papier ») doit être planifiée dans l’Emploi du temps pour cet enseignement.
          </p>
          <div className="btn-group mt-2">
            <DrawerCloseButton className="btn btn-outline" disabled={busy}>
              Fermer
            </DrawerCloseButton>
          </div>
        </section>
      ) : (
        <ReviewedForm
          validate={validate}
          busy={busy}
          error={error}
          confirmLabel={
            existingDelivery ? 'Confirmer la modification de l’épreuve' : 'Confirmer la programmation de l’épreuve'
          }
          fields={[
            { label: 'Épreuve', value: String(evaluation.name || '') },
            {
              label: 'Séance d’examen',
              value: isCreatingSession
                ? `Nouvelle séance (${newSessionMode === 'EN_LIGNE' ? 'En ligne' : `Papier · ${availableRooms.find(r => r.id === newRoomId)?.name || 'Salle'}`})`
                : selectedSession
                ? `${displayTime(String(selectedSession.starts_at))} → ${displayTime(String(selectedSession.ends_at))} (${selectedSession.mode})`
                : 'Non sélectionnée',
            },
            { label: 'Ouverture de l’accès', value: accessOpensAt ? displayTime(iso(accessOpensAt)) : '' },
            { label: 'Fermeture de l’accès', value: accessClosesAt ? displayTime(iso(accessClosesAt)) : '' },
            { label: 'Durée allouée', value: `${durationMinutes} minute(s)` },
            { label: 'Motif', value: reason },
          ]}
          consequence={
            existingDelivery
              ? 'Les horaires de diffusion de l’épreuve seront mis à jour. Les étudiants admissibles composeront selon cette nouvelle fenêtre.'
              : isCreatingSession
              ? 'La séance d’examen et la fenêtre de diffusion seront créées ensemble dans la même transaction. Vous pourrez immédiatement composer ou autoriser le sujet.'
              : 'L’épreuve sera programmée sur la séance choisie. Dès l’ouverture, les étudiants admissibles pourront démarrer leur copie en ligne.'
          }
          onConfirm={async event => {
            event.preventDefault();
            const issue = validate();
            if (issue) {
              setError(issue);
              return;
            }
            setBusy(true);
            setError('');
            try {
              await manageEvaluation(portal.activeRole, {
                action: 'schedule_delivery',
                evaluationId: evaluation.id,
                ...(isCreatingSession
                  ? {
                      sessionId: null,
                      newSession: {
                        mode: newSessionMode,
                        roomId: newSessionMode === 'PAPIER' ? newRoomId : null,
                        startsAt: iso(accessOpensAt),
                        endsAt: iso(accessClosesAt),
                      },
                    }
                  : { sessionId }),
                accessOpensAt: iso(accessOpensAt),
                accessClosesAt: iso(accessClosesAt),
                durationMinutes,
                reason: reason.trim(),
                revision: snapshot.revision,
              });
              portal.reportActionOutcome({
                title: existingDelivery ? 'Programmation d’épreuve modifiée' : 'Épreuve programmée avec succès',
                detail: `${evaluation.name} : accès du ${displayTime(iso(accessOpensAt))} au ${displayTime(iso(accessClosesAt))} (${durationMinutes} min).`,
              });
              portal.refreshCampus();
              onScheduled();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Erreur lors de la programmation.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy} className="permission-fieldset">
            <div className="card mb-2" style={{ backgroundColor: 'var(--surface-sunken)' }}>
              <p>
                <strong>Épreuve :</strong> {String(evaluation.name || '')}
              </p>
              <p className="cell-sub">
                {authorizedPaper
                  ? `Sujet associé : ${String(authorizedPaper.title || '')} (v${String(authorizedPaper.version)}) · ${String(authorizedPaper.duration_minutes)} min`
                  : 'Aucun sujet autorisé pour le moment. Vous pouvez composer le sujet dès que cette programmation est enregistrée.'}
              </p>
            </div>

            <label className="form-group">
              Séance d’examen planifiée
              <select
                className="select-input"
                required
                value={sessionId}
                onChange={event => handleSessionChange(event.target.value)}
              >
                {canCreateSchedule && (
                  <option value="__new__">+ Créer une nouvelle séance d’examen maintenant</option>
                )}
                {sessions.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {displayTime(String(s.starts_at))} → {displayTime(String(s.ends_at))} ({String(s.mode)})
                  </option>
                ))}
              </select>
            </label>

            {isCreatingSession && (
              <div className="form-grid">
                <label className="form-group">
                  Mode de la séance d’examen
                  <select
                    className="select-input"
                    value={newSessionMode}
                    onChange={event => setNewSessionMode(event.target.value as 'EN_LIGNE' | 'PAPIER')}
                  >
                    <option value="EN_LIGNE">Épreuve en ligne (sans salle)</option>
                    <option value="PAPIER">Épreuve sur papier (en salle)</option>
                  </select>
                </label>
                {newSessionMode === 'PAPIER' && (
                  <label className="form-group">
                    Salle d’examen
                    <select
                      className="select-input"
                      required
                      value={newRoomId}
                      onChange={event => setNewRoomId(event.target.value)}
                    >
                      <option value="">Choisir une salle disponible</option>
                      {availableRooms.map(room => (
                        <option key={room.id} value={String(room.id)}>
                          {String(room.name || room.code || 'Salle')} ({String(room.capacity || 0)} pl.)
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            <div className="form-grid">
              <label className="form-group">
                Ouverture de l’accès (heure de Lomé)
                <input
                  className="input"
                  type="datetime-local"
                  required
                  value={accessOpensAt}
                  onChange={event => setAccessOpensAt(event.target.value)}
                />
              </label>
              <label className="form-group">
                Fermeture de l’accès (heure de Lomé)
                <input
                  className="input"
                  type="datetime-local"
                  required
                  min={accessOpensAt || undefined}
                  value={accessClosesAt}
                  onChange={event => setAccessClosesAt(event.target.value)}
                />
              </label>
            </div>

            <label className="form-group">
              Durée maximale autorisée (minutes)
              <input
                className="input"
                type="number"
                min={1}
                max={1440}
                required
                value={durationMinutes}
                onChange={event => setDurationMinutes(Number(event.target.value))}
              />
            </label>

            <label className="form-group">
              Motif de programmation ou d’ajustement
              <textarea
                className="input"
                required
                minLength={3}
                maxLength={1000}
                value={reason}
                onChange={event => setReason(event.target.value)}
                placeholder="Ex. : Programmation de l'épreuve en ligne pour la session normale..."
              />
            </label>

            <DrawerActions>
              <button className="btn btn-primary" disabled={busy}>
                Vérifier la programmation
              </button>
              <DrawerCloseButton className="btn btn-outline" disabled={busy}>
                Annuler
              </DrawerCloseButton>
            </DrawerActions>
          </fieldset>
        </ReviewedForm>
      )}
    </WorkPage>
  );
}
