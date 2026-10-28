'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import LoadingState from '@/components/ui/LoadingState';
import SessionRecovery from './SessionRecovery';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePortal } from '@/hooks/usePortal';

export default function RequiredPasswordChangeForm() {
  const state = usePortal();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const [waitingForProfile, setWaitingForProfile] = useState(false);
  useEffect(() => {
    if (waitingForProfile && state.session?.mustVerifyProfile) router.replace('/premiere-connexion');
  }, [waitingForProfile, state.session?.mustVerifyProfile, router]);

  if (state.authError) return <SessionRecovery message={state.authError} onRetry={state.retryAuthentication} onExit={state.logout} />;
  if (!state.authReady) return <div className="auth-form-card"><LoadingState label="Vérification de votre accès…" /></div>;
  if (!state.session) return <div className="auth-form-card"><h2>Connexion requise</h2><p className="auth-form-description">Connectez-vous avec vos identifiants pour mettre à jour votre mot de passe.</p><Link className="btn btn-primary auth-submit" href="/connexion">Se connecter</Link></div>;
  if (waitingForProfile) return <div className="auth-form-card"><LoadingState label="Mot de passe enregistré. Ouverture de la vérification de vos informations…" /></div>;

  return <div className="auth-form-card">
    <span className="auth-eyebrow">SÉCURITÉ DU COMPTE</span><h2>Choisissez un nouveau mot de passe</h2>
    <p className="auth-form-description">Ce compte doit changer son mot de passe avant d’accéder à la plateforme.</p>
    <form onSubmit={event => {
      event.preventDefault(); if (pending.current) return; pending.current = true; setFeedback(''); setSubmitting(true);
      void (async () => {
        if (password !== confirmation) throw new Error('Les deux mots de passe ne correspondent pas.');
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error('Reconnectez-vous puis réessayez.');
        const response = await fetch('/api/session/password', {
          method: 'POST',
          headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        if (!response.ok) throw new Error('Le changement n’a pas été confirmé par le service des accès. Réessayez.');
        const result = await response.json();
        if (result.next === 'PROFILE') { setWaitingForProfile(true); state.refreshCampus(); state.retryAuthentication(); return; }
        await supabase.auth.signOut();
        router.replace('/connexion?mot-de-passe-modifie=1');
      })().catch(error => { setFeedback(error instanceof Error ? error.message : 'Mise à jour impossible.'); setSubmitting(false); }).finally(() => { pending.current = false; });
    }}>
      <label className="form-group">Nouveau mot de passe<input className="input" required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label className="form-group">Confirmer le mot de passe<input className="input" required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
      {feedback && <div className="auth-error" role="alert">{feedback}</div>}
      <button className="btn btn-primary auth-submit" disabled={submitting}>{submitting ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}</button>
    </form>
  </div>;
}
