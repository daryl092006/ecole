'use client';
import { useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
export default function PasswordHelpForm() {
  const [email, setEmail] = useState(''); const [feedback, setFeedback] = useState(''); const [done, setDone] = useState(false); const [submitting, setSubmitting] = useState(false);
  return <div className="auth-form-card"><Link className="auth-back-link" href="/connexion">Retour à la connexion</Link><h2>Mot de passe oublié</h2><p className="auth-form-description">Indiquez l’adresse email de votre compte. Si elle est reconnue, vous recevrez un lien pour choisir un nouveau mot de passe.</p>
    {!done ? <form onSubmit={event => { event.preventDefault(); setSubmitting(true); void (async () => { const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/mot-de-passe-reinitialiser` }); if (error) throw error; })().then(() => { setDone(true); setFeedback('Si cette adresse correspond à un compte, un lien de réinitialisation sera envoyé.'); }).catch(() => { setFeedback('La demande n’a pas pu être envoyée. Vérifiez la configuration du service de courriel ou contactez l’administration.'); }).finally(() => setSubmitting(false)); }}><label className="form-group">Adresse email<input required className="input" type="email" maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label><button className="btn btn-primary auth-submit" disabled={submitting}>{submitting ? 'Envoi…' : 'Recevoir un lien de réinitialisation'}</button></form> : <Link className="btn btn-primary auth-submit" href="/connexion">Revenir à la connexion</Link>}
    {feedback && <div className={done ? 'info-box mt-2' : 'auth-error'} role={done ? 'status' : 'alert'}>{feedback}</div>}
  </div>;
}
