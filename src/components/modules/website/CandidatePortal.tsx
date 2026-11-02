'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import SchoolLogo from '@/components/ui/SchoolLogo';
import LoadingState from '@/components/ui/LoadingState';
import ApplicationIntakeForm, { type IntakeInput } from './ApplicationIntakeForm';
import type { WebsiteIntake } from '@/types/website';
import type { CandidateDossier } from '@/types/admissions';
import { admissionsJourney, ADMISSIONS_STEPS } from '@/services/admissionsJourney';
import { stageLabel } from '@/services/admissionsService';
import { DOCUMENT_LABELS } from '@/services/websiteService';

async function responseData(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'La demande n’a pas pu être enregistrée.');
  return data;
}

function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
}

export default function CandidatePortal({ tracking = false }: { tracking?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [intakes, setIntakes] = useState<WebsiteIntake[]>([]);
  const [year, setYear] = useState('');
  const [dossier, setDossier] = useState<CandidateDossier | null>(null);
  const [receipt, setReceipt] = useState<{ reference: string; tracking_url: string } | null>(null);
  const [token, setToken] = useState('');

  // États pour la connexion et le changement de mot de passe obligatoire
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdChangeError, setPwdChangeError] = useState('');
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState('');

  useEffect(() => {
    let disposed = false;
    async function load() {
      try {
        const configuration = await responseData(await fetch('/api/candidature', { cache: 'no-store' }));
        if (disposed) return;
        setIntakes(configuration.intakes || []);
        setYear(configuration.year?.name || '');

        if (tracking) {
          const access = new URLSearchParams(window.location.hash.slice(1)).get('access');
          if (access) {
            window.history.replaceState(null, '', window.location.pathname);
            await responseData(
              await fetch('/api/candidate-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: access }),
              })
            );
          }
          try {
            const value = (await responseData(
              await fetch('/api/candidate-dossier', { cache: 'no-store' })
            )) as CandidateDossier;
            if (!disposed && value?.application) {
              setDossier(value);
              setYear(value.application.academic_year_name || '');
              const current = configuration.intakes.filter(
                (item: WebsiteIntake) => item.academic_year_id === value.application.academic_year_id
              ) as WebsiteIntake[];
              if (value.application.intake_id && !current.some(item => item.id === value.application.intake_id)) {
                current.push({
                  id: value.application.intake_id,
                  academic_year_id: value.application.academic_year_id,
                  level_id: value.application.intake_level_id || '',
                  program_id: value.application.intake_program_id || '',
                  label: value.application.intake_label || 'Formation du dossier',
                  active: false,
                  version: 1,
                  required_documents: value.application.required_documents || [],
                });
              }
              setIntakes(current);
            }
          } catch {
            // Non connecté : affichera le formulaire de connexion
          }
        } else {
          const stored = sessionStorage.getItem('escen:candidature:request') || newToken();
          sessionStorage.setItem('escen:candidature:request', stored);
          if (!disposed) setToken(stored);
        }
      } catch (err) {
        if (!disposed) setError(err instanceof Error ? err.message : 'Le dossier est indisponible.');
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    void load();
    return () => {
      disposed = true;
    };
  }, [tracking]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLoginError('');
    try {
      const result = await responseData(
        await fetch('/api/candidate-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: loginIdentifier.trim(),
            password: loginPassword,
          }),
        })
      );

      if (result.must_change_password) {
        setMustChangePassword(true);
      }

      const val = (await responseData(
        await fetch('/api/candidate-dossier', { cache: 'no-store' })
      )) as CandidateDossier;
      setDossier(val);
      setYear(val.application.academic_year_name || '');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Connexion impossible. Vérifiez vos identifiants.');
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setPwdChangeError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdChangeError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    setPwdChangeError('');
    try {
      await responseData(
        await fetch('/api/candidate-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'change_password',
            current_password: loginPassword,
            new_password: newPassword,
          }),
        })
      );
      setMustChangePassword(false);
      setPwdChangeSuccess('Votre mot de passe personnel a été enregistré avec succès !');
      setTimeout(() => setPwdChangeSuccess(''), 5000);
    } catch (err) {
      setPwdChangeError(err instanceof Error ? err.message : 'Échec de la mise à jour du mot de passe.');
    } finally {
      setBusy(false);
    }
  }

  async function save(application: IntakeInput, files: FormData) {
    setBusy(true);
    setError('');
    try {
      if (tracking && dossier) {
        let current = dossier;
        if (Array.from(files.keys()).length) {
          files.append('version', String(current.application.version));
          current = await responseData(await fetch('/api/candidate-dossier', { method: 'POST', body: files }));
          setDossier(current);
        }
        const updated = await responseData(
          await fetch('/api/candidate-dossier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ application, version: current.application.version }),
          })
        );
        setDossier(updated);
        setEditing(false);
      } else {
        files.append('payload', JSON.stringify({ application, request_token: token }));
        const result = await responseData(await fetch('/api/candidature', { method: 'POST', body: files }));
        setReceipt(result);
        sessionStorage.removeItem('escen:candidature:request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  const app = dossier?.application;
  const journey = app ? admissionsJourney(app) : null;
  const candidateNext = !app
    ? ''
    : ['INCOMPLET', 'A_COMPLETER'].includes(app.workflow_stage || '')
    ? 'Complétez les éléments demandés ci-dessous, puis renvoyez votre dossier. Le chargé de clientèle vérifiera vos modifications.'
    : ['NOUVELLE', 'RECUE', 'VERIFICATION_ADMISSION', 'COMPLET'].includes(app.workflow_stage || '')
    ? 'Votre dossier est en cours de vérification par le chargé de clientèle. Vous serez informé si des informations ou des pièces sont nécessaires.'
    : ['TRANSMIS_ACADEMIE', 'ETUDE_ACADEMIQUE'].includes(app.workflow_stage || '')
    ? 'La direction académique étudie votre candidature. Vous recevrez sa décision dans cet espace.'
    : ['ADMISSIBLE', 'ATTENTE_PAIEMENT'].includes(app.workflow_stage || '')
    ? 'Contactez le chargé de clientèle pour régler les frais d’inscription. Votre admission devient officielle après confirmation du montant intégral reçu par ESCEN.'
    : app.workflow_stage === 'REFUSE'
    ? 'La décision est disponible dans vos courriers ci-dessous.'
    : app.student_id
    ? 'Votre admission est officielle et votre dossier étudiant est créé.'
    : 'Votre admission est officielle. Le chargé de clientèle prépare votre dossier étudiant.';

  return (
    <main className="candidate-public-page">
      <header className="candidate-public-header">
        <SchoolLogo className="header-school-logo" />
        <div>
          <strong>ESCEN</strong>
          <p>{tracking ? 'Mon espace candidat' : 'Candidature en ligne'}{year ? ` · ${year}` : ''}</p>
        </div>
      </header>

      <div className="candidate-public-content">
        {loading ? (
          <LoadingState label="Ouverture de votre espace…" />
        ) : receipt ? (
          <section className="card" role="status" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderTop: '4px solid #01b4d5' }}>
            <h1 style={{ fontSize: '1.4rem', color: '#0f4c81', marginBottom: '0.75rem', fontWeight: 700 }}>Votre candidature est reçue avec succès</h1>
            <div style={{ background: '#f0f9ff', borderLeft: '4px solid #01b4d5', border: '1px solid #bae6fd', padding: '1.25rem', borderRadius: '6px', maxWidth: '440px', margin: '1rem auto', textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#0369a1', fontWeight: 700, letterSpacing: '0.5px' }}>Référence officielle de votre dossier</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f4c81', marginTop: '0.25rem', fontFamily: 'monospace' }}>{receipt.reference}</div>
              <div style={{ fontSize: '0.85rem', color: '#075985', marginTop: '0.4rem' }}>Mot de passe initial temporaire : <strong style={{ color: '#0f4c81', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>Escen2026!</strong></div>
            </div>
            <p className="cell-sub" style={{ maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Vous pouvez vous connecter à votre Espace Candidat dès maintenant pour suivre votre dossier. À votre première connexion, il vous sera demandé de créer votre mot de passe personnel.
            </p>
            <Link className="btn btn-primary" href="/candidature/suivi">
              Accéder à mon espace candidat
            </Link>
          </section>
        ) : app && !editing ? (
          <>
            {/* Bannière de succès après modification du mot de passe */}
            {pwdChangeSuccess && (
              <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '1rem', marginBottom: '1rem' }}>
                ✓ {pwdChangeSuccess}
              </div>
            )}

            {/* Modal obligatoire pour la 1ère connexion si le mot de passe doit être changé */}
            {mustChangePassword && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderLeft: '4px solid #01b4d5', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', color: '#0f4c81', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
                  Première connexion : Sécurisez votre espace candidat
                </h2>
                <p className="cell-sub" style={{ margin: '0 0 1rem 0', color: '#0369a1' }}>
                  Pour protéger vos données personnelles, veuillez définir dès maintenant votre mot de passe personnel définitif (8 caractères minimum).
                </p>

                {pwdChangeError && (
                  <div className="restricted-box" role="alert" style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: 0, color: '#dc2626' }}>{pwdChangeError}</p>
                  </div>
                )}

                <form onSubmit={handleChangePassword} style={{ maxWidth: '400px' }}>
                  <label className="form-group">
                    <span>Nouveau mot de passe personnel</span>
                    <input
                      type="password"
                      className="input"
                      required
                      minLength={8}
                      placeholder="Au moins 8 caractères"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <label className="form-group">
                    <span>Confirmer le mot de passe</span>
                    <input
                      type="password"
                      className="input"
                      required
                      minLength={8}
                      placeholder="Confirmez votre mot de passe"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: '#01b4d5', borderColor: '#01b4d5', color: '#ffffff', fontWeight: 600 }}
                    disabled={busy || newPassword.length < 8 || newPassword !== confirmPassword}
                  >
                    {busy ? 'Enregistrement…' : 'Enregistrer mon mot de passe'}
                  </button>
                </form>
              </div>
            )}

            <section className="card">
              <h1>{app.identity.prenom} {app.identity.nom}</h1>
              <p>Référence : <strong>{app.reference}</strong></p>
              <p className="pill">{stageLabel(app)}</p>
              <p>{app.intake_label}</p>
              {journey && (
                <ol className="admissions-stepper" aria-label="Étapes de ma candidature">
                  {ADMISSIONS_STEPS.map((label, index) => (
                    <li
                      key={label}
                      aria-current={index === journey.step ? 'step' : undefined}
                      className={index === journey.step ? 'admissions-step-current' : index < journey.step ? 'admissions-step-done' : ''}
                    >
                      <span>{index + 1}</span>
                      {label}
                    </li>
                  ))}
                </ol>
              )}
              <div className="admission-next-action">
                <h2>La suite pour vous</h2>
                <p>{candidateNext}</p>
              </div>
              {app.requested_changes && (
                <div className="restricted-box">
                  <h2>Éléments à compléter</h2>
                  <p className="candidate-preserve-text">{app.requested_changes}</p>
                </div>
              )}
              {['NOUVELLE', 'RECUE', 'INCOMPLET', 'A_COMPLETER'].includes(app.workflow_stage || '') && (
                <button className="btn btn-primary" onClick={() => setEditing(true)}>
                  Compléter mon dossier
                </button>
              )}
              {app.registration_fee_due !== null && (
                <p>
                  Frais d’inscription : {Number(app.registration_fee_due).toLocaleString('fr-FR')} FCFA · Confirmé : {Number(app.registration_fee_paid).toLocaleString('fr-FR')} FCFA.
                </p>
              )}
              {(app.workflow_stage === 'ADMISSIBLE' || app.workflow_stage === 'ATTENTE_PAIEMENT') && (
                <p>
                  L’admissibilité est sous réserve du règlement des frais d’inscription. Votre admission sera officielle après confirmation du paiement par ESCEN.
                </p>
              )}
              {(app.workflow_stage === 'ADMIS_OFFICIEL' || Boolean(app.student_id)) && (
                <div className="restricted-box" style={{ marginTop: 16 }}>
                  <h2>Félicitations, votre admission est officielle !</h2>
                  <p>Vos accès officiels ont été activés. Vous pouvez dès à présent vous connecter à votre Espace Étudiant et à vos outils Microsoft 365.</p>
                  <div style={{ marginTop: 12, marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Link href="/" className="btn btn-primary">Se connecter à mon Espace Étudiant</Link>
                    <a href="https://office.com" target="_blank" rel="noreferrer" className="btn btn-outline">Ouvrir Microsoft 365 (Office, Teams)</a>
                  </div>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    Vos identifiants officiels (matricule et email institutionnel @escen.university) vous ont été transmis par email sur <strong>{app.identity.email}</strong>.
                  </p>
                </div>
              )}
            </section>
            <section className="card">
              <h2>Suivi de mon dossier</h2>
              <ol className="candidate-history">
                {app.events.map(event => (
                  <li key={event.id}>
                    <strong>{new Date(event.created_at).toLocaleString('fr-FR')}</strong>
                    <p>{event.reason}</p>
                  </li>
                ))}
              </ol>
            </section>
            <section className="card">
              <h2>Mes documents</h2>
              {app.documents.length ? (
                <ul>
                  {app.documents.map(doc => (
                    <li key={doc.id}>
                      {DOCUMENT_LABELS[doc.document_key] || doc.document_key} · {doc.filename}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Aucune pièce déposée. Vous pourrez compléter votre dossier si l’admission le demande.</p>
              )}
            </section>
            <section className="card">
              <h2>Mes courriers</h2>
              {app.letters.length ? (
                app.letters.map(letter => (
                  <p key={letter.id}>
                    <a className="btn btn-outline" href={`/api/candidate-dossier?letter=${letter.id}`} target="_blank" rel="noreferrer">
                      Ouvrir {letter.kind === 'ADMISSIBILITE' ? 'la lettre d’admissibilité' : letter.kind === 'REFUS' ? 'la lettre de refus' : 'la confirmation d’admission'}
                    </a>
                  </p>
                ))
              ) : (
                <p>Les décisions et courriers apparaîtront ici.</p>
              )}
            </section>
            <button
              className="btn btn-outline"
              onClick={async () => {
                await fetch('/api/candidate-session', { method: 'DELETE' });
                setDossier(null);
                setMustChangePassword(false);
              }}
            >
              Me déconnecter
            </button>
          </>
        ) : (!tracking || editing) && intakes.length ? (
          <section className="card">
            <h1>{editing ? 'Compléter ma candidature' : 'Déposer ma candidature'}</h1>
            <ApplicationIntakeForm
              initial={app}
              intakes={intakes}
              busy={busy}
              error={error}
              onSave={save}
              title={editing ? 'Renvoyer mon dossier à l’admission' : 'Confirmer l’envoi de ma candidature'}
            />
            {editing && (
              <button disabled={busy} className="btn btn-outline" onClick={() => setEditing(false)}>
                Revenir au suivi
              </button>
            )}
          </section>
        ) : (
          /* FORMULAIRE DE CONNEXION CANDIDAT */
          <section className="card" style={{ maxWidth: '440px', margin: '2rem auto', padding: '2.25rem 2rem', borderTop: '4px solid #01b4d5', boxShadow: '0 4px 16px rgba(15, 76, 129, 0.08)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ maxWidth: '200px', margin: '0 auto 12px' }}>
                <SchoolLogo priority className="candidate-portal-card-logo" />
              </div>
              <h1 style={{ fontSize: '1.4rem', color: '#0f4c81', margin: '0 0 0.5rem 0', fontWeight: 700 }}>Espace Candidat</h1>
              <p className="cell-sub" style={{ margin: 0, color: '#64748b' }}>
                Accédez au suivi de votre candidature et à vos courriers officiels.
              </p>
            </div>

            {loginError && (
              <div className="restricted-box" role="alert" style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: 0, color: '#dc2626' }}>{loginError}</p>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <label className="form-group">
                <span>Adresse e-mail ou Référence</span>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="ex. darylggt23@gmail.com ou WEB-..."
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  disabled={busy}
                  autoFocus
                />
              </label>

              <label className="form-group">
                <span>Mot de passe</span>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    required
                    placeholder="Votre mot de passe"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: '#64748b',
                    }}
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </label>

              <div style={{ background: '#f0f9ff', padding: '12px 14px', borderRadius: '6px', border: '1px solid #bae6fd', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#075985', lineHeight: 1.5 }}>
                <strong style={{ color: '#0f4c81' }}>Première connexion :</strong><br />
                Utilisez le mot de passe initial : <code style={{ fontWeight: 700, color: '#0f4c81', background: '#e0f2fe', padding: '2px 6px', borderRadius: '3px' }}>Escen2026!</code>. Vous créerez votre mot de passe personnel dès votre entrée.
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontWeight: 700, background: '#01b4d5', borderColor: '#01b4d5', color: '#ffffff', fontSize: '0.95rem' }}
                disabled={busy || !loginIdentifier.trim() || !loginPassword}
              >
                {busy ? 'Connexion en cours…' : 'Accéder à mon espace candidat'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', fontSize: '0.85rem' }}>
              <Link href="/candidature" style={{ color: '#01b4d5', textDecoration: 'none', fontWeight: 600 }}>
                ← Déposer une nouvelle candidature
              </Link>
            </div>
          </section>
        )}

        {error && app && !editing && <p role="alert" className="restricted-box">{error}</p>}
      </div>
    </main>
  );
}
