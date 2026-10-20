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
  offerings: { title: 'Formations proposées', collections: ['academic_offerings'], description: 'Filières, niveaux et modes de cours.' },
  groups: { title: 'Groupes', collections: ['groups'], description: 'Groupes et filières rattachées.' },
  tuition: { title: 'Frais de scolarité', collections: ['annual_fee_schedules'], category: 'SCOLARITE', description: 'Tarifs communs ou par formation.' },
  registration: { title: 'Frais d’inscription', collections: ['annual_fee_schedules'], category: 'INSCRIPTION', description: 'Montants à régler à l’inscription.' },
  payments: { title: 'Encaissement', collections: ['annual_payment_channels'], description: 'Moyens de paiement acceptés.' },
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

  const leaveStep = () => { setStep(null); setCollection(''); setRetry(value => value + 1); };

  const handleConfigureClick = (checkKey: string) => {
    enter(checkKey, false);
  };

  if (selected && collection && consulting) {
    const section = Object.keys(CRUD_SECTIONS).find(key => CRUD_SECTIONS[key].includes(collection))!;
    return <DetailDrawer title={`${selected.title} · ${yearName}`} onClose={leaveStep}>
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
          onDone: leaveStep,
          onSaved: () => { setRetry(value => value + 1); portal.refreshCampus(); }
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
        onClose={leaveStep}
        onSaved={() => {
          const nextCollection = selected.collections[selected.collections.indexOf(collection) + 1];
          setMessage(`${selected.title} : enregistré.`);
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
        <LoadingState label="Vérification de l’année…" variant="cards" />
      ) : (
        <>
          {message && <p className="info-box" role="status">{message}</p>}
          <div className="year-preparation-overview">
            <div className="year-prep-header">
              <p className="year-prep-count">
                <strong>{checks.filter(check => check.ready).length} sur {checks.length}</strong> rubriques prêtes
              </p>
              {previousYear && <span className="year-prep-source">Année précédente : {previousYear.name}</span>}
            </div>
            <div className="year-prep-progress-bar" role="progressbar" aria-valuenow={checks.filter(check => check.ready).length} aria-valuemin={0} aria-valuemax={checks.length}>
              <div className="year-prep-progress-fill" style={{ width: `${(checks.filter(check => check.ready).length / checks.length) * 100}%` }} />
            </div>
          </div>
          <ol role="list" className="year-preparation-list" aria-label="Préparation de l’année">
            {checks.map((check, index) => {
              const stepConfig = steps[check.key];
              const hasPrefilled = !check.ready && Boolean(previousYear && getStepPreFilledItems(check.key, previousSummary).length);
              return <li role="listitem" key={check.key} className={`year-preparation-row${check.ready ? ' is-ready' : ''}`}>
                <span className="year-preparation-index" aria-hidden="true">{index + 1}</span>
                <div className="year-preparation-label">
                  <strong>{stepConfig?.title || check.label}</strong>
                  <p>{stepConfig?.description}</p>
                </div>
                <span className={`year-preparation-state${check.ready ? ' is-ready' : hasPrefilled ? ' is-pending' : ''}`}>
                  {check.ready ? 'Prêt' : hasPrefilled ? 'À vérifier' : 'À renseigner'}
                </span>
                <button type="button" className={`btn ${check.ready ? 'btn-outline' : 'btn-primary'}`}
                  aria-label={`${check.ready ? 'Consulter' : 'Configurer'} ${stepConfig?.title.toLocaleLowerCase('fr') || check.label}`}
                  onClick={() => check.ready ? enter(check.key, true) : handleConfigureClick(check.key)}>Ouvrir</button>
              </li>;
            })}
          </ol>
          {!next && checks.length > 0 && <div className="year-preparation-footer">
            <p>L’année est prête à être ouverte.</p>
            {onActivate && <button type="button" className="btn btn-primary" onClick={onActivate}>Ouvrir l’année {yearName}</button>}
          </div>}

        </>
      )}
    </DetailDrawer>
  );
}
