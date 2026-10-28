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
      if (!controller.signal.aborted) { setSupport(result); setYearId(result.currentYearId || ''); }
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
      if (!controller.signal.aborted) setData(profile);
    })().catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [authReady, session, retry, router]);
  if (portal.authError) return <SessionRecovery message={portal.authError} onRetry={portal.retryAuthentication} onExit={portal.logout} />;
  if (!portal.authReady) return <div className="auth-form-card"><LoadingState label="Vérification de votre accès…" /></div>;
  if (!portal.session) return <div className="auth-form-card"><h2>Connexion requise</h2><Link href="/connexion">Se connecter</Link></div>;
  if (finishing) return <div className="auth-form-card"><LoadingState label="Vérification enregistrée. Ouverture de votre tableau de bord…" /></div>;
  if (!data) return <div className="auth-form-card">{error ? <><p role="alert">{error}</p><button className="btn btn-primary" onClick={() => setRetry(value => value + 1)}>Réessayer</button></> : <LoadingState label="Chargement de vos informations…" />}</div>;
  const fields = [{ label: 'Nom', value: data.profile.lastname }, { label: 'Prénoms', value: data.profile.firstname }, { label: 'Email', value: data.profile.email }, { label: 'Téléphone', value: data.profile.phone }];
  return <div className="auth-form-card"><span className="auth-eyebrow">PREMIÈRE CONNEXION · ÉTAPE 2 SUR 2</span><h2>Vérifiez vos informations</h2>
    <p className="auth-form-description">Votre mot de passe a été modifié. Vérifiez maintenant les informations enregistrées dans votre dossier.</p>
    <ReviewedForm busy={busy} error={error} fields={[...fields, { label: 'Vérification', value: decision === 'CONFIRM' ? 'Informations confirmées' : 'Erreur signalée' }, ...(decision === 'REPORT' ? [{ label: 'Informations à corriger', value: details }, { label: 'Année du signalement', value: support?.years.find(year => year.id === yearId)?.name || '' }] : [])]}
      confirmLabel={decision === 'CONFIRM' ? 'Confirmer mes informations' : 'Transmettre le signalement et continuer'}
      consequence={decision === 'CONFIRM' ? 'Votre vérification sera enregistrée et vous pourrez accéder à votre tableau de bord.' : 'Une demande sera transmise au centre de support. Vos informations officielles restent inchangées jusqu’à leur correction par une personne habilitée. Vous pourrez accéder à votre tableau de bord.'}
      validate={() => decision === 'REPORT' && (details.trim().length < 3 || !yearId || !support?.years.some(year => year.id === yearId)) ? 'Décrivez les informations à corriger et choisissez une année autorisée.' : null}
      onConfirm={() => {
        setBusy(true); setError('');
        void (async () => {
          const { data: auth } = await getSupabaseBrowserClient().auth.getSession();
          if (!auth.session) throw new Error('Reconnectez-vous pour continuer.');
          const response = await fetch('/api/session/first-login', { method: 'POST', headers: { Authorization: `Bearer ${auth.session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision, snapshot: data.snapshot, ...(decision === 'REPORT' ? { details, yearId } : {}) }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'La vérification n’a pas été enregistrée.');
          setFinishing(true); portal.refreshCampus(); portal.retryAuthentication();
        })().catch(cause => setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')).finally(() => setBusy(false));
      }}>
      <dl className="record-details-grid">{fields.map(field => <div key={field.label}><dt>{field.label}</dt><dd>{field.value || 'Non renseigné'}</dd></div>)}</dl>
      <fieldset><legend>Ces informations sont-elles correctes ?</legend>
        <label className="form-group"><span><input type="radio" name="profile-decision" checked={decision === 'CONFIRM'} onChange={() => setDecision('CONFIRM')} /> Oui, mes informations sont correctes</span></label>
        <label className="form-group"><span><input type="radio" name="profile-decision" checked={decision === 'REPORT'} onChange={() => setDecision('REPORT')} /> Non, je souhaite signaler une erreur</span></label>
      </fieldset>
      {decision === 'REPORT' && <><label className="form-group">Informations à corriger<textarea className="input" required minLength={3} maxLength={1000} value={details} onChange={event => setDetails(event.target.value)} /></label>
        {supportError ? <div role="alert">{supportError}<button type="button" className="btn btn-outline" onClick={() => setSupportRetry(value => value + 1)}>Réessayer le chargement des années</button></div>
          : !support ? <LoadingState compact label="Chargement des années autorisées…" />
            : support.years.length === 0 ? <p role="alert">Aucune année ne vous est encore attribuée pour transmettre ce signalement. Contactez l’administration ESCEN.</p>
              : <label className="form-group">Année du signalement<select className="select-input" required value={yearId} onChange={event => setYearId(event.target.value)}><option value="">Choisir une année</option>{support.years.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>}
      </>}
      <button className="btn btn-primary auth-submit">Vérifier avant de confirmer</button>
    </ReviewedForm>
  </div>;
}
