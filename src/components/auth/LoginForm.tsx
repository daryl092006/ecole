'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import LoadingState from '@/components/ui/LoadingState';
import SessionRecovery from './SessionRecovery';
import { postLoginPath } from '@/permissions/navigation';
export default function LoginForm() {
  const state = usePortal(); const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const pending = useRef(false);
  const alert = useRef<HTMLDivElement>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [visible, setVisible] = useState(false); const [feedback, setFeedback] = useState(''); const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (state.authReady && state.session && !submitting && !state.authError) router.replace(state.session.mustChangePassword ? '/mot-de-passe-modifier' : postLoginPath(new URLSearchParams(window.location.search).get('retour') || undefined, state.activeRole));
  }, [state.session, state.activeRole, state.authReady, state.authError, submitting, router]);
  useEffect(() => { setPasswordUpdated(new URLSearchParams(window.location.search).get('mot-de-passe-modifie') === '1'); }, []);
  useEffect(() => { if (feedback) alert.current?.focus(); }, [feedback]);
  if (state.authError) return <SessionRecovery message={state.authError} onRetry={state.retryAuthentication} onExit={state.logout} />;
  if (!state.authReady) return <div className="auth-form-card"><LoadingState label="Vérification de votre connexion…" /></div>;
  return <div className="auth-form-card"><span className="auth-eyebrow">VOTRE ESPACE ESCEN</span><h2>Connexion</h2><p className="auth-form-description">Connectez-vous pour accéder à votre espace de travail.</p>
    {passwordUpdated && <p className="info-box" role="status">Votre mot de passe a été modifié. Connectez-vous avec votre nouveau mot de passe.</p>}
    {state.authNotice && !feedback && <p className="auth-error" role="alert">{state.authNotice}</p>}
    <form aria-busy={submitting} onSubmit={event => { event.preventDefault(); if (pending.current) return; pending.current = true; setFeedback(''); setSubmitting(true);
      void state.login(email, password, new URLSearchParams(window.location.search).get('retour') || undefined).then(() => setPassword('')).catch(error => { setFeedback(error instanceof Error ? error.message : 'Connexion impossible.'); }).finally(() => { pending.current = false; setSubmitting(false); });
    }}>
      <fieldset className="reviewed-form-fields" disabled={submitting}><label className="form-group">Adresse email<input className="input" type="email" required maxLength={254} autoComplete="username" placeholder="votre.adresse@etablissement.tg" value={email} onChange={event => { setEmail(event.target.value); setFeedback(''); }} /></label>
      <label className="form-group">Mot de passe<div className="password-field"><input className="input" required type={visible ? 'text' : 'password'} maxLength={128} autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setFeedback(''); }} /><button type="button" className="password-toggle" aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
      </fieldset><div className="auth-form-options"><Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link></div>
      {feedback && <div ref={alert} tabIndex={-1} className="auth-error" role="alert">{feedback}</div>}
      <button className="btn btn-primary auth-submit" disabled={submitting}>{submitting ? 'Connexion…' : 'Se connecter'}</button>
    </form>
  </div>;
}
