'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
export default function PasswordHelpForm() {
  const [email, setEmail] = useState(''); const [feedback, setFeedback] = useState(''); const [done, setDone] = useState(false); const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  async function requestReset() {
    if (pending.current) return;
    pending.current = true; setSubmitting(true); setFeedback('');
    try {
      const client = getSupabaseBrowserClient();
      const { error: logoutError } = await client.auth.signOut({ scope: 'local' });
      if (logoutError) throw logoutError;
      const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/mot-de-passe-reinitialiser` });
      if (error) throw error;
      setDone(true);
      setFeedback('Demande enregistrée. Consultez votre boîte mail et vos courriers indésirables. Pour protéger les comptes, nous ne précisons pas si cette adresse est enregistrée. Si elle l’est, vous recevrez un lien pour choisir un nouveau mot de passe.');
    } catch {
      setFeedback('La demande n’a pas pu être envoyée. Réessayez ou contactez l’administration.');
    } finally { pending.current = false; setSubmitting(false); }
  }
  return <div className="auth-form-card"><Link className="auth-back-link" href="/connexion">Retour à la connexion</Link><h2>Mot de passe oublié</h2><p className="auth-form-description">Indiquez l’adresse email de votre compte. Si elle est reconnue, vous recevrez un lien pour choisir un nouveau mot de passe.</p>
    {!done ? <form aria-busy={submitting} onSubmit={event => { event.preventDefault(); void requestReset(); }}><label className="form-group">Adresse email<input required disabled={submitting} className="input" type="email" maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label><button className="btn btn-primary auth-submit" disabled={submitting}>{submitting ? 'Envoi…' : 'Recevoir un lien de réinitialisation'}</button></form> : <Link className="btn btn-primary auth-submit" href="/connexion">Revenir à la connexion</Link>}
    {feedback && <div className={done ? 'info-box mt-2' : 'auth-error'} role={done ? 'status' : 'alert'}>{feedback}</div>}
  </div>;
}
