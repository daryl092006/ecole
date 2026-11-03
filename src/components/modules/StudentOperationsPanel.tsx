'use client';
import DrawerActions from '@/components/ui/DrawerActions';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';
import IconButton from '@/components/ui/IconButton';
import { useEffect, useState, type ReactNode } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { studentOperations } from '@/services/remoteCampusService';
import YearPreparationPanel from './academic/YearPreparationPanel';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import LoadingState from '@/components/ui/LoadingState';
import EnrollmentDialog from './EnrollmentDialog';
import StudentPaymentList from './StudentPaymentList';
import StudentProfilePanel from './StudentProfilePanel';
import ContractAmendmentPanel from './ContractAmendmentPanel';
import type {ContractAmendmentOption} from '@/types/contractAmendment';
import type { Student } from '@/types';
import type { PaymentAdjustmentDirectory } from '@/types/paymentAdjustments';
import type { PaymentAllocationDirectory } from '@/types/paymentAllocations';

interface EnrollmentItem {
  id: string;
  status: string;
  enrolledOn?: string;
  currentGroupId?: string | null;
  currentGroupName?: string | null;
  currentGroupValidFrom?: string | null;
  availableGroups?: { id: string; name: string }[];
}

interface Directory {
  amendmentOptions?: ContractAmendmentOption[];
  adjustmentDirectory?: PaymentAdjustmentDirectory;
  allocationDirectory?: PaymentAllocationDirectory;
  channels?: { name: string; method: string }[];
  revision: number;
  enrollments: EnrollmentItem[];
  contracts?: { id: string; versionId: string; enrollmentId: string; reference: string; status: string; amount: number }[];
  payments: { id: string; reference: string; amount: number; paidOn: string; cancelled: boolean; pending?: boolean }[];
  paid: number;
}

export default function StudentOperationsPanel({
  matricule,
  onChanged,
  mode,
  children,
  student
}: {
  student?: Student;
  matricule: string;
  onChanged?: () => void;
  mode: 'academic' | 'finance';
  children?: ReactNode;
}) {
  const financial = mode === 'finance';
  const portal = usePortal();
  const [data, setData] = useState<Directory | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [enrolling, setEnrolling] = useState(false);
  const [organising, setOrganising] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [action, setAction] = useState<'payment' | 'status' | 'change_group' | 'approve_contract' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentCategory, setPaymentCategory] = useState<'INSCRIPTION' | 'SCOLARITE' | 'AUTRE'>('INSCRIPTION');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [reference, setReference] = useState('');
  const [provider, setProvider] = useState('');
  const [method, setMethod] = useState('ESPECES');
  const [paidOn, setPaidOn] = useState('');
  const [status, setStatus] = useState('SUSPENDU');
  const [dueOn, setDueOn] = useState('');
  const [groupId, setGroupId] = useState('');
  const [effectiveOn, setEffectiveOn] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    void studentOperations(matricule, portal.activeRole, undefined, controller.signal)
      .then(value => {
        if (!controller.signal.aborted) {
          setData(value);
          setEnrollmentId(value.enrollments[0]?.id || '');
        }
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [matricule, portal.activeRole, portal.academicYearSelection, retry]);

  if (enrolling) {
    return (
      <EnrollmentDialog
        kind="auto"
        initialMatricule={matricule}
        onClose={() => {
          setEnrolling(false);
          setRetry(value => value + 1);
          onChanged?.();
        }}
      />
    );
  }

  const selectedYear = portal.academicYearContext?.years.find(year => year.id === portal.academicYearContext?.selectedYearId);

  if ((organising || configuring) && selectedYear) {
    return (
      <YearPreparationPanel
        yearId={selectedYear.id}
        yearName={selectedYear.name}
        onClose={() => {
          setOrganising(false);
          setConfiguring(false);
          setRetry(value => value + 1);
          onChanged?.();
        }}
      />
    );
  }

  const draftContract = data?.contracts?.find(contract => contract.status === 'DRAFT');
  const activeContract = data?.contracts?.find(
    contract => contract.enrollmentId === enrollmentId && (action !== 'approve_contract' || contract.status === 'DRAFT')
  );
  const selectableEnrollments = action === 'approve_contract'
    ? data?.enrollments.filter(enrollment => data.contracts?.some(contract => contract.enrollmentId === enrollment.id && contract.status === 'DRAFT')) || []
    : data?.enrollments || [];
  const currentEnrollment = data?.enrollments.find(item => item.id === enrollmentId) || data?.enrollments[0];
  const candidateGroups = (currentEnrollment?.availableGroups || []).filter(grp => grp.id !== currentEnrollment?.currentGroupId);

  const canManageLifecycle = portal.perms.permissions.includes('student.lifecycle.manage');
  const canRecordPayment = portal.perms.permissions.includes('payment.record');
  const canManageGroups = portal.perms.permissions.includes('academic.group.manage');

  return (
    <section className="card card-full">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>{financial ? 'Versements' : 'Années et groupes'}</h2>

        {/* Toolbar d'actions : alignée proprement dans l'en-tête */}
        {data && (
          <div className="btn-group">
            {!data.enrollments.length ? (
              <>
                {canManageLifecycle && canRecordPayment && (
                  <button className="btn btn-outline" onClick={() => setEnrolling(true)}>
                    Régulariser l’inscription
                  </button>
                )}
                {canManageGroups && (
                  <button className="btn btn-outline" onClick={() => setOrganising(true)}>
                    Configurer l’année
                  </button>
                )}
              </>
            ) : (
              <>
                {financial && canRecordPayment && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (data.channels?.length === 0 && portal.academicYearContext?.years.find(year => year.id === portal.academicYearContext?.selectedYearId)?.status !== 'CLOTUREE') {
                        setConfiguring(true);
                      } else {
                        setAction('payment');
                        setPaymentCategory('INSCRIPTION');
                        setAmount('50000');
                        setPaidOn(new Date().toISOString().slice(0, 10));
                        setReason(`Frais d’inscription · ${selectedYear?.name || '2026-2027'}`);
                        if (student) setPayer(`${student.lastname} ${student.firstname}`.trim());
                        const defaultProvider = data.channels?.find(channel => channel.method === 'ESPECES')?.name || data.channels?.[0]?.name || '';
                        if (defaultProvider) setProvider(defaultProvider);
                      }
                      setError('');
                    }}
                  >
                    Enregistrer un paiement
                  </button>
                )}
                {financial && draftContract && canRecordPayment && (
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setEnrollmentId(draftContract.enrollmentId);
                      const enrolledDate = data.enrollments.find(item => item.id === draftContract.enrollmentId)?.enrolledOn;
                      setDueOn(enrolledDate || new Date().toISOString().slice(0, 10));
                      setAction('approve_contract');
                      setError('');
                    }}
                  >
                    Approuver le contrat
                  </button>
                )}
                {!financial && canManageLifecycle && (
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setAction('status');
                      setError('');
                    }}
                  >
                    Changer le statut scolaire
                  </button>
                )}
                {!financial && canManageLifecycle && candidateGroups.length > 0 && (
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setGroupId(candidateGroups[0]?.id || '');
                      setEffectiveOn(new Date().toISOString().slice(0, 10));
                      setAction('change_group');
                      setError('');
                    }}
                  >
                    Changer de groupe
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {financial && data && <ContractAmendmentPanel matricule={matricule} options={data.amendmentOptions || []} revision={data.revision} onSaved={()=>{setMessage('Avenant enregistré, double diplomation et paiements synchronisés.');setRetry(value=>value+1);onChanged?.();}}/>}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert">
          {error}
          <IconButton className="btn btn-outline" onClick={() => setRetry(value => value + 1)} label="Actualiser le dossier" />
        </p>
      )}

      {/* Contrat en brouillon */}
      {financial && draftContract && (
        <p className="cell-sub" style={{ marginBottom: '1rem' }}>
          Contrat en brouillon ({draftContract.reference} · {draftContract.amount.toLocaleString('fr-FR')} FCFA) : approuvez le contrat pour établir le solde financier officiel.
        </p>
      )}

      {/* État de chargement : uniquement pour la finance (car il n'y a pas de tableau children) */}
      {financial && !data && !error && (
        <LoadingState label="Vérification de l’inscription et des versements…" variant="table" />
      )}

      {/* Tableau des versements en mode finance */}
      {financial && data && portal.perms.permissions.includes('finance.view') && (
        <StudentPaymentList
          matricule={matricule}
          payments={data.payments}
          revision={data.revision}
          adjustmentDirectory={data.adjustmentDirectory}
          allocationDirectory={data.allocationDirectory}
          onSaved={msg => {
            setMessage(msg);
            setRetry(value => value + 1);
            onChanged?.();
          }}
        />
      )}

      {/* Enfants : par exemple le tableau d'inscription StudentEnrollmentsPanel en mode académique */}
      {children}

      {/* Modal WorkPage pour les actions */}
      {action && (
        <WorkPage
          title={
            action === 'payment'
              ? `Encaisser · ${matricule}`
              : action === 'approve_contract'
              ? `Approuver le contrat · ${matricule}`
              : action === 'change_group'
              ? `Changer de groupe · ${matricule}`
              : `Changer le statut · ${matricule}`
          }
          busy={busy}
          onClose={() => setAction(null)}
        >
          <>
            {student && (
              <section aria-label="Identité du dossier">
                <p>
                  <strong>
                    {student.lastname} {student.firstname}
                  </strong>{' '}
                  · {matricule}
                </p>
                <StudentProfilePanel
                  student={student}
                  compact
                  onSaved={() => {
                    setRetry(value => value + 1);
                    onChanged?.();
                  }}
                />
              </section>
            )}
            <ReviewedForm
              busy={busy}
              error={error}
              confirmLabel={
                action === 'payment'
                  ? 'Confirmer le paiement'
                  : action === 'approve_contract'
                  ? 'Confirmer l’approbation du contrat'
                  : action === 'change_group'
                  ? 'Confirmer le changement de groupe'
                  : 'Confirmer le statut'
              }
              fields={[
                { label: 'Dossier', value: matricule },
                { label: 'Inscription', value: enrollmentId },
                ...(action === 'payment'
                  ? [
                      {
                        label: 'Nature du versement',
                        value:
                          paymentCategory === 'INSCRIPTION'
                            ? 'Frais d’inscription (50 000 FCFA)'
                            : paymentCategory === 'SCOLARITE'
                            ? 'Frais de scolarité'
                            : 'Autre versement'
                      },
                      { label: 'Montant FCFA', value: amount },
                      { label: 'Payeur', value: payer },
                      { label: 'Référence', value: reference },
                      { label: 'Organisme', value: provider },
                      { label: 'Mode', value: method },
                      { label: 'Date', value: paidOn }
                    ]
                  : action === 'approve_contract'
                  ? [
                      { label: 'Contrat', value: activeContract?.reference || '' },
                      {
                        label: 'Montant contractuel FCFA',
                        value: activeContract ? `${activeContract.amount.toLocaleString('fr-FR')} FCFA` : ''
                      },
                      { label: 'Date d’échéance', value: dueOn }
                    ]
                  : action === 'change_group'
                  ? [
                      { label: 'Groupe actuel', value: currentEnrollment?.currentGroupName || 'Non affecté' },
                      { label: 'Nouveau groupe', value: candidateGroups.find(g => g.id === groupId)?.name || groupId },
                      { label: 'Date d’effet', value: effectiveOn }
                    ]
                  : [{ label: 'Nouveau statut', value: status }]),
                ...(reason.trim() ? [{ label: 'Motif', value: reason }] : [])
              ]}
              consequence={
                action === 'payment'
                  ? paymentCategory === 'INSCRIPTION'
                    ? 'Le versement sera enregistré au titre des frais d’inscription (50 000 FCFA) avec reçu officiel. Tout contrat en cours restera inchangé.'
                    : 'Le paiement, son reçu et ses affectations seront enregistrés ensemble. Les échéances les plus anciennes seront réglées en premier, au prorata des soldes des lignes de frais. Tout excédent ou montant sans contrat approuvé restera à affecter.'
                  : action === 'approve_contract'
                  ? 'Le contrat passera de brouillon à approuvé avec son échéance contractuelle, établissant le montant attendu et le reste à payer du dossier.'
                  : action === 'change_group'
                  ? 'L’affectation de groupe actuelle sera clôturée à la date d’effet choisie et une nouvelle affectation sera créée avec traçabilité de l’auteur et du motif.'
                  : 'Le changement sera enregistré avec son ancien statut, son auteur et son motif.'
              }
              onConfirm={() => {
                setBusy(true);
                setError('');
                const effectiveReason =
                  reason.trim() ||
                  (action === 'payment'
                    ? paymentCategory === 'INSCRIPTION'
                      ? `Frais d’inscription · ${selectedYear?.name || '2026-2027'}`
                      : paymentCategory === 'SCOLARITE'
                      ? `Frais de scolarité · ${selectedYear?.name || '2026-2027'}`
                      : `Versement annexe · ${selectedYear?.name || '2026-2027'}`
                    : action === 'approve_contract'
                    ? 'Approbation du contrat financier'
                    : action === 'change_group'
                    ? 'Changement de groupe d’affectation'
                    : `Changement de statut scolaire vers ${status}`);

                void studentOperations(matricule, portal.activeRole, {
                  revision: data!.revision,
                  enrollmentId,
                  reason: effectiveReason,
                  action,
                  ...(action === 'payment'
                    ? {
                        amount: Number(amount),
                        payer,
                        reference,
                        provider,
                        method,
                        paidOn,
                        category: paymentCategory === 'AUTRE' ? 'ANNEXE' : paymentCategory
                      }
                    : action === 'approve_contract'
                    ? { ...(dueOn ? { dueOn } : {}) }
                    : action === 'change_group'
                    ? { groupId, effectiveOn }
                    : { status })
                })
                  .then(() => {
                    setAction(null);
                    setMessage(
                      action === 'payment'
                        ? 'Paiement et reçu enregistrés.'
                        : action === 'approve_contract'
                        ? 'Contrat approuvé et situation financière établie.'
                        : action === 'change_group'
                        ? 'Changement de groupe enregistré.'
                        : 'Statut scolaire enregistré.'
                    );
                    setRetry(value => value + 1);
                    portal.refreshCampus();
                    onChanged?.();
                  })
                  .catch(cause => setError(cause.message))
                  .finally(() => setBusy(false));
              }}
            >
              <label className="form-group">
                Inscription
                <select
                  className="select-input"
                  required
                  value={enrollmentId}
                  onChange={event => {
                    setEnrollmentId(event.target.value);
                    if (action === 'approve_contract') {
                      setDueOn(data?.enrollments.find(item => item.id === event.target.value)?.enrolledOn || new Date().toISOString().slice(0, 10));
                    }
                  }}
                >
                  {selectableEnrollments.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.status} · {item.currentGroupName ? `${item.currentGroupName} · ` : ''}
                      {item.id}
                    </option>
                  ))}
                </select>
              </label>

              {action === 'payment' ? (
                <>
                  <label className="form-group">
                    Nature du versement
                    <select
                      className="select-input"
                      value={paymentCategory}
                      onChange={event => {
                        const val = event.target.value as 'INSCRIPTION' | 'SCOLARITE' | 'AUTRE';
                        setPaymentCategory(val);
                        if (val === 'INSCRIPTION') {
                          setAmount('50000');
                          setReason(`Frais d’inscription · ${selectedYear?.name || '2026-2027'}`);
                        } else if (val === 'SCOLARITE') {
                          if (amount === '50000') setAmount('');
                          setReason(`Frais de scolarité (tranche) · ${selectedYear?.name || '2026-2027'}`);
                        } else {
                          setReason(`Frais annexes · ${selectedYear?.name || '2026-2027'}`);
                        }
                      }}
                    >
                      <option value="INSCRIPTION">Frais d’inscription (50 000 FCFA)</option>
                      <option value="SCOLARITE">Frais de scolarité (Acompte / Tranche / Solde)</option>
                      <option value="AUTRE">Autre règlement / Frais annexes</option>
                    </select>
                  </label>
                  <label className="form-group">
                    Montant FCFA
                    <input
                      className="input"
                      required
                      type="number"
                      min="1"
                      max="2147483647"
                      step="1"
                      value={amount}
                      onChange={event => setAmount(event.target.value)}
                    />
                  </label>
                  {[
                    { label: 'Payeur', value: payer, set: setPayer },
                    { label: 'Référence du versement', value: reference, set: setReference },
                    { label: 'Organisme ou caisse', value: provider, set: setProvider }
                  ].map(field => (
                    <label key={field.label} className="form-group">
                      {field.label}
                      <input
                        className="input"
                        required
                        minLength={2}
                        maxLength={160}
                        list={field.label === 'Organisme ou caisse' ? 'annual-payment-providers' : undefined}
                        value={field.value}
                        onChange={event => field.set(event.target.value)}
                      />
                    </label>
                  ))}
                  <datalist id="annual-payment-providers">
                    {data?.channels
                      ?.filter(channel => channel.method === method)
                      .map(channel => (
                        <option key={channel.name} value={channel.name} />
                      ))}
                  </datalist>
                  <label className="form-group">
                    Mode de paiement
                    <select className="select-input" value={method} onChange={event => setMethod(event.target.value)}>
                      {['ESPECES', 'MOBILE_MONEY', 'VIREMENT', 'CHEQUE', 'CARTE'].map(val => (
                        <option key={val}>{val}</option>
                      ))}
                    </select>
                  </label>
                  <label className="form-group">
                    Date du paiement
                    <input className="input" required type="date" value={paidOn} onChange={event => setPaidOn(event.target.value)} />
                  </label>
                </>
              ) : action === 'approve_contract' ? (
                <>
                  <p>
                    Montant contractuel à approuver :{' '}
                    <strong>{activeContract ? `${activeContract.amount.toLocaleString('fr-FR')} FCFA` : ''}</strong>
                  </p>
                  <label className="form-group">
                    Date d’échéance contractuelle
                    <input className="input" required type="date" value={dueOn} onChange={event => setDueOn(event.target.value)} />
                  </label>
                </>
              ) : action === 'change_group' ? (
                <>
                  <p>
                    Groupe actuel : <strong>{currentEnrollment?.currentGroupName || 'Non affecté'}</strong>
                    {currentEnrollment?.currentGroupValidFrom ? ` (depuis le ${currentEnrollment.currentGroupValidFrom})` : ''}
                  </p>
                  <label className="form-group">
                    Nouveau groupe
                    <select className="select-input" required value={groupId} onChange={event => setGroupId(event.target.value)}>
                      {candidateGroups.map(grp => (
                        <option key={grp.id} value={grp.id}>
                          {grp.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-group">
                    Date d’effet
                    <input
                      className="input"
                      required
                      type="date"
                      min={currentEnrollment?.currentGroupValidFrom || undefined}
                      value={effectiveOn}
                      onChange={event => setEffectiveOn(event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <label className="form-group">
                  Statut
                  <select className="select-input" value={status} onChange={event => setStatus(event.target.value)}>
                    <option value="SUSPENDU">Suspendu</option>
                    <option value="ABANDON">Abandon</option>
                    <option value="INSCRIT">Reprise de scolarité</option>
                  </select>
                </label>
              )}
              <DrawerActions>
                <DrawerCloseButton className="btn btn-outline">Annuler</DrawerCloseButton>
                <button className="btn btn-primary">Vérifier l’opération</button>
              </DrawerActions>
            </ReviewedForm>
          </>
        </WorkPage>
      )}
    </section>
  );
}
