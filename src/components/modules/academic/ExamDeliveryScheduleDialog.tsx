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
  const allDeliveries = snapshot.tables.exam_deliveries || [];
  const allParticipants = snapshot.tables.session_participants || [];
  const existingDelivery = allDeliveries.find(
    d => d.evaluation_id === evaluation.id
  );
  const sessions = (snapshot.tables.sessions || []).filter(s => {
    if (s.assignment_id !== evaluation.assignment_id || s.cancelled_at || s.archived_at) return false;
    if (['ANNULE', 'ANNULEE', 'REPORTE'].includes(String(s.status))) return false;
    if (allDeliveries.some(d => d.session_id === s.id && d.evaluation_id !== evaluation.id)) return false;
    if (s.mode === 'COURS') {
      const otherParticipants = allParticipants.filter(
        p => p.session_id === s.id && p.assignment_id !== s.assignment_id && p.active !== false
      );
      if (otherParticipants.length > 0) return false;
    }
    return true;
  });
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
  const [newSessionMode, setNewSessionMode] = useState<'EN_LIGNE' | 'PAPIER'>(
    initialSession?.mode === 'PAPIER' ? 'PAPIER' : 'EN_LIGNE'
  );
  const [newRoomId, setNewRoomId] = useState<string>(
    initialSession?.room_id
      ? String(initialSession.room_id)
      : availableRooms[0]
      ? String(availableRooms[0].id)
      : ''
  );
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
  const [reason] = useState<string>(
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
      if (target.mode === 'PAPIER') {
        setNewSessionMode('PAPIER');
      } else if (target.mode === 'EN_LIGNE') {
        setNewSessionMode('EN_LIGNE');
      }
      if (target.room_id) {
        setNewRoomId(String(target.room_id));
      }
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
    if (newSessionMode === 'PAPIER' && !newRoomId) {
      return 'Veuillez sélectionner une salle pour la séance d’examen sur papier.';
    }
    if (!isCreatingSession && selectedSession) {
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
                ? `${displayTime(String(selectedSession.starts_at))} → ${displayTime(String(selectedSession.ends_at))} (${newSessionMode === 'EN_LIGNE' ? 'En ligne' : `Sur papier · ${availableRooms.find(r => r.id === newRoomId)?.name || 'Salle'}`})`
                : 'Non sélectionnée',
            },
            { label: 'Ouverture de l’accès', value: accessOpensAt ? displayTime(iso(accessOpensAt)) : '' },
            { label: 'Fermeture de l’accès', value: accessClosesAt ? displayTime(iso(accessClosesAt)) : '' },
            { label: 'Durée allouée', value: `${durationMinutes} minute(s)` },
          ]}
          consequence={
            existingDelivery
              ? 'Les horaires de diffusion de l’épreuve seront mis à jour. Les étudiants admissibles composeront selon cette nouvelle fenêtre.'
              : isCreatingSession
              ? 'La séance d’examen et la fenêtre de diffusion seront créées ensemble dans la même transaction. Vous pourrez immédiatement composer ou autoriser le sujet.'
              : selectedSession?.mode === 'COURS'
              ? 'La séance de cours choisie accueillera l’épreuve et sera convertie en séance d’évaluation. Vous pourrez immédiatement composer le sujet ou saisir les notes.'
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
                  : {
                      sessionId,
                      sessionMode: newSessionMode,
                      roomId: newSessionMode === 'PAPIER' ? newRoomId : null,
                    }),
                accessOpensAt: iso(accessOpensAt),
                accessClosesAt: iso(accessClosesAt),
                durationMinutes,
                reason: reason.trim() || (existingDelivery ? 'Modification de la programmation de l’épreuve' : 'Programmation de l’épreuve'),
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
              Séance (cours existant ou nouvelle séance d’examen)
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
                    {s.mode === 'COURS' ? 'Pendant le cours du ' : 'Séance d’examen du '}
                    {displayTime(String(s.starts_at))} → {displayTime(String(s.ends_at))} ({s.mode === 'COURS' ? 'Cours programmé' : String(s.mode)})
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid">
              <label className="form-group">
                Mode de passage de l’épreuve
                <select
                  className="select-input"
                  value={newSessionMode}
                  onChange={event => setNewSessionMode(event.target.value as 'EN_LIGNE' | 'PAPIER')}
                >
                  <option value="EN_LIGNE">Épreuve en ligne (sur le portail)</option>
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
                        {String(room.name || room.code || 'Salle')}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

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

            <div style={{ margin: '14px 0', padding: '12px 16px', background: '#f8fafc', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>Sécurité & Surveillance anti-triche active</strong>
                <span className="pill pill-success" style={{ fontSize: '11px' }}>Activée</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#64748b' }}>
                <li><strong>Minuterie stricte :</strong> Décompte synchronisé sur le serveur et remise automatique des copies à l’échéance ({durationMinutes} min).</li>
                <li><strong>Détection des sorties d’écran :</strong> Chaque changement d’onglet ou perte de focus est consigné avec horodatage.</li>
                <li><strong>Protection des contenus :</strong> Clic droit et copier-coller bloqués pour préserver l’intégrité du sujet.</li>
              </ul>
            </div>

            <DrawerActions>
              <DrawerCloseButton className="btn btn-outline" disabled={busy}>
                Annuler
              </DrawerCloseButton>
              <button className="btn btn-primary" disabled={busy}>
                Vérifier la programmation
              </button>
            </DrawerActions>
          </fieldset>
        </ReviewedForm>
      )}
    </WorkPage>
  );
}
