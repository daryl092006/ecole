'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleCheck, Download, FileText, Folder, Globe, GraduationCap, Info, Landmark, Mail, MapPin, Pencil, Phone, TriangleAlert, UserRound } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import EnrollmentDialog from '../EnrollmentDialog';
import { admissionsOperation, downloadAdmissionLetter, downloadAdmissionDocument, admissionDocumentBlob, RemoteRequestError } from '@/services/remoteCampusService';
import { APPLICATION_STAGES, type AdmissionAction, type AdmissionApplication, type AdmissionsContext } from '@/types/admissions';
import { admissionsJourney, ADMISSIONS_STEPS } from '@/services/admissionsJourney';
import { ADMISSION_ACTIONS, stageLabel } from '@/services/admissionsService';
import { formatCandidateIdentity, formatDocumentLabel } from '@/services/websiteService';
import ApplicationIntakeForm, { type IntakeInput } from './ApplicationIntakeForm';
import OnlineAdmissionsPanel from './OnlineAdmissionsPanel';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import DocumentPreview from '@/components/ui/DocumentPreview';

const ACTION_RESULTS: Record<AdmissionAction, string> = {
  acknowledge: 'Candidature reçue', review: 'En vérification admission', incomplete: 'Dossier incomplet',
  request_changes: 'Dossier à compléter', complete: 'Dossier complet', transmit: 'Transmis à l’académie',
  study: 'En étude académique', admissible: 'Admissible, sous réserve des frais d’inscription', refuse: 'Refusé',
  await_payment: 'En attente de paiement', confirm_payment: 'Admis officiellement si le solde est réglé ; sinon en attente de paiement',
  reverse_payment: 'En attente de paiement', contact: 'Statut conservé ; appel ajouté à l’historique',
  create_student: 'Admission conservée ; dossier étudiant créé ou relié',
};
function stageTone(item: AdmissionApplication) {
  if (!item.workflow_stage) return item.status === 'BROUILLON' ? 'draft' : 'historical';
  if (item.workflow_stage === 'ADMIS_OFFICIEL') return 'success';
  if (item.workflow_stage === 'REFUSE') return 'danger';
  if (['INCOMPLET','A_COMPLETER','ADMISSIBLE','ATTENTE_PAIEMENT'].includes(item.workflow_stage)) return 'warning';
  return 'active';
}
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2,'0')).join('');
export default function AdmissionsWorkflowPanel() {
  const portal = usePortal(); const role = portal.activeRole; const year = portal.academicYearContext?.selectedYearId;
  const [data, setData] = useState<AdmissionsContext | null>(null); const [loading, setLoading] = useState(true); const [legacy, setLegacy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [busy, setBusy] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState(''); const [selected, setSelected] = useState<AdmissionApplication | null>(null);
  const [action, setAction] = useState<AdmissionAction | ''>(''); const [reason, setReason] = useState(''); const [checks, setChecks] = useState<string[]>([]);
  const [identityChecked, setIdentityChecked] = useState(false); const [guardiansChecked, setGuardiansChecked] = useState(false);
  const [amount, setAmount] = useState(''); const [reference, setReference] = useState(''); const [channel, setChannel] = useState(''); const [paymentId, setPaymentId] = useState('');
  const [matricule, setMatricule] = useState(''); const [student, setStudent] = useState(''); const [createToken, setCreateToken] = useState('');
  const [enrollingMatricule, setEnrollingMatricule] = useState<string | null>(null);
  const [downloadingDocument, setDownloadingDocument] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState('');
  const [previewDocument, setPreviewDocument] = useState<{ id: string; filename: string; mime_type: string } | null>(null);
  const loadPreview = useCallback((signal: AbortSignal) => {
    if (!previewDocument) return Promise.reject(new Error('Aucune pièce sélectionnée.'));
    return admissionDocumentBlob(previewDocument.id, role, signal);
  }, [previewDocument, role]);
  useEffect(() => { setPreviewDocument(null); }, [selected?.id]);
  useEffect(() => { setDocumentError(''); }, [selected?.id]);
  async function downloadDocument(id: string, filename: string) {
    if (downloadingDocument) return;
    setDownloadingDocument(id); setDocumentError('');
    try { await downloadAdmissionDocument(id, role, filename); }
    catch (cause) { setDocumentError(cause instanceof Error ? cause.message : 'Téléchargement impossible. Réessayez.'); }
    finally { setDownloadingDocument(null); }
  }
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const value = await admissionsOperation(role, undefined, signal) as AdmissionsContext;
    if (signal?.aborted) return; setData(value); setLegacy(!value.enabled);
    setSelected(previous => previous ? value.applications.find(item => item.id === previous.id) || null : null);
  }, [role]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setData(null); setSelected(null); setLegacy(false);
    void refresh(controller.signal).catch(error => { if (!controller.signal.aborted) { setLegacy(error instanceof RemoteRequestError && error.status === 403); setError(error.message); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh, year, retry]);
  function chooseAction(value: AdmissionAction) {
    const requiresReason = ['incomplete', 'request_changes', 'refuse', 'reverse_payment'].includes(value);
    setAction(value);
    setReason(requiresReason ? '' : ADMISSION_ACTIONS[value].label);
    setChecks([]); setIdentityChecked(false); setGuardiansChecked(false);
    setAmount(String(Math.max(0, Number(selected?.registration_fee_due || 0) - Number(selected?.registration_fee_paid || 0))));
    setReference(''); setPaymentId(''); setChannel(''); setStudent(selected?.legacy_student_id || ''); setMatricule(''); setError('');
  }
  useEffect(() => { if (action) document.getElementById('admissions-action-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [action]);
  async function saved() { await Promise.all([portal.refreshCampus(),refresh()]); window.dispatchEvent(new Event('escen:admissions-changed')); }
  async function command() {
    if (!selected || !action) return; setBusy(true); setError('');
    try {
      const payload: Record<string, unknown> = { action, id: selected.id, version: selected.version, reason: reason.trim() || ADMISSION_ACTIONS[action].label };
      if (action === 'complete') Object.assign(payload, { checked_documents: checks, identity_checked: identityChecked, guardians_checked: guardiansChecked });
      if (action === 'confirm_payment') Object.assign(payload, { amount: Number(amount), reference, channel_id: channel });
      if (action === 'reverse_payment') payload.payment_id = paymentId;
      if (action === 'create_student') Object.assign(payload, { matricule, existing_student_id: student || null });
      await admissionsOperation(role, payload); setAction(''); await saved(); setSuccess('Le dossier a été enregistré. Les courriers prévus sont placés dans la file d’envoi.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Enregistrement impossible.'); } finally { setBusy(false); }
  }
  async function create(application: IntakeInput, files: FormData) {
    setBusy(true); setError('');
    try { files.append('payload', JSON.stringify({ request_token: createToken, application })); await admissionsOperation(role, files); setCreateToken(''); await saved(); setSuccess('Candidature saisie à ESCEN et reçue par l’admission.'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Enregistrement impossible.'); } finally { setBusy(false); }
  }
  if (loading) return <LoadingState label="Chargement des candidatures…" />;
  if (legacy) return <><p className="restricted-box" role="status">Le nouveau circuit attend sa mise à jour en base. Les dossiers existants restent consultables.</p><OnlineAdmissionsPanel readOnly /></>;
  if (!data) return <section className="card"><h1>Candidatures</h1><p role="alert" className="restricted-box">{error || 'Les candidatures sont indisponibles.'}</p><button className="btn btn-outline" onClick={() => setRetry(value => value + 1)}>Réessayer</button></section>;
  const canProgress = (item: AdmissionApplication) => { const next = admissionsJourney(item).primary; return next !== null && data.capabilities[ADMISSION_ACTIONS[next].capability]; };
  const journey = selected ? admissionsJourney(selected) : null;
  const listed = data.applications.filter(item => (!onlyMine || canProgress(item)) && (!filter || (filter === 'HISTORIQUE' ? !item.workflow_stage && item.status !== 'BROUILLON' : filter === 'BROUILLONS' ? !item.workflow_stage && item.status === 'BROUILLON' : filter === 'A_COMPLETER' ? ['INCOMPLET','A_COMPLETER'].includes(item.workflow_stage || '') : filter === 'ATTENTE_PAIEMENT' ? ['ADMISSIBLE','ATTENTE_PAIEMENT'].includes(item.workflow_stage || '') : item.workflow_stage === filter)) && `${item.identity.nom} ${item.identity.prenom} ${item.identity.email} ${item.reference}`.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')));
  const actionable = selected ? (Object.entries(ADMISSION_ACTIONS) as [AdmissionAction, typeof ADMISSION_ACTIONS[AdmissionAction]][]).filter(([key, value]) => data.capabilities[value.capability] && value.from.includes(selected.workflow_stage) && (key !== 'create_student' || !selected.student_id) && (key !== 'review' || selected.status !== 'BROUILLON')) : [];
  const identityRows = selected ? formatCandidateIdentity(selected.identity) : [];
  const needsActionReason = Boolean(action && ['incomplete', 'request_changes', 'refuse', 'reverse_payment'].includes(action));
  return <div className="domain-workspace workspace-stack">
    <div className="page-intro">
      <div>
        <span className="page-eyebrow">SITE WEB & ADMISSIONS</span>
        <h1>Candidatures</h1>
        <p>Suivez chaque dossier, identifiez le responsable et effectuez la prochaine action.</p>
      </div>
      <div className="btn-group">
        <button className="btn btn-outline" disabled={busy} onClick={() => { void refresh().catch(error => setError(error.message)); }}>Actualiser les dossiers</button>
        {data.capabilities.review && year && <button className="btn btn-primary" onClick={() => { setError(''); setCreateToken(newToken()); }}>Saisir une candidature à ESCEN</button>}
      </div>
    </div>
    {error && !selected && !createToken && <p role="alert" className="restricted-box">{error}</p>}{success && <p role="status" className="success-message">{success}</p>}
    {!data.mail_configured && <p className="restricted-box" role="status">Les mails sont conservés dans la file d’envoi. Le service d’envoi doit être configuré pour les transmettre.</p>}
    <div className="admissions-summary" aria-label="Suivi des candidatures">{[['','Tous les dossiers'],['HISTORIQUE','Historiques à vérifier'],['BROUILLONS','Brouillons non soumis'],['NOUVELLE','Nouvelles'],['A_COMPLETER','À compléter'],['TRANSMIS_ACADEMIE','Pour l’académie'],['ATTENTE_PAIEMENT','Paiement attendu'],['ADMIS_OFFICIEL','Admissions officielles']].map(([stage,label]) => <button className="card" key={stage} onClick={() => setFilter(filter === stage ? '' : stage)} aria-pressed={filter === stage}><strong>{data.applications.filter(item => stage === '' || (stage === 'HISTORIQUE' && !item.workflow_stage && item.status !== 'BROUILLON') || (stage === 'BROUILLONS' && !item.workflow_stage && item.status === 'BROUILLON') || item.workflow_stage === stage || (stage === 'A_COMPLETER' && item.workflow_stage === 'INCOMPLET') || (stage === 'ATTENTE_PAIEMENT' && item.workflow_stage === 'ADMISSIBLE')).length}</strong><span>{label}</span></button>)}</div>
    <section className="card"><div className="card-header"><h2>Dossiers de candidature</h2><span>{listed.length} dossier(s)</span></div><div className="form-grid"><label className="form-group">Rechercher un dossier<input className="input" type="search" placeholder="Nom, email ou référence" value={search} onChange={event => setSearch(event.target.value)} /></label><label className="form-group">Statut<select className="select-input" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Tous les dossiers</option>{Object.entries(APPLICATION_STAGES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}<option value="HISTORIQUE">Historiques à vérifier</option><option value="BROUILLONS">Brouillons non soumis</option></select></label></div><label className="candidate-consent" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}><input type="checkbox" checked={onlyMine} onChange={event => setOnlyMine(event.target.checked)} />Afficher uniquement les dossiers que je peux faire avancer ({data.applications.filter(canProgress).length})</label>
      {listed.length ? <div className="table-wrap"><ResponsiveTable className="data-table"><thead><tr><th>Candidat</th><th>Référence</th><th>Formation</th><th>Origine</th><th>Étape et responsable</th><th>Actions</th></tr></thead><tbody>{listed.map(item => <tr key={item.id}><td><strong>{item.identity.prenom} {item.identity.nom}</strong><div className="cell-sub">{item.identity.email}</div></td><td>{item.reference}</td><td>{item.intake_label || (item.legacy_state?.program_unresolved ? 'Filière à vérifier' : 'Formation non renseignée')}</td><td>{item.entry_channel === 'ACCUEIL' ? 'Accueil ESCEN' : 'Site web'}</td><td><span className={`pill admission-status admission-status--${stageTone(item)}`}>{stageLabel(item)}</span><div className="cell-sub">{admissionsJourney(item).owner}</div></td><td><IconButton label="Ouvrir le dossier" className="btn btn-outline" onClick={() => { setSelected(item); setAction(''); setError(''); setSuccess(''); }} /></td></tr>)}</tbody></ResponsiveTable></div> : <div className="empty-state"><strong>Aucune candidature pour ce filtre</strong><span>Les demandes en ligne et saisies à ESCEN suivent le même circuit.</span></div>}
    </section>
    {createToken && <WorkPage title="Saisir une candidature à ESCEN" busy={busy} onClose={() => setCreateToken('')}><ApplicationIntakeForm intakes={data.intakes} busy={busy} error={error} onSave={create} title="Confirmer la candidature saisie à ESCEN" /></WorkPage>}
    {selected && <WorkPage title={`Dossier ${selected.reference}`} busy={busy} onClose={() => { setSelected(null); setAction(''); }}><div className="workspace-stack">
      <div className="dossier-hero">
        <div className="dossier-hero-main">
          <div className="dossier-avatar">
            {selected.identity.prenom?.[0]?.toUpperCase() || ''}{selected.identity.nom?.[0]?.toUpperCase() || ''}
          </div>
          <div className="dossier-hero-info">
            <div className="dossier-hero-title-row">
              <h2 className="dossier-hero-name">{selected.identity.prenom} {selected.identity.nom}</h2>
              <span className={`pill admission-status admission-status--${stageTone(selected)}`}>
                {stageLabel(selected)}
              </span>
            </div>
            <div className="dossier-hero-meta">
              <span className="dossier-meta-badge"><GraduationCap size={16} aria-hidden="true" /> {selected.intake_label || 'Formation à vérifier'}</span>
              <span className="dossier-meta-badge"><Folder size={16} aria-hidden="true" /> Réf. {selected.reference}</span>
              <span className="dossier-meta-badge">{selected.entry_channel === 'ACCUEIL' ? <><Landmark size={16} aria-hidden="true" /> Accueil ESCEN</> : <><Globe size={16} aria-hidden="true" /> Dépôt en ligne</>}</span>
            </div>
          </div>
        </div>

        {!selected.workflow_stage && (
          <div className="dossier-callout dossier-callout--info">
            <span className="dossier-callout-icon"><Info size={19} aria-hidden="true" /></span>
            <div className="dossier-callout-content">
              <strong>Dossier importé de l’historique</strong>
              <p>Vérifiez les informations personnelles et les pièces justificatives avant de confirmer l’avancement dans le parcours.</p>
            </div>
          </div>
        )}
        {selected.legacy_state?.program_unresolved && (
          <div className="dossier-callout dossier-callout--warning">
            <span className="dossier-callout-icon"><TriangleAlert size={19} aria-hidden="true" /></span>
            <div className="dossier-callout-content">
              <strong>Filière à confirmer</strong>
              <p>La filière d’origine du candidat doit être vérifiée avant la décision.</p>
            </div>
          </div>
        )}
        {!!selected.legacy_state?.missing_documents && (
          <div className="dossier-callout dossier-callout--warning">
            <span className="dossier-callout-icon"><Folder size={16} aria-hidden="true" /></span>
            <div className="dossier-callout-content">
              <strong>Pièces manquantes</strong>
              <p>{selected.legacy_state.missing_documents} pièce(s) référencée(s) absente(s) de la sauvegarde.</p>
            </div>
          </div>
        )}
        {selected.requested_changes && (
          <div className="dossier-callout dossier-callout--alert">
            <span className="dossier-callout-icon"><Pencil size={19} aria-hidden="true" /></span>
            <div className="dossier-callout-content">
              <strong>Compléments demandés au candidat</strong>
              <p className="candidate-preserve-text">{selected.requested_changes}</p>
            </div>
          </div>
        )}

        {journey && (
          <div className="dossier-journey-panel">
            <div className="dossier-section-title-row">
              <h3 className="dossier-section-title">Parcours du dossier</h3>
              <span className="dossier-step-counter">Étape {journey.step + 1} sur {ADMISSIONS_STEPS.length}</span>
            </div>

            <ol className="admissions-stepper" aria-label="Étapes de la candidature">
              {ADMISSIONS_STEPS.map((label, index) => {
                const isCurrent = index === journey.step;
                const isDone = index < journey.step;
                return (
                  <li
                    key={label}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={isCurrent ? 'admissions-step-current' : isDone ? 'admissions-step-done' : ''}
                  >
                    <span className="admissions-step-bubble">{isDone ? '✓' : index + 1}</span>
                    <span className="admissions-step-label">{label}</span>
                  </li>
                );
              })}
            </ol>

            <div className="dossier-action-banner">
              <div className="dossier-action-banner-header">
                <div>
                  <h4 className="dossier-step-title">
                    {selected.workflow_stage === 'REFUSE' ? 'Candidature refusée' : `Étape ${journey.step + 1} : ${ADMISSIONS_STEPS[journey.step]}`}
                  </h4>
                  <p className="dossier-step-instruction">{journey.instruction}</p>
                </div>
                <div className="dossier-owner-tag">
                  <span className="dossier-owner-label">Responsable</span>
                  <strong className="dossier-owner-name">{journey.owner}</strong>
                </div>
              </div>

              {!year && (
                <div className="dossier-callout dossier-callout--warning">
                  <span className="dossier-callout-icon"><TriangleAlert size={19} aria-hidden="true" /></span>
                  <div className="dossier-callout-content">
                    <p>Sélectionnez une année de travail pour effectuer une action sur ce dossier.</p>
                  </div>
                </div>
              )}

              {year && journey.primary && !actionable.some(([key]) => key === journey.primary) && (
                <div className="dossier-callout dossier-callout--info">
                  <span className="dossier-callout-icon"><Info size={19} aria-hidden="true" /></span>
                  <div className="dossier-callout-content">
                    <p>Ce dossier attend l’intervention du responsable indiqué ci-dessus (<strong>{journey.owner}</strong>). Votre rôle permet la consultation à cette étape.</p>
                  </div>
                </div>
              )}

              {year && actionable.some(([key]) => key === journey.primary) && journey.primary && (
                <div className="dossier-action-cta">
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => chooseAction(journey.primary!)}
                  >
                    {ADMISSION_ACTIONS[journey.primary].label}
                  </button>
                  <span className="dossier-action-hint">
                    Après confirmation : <strong>{ACTION_RESULTS[journey.primary]}</strong>
                  </span>
                </div>
              )}

              {year && actionable.some(([key]) => ['request_changes', 'refuse'].includes(key)) && (
                <div className="dossier-secondary-actions">
                  <span className="dossier-secondary-title">Actions secondaires :</span>
                  <div className="btn-group">
                    {actionable.filter(([key]) => ['request_changes', 'refuse'].includes(key)).map(([key, value]) => (
                      <button
                        key={key}
                        className={`btn btn-sm ${key === 'refuse' ? 'btn-danger' : 'btn-outline'}`}
                        disabled={busy}
                        onClick={() => chooseAction(key)}
                      >
                        {value.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {year && actionable.some(([key]) => key !== journey.primary && !['acknowledge', 'await_payment', 'incomplete', 'request_changes', 'refuse'].includes(key)) && (
                <details className="admissions-other-actions">
                  <summary>Autres actions : compléments, décision ou correction</summary>
                  <div className="admission-actions">
                    {actionable.filter(([key]) => key !== journey.primary && !['acknowledge', 'await_payment', 'incomplete', 'request_changes', 'refuse'].includes(key)).map(([key, value]) => (
                      <div className="admission-action" key={key}>
                        <button className="btn btn-outline" disabled={busy} onClick={() => chooseAction(key)}>
                          {value.label}
                        </button>
                        <p>Après confirmation : {ACTION_RESULTS[key]}.</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {selected.student_id && (() => {
                const linked = (portal.relationalSnapshot.tables.students || []).find(item => item.id === selected.student_id);
                const linkedMat = linked?.matricule ? String(linked.matricule) : '';
                if (!linkedMat) return null;
                return (
                  <div className="dossier-enrolled-box">
                    <span className="dossier-enrolled-badge"><CircleCheck size={19} aria-hidden="true" /> Étudiant officiellement admis</span>
                    <div className="btn-group">
                      {portal.perms.permissions.includes('student.lifecycle.manage') && portal.perms.permissions.includes('payment.record') && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEnrollingMatricule(linkedMat)}>
                          Inscrire au groupe et créer le contrat ({linkedMat})
                        </button>
                      )}
                      {portal.perms.permissions.includes('student.view') && (
                        <Link className="btn btn-outline btn-sm" href={`/etudiants/${encodeURIComponent(linkedMat)}`}>
                          Ouvrir le dossier étudiant ({linkedMat})
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {enrollingMatricule && <EnrollmentDialog kind="auto" initialMatricule={enrollingMatricule} onClose={() => { setEnrollingMatricule(null); void saved(); }} />}
      {action && <section id="admissions-action-form" className="card admissions-action-form"><button type="button" className="btn btn-outline" disabled={busy} onClick={() => setAction('')}>Annuler cette action</button><h2>{ADMISSION_ACTIONS[action].label}</h2><ReviewedForm key={`${selected.id}:${selected.version}:${action}`} busy={busy} error={error} confirmLabel={`Confirmer : ${ADMISSION_ACTIONS[action].label.toLocaleLowerCase('fr')}`} validate={() => needsActionReason && reason.trim().length < 3 ? 'Saisissez un motif précis.' : action === 'complete' && (!identityChecked || !guardiansChecked) ? 'Confirmez les contrôles des informations et des tuteurs.' : null}
        fields={[{label:'Candidat',value:`${selected.identity.prenom} ${selected.identity.nom}`},{label:'Action',value:ADMISSION_ACTIONS[action].label},{label:'Étape du dossier',previous:stageLabel(selected),value:ACTION_RESULTS[action]},...(needsActionReason ? [{label:'Motif',value:reason}] : []),
          ...(action === 'confirm_payment' ? [{label:'Montant confirmé',value:`${Number(amount).toLocaleString('fr-FR')} FCFA`},{label:'Référence',value:reference},{label:'Moyen de paiement',value:data.payment_channels.find(item => item.id === channel)?.name || ''}] : []),
          ...(action === 'complete' ? [{label:'Pièces contrôlées',value:checks.map(id => selected.documents.find(doc => doc.id === id)?.filename || '').join(', ')}] : []),
          ...(action === 'create_student' ? [{label:'Matricule',value:matricule},{label:'Dossier étudiant',value:student ? 'Dossier existant sélectionné explicitement' : 'Nouveau dossier'}] : [])]}
        consequence={action === 'confirm_payment' ? 'Confirmez uniquement un règlement effectivement reçu. L’admission devient officielle lorsque la totalité des frais d’inscription est confirmée.' : action === 'reverse_payment' ? 'Une contre-opération motivée sera conservée. Le dossier reviendra en attente de paiement ; l’identité étudiante existante sera conservée.' : action === 'transmit' ? 'Le dossier complet sera transmis à l’académie. Le candidat et l’académie seront informés.' : action === 'admissible' ? 'Une lettre d’admissibilité sera créée et mise en envoi, sous réserve du règlement des frais d’inscription. Cette décision ne confirme aucun paiement.' : action === 'refuse' ? 'La décision de refus et sa lettre seront conservées et communiquées au candidat.' : 'L’action sera enregistrée dans l’historique et les notifications prévues seront préparées.'} onConfirm={() => void command()}>
        {action === 'complete' && <><label className="candidate-consent"><input type="checkbox" checked={identityChecked} onChange={event => setIdentityChecked(event.target.checked)} />Informations personnelles vérifiées</label><label className="candidate-consent"><input type="checkbox" checked={guardiansChecked} onChange={event => setGuardiansChecked(event.target.checked)} />Parents ou tuteurs vérifiés</label><p>Pièces demandées : {selected.required_documents.map(key => formatDocumentLabel(key)).join(', ') || 'aucune pièce imposée par la formation.'}</p>{selected.documents.map(doc => <label className="candidate-consent" key={doc.id}><input type="checkbox" checked={checks.includes(doc.id)} onChange={event => setChecks(values => event.target.checked ? [...values,doc.id] : values.filter(id => id !== doc.id))} />Pièce vérifiée : {doc.filename}</label>)}</>}
        {action === 'confirm_payment' && <div className="form-grid"><label className="form-group">Montant reçu en FCFA<input type="number" className="input" min="1" step="1" max={Math.max(0,Number(selected.registration_fee_due)-Number(selected.registration_fee_paid))} required value={amount} onChange={event => setAmount(event.target.value)} /></label><label className="form-group">Moyen de paiement<select className="select-input" required value={channel} onChange={event => setChannel(event.target.value)}><option value="">Choisir</option>{data.payment_channels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="form-group">Référence du règlement ou reçu<input className="input" required minLength={3} maxLength={160} value={reference} onChange={event => setReference(event.target.value)} /></label></div>}
        {action === 'reverse_payment' && <label className="form-group">Confirmation à annuler<select className="select-input" required value={paymentId} onChange={event => setPaymentId(event.target.value)}><option value="">Choisir</option>{selected.registration_payments.filter(item => item.kind === 'PAYMENT' && !selected.registration_payments.some(reversal => reversal.reversal_of === item.id)).map(item => <option key={item.id} value={item.id}>{item.reference} · {Number(item.amount).toLocaleString('fr-FR')} FCFA</option>)}</select></label>}
        {action === 'create_student' && <div className="form-grid"><label className="form-group">Dossier existant<select className="select-input" value={student} onChange={event => { setStudent(event.target.value); const row = (portal.relationalSnapshot.tables.students || []).find(item => item.id === event.target.value); setMatricule(String(row?.matricule || '')); }}><option value="">Créer un nouveau dossier</option>{(portal.relationalSnapshot.tables.students || []).map(item => <option value={item.id} key={item.id}>{String(item.matricule)}</option>)}</select></label><label className="form-group">Matricule<input className="input" required maxLength={160} value={matricule} onChange={event => setMatricule(event.target.value)} /></label></div>}
        {needsActionReason && <label className="form-group">{['incomplete','request_changes'].includes(action) ? 'Informations ou pièces à compléter' : 'Motif de l’action'}<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>}<button type="submit" className="btn btn-primary">Relire avant de confirmer</button>
      </ReviewedForm></section>}

      <section className="card">
        <h3>Informations du candidat</h3>
        {(selected.identity.email || selected.identity.tel || selected.identity.adresse) && (
          <div className="dossier-contacts-bar">
            {selected.identity.email && (
              <a href={`mailto:${selected.identity.email}`} className="dossier-contact-pill">
                <Mail size={16} aria-hidden="true" /> {selected.identity.email}
              </a>
            )}
            {selected.identity.tel && (
              <a href={`tel:${selected.identity.tel}`} className="dossier-contact-pill">
                <Phone size={16} aria-hidden="true" /> {selected.identity.tel}
              </a>
            )}
            {selected.identity.tel2 && (
              <a href={`tel:${selected.identity.tel2}`} className="dossier-contact-pill">
                <Phone size={16} aria-hidden="true" /> {selected.identity.tel2}
              </a>
            )}
            {selected.identity.adresse && (
              <span className="dossier-contact-pill">
                <MapPin size={16} aria-hidden="true" /> {selected.identity.adresse}
              </span>
            )}
          </div>
        )}
        <dl className="record-details-grid">
          {identityRows.filter(item => !['Email', 'Téléphone', 'Téléphone secondaire', 'Autre téléphone', 'Adresse'].includes(item.label)).map(item => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Parents ou tuteurs</h3>
        {selected.guardians && selected.guardians.length > 0 ? (
          <div className="dossier-guardians-grid">
            {selected.guardians.map((guardian, index) => {
              const guardianName = [guardian.prenom, guardian.nom].filter(Boolean).join(' ') || `Parent / tuteur ${index + 1}`;
              const guardianLien = guardian.lien || 'Parent / Tuteur';
              return (
                <div key={index} className="dossier-guardian-card">
                  <div className="dossier-guardian-header">
                    <div className="dossier-guardian-avatar"><UserRound size={20} aria-hidden="true" /></div>
                    <div>
                      <h4 className="dossier-guardian-name">{guardianName}</h4>
                      <span className="pill pill-subtle">{guardianLien}</span>
                    </div>
                  </div>
                  <div className="dossier-guardian-body">
                    <div className="dossier-guardian-row">
                      <span className="dossier-label">Téléphone</span>
                      {guardian.tel ? (
                        <a href={`tel:${guardian.tel}`} className="dossier-contact-link"><Phone size={16} aria-hidden="true" /> {guardian.tel}</a>
                      ) : (
                        <span className="dossier-empty-val">Non renseigné</span>
                      )}
                    </div>
                    {guardian.email && (
                      <div className="dossier-guardian-row">
                        <span className="dossier-label">Email</span>
                        <a href={`mailto:${guardian.email}`} className="dossier-contact-link"><Mail size={16} aria-hidden="true" /> {guardian.email}</a>
                      </div>
                    )}
                    {guardian.profession && (
                      <div className="dossier-guardian-row">
                        <span className="dossier-label">Profession</span>
                        <span>{guardian.profession}</span>
                      </div>
                    )}
                    {guardian.adresse && (
                      <div className="dossier-guardian-row">
                        <span className="dossier-label">Adresse</span>
                        <span>{guardian.adresse}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="cell-sub">Aucun parent ou tuteur renseigné.</p>
        )}
      </section>

      <section className="card">
        <h3>Pièces du dossier ({selected.documents.length})</h3>
        {documentError && <p role="alert" className="restricted-box">{documentError}</p>}
        {selected.documents.length ? (
          <div className="workspace-stack" style={{ gap: '0.625rem' }}>
            {selected.documents.map(doc => (
              <div key={doc.id} className="dossier-doc-card">
                <div className="dossier-doc-main">
                  <span className="dossier-doc-icon"><FileText size={22} aria-hidden="true" /></span>
                  <div>
                    <strong>{formatDocumentLabel(doc.document_key)}</strong>
                    <div className="cell-sub">{doc.filename}</div>
                  </div>
                </div>
                <div className="btn-group"><button type="button" className="btn btn-sm btn-outline" aria-label={`Visualiser ${doc.filename}`} onClick={() => setPreviewDocument(doc)}>Visualiser</button>
                <button
                  type="button"
                  aria-label={`Télécharger ${doc.filename}`}
                  className="btn btn-sm btn-outline"
                  disabled={downloadingDocument !== null}
                  aria-busy={downloadingDocument === doc.id}
                  onClick={() => { void downloadDocument(doc.id, doc.filename); }}
                >
                  <Download size={16} aria-hidden="true" />
                  {downloadingDocument === doc.id ? 'Téléchargement…' : 'Télécharger'}
                </button></div>
              </div>
            ))}
          </div>
        ) : <p className="cell-sub">Aucune pièce déposée dans ce dossier.</p>}
      </section>

      {error && !action && <p role="alert" className="restricted-box">{error}</p>}

      {(selected.registration_fee_due !== null || selected.registration_payments.length > 0) && (
        <section className="card">
          <h3>Frais d’inscription</h3>
          {selected.registration_fee_due !== null && <p>Montant attendu : <strong>{Number(selected.registration_fee_due).toLocaleString('fr-FR')} FCFA</strong> · Confirmé : <strong>{Number(selected.registration_fee_paid).toLocaleString('fr-FR')} FCFA</strong></p>}
          {selected.registration_payments.length ? selected.registration_payments.map(item => <p key={item.id}>{item.kind === 'REVERSAL' ? 'Annulation' : 'Règlement confirmé'} · {item.reference} · {Number(item.amount).toLocaleString('fr-FR')} FCFA</p>) : <p className="cell-sub">Aucun règlement confirmé pour le moment.</p>}
        </section>
      )}

      {(selected.events.length > 0 || selected.letters.length > 0) && (
        <section className="card">
          {selected.letters.length > 0 && <>
            <h3>Courriers</h3>
            {selected.letters.map(letter => <p key={letter.id}>{letter.kind} · {letter.reference} <IconButton label={`Télécharger ${letter.reference}`} className="btn btn-sm btn-outline" onClick={() => { void downloadAdmissionLetter(letter.id,letter.reference,role).catch(error => setError(error.message)); }} /></p>)}
          </>}
          <h3>Historique des actions</h3>
          <ol className="candidate-history">{selected.events.map(event => <li key={event.id}><strong>{event.to_stage ? APPLICATION_STAGES[event.to_stage] : 'Historique'} · {new Date(event.created_at).toLocaleString('fr-FR')}</strong><p>{event.reason}</p></li>)}</ol>
        </section>
      )}
    </div></WorkPage>}
    {previewDocument && <DocumentPreview filename={previewDocument.filename} mimeType={previewDocument.mime_type} load={loadPreview} download={() => downloadAdmissionDocument(previewDocument.id, role, previewDocument.filename)} onClose={() => setPreviewDocument(null)} />}
  </div>;
}
