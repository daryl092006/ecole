'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/hooks/usePortal';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { FirstLoginPage, FirstLoginSupportContext } from '@/types/firstLogin';
import LoadingState from '@/components/ui/LoadingState';
import ReviewedForm from '@/components/ui/ReviewedForm';
import SessionRecovery from './SessionRecovery';

export default function FirstLoginForm() {
  const portal = usePortal(); const router = useRouter();
  const [data, setData] = useState<FirstLoginPage | null>(null);
  const [decision, setDecision] = useState<'CONFIRM' | 'REPORT'>('CONFIRM');
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
        setAddress(profile.profile.address || '');
        setPersonalEmail(profile.profile.personalEmail || '');
        setPhone(profile.profile.phone || '');
        setBirthDate(profile.profile.birthDate || '');
      }
    })().catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [authReady, session, retry, router]);

  if (portal.authError) return <SessionRecovery message={portal.authError} onRetry={portal.retryAuthentication} onExit={portal.logout} />;
  if (!portal.authReady) return <div className="auth-form-card"><LoadingState label="Vérification de votre accès…" /></div>;
  if (!portal.session) return <div className="auth-form-card"><h2>Connexion requise</h2><Link href="/connexion">Se connecter</Link></div>;
  if (finishing) return <div className="auth-form-card"><LoadingState label="Vérification enregistrée. Ouverture de votre tableau de bord…" /></div>;
  if (!data) return <div className="auth-form-card">{error ? <><p role="alert">{error}</p><button className="btn btn-primary" onClick={() => setRetry(value => value + 1)}>Réessayer</button></> : <LoadingState label="Chargement de vos informations…" />}</div>;

  const displayBirthDate = data.profile.birthDate ? new Date(data.profile.birthDate + 'T00:00:00').toLocaleDateString('fr-FR') : (birthDate ? new Date(birthDate + 'T00:00:00').toLocaleDateString('fr-FR') : 'Non renseignée');

  const fields = [
    { label: 'Nom', value: data.profile.lastname },
    { label: 'Prénoms', value: data.profile.firstname },
    { label: 'Date de naissance', value: displayBirthDate },
    ...(data.profile.programName ? [{ label: 'Filière d’inscription', value: data.profile.programName }] : []),
    { label: 'Email de connexion', value: data.profile.email },
    { label: 'Adresse géographique', value: address || 'Non renseignée' },
    { label: 'Email personnel', value: personalEmail || 'Non renseigné' },
    { label: 'Téléphone', value: phone || 'Non renseigné' },
  ];

  return <div className="auth-form-card"><span className="auth-eyebrow">PREMIÈRE CONNEXION · ÉTAPE 2 SUR 2</span><h2>Vérifiez vos informations</h2>
    <p className="auth-form-description">Votre mot de passe a été modifié. Vérifiez vos informations officielles et complétez vos coordonnées personnelles avant d’accéder à la plateforme.</p>
    <ReviewedForm
      busy={busy}
      error={error}
      fields={[
        ...fields,
        { label: 'Vérification', value: decision === 'CONFIRM' ? 'Informations confirmées' : 'Erreur administrative signalée' },
        ...(decision === 'REPORT' ? [
          { label: 'Informations à corriger', value: details },
          { label: 'Année du signalement', value: support?.years.find(year => year.id === yearId)?.name || '' },
        ] : []),
      ]}
      confirmLabel={decision === 'CONFIRM' ? 'Confirmer mes informations' : 'Transmettre le signalement et continuer'}
      consequence={decision === 'CONFIRM' ? 'Vos coordonnées personnelles seront mises à jour dans votre dossier et votre accès sera débloqué.' : 'Une demande sera transmise au centre de support. Vos informations officielles restent inchangées jusqu’à leur correction par une personne habilitée. Vous pourrez accéder à votre tableau de bord.'}
      validate={() => {
        if (decision === 'CONFIRM') {
          if (!address.trim()) return 'Veuillez renseigner votre adresse géographique (quartier, ville, rue...).';
          if (!personalEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail.trim())) return 'Veuillez renseigner une adresse email personnelle valide.';
          if (!phone.trim()) return 'Veuillez renseigner votre numéro de téléphone.';
          if (!data.profile.birthDate && !birthDate) return 'Veuillez renseigner votre date de naissance.';
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
                address: address.trim(),
                personalEmail: personalEmail.trim(),
                phone: phone.trim(),
                ...((!data.profile.birthDate && birthDate) ? { birthDate } : {}),
              } : { details, yearId }),
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'La vérification n’a pas été enregistrée.');
          setFinishing(true); portal.refreshCampus(); portal.retryAuthentication();
        })().catch(cause => setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')).finally(() => setBusy(false));
      }}>

      <div className="card mb-3" style={{ background: 'var(--surface-sunken)', padding: '1rem', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Informations administratives enregistrées</h3>
        <dl className="record-details-grid" style={{ marginBottom: 0 }}>
          <div><dt>Nom</dt><dd>{data.profile.lastname}</dd></div>
          <div><dt>Prénoms</dt><dd>{data.profile.firstname}</dd></div>
          <div><dt>Date de naissance</dt><dd>{data.profile.birthDate ? new Date(data.profile.birthDate + 'T00:00:00').toLocaleDateString('fr-FR') : 'Non renseignée'}</dd></div>
          {data.profile.programName && <div><dt>Filière d’inscription</dt><dd><strong>{data.profile.programName}</strong></dd></div>}
          <div><dt>Email de connexion</dt><dd>{data.profile.email}</dd></div>
        </dl>
      </div>

      <fieldset style={{ border: '1px solid var(--border-subtle, #e2e8f0)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <legend style={{ fontWeight: 600, padding: '0 0.5rem' }}>Coordonnées personnelles à compléter</legend>

        {!data.profile.birthDate && (
          <label className="form-group">
            Date de naissance <span style={{ color: 'var(--danger, #dc2626)' }}>*</span>
            <input className="input" type="date" required value={birthDate} onChange={e => setBirthDate(e.target.value)} />
          </label>
        )}

        <label className="form-group">
          Adresse géographique (domicile, quartier, ville...) <span style={{ color: 'var(--danger, #dc2626)' }}>*</span>
          <input className="input" type="text" required placeholder="Ex : Quartier Totsi, Lomé" value={address} onChange={e => setAddress(e.target.value)} />
        </label>

        <label className="form-group">
          Adresse email personnelle <span style={{ color: 'var(--danger, #dc2626)' }}>*</span>
          <input className="input" type="email" required placeholder="Ex : mon.adresse@gmail.com" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} />
        </label>

        <label className="form-group">
          Numéro de téléphone <span style={{ color: 'var(--danger, #dc2626)' }}>*</span>
          <input className="input" type="tel" required placeholder="Ex : +228 90 00 00 00" value={phone} onChange={e => setPhone(e.target.value)} />
        </label>
      </fieldset>

      <fieldset><legend>Ces informations administratives sont-elles exactes ?</legend>
        <label className="form-group"><span><input type="radio" name="profile-decision" checked={decision === 'CONFIRM'} onChange={() => setDecision('CONFIRM')} /> Oui, mes informations officielles sont exactes</span></label>
        <label className="form-group"><span><input type="radio" name="profile-decision" checked={decision === 'REPORT'} onChange={() => setDecision('REPORT')} /> Non, je souhaite signaler une erreur administrative (filière, nom, date...)</span></label>
      </fieldset>

      {decision === 'REPORT' && <><label className="form-group">Informations à corriger<textarea className="input" required minLength={3} maxLength={1000} value={details} onChange={event => setDetails(event.target.value)} placeholder="Décrivez l'erreur constatée sur votre filière, nom, date de naissance..." /></label>
        {supportError ? <div role="alert">{supportError}<button type="button" className="btn btn-outline" onClick={() => setSupportRetry(value => value + 1)}>Réessayer le chargement des années</button></div>
          : !support ? <LoadingState compact label="Chargement…" />
            : support.years.length === 0 ? <p role="alert">Aucune année ne vous est encore attribuée pour transmettre ce signalement. Contactez l’administration ESCEN.</p>
              : (!portal.perms.scope.ownDataOnly && support.years.length > 1) ? <label className="form-group">Année du signalement<select className="select-input" required value={yearId} onChange={event => setYearId(event.target.value)}><option value="">Choisir une année</option>{support.years.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label> : null}
      </>}
      <button className="btn btn-primary auth-submit">Vérifier avant de confirmer</button>
    </ReviewedForm>
  </div>;
}
