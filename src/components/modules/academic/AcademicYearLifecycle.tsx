'use client';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import ReviewedForm from '@/components/ui/ReviewedForm';
import YearClosurePanel from './YearClosurePanel';
import YearPreparationPanel from './YearPreparationPanel';
import WorkPage from '@/components/ui/WorkPage';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { changeAcademicYear, loadYearPreparation, loadAcademicYearChangeReview } from '@/services/remoteCampusService';
import { YEAR_STATUS_LABELS, type YearStatus, type AcademicYearOption, type AcademicYearChangeReview } from '@/types/academicYearContext';
import type { DatabaseRow } from '@/types/persistence';

interface ClosureCommand {
  yearId: string;
  yearName: string;
  status: 'EN_CLOTURE' | 'CLOTUREE';
  title: string;
  revision: number;
}

export default function AcademicYearLifecycle({
  rows,
  revision,
  onSaved,
  onEdit,
  onView,
}: {
  rows: DatabaseRow[];
  revision: number;
  onSaved: () => void;
  onEdit?: (row: DatabaseRow) => void;
  onView?: (row: DatabaseRow) => void;
}) {
  const portal = usePortal();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canManage = portal.globalAccess && portal.perms.permissions.includes('academic.year.open');
  const [managing, setManaging] = useState<string | null>(null);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [pendingYear, setPendingYear] = useState<AcademicYearOption | null>(null);
  const [changeReview, setChangeReview] = useState<AcademicYearChangeReview | null>(null);
  const [reviewing, setReviewing] = useState<DatabaseRow | null>(null);
  const [closureCommand, setClosureCommand] = useState<ClosureCommand | null>(null);
  const [closureReason, setClosureReason] = useState('');

  const opened = rows.filter(year => year.status === 'OUVERTE');
  const currentId = portal.academicYearContext?.currentYearId;
  const reviewedCurrentId = changeReview ? changeReview.currentYearId : currentId;
  const reviewedOpened = changeReview ? changeReview.years.filter(year => year.status === 'OUVERTE') : opened;

  async function beginYearChange(yearId: string) {
    if (busy) return;
    setManaging(null); setBusy(true); setError('');
    try {
      const fresh = await loadAcademicYearChangeReview(portal.activeRole);
      const year = fresh.years.find(item => item.id === yearId);
      if (!year) throw new Error('Cette année est introuvable. Actualisez la liste.');
      if (year.status === 'CLOTUREE') throw new Error('Cette année est clôturée et ne peut plus devenir l’année de travail.');
      setChangeReview(fresh); setPendingYear(year);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Vérification de l’année indisponible.'); }
    finally { setBusy(false); }
  }

  function openClosureCommand(next: ClosureCommand) {
    setManaging(null);
    setClosureCommand(next);
    setClosureReason('');
    setError('');
  }

  async function handleToggle(year: AcademicYearOption) {
    const isCurrent = year.id === reviewedCurrentId;
    const status = year.status as YearStatus;
    if (status === 'CLOTUREE' || busy) return;
    setBusy(true);
    setError('');

    try {
      let currentRev = changeReview?.revision ?? revision;

      if (isCurrent) {
        // Désactivation directe de l'année active
        await changeAcademicYear(
          {
            action: 'current',
            yearId: null,
            revision: currentRev,
            reason: `Désactivation de l’année de travail ${year.name}`,
          },
          portal.activeRole
        );
      } else {
        // Activation de l'année
        if (status === 'BROUILLON') {
          // Vérifier si la configuration de l'année est prête
          const prep = await loadYearPreparation(year.id, portal.activeRole);
          if (!prep.ready) {
            setPreparing(year.id);
            setPendingYear(null);
            return;
          }

          const otherOpened = reviewedOpened.find(y => y.id !== year.id);
          if (otherOpened) {
            if (reviewedCurrentId === otherOpened.id) {
              const r1 = await changeAcademicYear(
                {
                  action: 'current',
                  yearId: null,
                  revision: currentRev,
                  reason: `Retrait de l’année de travail ${otherOpened.name}`,
                },
                portal.activeRole
              );
              if (r1?.revision) currentRev = r1.revision;
            }
            const r2 = await changeAcademicYear(
              {
                action: 'transition',
                yearId: otherOpened.id,
                status: 'EN_CLOTURE',
                revision: currentRev,
                reason: `Clôture de l’année ${otherOpened.name}`,
              },
              portal.activeRole
            );
            if (r2?.revision) currentRev = r2.revision;
          }

          const r3 = await changeAcademicYear(
            {
              action: 'transition',
              yearId: year.id,
              status: 'OUVERTE',
              revision: currentRev,
              reason: `Ouverture de l’année ${year.name}`,
            },
            portal.activeRole
          );
          if (r3?.revision) currentRev = r3.revision;
        }

        // Définir comme année de travail active
        await changeAcademicYear(
          {
            action: 'current',
            yearId: year.id,
            revision: currentRev,
            reason: `Activation de l’année ${year.name}`,
          },
          portal.activeRole
        );
      }

      setPendingYear(null);
      portal.reloadCampus();
      onSaved();
    } catch (cause) {
      if (cause instanceof Error && (cause.message.includes('non prête') || cause.message.includes('prête'))) {
        setPreparing(year.id);
        setPendingYear(null);
        setError('');
        return;
      }
      setError(cause instanceof Error ? cause.message : 'Changement refusé.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-full">
      {error && (
        <div className="restricted-box" role="alert">
          <p style={{ margin: 0 }}>{error}</p>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setError('')}>Fermer</button>
        </div>
      )}

      {rows
        .filter(row => !row.archived_at)
        .map(year => {
          const status = year.status as YearStatus;
          const isCurrent = year.id === currentId;
          return (
            <div key={year.id} className="academic-year-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <strong>{String(year.name)}</strong>
                  <span
                    className={`pill ${
                      isCurrent
                        ? 'pill-success'
                        : status === 'OUVERTE'
                        ? 'pill-warning'
                        : status === 'BROUILLON'
                        ? 'pill-default'
                        : status === 'EN_CLOTURE'
                        ? 'pill-warning'
                        : 'pill-default'
                    }`}
                  >
                    {isCurrent ? '● Année active' : YEAR_STATUS_LABELS[status] || status}
                  </span>
                </div>
                <p className="cell-sub">
                  {String(year.starts_on || '').split('-').reverse().join('/')} — {String(year.ends_on || '').split('-').reverse().join('/')}
                </p>
              </div>
              <div className="academic-year-actions">
                  {canManage && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isCurrent}
                      aria-label={isCurrent ? `Désactiver l’année ${year.name}` : `Activer l’année ${year.name}`}
                      title={isCurrent ? `Désactiver l’année ${year.name}` : status === 'CLOTUREE' ? 'Année clôturée' : `Activer l’année ${year.name}`}
                      className={`year-toggle-btn ${isCurrent ? 'active' : ''}`}
                      disabled={status === 'CLOTUREE' || busy}
                      onClick={() => { void beginYearChange(year.id); }}
                    >
                      <span className="year-toggle-slider">
                        <span className="year-toggle-knob" />
                      </span>
                      <span className="year-toggle-text">
                        {isCurrent ? 'Active' : status === 'CLOTUREE' ? 'Clôturée' : 'Inactive'}
                      </span>
                    </button>
                  )}
              <button type="button" className="btn btn-outline" onClick={() => setManaging(year.id)} aria-label={`Ouvrir l’année ${year.name}`}>Ouvrir</button>
              </div>
              {managing === year.id && <WorkPage title={`Année scolaire · ${year.name}`} onClose={() => setManaging(null)}>
                <p>{String(year.starts_on || '').split('-').reverse().join('/')} — {String(year.ends_on || '').split('-').reverse().join('/')} · {isCurrent ? 'Année de travail' : YEAR_STATUS_LABELS[status] || status}</p>
                <div className="academic-year-actions">
                  <div className="btn-group">
                    {onView && <button className="btn btn-outline" onClick={() => { setManaging(null); onView(year); }}>Informations détaillées</button>}
                    {onEdit && <button className="btn btn-outline" onClick={() => { setManaging(null); onEdit(year); }}>Modifier les dates et le libellé</button>}
                    {canManage && (
                      <>
                        <button className="btn btn-outline" onClick={() => { setManaging(null); setPreparing(year.id); }}>
                          {status === 'BROUILLON' ? 'Préparer' : 'Configurer'} {String(year.name)}
                        </button>
                        {status === 'OUVERTE' && !isCurrent && (
                          <button
                            className="btn btn-outline"
                            onClick={() =>
                              openClosureCommand({
                                yearId: year.id,
                                yearName: String(year.name),
                                status: 'EN_CLOTURE',
                                title: `Préparer la clôture de ${year.name}`,
                                revision,
                              })
                            }
                          >
                            Préparer la clôture de {String(year.name)}
                          </button>
                        )}
                        {['OUVERTE', 'EN_CLOTURE'].includes(status) && (
                          <button className="btn btn-outline" onClick={() => { setManaging(null); setReviewing(year); }}>
                            Bilan avant clôture de {String(year.name)}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </WorkPage>}
            </div>
          );
        })}

      {pendingYear && <WorkPage title={`Changer l’année de travail · ${pendingYear.name}`} busy={busy} onClose={() => setPendingYear(null)}>
        <p>Année concernée : <strong>{String(pendingYear.name)}</strong>.</p>
        {pendingYear.id === reviewedCurrentId ? <p>Cette année cessera d’être l’année de travail. Elle conservera son état actuel. Les activités nécessiteront un choix explicite d’année tant qu’aucune année de travail ne sera désignée.</p> : <>
          {pendingYear.status === 'BROUILLON' && <p>La configuration sera vérifiée avant l’ouverture de cette année.</p>}
          {pendingYear.status === 'BROUILLON' && reviewedOpened.filter(year => year.id !== pendingYear.id).map(year => <p key={year.id}>L’année <strong>{String(year.name)}</strong> passera de « Ouverte » à « En clôture ». Sa clôture définitive reste une opération distincte.</p>)}
          <p><strong>{String(pendingYear.name)}</strong> deviendra l’année de travail de l’établissement. Les inscriptions et les paiements existants conserveront leur année.</p>
        </>}
        {error && <p role="alert">{error}</p>}
        {busy && <p role="status">Vérification et changement de l’année en cours…</p>}
        <DrawerActions>{error && <button className="btn btn-outline" disabled={busy} onClick={() => void beginYearChange(pendingYear.id)}>Actualiser les informations</button>}<button className="btn btn-primary" disabled={busy} onClick={() => void handleToggle(pendingYear)}>Confirmer le changement d’année</button><DrawerCloseButton className="btn btn-outline" disabled={busy}>Annuler</DrawerCloseButton></DrawerActions>
      </WorkPage>}
      {preparing && (
        <YearPreparationPanel
          key={preparing}
          yearId={preparing}
          yearName={String(rows.find(year => year.id === preparing)?.name || preparing)}
          onClose={() => {
            setPreparing(null);
            onSaved();
          }}
          onActivate={() => {
            const targetYearId = preparing;
            setPreparing(null);
            if (targetYearId) void beginYearChange(targetYearId);
          }}
        />
      )}
      {reviewing && (
        <YearClosurePanel
          yearId={reviewing.id}
          yearName={String(reviewing.name)}
          canClose={reviewing.status === 'EN_CLOTURE'}
          onClose={() => setReviewing(null)}
          onConfirm={reviewRevision => {
            openClosureCommand({
              yearId: reviewing.id,
              yearName: String(reviewing.name),
              status: 'CLOTUREE',
              title: `Clôturer ${reviewing.name}`,
              revision: reviewRevision,
            });
            setReviewing(null);
          }}
        />
      )}
      {closureCommand && (
        <WorkPage title={closureCommand.title} busy={busy} onClose={() => setClosureCommand(null)}>
          <ReviewedForm
            busy={busy}
            error={error}
            confirmLabel="Confirmer le changement d’année"
            fields={[
              { label: 'Opération', value: closureCommand.title },
              { label: 'Motif', value: closureReason },
            ]}
            consequence={
              closureCommand.status === 'CLOTUREE'
                ? 'La clôture protège les écritures académiques de cette année. Les évaluations et réclamations doivent être terminées. Les dettes et leurs règlements restent rattachés à leur année d’origine.'
                : 'Les nouvelles inscriptions et programmations seront bloquées. La finalisation des notes et réclamations restera possible.'
            }
            onConfirm={() => {
              setBusy(true);
              setError('');
              void changeAcademicYear(
                {
                  action: 'transition',
                  yearId: closureCommand.yearId,
                  status: closureCommand.status,
                  revision: closureCommand.revision,
                  reason: closureReason,
                },
                portal.activeRole
              )
                .then(() => {
                  setClosureCommand(null);
                  portal.reloadCampus();
                  onSaved();
                })
                .catch(cause => setError(cause instanceof Error ? cause.message : 'Changement refusé.'))
                .finally(() => setBusy(false));
            }}
          >
            <label className="form-group">
              Motif du changement
              <textarea
                aria-label="Motif du changement"
                className="input"
                required
                minLength={3}
                maxLength={1000}
                value={closureReason}
                onChange={event => setClosureReason(event.target.value)}
              />
            </label>
            <button className="btn btn-primary" disabled={busy}>
              Vérifier les conséquences
            </button>
          </ReviewedForm>
        </WorkPage>
      )}
    </section>
  );
}
