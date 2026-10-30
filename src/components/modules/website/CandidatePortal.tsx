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
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'La demande n’a pas pu être enregistrée.'); return data;
}
function newToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join(''); }
export default function CandidatePortal({ tracking = false }: { tracking?: boolean }) {
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [editing, setEditing] = useState(false);
  const [intakes, setIntakes] = useState<WebsiteIntake[]>([]); const [year, setYear] = useState(''); const [dossier, setDossier] = useState<CandidateDossier | null>(null);
  const [receipt, setReceipt] = useState<{ reference: string; tracking_url: string } | null>(null); const [token, setToken] = useState('');
  useEffect(() => {
    let disposed = false;
    async function load() {
      try {
        const configuration = await responseData(await fetch('/api/candidature', { cache: 'no-store' }));
        if (disposed) return; setIntakes(configuration.intakes); setYear(configuration.year?.name || '');
        if (tracking) {
          const access = new URLSearchParams(window.location.hash.slice(1)).get('access');
          if (access) { window.history.replaceState(null, '', window.location.pathname); await responseData(await fetch('/api/candidate-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: access }) })); }
          const value = await responseData(await fetch('/api/candidate-dossier', { cache: 'no-store' })) as CandidateDossier;
          if (!disposed) {
            setDossier(value); setYear(value.application.academic_year_name || '');
            const current = configuration.intakes.filter((item: WebsiteIntake) => item.academic_year_id === value.application.academic_year_id) as WebsiteIntake[];
            if (value.application.intake_id && !current.some(item => item.id === value.application.intake_id)) current.push({ id:value.application.intake_id,academic_year_id:value.application.academic_year_id,level_id:value.application.intake_level_id || '',program_id:value.application.intake_program_id || '',label:value.application.intake_label || 'Formation du dossier',active:false,version:1,required_documents:value.application.required_documents || [] });
            setIntakes(current);
          }
        } else {
          const stored = sessionStorage.getItem('escen:candidature:request') || newToken(); sessionStorage.setItem('escen:candidature:request', stored); if (!disposed) setToken(stored);
        }
      } catch (error) { if (!disposed) setError(error instanceof Error ? error.message : 'Le dossier est indisponible.'); }
      finally { if (!disposed) setLoading(false); }
    }
    void load(); return () => { disposed = true; };
  }, [tracking]);
  async function save(application: IntakeInput, files: FormData) {
    setBusy(true); setError('');
    try {
      if (tracking && dossier) {
        let current = dossier;
        if (Array.from(files.keys()).length) { files.append('version', String(current.application.version)); current = await responseData(await fetch('/api/candidate-dossier', { method: 'POST', body: files })); setDossier(current); }
        const updated = await responseData(await fetch('/api/candidate-dossier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application, version: current.application.version }) }));
        setDossier(updated); setEditing(false);
      } else {
        files.append('payload', JSON.stringify({ application, request_token: token }));
        const result = await responseData(await fetch('/api/candidature', { method: 'POST', body: files }));
        setReceipt(result); sessionStorage.removeItem('escen:candidature:request');
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Enregistrement impossible.'); } finally { setBusy(false); }
  }
  const app = dossier?.application;
  const journey = app ? admissionsJourney(app) : null;
  const candidateNext = !app ? '' : ['INCOMPLET','A_COMPLETER'].includes(app.workflow_stage || '') ? 'Complétez les éléments demandés ci-dessous, puis renvoyez votre dossier. Le chargé de clientèle vérifiera vos modifications.'
    : ['NOUVELLE','RECUE','VERIFICATION_ADMISSION','COMPLET'].includes(app.workflow_stage || '') ? 'Votre dossier est en cours de vérification par le chargé de clientèle. Vous serez informé si des informations ou des pièces sont nécessaires.'
    : ['TRANSMIS_ACADEMIE','ETUDE_ACADEMIQUE'].includes(app.workflow_stage || '') ? 'La direction académique étudie votre candidature. Vous recevrez sa décision dans cet espace.'
    : ['ADMISSIBLE','ATTENTE_PAIEMENT'].includes(app.workflow_stage || '') ? 'Contactez le chargé de clientèle pour régler les frais d’inscription. Votre admission devient officielle après confirmation du montant intégral reçu par ESCEN.'
    : app.workflow_stage === 'REFUSE' ? 'La décision est disponible dans vos courriers ci-dessous.'
    : app.student_id ? 'Votre admission est officielle et votre dossier étudiant est créé.' : 'Votre admission est officielle. Le chargé de clientèle prépare votre dossier étudiant.';
  return <main className="candidate-public-page"><header className="candidate-public-header"><SchoolLogo className="header-school-logo" /><div><strong>ESCEN</strong><p>{tracking ? 'Mon espace candidat' : 'Candidature en ligne'}{year ? ` · ${year}` : ''}</p></div></header>
    <div className="candidate-public-content">{loading ? <LoadingState label="Ouverture de votre espace…" /> : receipt ? <section className="card" role="status"><h1>Votre candidature est reçue</h1><p>Référence : <strong>{receipt.reference}</strong></p><p>Vous pouvez suivre votre dossier et ajouter les pièces manquantes depuis votre espace candidat.</p><Link className="btn btn-primary" href={receipt.tracking_url}>Ouvrir mon espace candidat</Link></section>
      : app && !editing ? <><section className="card"><h1>{app.identity.prenom} {app.identity.nom}</h1><p>Référence : {app.reference}</p><p className="pill">{stageLabel(app)}</p><p>{app.intake_label}</p>
        {journey && <ol className="admissions-stepper" aria-label="Étapes de ma candidature">{ADMISSIONS_STEPS.map((label,index) => <li key={label} aria-current={index === journey.step ? 'step' : undefined} className={index === journey.step ? 'admissions-step-current' : index < journey.step ? 'admissions-step-done' : ''}><span>{index + 1}</span>{label}</li>)}</ol>}
        <div className="admission-next-action"><h2>La suite pour vous</h2><p>{candidateNext}</p></div>
        {app.requested_changes && <div className="restricted-box"><h2>Éléments à compléter</h2><p className="candidate-preserve-text">{app.requested_changes}</p></div>}
        {['NOUVELLE','RECUE','INCOMPLET','A_COMPLETER'].includes(app.workflow_stage || '') && <button className="btn btn-primary" onClick={() => setEditing(true)}>Compléter mon dossier</button>}
        {app.registration_fee_due !== null && <p>Frais d’inscription : {Number(app.registration_fee_due).toLocaleString('fr-FR')} FCFA · Confirmé : {Number(app.registration_fee_paid).toLocaleString('fr-FR')} FCFA.</p>}
        {app.workflow_stage === 'ADMISSIBLE' || app.workflow_stage === 'ATTENTE_PAIEMENT' ? <p>L’admissibilité est sous réserve du règlement des frais d’inscription. Votre admission sera officielle après confirmation du paiement par ESCEN.</p> : null}
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
      </section><section className="card"><h2>Suivi de mon dossier</h2><ol className="candidate-history">{app.events.map(event => <li key={event.id}><strong>{new Date(event.created_at).toLocaleString('fr-FR')}</strong><p>{event.reason}</p></li>)}</ol></section>
      <section className="card"><h2>Mes documents</h2>{app.documents.length ? <ul>{app.documents.map(doc => <li key={doc.id}>{DOCUMENT_LABELS[doc.document_key] || doc.document_key} · {doc.filename}</li>)}</ul> : <p>Aucune pièce déposée. Vous pourrez compléter votre dossier si l’admission le demande.</p>}</section>
      <section className="card"><h2>Mes courriers</h2>{app.letters.length ? app.letters.map(letter => <p key={letter.id}><a className="btn btn-outline" href={`/api/candidate-dossier?letter=${letter.id}`} target="_blank" rel="noreferrer">Ouvrir {letter.kind === 'ADMISSIBILITE' ? 'la lettre d’admissibilité' : letter.kind === 'REFUS' ? 'la lettre de refus' : 'la confirmation d’admission'}</a></p>) : <p>Les décisions et courriers apparaîtront ici.</p>}</section>
      <button className="btn btn-outline" onClick={async () => { await fetch('/api/candidate-session', { method: 'DELETE' }); setDossier(null); setError('Vous êtes déconnecté. Utilisez votre lien personnel pour revenir.'); }}>Me déconnecter</button></>
      : (!tracking || editing) && intakes.length ? <section className="card"><h1>{editing ? 'Compléter ma candidature' : 'Déposer ma candidature'}</h1><ApplicationIntakeForm initial={app} intakes={intakes} busy={busy} error={error} onSave={save} title={editing ? 'Renvoyer mon dossier à l’admission' : 'Confirmer l’envoi de ma candidature'} />{editing && <button disabled={busy} className="btn btn-outline" onClick={() => setEditing(false)}>Revenir au suivi</button>}</section>
      : <section className="card"><h1>{tracking ? 'Accès à mon dossier' : 'Candidatures'}</h1><p>{error || 'Aucune formation n’est actuellement ouverte aux candidatures.'}</p>{tracking && <p>Ouvrez le lien personnel reçu par mail lors de votre candidature.</p>}</section>}
      {error && app && !editing && <p role="alert" className="restricted-box">{error}</p>}
    </div></main>;
}
