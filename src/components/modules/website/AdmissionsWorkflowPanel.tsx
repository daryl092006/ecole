'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleCheck, Download, FileText, Folder, Globe, GraduationCap, Info, Landmark, Mail, MapPin, Pencil, Phone, TriangleAlert, UserRound } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import EnrollmentDialog from '../EnrollmentDialog';
import { admissionsOperation, downloadAdmissionLetter, downloadAdmissionDocument, admissionDocumentBlob, RemoteRequestError } from '@/services/remoteCampusService';
import { APPLICATION_STAGES, type AdmissionAction, type AdmissionApplication, type AdmissionsContext } from '@/types/admissions';
import type { WebsiteIntake } from '@/types/website';
import { admissionsJourney, ADMISSIONS_STEPS } from '@/services/admissionsJourney';
import { ADMISSION_ACTIONS, stageLabel, MACRO_STAGES, type MacroStage, getApplicationMacroStage, stageBadge } from '@/services/admissionsService';
import { formatCandidateIdentity, formatDocumentLabel } from '@/services/websiteService';
import { downloadCsv } from '@/utils/csv';
import ApplicationIntakeForm, { type IntakeInput } from './ApplicationIntakeForm';
import OnlineAdmissionsPanel from './OnlineAdmissionsPanel';
import WorkPage from '@/components/ui/WorkPage';
import ReviewedForm from '@/components/ui/ReviewedForm';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import DocumentPreview from '@/components/ui/DocumentPreview';
import PageHeader from '@/components/ui/PageHeader';
import DataPanel from '@/components/ui/DataPanel';

const ACTION_RESULTS: Record<AdmissionAction, string> = {
  acknowledge: 'Candidature reçue', review: 'En vérification admission', incomplete: 'Dossier incomplet',
  request_changes: 'Dossier à compléter (notification et lien envoyés au candidat)', complete: 'Dossier complet', transmit: 'Transmis à l’académie pour décision',
  study: 'En étude académique', admissible: 'Admissible (frais d’inscription ouverts et lettre d’admissibilité envoyée)', refuse: 'Candidature refusée (lettre de refus envoyée)',
  await_payment: 'En attente de paiement', confirm_payment: 'Admis officiellement et dossier étudiant créé automatiquement (si solde réglé) ; sinon en attente de paiement',
  reverse_payment: 'En attente de paiement', contact: 'Statut conservé ; appel ajouté à l’historique',
  create_student: 'Admission conservée ; dossier étudiant créé ou relié',
};
function stageTone(item: AdmissionApplication) {
  if (item.workflow_stage === 'ADMIS_OFFICIEL' || item.student_id || item.legacy_student_id || item.legacy_state?.admitted || item.legacy_state?.validated) return 'success';
  if (!item.workflow_stage) return item.status === 'BROUILLON' ? 'draft' : 'active';
  if (item.workflow_stage === 'REFUSE') return 'danger';
  if (['INCOMPLET','A_COMPLETER','ADMISSIBLE','ATTENTE_PAIEMENT'].includes(item.workflow_stage)) return 'warning';
  return 'active';
}

function getCandidateProgramAndLevel(item: AdmissionApplication, intakes: WebsiteIntake[]) {
  const intake = intakes.find(i => i.id === item.intake_id);
  let program = intake?.program_name || '';
  let level = intake?.level_name || '';
  if (!program && item.intake_label) {
    const parts = item.intake_label.split(' - ');
    program = parts[0]?.trim() || '';
    if (parts.length > 1) {
      level = parts.slice(1).join(' - ').trim();
    }
  }
  if (!program) {
    program = item.legacy_state?.program_unresolved ? 'Filière à vérifier' : 'Non renseignée';
  }
  if (!level) {
    level = 'Non renseigné';
  }
  return { program, level };
}
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2,'0')).join('');
export default function AdmissionsWorkflowPanel() {
  const portal = usePortal(); const role = portal.activeRole; const year = portal.academicYearContext?.selectedYearId;
  const [data, setData] = useState<AdmissionsContext | null>(null); const [loading, setLoading] = useState(true); const [legacy, setLegacy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [busy, setBusy] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [search, setSearch] = useState('');
  const [macroFilter, setMacroFilter] = useState<MacroStage>('ALL');
  const [filiereFilter, setFiliereFilter] = useState('');
  const [niveauFilter, setNiveauFilter] = useState('');
  const [selected, setSelected] = useState<AdmissionApplication | null>(null);
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
    const requiresReason = ['incomplete', 'request_changes', 'refuse', 'contact'].includes(value);
    setAction(value);
    setReason(requiresReason ? '' : ADMISSION_ACTIONS[value].label);
    setChecks((selected?.documents || []).map(d => d.id));
    setIdentityChecked(true);
    setGuardiansChecked(true);
    setAmount(String(Math.max(0, Number(selected?.registration_fee_due || 0) - Number(selected?.registration_fee_paid || 0))));
    setReference(''); setPaymentId(''); setChannel(data?.payment_channels?.[0]?.id || ''); setStudent(selected?.legacy_student_id || ''); setMatricule(''); setError('');
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
      if (action === 'create_student') Object.assign(payload, { matricule: matricule.trim() || undefined, existing_student_id: student || null });
      await admissionsOperation(role, payload); setAction(''); await saved(); setSuccess(data?.mail_configured ? 'Le dossier a été mis à jour et les notifications par e-mail ont été envoyées au candidat et aux responsables.' : 'Le dossier a été enregistré. Les courriers prévus sont placés dans la file d’envoi.');
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
  const linkedStudent = selected ? portal.students.find(s => Boolean(s.email && selected.identity.email) && s.email.toLowerCase() === selected.identity.email.toLowerCase()) : null;
  const filiereOptions = data ? Array.from(new Set(data.applications.map(app => getCandidateProgramAndLevel(app, data.intakes).program).filter(Boolean))).sort() : [];
  const niveauOptions = data ? Array.from(new Set(data.applications.map(app => getCandidateProgramAndLevel(app, data.intakes).level).filter(Boolean))).sort() : [];
  const listed = (data?.applications || []).filter(item => {
    if (onlyMine && !canProgress(item)) return false;
    if (macroFilter !== 'ALL' && getApplicationMacroStage(item) !== macroFilter) return false;
    const info = getCandidateProgramAndLevel(item, data?.intakes || []);
    if (filiereFilter && info.program !== filiereFilter) return false;
    if (niveauFilter && info.level !== niveauFilter) return false;
    if (search) {
      const term = search.toLocaleLowerCase('fr');
      const matched = `${item.identity.nom} ${item.identity.prenom} ${item.identity.email} ${item.reference} ${info.program} ${info.level}`.toLocaleLowerCase('fr').includes(term);
      if (!matched) return false;
    }
    return true;
  });
  const actionable = selected ? (Object.entries(ADMISSION_ACTIONS) as [AdmissionAction, typeof ADMISSION_ACTIONS[AdmissionAction]][]).filter(([key, value]) => data.capabilities[value.capability] && value.from.includes(selected.workflow_stage) && (key !== 'create_student' || !selected.student_id) && (key !== 'review' || selected.status !== 'BROUILLON')) : [];
  const identityRows = selected ? formatCandidateIdentity(selected.identity) : [];
  const needsActionReason = Boolean(action && ['incomplete', 'request_changes', 'refuse', 'contact'].includes(action));

  function exportExcel() {
    if (!data || !listed.length) return;
    const headers = ['Nom', 'Prénom', 'Email', 'Numéro de dossier', 'Filière', 'Niveau', 'Statut', 'Origine'];
    const rows = listed.map(item => {
      const info = getCandidateProgramAndLevel(item, data.intakes);
      const badge = stageBadge(item);
      return [
        item.identity.nom || '',
        item.identity.prenom || '',
        item.identity.email || '',
        item.reference,
        info.program,
        info.level,
        badge.label,
        item.entry_channel === 'ACCUEIL' ? 'Accueil ESCEN' : 'Site web',
      ];
    });
    downloadCsv('etude-des-dossiers-candidatures.csv', headers, rows);
  }

  return <div className="domain-workspace workspace-stack">
    <PageHeader
      eyebrow="SITE WEB & ADMISSIONS"
      title="Candidatures"
      description="Gestion centralisée, examen des pièces et validation des candidatures entrantes."
    >
      {data.capabilities.review && year && <button type="button" className="btn btn-primary" onClick={() => { setError(''); setCreateToken(newToken()); }}>Saisir une candidature</button>}
      <button type="button" className="btn btn-outline" disabled={!listed.length} onClick={exportExcel}>
        <Download size={16} aria-hidden="true" />
        Exporter Excel
      </button>
      <button type="button" className="btn btn-outline" disabled={busy} onClick={() => { void refresh().catch(error => setError(error.message)); }}>Actualiser</button>
    </PageHeader>
    {error && !selected && !createToken && <p role="alert" className="restricted-box">{error}</p>}{success && <p role="status" className="success-message">{success}</p>}
    {!data.mail_configured && (
      <p className="restricted-box" role="status">Les mails sont conservés dans la file d’envoi. Le service d’envoi doit être configuré pour les transmettre.</p>
    )}
    <DataPanel title="Dossiers de candidature" meta={<span className="pill pill-default">{listed.length} dossier(s)</span>}
      footer={`${listed.length} dossier(s) affiché(s) sur ${data.applications.length}`}
      toolbar={<><div className="panel-filter-grid">
        <label className="form-group">
          Rechercher un candidat
          <input
            className="input"
            type="search"
            placeholder="Rechercher par nom, email, référence..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </label>
        <label className="form-group">
          Filières
          <select
            className="select-input"
            value={filiereFilter}
            onChange={event => setFiliereFilter(event.target.value)}
          >
            <option value="">Toutes les filières</option>
            {filiereOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>
        <label className="form-group">
          Niveaux
          <select
            className="select-input"
            value={niveauFilter}
            onChange={event => setNiveauFilter(event.target.value)}
          >
            <option value="">Tous les niveaux</option>
            {niveauOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>
        <label className="form-group">Statut
          <select className="select-input" value={macroFilter} onChange={event => setMacroFilter(event.target.value as MacroStage)}>
            {MACRO_STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label.charAt(0) + stage.label.slice(1).toLocaleLowerCase('fr')} ({data.applications.filter(item => stage.id === 'ALL' || getApplicationMacroStage(item) === stage.id).length})</option>)}
          </select>
        </label>
      </div><div className="panel-filter-options">
      <label className="checkbox-field">
        <input type="checkbox" checked={onlyMine} onChange={event => setOnlyMine(event.target.checked)} />
        Afficher uniquement les dossiers que je peux faire avancer ({data.applications.filter(canProgress).length})
      </label>
      {(search || filiereFilter || niveauFilter || onlyMine || macroFilter !== 'ALL') && <button type="button" className="btn btn-outline" onClick={() => { setSearch(''); setFiliereFilter(''); setNiveauFilter(''); setOnlyMine(false); setMacroFilter('ALL'); }}>Réinitialiser les filtres</button>}
      </div></>}>
      {listed.length ? (
        <div className="table-wrap">
          <ResponsiveTable className="data-table">
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Dossier</th>
                <th>Filière</th>
                <th>Niveau</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {listed.map(item => {
                const info = getCandidateProgramAndLevel(item, data.intakes);
                const badge = stageBadge(item);
                const initials = `${item.identity.prenom?.[0] || ''}${item.identity.nom?.[0] || ''}`.toUpperCase() || 'C';
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="candidate-cell-flex">
                        <div className="candidate-avatar-circle" aria-hidden="true">
                          {initials}
                        </div>
                        <div className="candidate-cell-info">
                          <strong>{item.identity.nom} {item.identity.prenom}</strong>
                          <div className="cell-sub candidate-cell-email" title={item.identity.email || ''}>{item.identity.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="dossier-ref-badge">{item.reference}</code>
                    </td>
                    <td>{info.program}</td>
                    <td>{info.level}</td>
                    <td>
                      <span className={`pill admission-status admission-status--${badge.tone}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        aria-label="Ouvrir le dossier"
                        className="btn btn-sm btn-outline"
                        onClick={() => { setSelected(item); setAction(''); setError(''); setSuccess(''); }}
                      >
                        Ouvrir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </ResponsiveTable>
        </div>
      ) : (
        <div className="empty-state">
          <strong>Aucune candidature pour ce filtre</strong>
          <span>Les demandes en ligne et saisies à ESCEN suivent le même circuit.</span>
        </div>
      )}
    </DataPanel>
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
              {linkedStudent && (
                <span className="dossier-meta-badge dossier-meta-badge--success">
                  <UserRound size={16} aria-hidden="true" /> Matricule {linkedStudent.matricule}
                </span>
              )}
              <span className="dossier-meta-badge">{selected.entry_channel === 'ACCUEIL' ? <><Landmark size={16} aria-hidden="true" /> Accueil ESCEN</> : <><Globe size={16} aria-hidden="true" /> Dépôt en ligne</>}</span>
            </div>
          </div>
        </div>

        {!selected.workflow_stage && !selected.legacy_state?.admitted && !selected.legacy_state?.validated && !selected.student_id && !selected.legacy_student_id && (
          <div className="dossier-callout dossier-callout--info">
            <span className="dossier-callout-icon"><Info size={19} aria-hidden="true" /></span>
            <div className="dossier-callout-content">
              <strong>Dossier en cours d’intégration</strong>
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

              {journey.step === 4 && (
                <div className="dossier-enrolled-callout">
                  <CircleCheck size={20} color="#10b981" aria-hidden="true" />
                  <div>
                    <strong>Étudiant officiellement inscrit pour l’année scolaire</strong>
                    <p>Le dossier est validé et l’inscription annuelle est active.</p>
                  </div>
                </div>
              )}

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

              {year && (actionable.some(([key]) => key === journey.primary) || actionable.some(([key]) => ['request_changes', 'refuse'].includes(key))) && (
                <div className="dossier-action-cta">
                  {journey.primary && actionable.some(([key]) => key === journey.primary) && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => chooseAction(journey.primary!)}
                    >
                      {ADMISSION_ACTIONS[journey.primary].label}
                    </button>
                  )}
                  {actionable.filter(([key]) => ['request_changes', 'refuse'].includes(key)).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      className={`btn ${key === 'refuse' ? 'btn-danger' : 'btn-outline'}`}
                      disabled={busy}
                      onClick={() => chooseAction(key)}
                    >
                      {value.label}
                    </button>
                  ))}
                  {journey.primary && actionable.some(([key]) => key === journey.primary) && (
                    <span className="dossier-action-hint">
                      Action principale : <strong>{ACTION_RESULTS[journey.primary]}</strong>
                    </span>
                  )}
                </div>
              )}

              {year && actionable.some(([key]) => key !== journey.primary && !['acknowledge', 'review', 'complete', 'study', 'await_payment', 'incomplete', 'request_changes', 'refuse'].includes(key)) && (
                <details className="admissions-other-actions">
                  <summary>Autres actions complémentaires</summary>
                  <div className="admission-actions">
                    {actionable.filter(([key]) => key !== journey.primary && !['acknowledge', 'review', 'complete', 'study', 'await_payment', 'incomplete', 'request_changes', 'refuse'].includes(key)).map(([key, value]) => (
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

              {(() => {
                const linkedMat = linkedStudent?.matricule || (() => {
                  const sId = selected.student_id || selected.legacy_student_id;
                  const row = (portal.relationalSnapshot.tables.students || []).find(item => item.id === sId);
                  return row?.matricule ? String(row.matricule) : null;
                })();

                if (linkedMat) {
                  return (
                    <div className="dossier-enrolled-box">
                      <span className="dossier-enrolled-badge"><CircleCheck size={19} aria-hidden="true" /> Dossier étudiant actif · Matricule {linkedMat}</span>
                      <div className="btn-group">
                        {portal.perms.permissions.includes('student.view') && (
                          <Link className="btn btn-primary btn-sm" href={`/etudiants/${encodeURIComponent(linkedMat)}`}>
                            Ouvrir le dossier étudiant ({linkedMat})
                          </Link>
                        )}
                        {portal.perms.permissions.includes('student.lifecycle.manage') && portal.perms.permissions.includes('payment.record') && (
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setEnrollingMatricule(linkedMat)}>
                            Affecter au groupe & contrat
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                if (selected.legacy_state?.admitted || selected.legacy_state?.validated || selected.workflow_stage === 'ADMIS_OFFICIEL') {
                  return (
                    <div className="dossier-enrolled-box">
                      <span className="dossier-enrolled-badge"><CircleCheck size={19} aria-hidden="true" /> Candidature admise · Fiche étudiante</span>
                      <div className="btn-group">
                        {portal.perms.permissions.includes('application.review') && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busy}
                            onClick={() => chooseAction('create_student')}
                          >
                            Créer la fiche dans Dossiers étudiants
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          </div>
        )}
      </div>

      {enrollingMatricule && <EnrollmentDialog kind="auto" initialMatricule={enrollingMatricule} onClose={() => { setEnrollingMatricule(null); void saved(); }} />}
      {action && <section id="admissions-action-form" className="card admissions-action-form"><button type="button" className="btn btn-outline" disabled={busy} onClick={() => setAction('')}>Annuler cette action</button><h2>{ADMISSION_ACTIONS[action].label}</h2><ReviewedForm key={`${selected.id}:${selected.version}:${action}`} busy={busy} error={error} confirmLabel={`Confirmer : ${ADMISSION_ACTIONS[action].label.toLocaleLowerCase('fr')}`} validate={() => needsActionReason && reason.trim().length < 3 ? (action === 'refuse' ? 'Précisez le motif du refus (au moins 3 caractères).' : action === 'contact' ? 'Précisez le compte-rendu de l’appel (au moins 3 caractères).' : 'Précisez les informations ou pièces à rectifier / compléter.') : action === 'complete' && (!identityChecked || !guardiansChecked) ? 'Confirmez les contrôles des informations et des tuteurs.' : null}
        fields={[{label:'Candidat',value:`${selected.identity.prenom} ${selected.identity.nom}`},{label:'Action',value:ADMISSION_ACTIONS[action].label},{label:'Étape du dossier',previous:stageLabel(selected),value:ACTION_RESULTS[action]},...(needsActionReason ? [{label:action === 'refuse' ? 'Motif du refus' : action === 'contact' ? 'Compte-rendu de l’appel' : 'Éléments à rectifier ou compléter par le candidat',value:reason}] : []),
          ...(action === 'confirm_payment' ? [{label:'Montant confirmé',value:`${Number(amount).toLocaleString('fr-FR')} FCFA`},{label:'Référence',value:reference},{label:'Moyen de paiement',value:data.payment_channels.find(item => item.id === channel)?.name || ''}] : []),
          ...(action === 'complete' ? [{label:'Pièces contrôlées',value:checks.map(id => selected.documents.find(doc => doc.id === id)?.filename || '').join(', ')}] : []),
          ...(action === 'create_student' ? [{label:'Matricule',value:matricule || 'Généré automatiquement (xxx-ESC-2026)'},{label:'Dossier étudiant',value:student ? 'Dossier existant sélectionné' : 'Nouveau dossier (création M365, portail et inscription)'}] : [])]}
        consequence={action === 'confirm_payment' ? 'Confirmez uniquement un règlement effectivement reçu. Dès que la totalité des frais d’inscription est confirmée, l’admission devient officielle et le dossier étudiant (matricule, Microsoft 365, portail) est créé automatiquement.' : action === 'reverse_payment' ? 'Une contre-opération sera conservée. Le dossier reviendra en attente de paiement ; l’identité étudiante existante sera conservée.' : action === 'transmit' ? 'Le dossier sera validé et transmis directement à l’académie pour décision. Le candidat et la direction académique seront notifiés.' : action === 'admissible' ? 'Une lettre d’admissibilité sera générée et envoyée au candidat, ce qui débloque l’étape de règlement des frais d’inscription.' : action === 'refuse' ? 'La décision de refus et la lettre officielle seront enregistrées et envoyées au candidat.' : action === 'create_student' ? 'Le dossier étudiant officiel sera créé avec un matricule automatique. Ses accès Microsoft 365, son compte portail, son affectation et le transfert de ses pièces justificatives seront réalisés automatiquement.' : 'L’action sera enregistrée dans l’historique et les notifications prévues seront envoyées au candidat.'} onConfirm={() => void command()}>
        {action === 'complete' && <><label className="candidate-consent"><input type="checkbox" checked={identityChecked} onChange={event => setIdentityChecked(event.target.checked)} />Informations personnelles vérifiées</label><label className="candidate-consent"><input type="checkbox" checked={guardiansChecked} onChange={event => setGuardiansChecked(event.target.checked)} />Parents ou tuteurs vérifiés</label><p>Pièces demandées : {selected.required_documents.map(key => formatDocumentLabel(key)).join(', ') || 'aucune pièce imposée par la formation.'}</p>{selected.documents.map(doc => <label className="candidate-consent" key={doc.id}><input type="checkbox" checked={checks.includes(doc.id)} onChange={event => setChecks(values => event.target.checked ? [...values,doc.id] : values.filter(id => id !== doc.id))} />Pièce vérifiée : {doc.filename}</label>)}</>}
        {action === 'confirm_payment' && <div className="form-grid"><label className="form-group">Montant reçu en FCFA<input type="number" className="input" min="1" step="1" max={Math.max(0,Number(selected.registration_fee_due)-Number(selected.registration_fee_paid))} required value={amount} onChange={event => setAmount(event.target.value)} /></label><label className="form-group">Moyen de paiement<select className="select-input" required value={channel} onChange={event => setChannel(event.target.value)}><option value="">Choisir</option>{data.payment_channels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="form-group">Référence du règlement ou reçu<input className="input" required minLength={3} maxLength={160} value={reference} onChange={event => setReference(event.target.value)} /></label></div>}
        {action === 'reverse_payment' && <label className="form-group">Confirmation à annuler<select className="select-input" required value={paymentId} onChange={event => setPaymentId(event.target.value)}><option value="">Choisir</option>{selected.registration_payments.filter(item => item.kind === 'PAYMENT' && !selected.registration_payments.some(reversal => reversal.reversal_of === item.id)).map(item => <option key={item.id} value={item.id}>{item.reference} · {Number(item.amount).toLocaleString('fr-FR')} FCFA</option>)}</select></label>}
        {action === 'create_student' && <div className="form-grid"><label className="form-group">Dossier existant<select className="select-input" value={student} onChange={event => { setStudent(event.target.value); const row = (portal.relationalSnapshot.tables.students || []).find(item => item.id === event.target.value); setMatricule(String(row?.matricule || '')); }}><option value="">Créer un nouveau dossier étudiant (Automatique)</option>{(portal.relationalSnapshot.tables.students || []).map(item => <option value={item.id} key={item.id}>{String(item.matricule)}</option>)}</select></label>{!student ? <div className="form-group"><span className="badge badge-success">Génération automatique</span><p style={{marginTop: 6, fontSize: 13, color: 'var(--text-muted)'}}>Le matricule officiel (xxx-ESC-2026), le compte Microsoft 365 (@escen.university), la licence Office 365, les accès au portail et le groupe seront créés automatiquement.</p></div> : <label className="form-group">Matricule officiel<input className="input" readOnly value={matricule} /></label>}</div>}
        {needsActionReason && <label className="form-group">{action === 'refuse' ? 'Motif du refus communiqué au candidat' : action === 'contact' ? 'Compte-rendu de l’appel d’accompagnement' : 'Éléments ou pièces à rectifier / compléter (le candidat recevra ce message dans son espace)'}<textarea className="input" required minLength={3} maxLength={1000} rows={3} placeholder={action === 'refuse' ? 'Indiquez la raison du refus...' : action === 'contact' ? 'Résumé de l’échange téléphonique avec le candidat...' : 'Ex. : Merci de joindre une copie lisible de votre relevé de notes du Bac et de corriger votre date de naissance.'} value={reason} onChange={event => setReason(event.target.value)} /></label>}<button type="submit" className="btn btn-primary">Relire avant de confirmer</button>
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

        <h3 className="dossier-subsection-title">Parents ou tuteurs</h3>
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
          <div className="workspace-stack dossier-docs-list">
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
