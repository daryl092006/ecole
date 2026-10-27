'use client';
import PhoneInput from '@/components/ui/PhoneInput';
import DrawerActions from '@/components/ui/DrawerActions';
import IconButton from '@/components/ui/IconButton';
import CatalogTaskDialog from '@/components/modules/academic/CatalogTaskDialog';
import LoadingState from '@/components/ui/LoadingState';
import { useEffect, useState, type ReactNode } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { downloadApplicationDocument, loadWebsiteData, saveWebsiteData, createStudentRecord } from '@/services/remoteCampusService';
import { DOCUMENT_LABELS } from '@/services/websiteService';
import type { OnlineApplication, WebsiteIntake, WebsiteManagement } from '@/types/website';
import WorkPage from '@/components/ui/WorkPage';
import FormFeedback from '@/components/ui/FormFeedback';
import Link from 'next/link';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import WebsiteIntakeList, { EMPTY_INTAKE_FILTERS } from './WebsiteIntakeList';
import WebsiteLevelDocumentsEditor from './WebsiteLevelDocumentsEditor';
import type { WebsiteLevelGroup } from '@/services/websiteLevelDocumentsService';
import ReviewedForm from '@/components/ui/ReviewedForm';
import EnrollmentDialog from '@/components/modules/EnrollmentDialog';
import { DrawerCloseButton } from '@/components/ui/DetailDrawer';

function AdmissionsFrame({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  return onClose ? (
    <WorkPage title={title} onClose={onClose}>
      {children}
    </WorkPage>
  ) : (
    <div className="domain-workspace admissions-workspace workspace-stack">
      <div className="page-intro">
        <div>

          <h1>{title}</h1>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function OnlineAdmissionsPanel({
  onClose,
  mode = 'applications',
  readOnly = false,
}: {
  onClose?: () => void;
  mode?: 'applications' | 'configuration';
  readOnly?: boolean;
}) {
  const state = usePortal();
  const role = state.activeRole;
  const canManage =
    !readOnly &&
    (!state.academicYearContext || !!state.academicYearContext.selectedYearId) &&
    state.perms.permissions.includes('student.lifecycle.manage') &&
    state.session?.capabilities?.[role]?.globalAccess;

  const [intakeFilters, setIntakeFilters] = useState(EMPTY_INTAKE_FILTERS);
  const [levelGroup, setLevelGroup] = useState<WebsiteLevelGroup | null>(null);
  const [baseTask, setBaseTask] = useState<'programs' | 'levels' | null>(null);
  const [data, setData] = useState<WebsiteManagement | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<OnlineApplication | null>(null);
  const [intake, setIntake] = useState<WebsiteIntake | null>(null);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('EN_ANALYSE');
  const [confirm, setConfirm] = useState(false);
  const [filter, setFilter] = useState('');

  // Admission conversion flow
  const [enrollingMatricule, setEnrollingMatricule] = useState('');
  const [convertingApp, setConvertingApp] = useState<OnlineApplication | null>(null);
  const [convMatricule, setConvMatricule] = useState('');
  const [convNom, setConvNom] = useState('');
  const [convPrenom, setConvPrenom] = useState('');
  const [convEmail, setConvEmail] = useState('');
  const [convPhone, setConvPhone] = useState('');
  const [convGenre, setConvGenre] = useState('');
  const [convBirthDate, setConvBirthDate] = useState('');
  const [convNationality, setConvNationality] = useState('');
  const [convCity, setConvCity] = useState('');
  const [convReason, setConvReason] = useState('');
  const [convBusy, setConvBusy] = useState(false);
  const [convError, setConvError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setSelected(null);
    setIntake(null);
    setLevelGroup(null);
    setMessage('');
    loadWebsiteData<WebsiteManagement>('admissions', role, controller.signal)
      .then(value => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch(error => {
        if (!controller.signal.aborted) setMessage(error.message);
      });
    return () => controller.abort();
  }, [role, revision, state.academicYearSelection]);
  useEffect(() => { setIntakeFilters(EMPTY_INTAKE_FILTERS); }, [role, state.academicYearSelection]);

  async function save(values: Record<string, unknown>) {
    setBusy(true);
    setMessage('');
    try {
      await saveWebsiteData({ ...values, reason }, role);
      setSelected(null);
      setIntake(null);
      setLevelGroup(null);
      setConfirm(false);
      setRevision(value => value + 1);
      setSuccess(
        values.action === 'application-status'
          ? 'Suivi du dossier enregistré. Ce suivi ne vaut pas admission.'
          : values.action === 'level-documents-save' ? 'Pièces communes du niveau enregistrées pour toutes les filières.' : 'Configuration de la formation enregistrée.'
      );
      state.refreshCampus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string) {
    setMessage('');
    try {
      const url = await downloadApplicationDocument(id, role);
      window.location.assign(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Téléchargement impossible.');
    }
  }

  const startConversion = (app: OnlineApplication) => {
    setConvertingApp(app);
    const currentYear = new Date().getFullYear();
    const cleanRef = app.reference.replace(/[^A-Za-z0-9]/g, '');
    setConvMatricule(`ESCEN-${currentYear}-${cleanRef}`);
    setConvNom(app.identity.nom || '');
    setConvPrenom(app.identity.prenom || '');
    setConvEmail(app.identity.email || '');
    setConvPhone(app.identity.tel || '');
    setConvGenre(app.identity.genre || '');
    setConvBirthDate(app.identity.date_naissance ? app.identity.date_naissance.slice(0, 10) : '');
    setConvNationality(app.identity.nationalite || '');
    setConvCity(app.identity.lieu_naissance || '');
    setConvReason(`Admission et création du dossier étudiant suite à candidature en ligne réf. ${app.reference}`);
    setConvError('');
  };

  const selectedYear = state.academicYearContext?.years.find(
    year => year.id === state.academicYearContext?.selectedYearId
  );
  const yearLabel = selectedYear?.name || (state.academicYearSelection === 'all' ? 'toutes les années' : 'l’année consultée');
  const applications =
    data?.applications.filter(item =>
      `${item.reference} ${item.identity.nom} ${item.identity.prenom} ${item.identity.email}`
        .toLocaleLowerCase('fr')
        .includes(filter.trim().toLocaleLowerCase('fr'))
    ) || [];
  const statusLabels = { BROUILLON: 'Brouillon', RECU: 'Reçu', EN_ANALYSE: 'En analyse', CLASSE: 'Classé' };

  return (
    <>
      <FormFeedback message={success} error={false} />
      {baseTask && (
        <CatalogTaskDialog
          root={baseTask}
          onClose={() => setBaseTask(null)}
          onSaved={() => {
            setBaseTask(null);
            void loadWebsiteData<WebsiteManagement>('admissions', role)
              .then(setData)
              .catch(error => setMessage(error.message));
          }}
        />
      )}
      {!selected && !intake && !convertingApp && !levelGroup && (
        <AdmissionsFrame
          title={mode === 'configuration' ? 'Formations et pièces' : 'Candidatures'}
          onClose={onClose}
        >
          <p>
            {mode === 'configuration'
              ? `Ouverture des inscriptions et pièces demandées pour ${yearLabel}.`
              : `Candidatures pour ${yearLabel}.`}
          </p>
          {message && !selected && !intake && !levelGroup && <p role="alert" className="auth-error">{message}</p>}
          <IconButton className="btn btn-outline mb-2" onClick={() => setRevision(value => value + 1)} label={mode === 'configuration' ? 'Actualiser les formations' : 'Actualiser les dossiers'} />
          {!data ? (
            message ? (
              <section className="card" role="alert">
                <p>{mode === 'configuration' ? 'Le chargement des formations a échoué.' : 'Le chargement des demandes a échoué.'}</p>
                <IconButton className="btn btn-outline" onClick={() => setRevision(value => value + 1)} label="Réessayer" />
              </section>
            ) : (
              <LoadingState label={mode === 'configuration' ? 'Chargement des formations…' : 'Chargement des demandes…'} variant="table" />
            )
          ) : (
            <>
              {mode === 'applications' && (
                <div className="card card-full">
                  <div className="card-header">
                    <h2>Dossiers reçus du site</h2>
                    <span className="pill pill-default">{data.applications.length} dossier(s)</span>
                  </div>
                  <div className="browser-toolbar">
                    <label className="form-group">
                      Rechercher un dossier
                      <input
                        className="input"
                        type="search"
                        value={filter}
                        onChange={event => setFilter(event.target.value)}
                        placeholder="Nom, email ou référence"
                      />
                    </label>
                    {filter && (
                      <button type="button" className="btn btn-outline" onClick={() => setFilter('')}>
                        Effacer la recherche
                      </button>
                    )}
                  </div>
                  {!data.applications.length ? (
                    <div className="empty-state">
                      <strong>Aucune demande pour {yearLabel}</strong>
                      <span>Les dossiers apparaissent ici après leur envoi final depuis le formulaire du site.</span>
                      {state.perms.permissions.includes('academic.structure.manage') && (
                        <Link className="btn btn-outline" href="/site-web/documents">
                          Vérifier les formations ouvertes
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <ResponsiveTable className="data-table">
                        <thead>
                          <tr>
                            <th>Candidat</th>
                            <th>Référence</th>
                            <th>Formation</th>
                            <th>Année</th>
                            <th>État</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map(item => (
                            <tr key={item.id}>
                              <td>
                                <strong>
                                  {item.identity.prenom} {item.identity.nom}
                                </strong>
                                <div className="cell-sub">{item.identity.email}</div>
                              </td>
                              <td>{item.reference}</td>
                              <td>{item.intake_label || (item.legacy_state?.program_unresolved ? 'Filière à vérifier' : 'Formation non renseignée')}</td>
                              <td>
                                {(data.years || []).find(year => year.id === item.academic_year_id)?.name ||
                                  'Année à rattacher'}
                              </td>
                              <td>
                                <span
                                  className={`pill ${item.status === 'RECU' ? 'pill-warning' : 'pill-default'}`}
                                >
                                  {item.legacy_state?.admitted ? 'Admis · historique' : statusLabels[item.status]}
                                </span>
                              </td>
                              <td>
                                <IconButton
                                  className="btn btn-outline"
                                  label="Ouvrir le dossier"
                                  onClick={() => {
                                    setSuccess('');
                                    setSelected(item);
                                    setIntake(null);
    setLevelGroup(null);
                                    setReason('');
                                    setStatus(item.status === 'BROUILLON' ? 'RECU' : item.status);
                                    setConfirm(false);
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                          {!applications.length && (
                            <tr>
                              <td colSpan={6}>Aucun dossier ne correspond à votre recherche.</td>
                            </tr>
                          )}
                        </tbody>
                      </ResponsiveTable>
                    </div>
                  )}
                </div>
              )}
      {mode === 'configuration' && <WebsiteIntakeList data={data} yearLabel={yearLabel} canManage={canManage} filters={intakeFilters} onFilters={setIntakeFilters} onConfigureLevel={group => { setSuccess(''); setMessage(''); setReason(''); setLevelGroup(group); }} onConfigure={item => { setSuccess(''); setIntake({ ...item, academic_year_id: item.academic_year_id || '' }); setSelected(null); setReason(''); setConfirm(false); }} />}

            </>
          )}
        </AdmissionsFrame>
      )}

      {selected && !convertingApp && (
        <WorkPage
          busy={busy}
          title={`Dossier ${selected.reference}`}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          {(() => {
            const existingPerson = selected.identity.email
              ? (state.relationalSnapshot.tables.people || []).find(
                  p => String(p.email || '').toLowerCase() === selected.identity.email.toLowerCase()
                )
              : null;
            const linkedStudent = selected.legacy_student_id
              ? (state.relationalSnapshot.tables.students || []).find(s => s.id === selected.legacy_student_id)
              : null;
            const existingStudent = linkedStudent || (existingPerson
              ? (state.relationalSnapshot.tables.students || []).find(s => s.person_id === existingPerson.id)
              : null);

            return (
              <div className="card">
                {message && <p role="alert" className="auth-error">{message}</p>}
                <h2>
                  {selected.identity.prenom} {selected.identity.nom}
                </h2>
                <p>
                  {selected.intake_label || (selected.legacy_state?.program_unresolved ? 'Filière à vérifier' : 'Formation non renseignée')} · {selected.legacy_state?.admitted ? 'Admis · historique' : statusLabels[selected.status]}
                </p>
                {selected.legacy_source_row_id && (
                  <div className="card" role="status">
                    <p>Dossier repris pour 2026-2027. Année d’origine : {selected.legacy_state?.source_year || 'Non renseignée'}.</p>
                    {selected.legacy_state?.program_unresolved && <p>La filière d’origine est absente de la sauvegarde. Aucune autre filière n’a été attribuée.</p>}
                    {!!selected.legacy_state?.missing_documents && <p>{selected.legacy_state.missing_documents} pièce(s) référencée(s) manquante(s) dans la sauvegarde.</p>}
                    {selected.legacy_state?.admitted && <p>Admission historique conservée. La reprise ne crée pas une nouvelle inscription annuelle.</p>}
                    {selected.status === 'BROUILLON' && <p>Ce dossier n’avait pas été envoyé. La reprise conserve son état de brouillon.</p>}
                  </div>
                )}

                {existingStudent ? (
                  <div className="card mb-2" style={{ backgroundColor: 'var(--surface-sunken)' }}>
                    <p>
                      <strong>Dossier étudiant existant trouvé :</strong> {String(existingPerson?.firstname || '')}{' '}
                      {String(existingPerson?.lastname || '')} · Matricule {String(existingStudent.matricule)}
                    </p>
                    <div className="btn-group mt-1">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setEnrollingMatricule(String(existingStudent.matricule))}
                      >
                        Ouvrir l’inscription annuelle pour ce dossier
                      </button>
                    </div>
                  </div>
                ) : (
                  canManage && !selected.legacy_state?.admitted && ['RECU', 'EN_ANALYSE'].includes(selected.status) && (
                    <div className="card mb-2" style={{ backgroundColor: 'var(--surface-sunken)' }}>
                      <p>
                        <strong>Décision d’admission :</strong> Ce dossier est recevable. Vous pouvez admettre ce candidat
                        et convertir automatiquement ses données en profil étudiant ESCEN.
                      </p>
                      <div className="btn-group mt-1">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => startConversion(selected)}
                        >
                          Admettre et créer le dossier étudiant
                        </button>
                      </div>
                    </div>
                  )
                )}

                <h3>Identité et coordonnées</h3>
                <dl>
                  {Object.entries(selected.identity)
                    .filter(([, value]) => value)
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>
                          {({
                            nom: 'Nom',
                            prenom: 'Prénom',
                            genre: 'Sexe',
                            date_naissance: 'Date de naissance',
                            lieu_naissance: 'Lieu de naissance',
                            nationalite: 'Nationalité',
                            email: 'Email',
                            tel: 'Téléphone',
                            tel2: 'Autre téléphone',
                            tel3: 'Autre téléphone',
                            nom_jeune_fille: 'Nom de naissance',
                          } as Record<string, string>)[key] || key.replaceAll('_', ' ')}
                        </dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                </dl>

                <h3>Diplôme déclaré</h3>
                {Object.entries(selected.diploma)
                  .filter(([, value]) => value)
                  .map(([key, value]) => (
                    <p key={key}>
                      {key === 'type_diplome_id' ? 'Dernier diplôme' : key.replaceAll('_', ' ')} : {String(value)}
                    </p>
                  ))}

                <h3>Parents ou tuteurs</h3>
                {selected.guardians.map((guardian, index) => (
                  <p key={index}>
                    {guardian.prenom} {guardian.nom} · {guardian.tel} · {guardian.email}
                  </p>
                ))}

                <h3>Pièces reçues</h3>
                {selected.documents.map(doc => (
                  <p key={doc.id}>
                    {DOCUMENT_LABELS[doc.document_key]} — {doc.filename}{' '}
                    <button className="btn btn-outline btn-sm" onClick={() => void download(doc.id)}>
                      Télécharger {doc.filename}
                    </button>
                  </p>
                ))}

                {canManage && selected.status !== 'BROUILLON' && !selected.legacy_state?.admitted && (
                  <form
                    onSubmit={event => {
                      event.preventDefault();
                      setConfirm(true);
                    }}
                  >
                    <label className="form-group">
                      Suivi du dossier
                      <select
                        aria-label="Suivi du dossier"
                        className="select-input"
                        value={status}
                        onChange={event => {
                          setStatus(event.target.value);
                          setConfirm(false);
                        }}
                      >
                        <option value="RECU">Reçu</option>
                        <option value="EN_ANALYSE">En analyse</option>
                        <option value="CLASSE">Classé</option>
                      </select>
                    </label>
                    <label className="form-group">
                      Motif du suivi
                      <textarea
                        aria-label="Motif du suivi"
                        className="input"
                        required
                        minLength={3}
                        maxLength={1000}
                        value={reason}
                        onChange={event => {
                          setReason(event.target.value);
                          setConfirm(false);
                        }}
                      />
                    </label>
                    {!confirm && (
                      <DrawerActions>
                        <button className="btn btn-outline" disabled={busy}>
                          Relire le changement de suivi
                        </button>
                      </DrawerActions>
                    )}
                    {confirm && (
                      <div className="card mt-2">
                        <p>
                          Enregistrer le statut {status} pour {selected.reference} ? Ce suivi ne vaut pas admission.
                        </p>
                        <DrawerActions>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busy}
                            onClick={() =>
                              void save({
                                action: 'application-status',
                                id: selected.id,
                                version: selected.version,
                                status,
                              })
                            }
                          >
                            Confirmer le suivi
                          </button>
                        </DrawerActions>
                      </div>
                    )}
                  </form>
                )}
              </div>
            );
          })()}
        </WorkPage>
      )}

      {convertingApp && (
        <WorkPage
          title={`Admission du candidat — ${convertingApp.identity.prenom} ${convertingApp.identity.nom}`}
          onClose={() => {
            if (!convBusy) setConvertingApp(null);
          }}
        >
          <ReviewedForm
            busy={convBusy}
            error={convError}
            validate={() => {
              if (!convMatricule.trim()) return 'Le matricule est obligatoire.';
              if (!convNom.trim()) return 'Le nom de famille est obligatoire.';
              if (!convPrenom.trim()) return 'Le prénom est obligatoire.';
              if (!convReason.trim() || convReason.trim().length < 3) return 'Le motif d’admission (min 3 caractères) est requis.';
              return null;
            }}
            confirmLabel="Confirmer l’admission et créer le dossier"
            fields={[
              { label: 'Candidat', value: `${convPrenom} ${convNom}` },
              { label: 'Matricule attribué', value: convMatricule },
              { label: 'Email', value: convEmail || 'Non renseigné' },
              { label: 'Téléphone', value: convPhone || 'Non renseigné' },
              { label: 'Formation', value: convertingApp.intake_label || 'Non renseignée' },
              { label: 'Motif', value: convReason },
            ]}
            consequence="Le dossier étudiant sera créé dans la base de données sous ce matricule. La candidature sera classée pour admission, puis la fenêtre d’inscription annuelle s’ouvrira immédiatement pour finaliser la classe et le contrat."
            onConfirm={async event => {
              event.preventDefault();
              setConvBusy(true);
              setConvError('');
              try {
                await createStudentRecord(
                  convMatricule.trim(),
                  {
                    firstname: convPrenom.trim(),
                    lastname: convNom.trim(),
                    email: convEmail.trim(),
                    phone: convPhone.trim(),
                    gender: convGenre.trim(),
                    birthDate: convBirthDate.trim(),
                    nationality: convNationality.trim(),
                    address: '',
                    city: convCity.trim(),
                    country: '',
                  },
                  role
                );

                await saveWebsiteData(
                  {
                    action: 'application-status',
                    id: convertingApp.id,
                    version: convertingApp.version,
                    status: 'CLASSE',
                    reason: convReason.trim(),
                  },
                  role
                );

                const matricule = convMatricule.trim();
                state.reportActionOutcome({
                  title: 'Candidat admis avec succès',
                  detail: `Le dossier étudiant ${convPrenom} ${convNom} a été créé (Matricule : ${matricule}). L’inscription annuelle peut maintenant être finalisée.`,
                });
                setConvertingApp(null);
                setSelected(null);
                state.refreshCampus();
                setEnrollingMatricule(matricule);
              } catch (cause) {
                setConvError(cause instanceof Error ? cause.message : 'Erreur lors de la création du dossier étudiant.');
              } finally {
                setConvBusy(false);
              }
            }}
          >
            <fieldset disabled={convBusy} className="permission-fieldset">
              <div className="card mb-2" style={{ backgroundColor: 'var(--surface-sunken)' }}>
                <p>
                  <strong>Formation postulée :</strong> {convertingApp.intake_label || 'Non renseignée'}
                </p>
                <p className="cell-sub">
                  Référence du dossier en ligne : {convertingApp.reference}
                </p>
              </div>

              <div className="form-grid">
                <label className="form-group">
                  Matricule étudiant
                  <input
                    className="input"
                    required
                    maxLength={160}
                    value={convMatricule}
                    onChange={e => setConvMatricule(e.target.value)}
                  />
                </label>
                <label className="form-group">
                  Sexe
                  <select
                    className="select-input"
                    value={convGenre}
                    onChange={e => setConvGenre(e.target.value)}
                  >
                    <option value="">Non renseigné</option>
                    <option value="HOMME">Homme</option>
                    <option value="FEMME">Femme</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="form-group">
                  Nom de famille
                  <input
                    className="input"
                    required
                    maxLength={160}
                    value={convNom}
                    onChange={e => setConvNom(e.target.value)}
                  />
                </label>
                <label className="form-group">
                  Prénom(s)
                  <input
                    className="input"
                    required
                    maxLength={160}
                    value={convPrenom}
                    onChange={e => setConvPrenom(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-group">
                  Adresse email
                  <input
                    className="input"
                    type="email"
                    value={convEmail}
                    onChange={e => setConvEmail(e.target.value)}
                  />
                </label>
                <PhoneInput label="Numéro de téléphone" value={convPhone} onChange={setConvPhone} />
              </div>

              <div className="form-grid">
                <label className="form-group">
                  Date de naissance
                  <input
                    className="input"
                    type="date"
                    value={convBirthDate}
                    onChange={e => setConvBirthDate(e.target.value)}
                  />
                </label>
                <label className="form-group">
                  Lieu de naissance / Ville
                  <input
                    className="input"
                    maxLength={160}
                    value={convCity}
                    onChange={e => setConvCity(e.target.value)}
                  />
                </label>
                <label className="form-group">
                  Nationalité
                  <input
                    className="input"
                    maxLength={160}
                    value={convNationality}
                    onChange={e => setConvNationality(e.target.value)}
                  />
                </label>
              </div>

              <label className="form-group">
                Motif d’admission
                <textarea
                  className="input"
                  required
                  minLength={3}
                  maxLength={1000}
                  value={convReason}
                  onChange={e => setConvReason(e.target.value)}
                />
              </label>

              <DrawerActions>
                <button className="btn btn-primary" disabled={convBusy}>
                  Vérifier l’admission
                </button>
                <DrawerCloseButton className="btn btn-outline" disabled={convBusy}>
                  Annuler
                </DrawerCloseButton>
              </DrawerActions>
            </fieldset>
          </ReviewedForm>
        </WorkPage>
      )}

      {enrollingMatricule && (
        <EnrollmentDialog
          kind="new"
          initialMatricule={enrollingMatricule}
          onClose={() => {
            setEnrollingMatricule('');
            setRevision(v => v + 1);
          }}
        />
      )}

    {levelGroup && <WebsiteLevelDocumentsEditor group={levelGroup} busy={busy} error={message} reason={reason} onReason={setReason} onClose={() => { if (!busy) setLevelGroup(null); }} onSave={values => void save(values)} />}
    {intake && data && <WorkPage busy={busy} title="Configurer une formation sur le site" onClose={() => { if (!busy) setIntake(null); }}><ReviewedForm className="card" busy={busy} error={message} confirmLabel="Confirmer la configuration" fields={[
        { label: 'Année universitaire', value: data.years?.find(year => year.id === intake.academic_year_id)?.name || '' },
        { label: 'Niveau', value: intake.level_name || data.levels.find(item => item.id === intake.level_id)?.name || '' },
        { label: 'Formation', value: intake.label, previous: data.intakes.find(item => item.id === intake.id)?.label },
        { label: 'Ouverture sur le site', value: intake.active ? 'Ouverte' : 'Fermée', previous: data.intakes.find(item => item.id === intake.id)?.active ? 'Ouverte' : 'Fermée' },
        { label: 'Pièces obligatoires', value: intake.required_documents.map(key => DOCUMENT_LABELS[key] || key).join(', ') || 'Aucune', previous: data.intakes.find(item => item.id === intake.id)?.required_documents.map(key => DOCUMENT_LABELS[key] || key).join(', ') || 'Aucune' },
        { label: 'Motif', value: reason },
      ]} consequence="La configuration sera utilisée par le formulaire de candidature du site. Fermer la formation empêchera les nouvelles candidatures ; les dossiers reçus restent conservés." onConfirm={() => { const { id, version, academic_year_id, level_id, program_id, label, active, required_documents } = intake; void save({ action: 'intake-save', ...(id ? { id, version } : {}), academic_year_id, level_id, program_id, label, active, required_documents }); }}>{message && <p role="alert" className="auth-error">{message}</p>}
      <p><strong>{intake.program_name || intake.label}</strong> · {intake.level_name} · {data.years?.find(year => year.id === intake.academic_year_id)?.name}</p>
      <label className="form-group">Année universitaire<select aria-label="Année universitaire" className="select-input" required disabled={!!intake.id && !!intake.academic_year_id} value={intake.academic_year_id || ''} onChange={event => { setConfirm(false); setIntake({ ...intake, academic_year_id: event.target.value }); }}><option value="">Choisir une année</option>{(data.years || []).map(year => <option key={year.id} value={year.id}>{year.name} · {year.status}</option>)}</select></label>
      <label className="form-group">Libellé public<input className="input" required minLength={3} maxLength={200} value={intake.label} onChange={event => { setConfirm(false); setIntake({ ...intake, label: event.target.value }); }} /></label>
      <label className="form-group">Niveau<select aria-label="Niveau" className="select-input" required disabled={!!intake.id} value={intake.level_id} onChange={event => { setConfirm(false); setIntake({ ...intake, level_id: event.target.value }); }}><option value="">Choisir un niveau existant</option>{data.levels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="form-group">Filière<select aria-label="Filière" className="select-input" required disabled={!!intake.id} value={intake.program_id} onChange={event => { setConfirm(false); setIntake({ ...intake, program_id: event.target.value }); }}><option value="">Choisir une filière existante</option>{data.programs.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {canManage && state.perms.permissions.includes('academic.structure.manage') && <div className="btn-group">{!data.programs.length && <button type="button" className="btn btn-outline" onClick={() => setBaseTask('programs')}>Renseigner la filière ici</button>}{!data.levels.length && <button type="button" className="btn btn-outline" onClick={() => setBaseTask('levels')}>Renseigner le niveau ici</button>}</div>}
      <p>Les pièces sont communes à toutes les filières de ce niveau. Modifiez-les dans « Pièces par niveau ».</p>
      <label className="form-group"><span><input type="checkbox" checked={intake.active} onChange={event => { setConfirm(false); setIntake({ ...intake, active: event.target.checked }); }} /> Ouvrir aux inscriptions sur le site</span></label>
      <label className="form-group">Motif de la configuration<textarea aria-label="Motif de la configuration" className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => { setReason(event.target.value); setConfirm(false); }} /></label><DrawerActions><button className="btn btn-primary" disabled={busy}>Relire la configuration</button></DrawerActions>
    </ReviewedForm></WorkPage>}

    </>
  );
}
