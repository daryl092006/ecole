'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { postLoginPath } from '@/permissions/navigation';
export default function LoginForm() {
  const state = usePortal(); const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false); const [feedback, setFeedback] = useState(''); const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (state.session && !submitting) router.replace(postLoginPath(new URLSearchParams(window.location.search).get('retour') || undefined, state.activeRole));
  }, [state.session, state.activeRole, submitting, router]);
  return <div className="auth-form-card"><span className="auth-eyebrow">VOTRE ESPACE ESCEN</span><h2>Connexion</h2><p className="auth-form-description">Connectez-vous pour accéder à votre espace de travail.</p>
    <form onSubmit={event => { event.preventDefault(); setFeedback(''); setSubmitting(true);
      void state.login(email, password, new URLSearchParams(window.location.search).get('retour') || undefined).then(() => setPassword('')).catch(error => { setFeedback(error instanceof Error ? error.message : 'Connexion impossible.'); setSubmitting(false); });
    }}>
      <label className="form-group">Adresse email<input className="input" type="email" required maxLength={254} autoComplete="username" placeholder="votre.adresse@etablissement.tg" value={email} onChange={event => { setEmail(event.target.value); setFeedback(''); }} /></label>
      <label className="form-group">Mot de passe<div className="password-field"><input className="input" required type={visible ? 'text' : 'password'} maxLength={128} autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setFeedback(''); }} /><button type="button" className="password-toggle" aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
      <div className="auth-form-options"><Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link></div>
      {feedback && <div className="auth-error" role="alert">{feedback}</div>}
      <button className="btn btn-primary auth-submit" disabled={submitting}>{submitting ? 'Connexion…' : 'Se connecter'}</button>
    </form>
  </div>;
}
