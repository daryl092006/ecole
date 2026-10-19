'use client';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import IconButton from '@/components/ui/IconButton';
import YearPreparationPanel from './YearPreparationPanel';
import WorkPage from '@/components/ui/WorkPage';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { changeAcademicYear, loadYearPreparation } from '@/services/remoteCampusService';
import { YEAR_STATUS_LABELS, type YearStatus } from '@/types/academicYearContext';
import type { DatabaseRow } from '@/types/persistence';

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
  const [preparing, setPreparing] = useState<string | null>(null);
  const [pendingYear, setPendingYear] = useState<DatabaseRow | null>(null);

  const opened = rows.filter(year => year.status === 'OUVERTE');
  const currentId = portal.academicYearContext?.currentYearId;
  const current = rows.find(row => row.id === currentId);

  async function handleToggle(year: DatabaseRow) {
    const isCurrent = year.id === currentId;
    const status = year.status as YearStatus;
    if (status === 'CLOTUREE' || busy) return;
    setBusy(true);
    setError('');

    try {
      let currentRev = revision;

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

          const otherOpened = opened.find(y => y.id !== year.id);
          if (otherOpened) {
            if (currentId === otherOpened.id) {
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
      <div className="card-header">
        <h2>Années scolaires & Cycle de gestion</h2>
      </div>

      {error && (
        <div className="restricted-box" role="alert">
          <p style={{ margin: 0 }}>{error}</p>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setError('')}>Fermer</button>
        </div>
      )}

      <div className="year-summary-box">
        <p>
          Année de travail active : <strong>{current ? String(current.name) : 'Aucune année de travail désignée'}</strong>
        </p>
        <p className="cell-sub">
          Le bouton d’activation présente les changements à confirmer. Une année en brouillon doit être entièrement préparée avant son ouverture.
        </p>
      </div>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {canManage && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isCurrent}
                    aria-label={isCurrent ? `Désactiver l’année ${year.name}` : `Activer l’année ${year.name}`}
                    title={isCurrent ? `Désactiver l’année ${year.name}` : status === 'CLOTUREE' ? 'Année clôturée' : `Activer l’année ${year.name}`}
                    className={`year-toggle-btn ${isCurrent ? 'active' : ''}`}
                    disabled={status === 'CLOTUREE' || busy}
                    onClick={() => { setError(''); setPendingYear(year); }}
                  >
                    <span className="year-toggle-slider">
                      <span className="year-toggle-knob" />
                    </span>
                    <span className="year-toggle-text">
                      {isCurrent ? 'Active' : status === 'CLOTUREE' ? 'Clôturée' : 'Inactive'}
                    </span>
                  </button>
                )}
                <div className="btn-group">
                  {onView && <IconButton className="btn btn-outline" onClick={() => onView(year)} label="Voir" />}
                  {onEdit && <IconButton className="btn btn-outline" onClick={() => onEdit(year)} label="Modifier" />}
                  {canManage && (
                    <button className="btn btn-outline" onClick={() => setPreparing(year.id)}>
                      {status === 'BROUILLON' ? 'Préparer' : 'Configurer'} {String(year.name)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

      {pendingYear && <WorkPage title={`Changer l’année de travail · ${pendingYear.name}`} busy={busy} onClose={() => setPendingYear(null)}>
        <p>Année concernée : <strong>{String(pendingYear.name)}</strong>.</p>
        {pendingYear.id === currentId ? <p>Cette année cessera d’être l’année de travail. Elle conservera son état actuel. Les activités nécessiteront un choix explicite d’année tant qu’aucune année de travail ne sera désignée.</p> : <>
          {pendingYear.status === 'BROUILLON' && <p>La configuration sera vérifiée avant l’ouverture de cette année.</p>}
          {pendingYear.status === 'BROUILLON' && opened.filter(year => year.id !== pendingYear.id).map(year => <p key={year.id}>L’année <strong>{String(year.name)}</strong> passera de « Ouverte » à « En clôture ». Sa clôture définitive reste une opération distincte.</p>)}
          <p><strong>{String(pendingYear.name)}</strong> deviendra l’année de travail de l’établissement. Les inscriptions et les paiements existants conserveront leur année.</p>
        </>}
        {error && <p role="alert">{error}</p>}
        {busy && <p role="status">Vérification et changement de l’année en cours…</p>}
        <DrawerActions><button className="btn btn-primary" disabled={busy} onClick={() => void handleToggle(pendingYear)}>Confirmer le changement d’année</button><DrawerCloseButton className="btn btn-outline" disabled={busy}>Annuler</DrawerCloseButton></DrawerActions>
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
            const targetYear = rows.find(year => year.id === preparing);
            setPreparing(null);
            if (targetYear) {
              setError('');
              setPendingYear(targetYear);
            }
          }}
        />
      )}
    </section>
  );
}
