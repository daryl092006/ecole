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
    s => s.assignment_id === evaluation.assignment_id && s.mode !== 'COURS'
  );
  const existingDelivery = (snapshot.tables.exam_deliveries || []).find(
    d => d.evaluation_id === evaluation.id
  );
  const authorizedPaper = (snapshot.tables.exam_papers || []).find(
    p => p.evaluation_id === evaluation.id && p.status === 'AUTORISE' && !p.archived_at
  );

  const initialSession = existingDelivery
    ? sessions.find(s => s.id === existingDelivery.session_id) || sessions[0]
    : sessions[0];

  const [sessionId, setSessionId] = useState<string>(
    initialSession ? String(initialSession.id) : ''
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
  const [reason, setReason] = useState<string>(
    existingDelivery?.reason ? String(existingDelivery.reason) : ''
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedSession = sessions.find(s => s.id === sessionId);

  const handleSessionChange = (id: string) => {
    setSessionId(id);
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
    if (selectedSession) {
      const sStart = new Date(String(selectedSession.starts_at)).getTime();
      const sEnd = new Date(String(selectedSession.ends_at)).getTime();
      if (opens < sStart || closes > sEnd) {
        return 'La fenêtre de composition doit être comprise dans les limites de la séance d’examen.';
      }
    }
    if (durationMinutes < 1) return 'La durée de composition doit être d’au moins 1 minute.';
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
      {!sessions.length ? (
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
              label: 'Séance sélectionnée',
              value: selectedSession
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
                sessionId,
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
                  : 'Aucun sujet autorisé pour le moment. Vous pouvez composer le sujet avant ou après la programmation.'}
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
                {sessions.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {displayTime(String(s.starts_at))} → {displayTime(String(s.ends_at))} ({String(s.mode)})
                  </option>
                ))}
              </select>
            </label>

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
