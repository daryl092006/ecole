'use client';
import IconButton from '@/components/ui/IconButton';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadYearPreparation } from '@/services/remoteCampusService';
import type { YearPreparationCheck, ReconductConfigSummary } from '@/services/yearPreparationService';
import { getStepPreFilledItems } from '@/services/yearPreparationService';
import DetailDrawer from '@/components/ui/DetailDrawer';
import LoadingState from '@/components/ui/LoadingState';
import CatalogTaskDialog from './CatalogTaskDialog';
import ReferenceCrudWorkspace from './ReferenceCrudWorkspace';
import { CRUD_SECTIONS } from '@/data/crudCatalog';
import { catalogSpec } from '@/services/catalogCrudService';

const steps: Record<string, { title: string; collections: string[]; description: string; category?: string }> = {
  offerings: { title: 'Formations proposées', collections: ['academic_offerings'], description: 'Choisissez les formations qui accueilleront des étudiants cette année.' },
  groups: { title: 'Groupes', collections: ['groups'], description: 'Créez chaque groupe pour un niveau, puis rattachez les filières qu’il accueille. Plusieurs filières peuvent partager le même groupe.' },
  tuition: { title: 'Frais de scolarité', collections: ['annual_fee_schedules'], category: 'SCOLARITE', description: 'Indiquez le montant à payer. Précisez une filière ou un niveau uniquement si le tarif varie.' },
  registration: { title: 'Frais d’inscription', collections: ['annual_fee_schedules'], category: 'INSCRIPTION', description: 'Indiquez les frais d’inscription, communs ou propres à une formation.' },
  payments: { title: 'Encaissement', collections: ['annual_payment_channels'], description: 'Choisissez les moyens de paiement qui seront utilisés pour les inscriptions et la scolarité.' },
};

export default function YearPreparationPanel({
  yearId,
  yearName,
  onClose,
  onActivate,
}: {
  yearId: string;
  yearName: string;
  onClose: () => void;
  onActivate?: () => void;
}) {
  const portal = usePortal();
  const [checks, setChecks] = useState<YearPreparationCheck[] | null>(null);
  const [previousYear, setPreviousYear] = useState<{ id: string; name: string } | null>(null);
  const [previousSummary, setPreviousSummary] = useState<ReconductConfigSummary | null>(null);

  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState('');
  const [consulting, setConsulting] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [collection, setCollection] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setChecks(null);
    void loadYearPreparation(yearId, portal.activeRole, controller.signal).then(result => {
      if (!controller.signal.aborted) {
        setChecks(result.checks);
        setPreviousYear(result.previousYear || null);
        setPreviousSummary(result.previousSummary || null);
      }
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause.message);
    });
    return () => controller.abort();
  }, [yearId, portal.activeRole, portal.campusRevision, retry]);

  const selected = step ? steps[step] : undefined;
  const prefilledItems = getStepPreFilledItems(step || '', previousSummary);
  const enter = (key: string, consult = false) => {
    if (!steps[key]) return;
    setConsulting(consult);
    setStep(key);
    setCollection(steps[key].collections[0]);
    setMessage('');
  };

  const handleConfigureClick = (checkKey: string) => {
    enter(checkKey, false);
  };

  if (selected && collection && consulting) {
    const section = Object.keys(CRUD_SECTIONS).find(key => CRUD_SECTIONS[key].includes(collection))!;
    return <DetailDrawer title={`${selected.title} · ${yearName}`} onClose={() => { setStep(null); setCollection(''); }}>
      {selected.collections.length > 1 && <nav className="record-sections" aria-label="Rubriques de configuration">{selected.collections.map(key => <button key={key} className={collection === key ? 'selected' : ''} aria-pressed={collection === key} onClick={() => setCollection(key)}>{catalogSpec(key).title}</button>)}</nav>}
      <ReferenceCrudWorkspace
        key={collection}
        section={section}
        setup={{
          collection,
          yearId,
          yearName,
          category: selected.category,
          createOnLoad: false,
          stepKey: step || undefined,
          previousYear: previousYear || undefined,
          previousSummary: previousSummary || undefined,
          prefilledItems: prefilledItems.length ? prefilledItems : undefined,
          onChoose: setCollection,
          onSaved: () => { setRetry(value => value + 1); portal.reloadCampus(); }
        }}
      />
    </DetailDrawer>;
  }

  if (selected && collection) {
    return (
      <CatalogTaskDialog
        key={`${step}:${collection}`}
        root={collection}
        yearId={yearId}
        yearName={yearName}
        category={selected.category}
        stepKey={step || undefined}
        previousYear={previousYear || undefined}
        previousSummary={previousSummary || undefined}
        prefilledItems={prefilledItems.length ? prefilledItems : undefined}
        onClose={() => { setStep(null); setCollection(''); }}
        onSaved={() => {
          const nextCollection = selected.collections[selected.collections.indexOf(collection) + 1];
          setMessage(`${catalogSpec(collection).title} : enregistrement confirmé.`);
          if (nextCollection && collection !== 'groups') setCollection(nextCollection);
          else { setStep(null); setCollection(''); }
          setRetry(value => value + 1);
        }}
      />
    );
  }

  const next = checks?.find(check => !check.ready);

  return (
    <DetailDrawer title={`Préparer l’année · ${yearName}`} onClose={onClose}>
      {error ? (
        <section role="alert">
          <p>{error}</p>
          <IconButton className="btn btn-outline" onClick={() => setRetry(value => value + 1)} label="Réessayer" />
        </section>
      ) : !checks ? (
        <LoadingState label="Vérification de l’année…" />
      ) : (
        <>
          {message && <p className="info-box" role="status">{message}</p>}
          {(() => {
            const readyCount = checks.filter(check => check.ready).length;
            const totalCount = checks.length;
            const pct = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
            return (
              <div className="preparation-summary-card">
                <div className="preparation-summary-header">
                  <div className="preparation-summary-content">
                    <strong className="preparation-summary-title">Configuration obligatoire avant ouverture</strong>
                    <p className="preparation-summary-desc">
                      Pour être ouverte, l’année scolaire exige la configuration complète de ses formations, groupes rattachés, frais de scolarité, frais d’inscription et moyens d’encaissement.
                    </p>
                  </div>
                  {next && (
                    <div className="preparation-summary-cta">
                      <button className="btn btn-primary" onClick={() => handleConfigureClick(next.key)}>
                        Continuer : {steps[next.key]?.title || next.label} →
                      </button>
                    </div>
                  )}
                </div>
                <div className="preparation-progress-bar">
                  <div className="preparation-progress-meta">
                    <span>Progression globale</span>
                    <strong>{readyCount} sur {totalCount} étapes terminées ({pct} %)</strong>
                  </div>
                  <div className="preparation-progress-track">
                    <div className="preparation-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })()}

          {!next && (
            <div className="preparation-ready-banner">
              <div>
                <strong className="preparation-ready-title">
                  ✓ Configuration complète : l’année est prête pour l’ouverture
                </strong>
                <p className="cell-sub" style={{ margin: 0 }}>
                  Toutes les conditions requises sont remplies. Vous pouvez désormais valider et ouvrir cette année scolaire.
                </p>
              </div>
              {onActivate && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onActivate}
                >
                  Valider et ouvrir l’année {yearName}
                </button>
              )}
            </div>
          )}

          <ol className="preparation-steps-list">
            {checks.map((check, index) => {
              const stepConfig = steps[check.key];
              const prefilled = getStepPreFilledItems(check.key, previousSummary);
              const hasPrefilled = !check.ready && Boolean(previousYear && prefilled.length > 0);
              const isNext = next?.key === check.key;
              const statusClass = check.ready ? 'is-ready' : isNext ? 'is-active' : hasPrefilled ? 'is-pending' : '';

              return (
                <li key={check.key} className={`preparation-step-card ${statusClass}`}>
                  <div className="preparation-step-main">
                    <span className={`preparation-number ${check.ready ? 'is-ready' : isNext ? 'is-active' : ''}`}>
                      {check.ready ? '✓' : index + 1}
                    </span>
                    <div>
                      <div className="preparation-step-badge-row">
                        <span className="preparation-step-title">{stepConfig?.title || check.label}</span>
                        {check.ready ? (
                          <span className="pill pill-success">Configuration prête</span>
                        ) : hasPrefilled ? (
                          <span className="pill pill-warning">
                            Pré-rempli depuis {previousYear!.name} ({prefilled.length}) · À vérifier
                          </span>
                        ) : (
                          <span className="pill pill-default">À compléter</span>
                        )}
                      </div>
                      <p className="cell-sub">{stepConfig?.description}</p>
                    </div>
                  </div>

                  <div className="preparation-step-action">
                    {check.ready ? (
                      <button className="btn btn-outline" onClick={() => enter(check.key, true)}>
                        Consulter {stepConfig?.title.toLocaleLowerCase('fr') || check.label}
                      </button>
                    ) : (
                      <button
                        className={hasPrefilled || isNext ? 'btn btn-primary' : 'btn btn-outline'}
                        onClick={() => handleConfigureClick(check.key)}
                      >
                        Configurer {stepConfig?.title.toLocaleLowerCase('fr') || check.label}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </DetailDrawer>
  );
}
