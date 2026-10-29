'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/hooks/usePortal';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { FirstLoginPage, FirstLoginSupportContext } from '@/types/firstLogin';
import { displayedPhoneNumber, isPhoneNumber } from '@/services/phoneNumberService';
import LoadingState from '@/components/ui/LoadingState';
import PhoneInput from '@/components/ui/PhoneInput';
import ReviewedForm from '@/components/ui/ReviewedForm';
import SessionRecovery from './SessionRecovery';

export default function FirstLoginForm() {
  const portal = usePortal(); const router = useRouter();
  const [data, setData] = useState<FirstLoginPage | null>(null);
  const [decision, setDecision] = useState<'CONFIRM' | 'REPORT'>('CONFIRM');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [address, setAddress] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [details, setDetails] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [support, setSupport] = useState<FirstLoginSupportContext | null>(null);
  const [yearId, setYearId] = useState(''); const [supportError, setSupportError] = useState(''); const [supportRetry, setSupportRetry] = useState(0);
  const session = portal.session; const authReady = portal.authReady;

  useEffect(() => {
    if (decision !== 'REPORT' || !session?.mustVerifyProfile) return;
    const controller = new AbortController(); setSupport(null); setSupportError('');
    void (async () => {
      const { data: auth } = await getSupabaseBrowserClient().auth.getSession();
      if (!auth.session) throw new Error('Reconnectez-vous pour continuer.');
      const response = await fetch('/api/session/first-login?support=1', { headers: { Authorization: `Bearer ${auth.session.access_token}` }, cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Les années du signalement ne peuvent pas être chargées.');
      const result = await response.json() as FirstLoginSupportContext;
      if (!controller.signal.aborted) { setSupport(result); setYearId(result.currentYearId || result.years[0]?.id || ''); }
    })().catch(cause => { if (!controller.signal.aborted) setSupportError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [decision, session?.mustVerifyProfile, session?.accountId, supportRetry]);

  useEffect(() => {
    if (!authReady || !session) return;
    if (session.mustChangePassword) { router.replace('/mot-de-passe-modifier'); return; }
    if (!session.mustVerifyProfile) { router.replace('/mon-espace'); return; }
    const controller = new AbortController();
    setError(''); setData(null);
    void (async () => {
      const { data: auth } = await getSupabaseBrowserClient().auth.getSession();
      if (!auth.session) throw new Error('Reconnectez-vous pour vérifier vos informations.');
      const response = await fetch('/api/session/first-login', { headers: { Authorization: `Bearer ${auth.session.access_token}` }, cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Vos informations ne peuvent pas être chargées. Réessayez.');
      const profile = await response.json() as FirstLoginPage;
      if (!controller.signal.aborted) {
        setData(profile);
        setFirstname(profile.profile.firstname);
        setLastname(profile.profile.lastname);
        setAddress(profile.profile.address || '');
        setPersonalEmail(profile.profile.personalEmail || '');
        setPhone(displayedPhoneNumber(profile.profile.phone));
        setBirthDate(profile.profile.birthDate || '');
      }
    })().catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [authReady, session, retry, router]);

  if (portal.authError) return <SessionRecovery message={portal.authError} onRetry={portal.retryAuthentication} onExit={portal.logout} />;
  if (!portal.authReady) return <div className="auth-form-card first-login-card"><LoadingState label="Vérification de votre accès…" /></div>;
  if (!portal.session) return <div className="auth-form-card first-login-card"><h2>Connexion requise</h2><Link href="/connexion">Se connecter</Link></div>;
  if (finishing) return <div className="auth-form-card first-login-card"><LoadingState label="Vérification enregistrée. Ouverture de votre tableau de bord…" /></div>;
  if (!data) return <div className="auth-form-card first-login-card">{error ? <><p role="alert">{error}</p><button className="btn btn-primary" onClick={() => setRetry(value => value + 1)}>Réessayer</button></> : <LoadingState label="Chargement de vos informations…" />}</div>;

  const displayBirthDate = birthDate ? new Date(birthDate + 'T00:00:00').toLocaleDateString('fr-FR') : 'À renseigner';

  const reviewFields = [
    { label: 'Nom', previous: data.profile.lastname, value: decision === 'CONFIRM' ? lastname.trim() : data.profile.lastname },
    { label: 'Prénoms', previous: data.profile.firstname, value: decision === 'CONFIRM' ? firstname.trim() : data.profile.firstname },
    ...(data.profile.programName ? [{ label: 'Filière d’inscription', value: data.profile.programName }] : []),
    { label: 'Date de naissance', previous: data.profile.birthDate ? new Date(data.profile.birthDate + 'T00:00:00').toLocaleDateString('fr-FR') : 'Non renseignée', value: decision === 'CONFIRM' ? displayBirthDate : (data.profile.birthDate ? new Date(data.profile.birthDate + 'T00:00:00').toLocaleDateString('fr-FR') : 'Non renseignée') },
    { label: 'Email de connexion', value: data.profile.email },
    ...(decision === 'CONFIRM' ? [
      { label: 'Numéro de téléphone', value: displayedPhoneNumber(phone) || 'Non renseigné' },
      { label: 'Email personnel', value: personalEmail || 'Non renseigné' },
      { label: 'Adresse géographique', value: address || 'Non renseignée' },
      { label: 'Statut de vérification', value: 'Informations confirmées' },
    ] : [
      { label: 'Statut de vérification', value: 'Erreur administrative signalée' },
      { label: 'Informations à corriger', value: details },
      { label: 'Année du signalement', value: support?.years.find(year => year.id === yearId)?.name || '' },
    ]),
  ];

  return <div className="auth-form-card first-login-card">
    <span className="auth-eyebrow">PREMIÈRE CONNEXION · ÉTAPE 2 SUR 2</span>
    <h2>Vérifiez vos informations</h2>
    <p className="auth-form-description">Vérifiez et corrigez votre nom, vos prénoms, votre date de naissance et vos coordonnées avant de confirmer.</p>
    <ReviewedForm
      busy={busy}
      error={error}
      fields={reviewFields}
      confirmLabel={decision === 'CONFIRM' ? 'Confirmer mes informations' : 'Transmettre le signalement et continuer'}
      consequence={decision === 'CONFIRM' ? 'Votre identité et vos coordonnées seront mises à jour dans votre dossier, les changements seront tracés et votre accès sera débloqué.' : 'Une demande sera transmise au centre de support. Vos informations officielles restent inchangées jusqu’à leur correction par une personne habilitée. Vous pourrez accéder à votre tableau de bord.'}
      validate={() => {
        if (decision === 'CONFIRM') {
          if (!firstname.trim() || !lastname.trim()) return 'Veuillez renseigner votre nom et vos prénoms.';
          if (!birthDate) return 'Veuillez renseigner votre date de naissance.';
          if (!displayedPhoneNumber(phone) || !isPhoneNumber(phone)) return 'Veuillez renseigner un numéro de téléphone valide avec son indicatif.';
          if (!personalEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail.trim())) return 'Veuillez renseigner une adresse email personnelle valide.';
          if (!address.trim()) return 'Veuillez renseigner votre adresse géographique (quartier, ville, rue...).';
        }
        if (decision === 'REPORT') {
          if (details.trim().length < 3) return 'Décrivez les informations administratives à corriger.';
          if (!yearId || !support?.years.some(year => year.id === yearId)) return 'Choisissez une année autorisée pour le signalement.';
        }
        return null;
      }}
      onConfirm={() => {
        setBusy(true); setError('');
        void (async () => {
          const { data: auth } = await getSupabaseBrowserClient().auth.getSession();
          if (!auth.session) throw new Error('Reconnectez-vous pour continuer.');
          const response = await fetch('/api/session/first-login', {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              decision,
              snapshot: data.snapshot,
              ...(decision === 'CONFIRM' ? {
                firstname: firstname.trim(),
                lastname: lastname.trim(),
                address: address.trim(),
                personalEmail: personalEmail.trim(),
                phone: displayedPhoneNumber(phone).trim(),
                birthDate,
              } : { details, yearId }),
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'La vérification n’a pas été enregistrée.');
          setFinishing(true); portal.refreshCampus(); portal.retryAuthentication();
        })().catch(cause => setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')).finally(() => setBusy(false));
      }}>

      <section className="first-login-identity-box" aria-label="Dossier officiel enregistré">
        <div className="first-login-section-head">
          <h3>Dossier administratif enregistré</h3>
          {session?.matricule && <span className="pill pill-default">{session.matricule}</span>}
        </div>
        {data.profile.programName && (
          <div className="first-login-program-banner">
            <span>Filière et niveau d’inscription</span>
            <strong>{data.profile.programName}</strong>
          </div>
        )}
        <dl className="first-login-identity-grid">
          <div><dt>Nom</dt><dd>{data.profile.lastname}</dd></div>
          <div><dt>Prénoms</dt><dd>{data.profile.firstname}</dd></div>
          <div><dt>Date de naissance</dt><dd>{data.profile.birthDate ? new Date(data.profile.birthDate + 'T00:00:00').toLocaleDateString('fr-FR') : 'À compléter ci-dessous'}</dd></div>
          <div><dt>Identifiant de connexion</dt><dd>{data.profile.email}</dd></div>
        </dl>
      </section>

      <fieldset className="first-login-decision-fieldset">
        <legend>Ces informations administratives sont-elles exactes ?</legend>
        <div className="first-login-decision-grid">
          <label className={`first-login-decision-card ${decision === 'CONFIRM' ? 'is-selected' : ''}`}>
            <input type="radio" name="profile-decision" checked={decision === 'CONFIRM'} onChange={() => setDecision('CONFIRM')} />
            <div>
              <strong>Vérifier et corriger mes informations personnelles</strong>
              <span>Je corrige directement mon identité et mes coordonnées avant de les confirmer.</span>
            </div>
          </label>
          <label className={`first-login-decision-card ${decision === 'REPORT' ? 'is-selected' : ''}`}>
            <input type="radio" name="profile-decision" checked={decision === 'REPORT'} onChange={() => setDecision('REPORT')} />
            <div>
              <strong>Non, je souhaite signaler une erreur administrative</strong>
              <span>Ma filière, mon niveau ou mon dossier scolaire nécessite une intervention de la scolarité.</span>
            </div>
          </label>
        </div>
      </fieldset>

      {decision === 'CONFIRM' && (
        <fieldset className="first-login-contact-fieldset">
          <legend>Identité et coordonnées à vérifier</legend>
          <label className="form-group">Nom<input className="input" required maxLength={160} autoComplete="family-name" value={lastname} onChange={event => setLastname(event.target.value)} /></label>
          <label className="form-group">Prénoms<input className="input" required maxLength={160} autoComplete="given-name" value={firstname} onChange={event => setFirstname(event.target.value)} /></label>
          {(
            <label className="form-group">
              Date de naissance
              <input className="input" type="date" required max={new Date().toISOString().slice(0, 10)} value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </label>
          )}
          <PhoneInput
            label="Numéro de téléphone"
            defaultCountry="TG-228"
            required
            value={phone}
            onChange={setPhone}
          />
          <label className="form-group">
            Adresse email personnelle
            <input className="input" type="email" required placeholder="Ex : prenom.nom@gmail.com" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} />
          </label>
          <label className="form-group">
            Adresse géographique (quartier, ville, domicile)
            <input className="input" type="text" required placeholder="Ex : Quartier Totsi, Lomé" value={address} onChange={e => setAddress(e.target.value)} />
          </label>
        </fieldset>
      )}

      {decision === 'REPORT' && (
        <fieldset className="first-login-contact-fieldset">
          <legend>Signalement au service scolarité</legend>
          <label className="form-group">
            Informations à corriger
            <textarea className="input" rows={4} required minLength={3} maxLength={1000} value={details} onChange={event => setDetails(event.target.value)} placeholder="Précisez l’erreur sur votre filière, votre niveau ou votre dossier scolaire" />
          </label>
          {supportError ? <div role="alert">{supportError}<button type="button" className="btn btn-outline" onClick={() => setSupportRetry(value => value + 1)}>Réessayer le chargement des années</button></div>
            : !support ? <LoadingState compact label="Chargement…" />
              : support.years.length === 0 ? <p role="alert">Aucune année ne vous est encore attribuée pour transmettre ce signalement. Contactez l’administration ESCEN.</p>
                : !portal.perms.scope.ownDataOnly ? <label className="form-group">Année du signalement<select className="select-input" required value={yearId} onChange={event => setYearId(event.target.value)}><option value="">Choisir une année</option>{support.years.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label> : null}
        </fieldset>
      )}

      <button className="btn btn-primary auth-submit">Vérifier avant de confirmer</button>
    </ReviewedForm>
  </div>;
}
