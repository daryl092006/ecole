'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function PasswordRecoveryForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return <div className="auth-form-card">
    <Link className="auth-back-link" href="/connexion">Retour à la connexion</Link>
    <span className="auth-eyebrow">SÉCURITÉ DU COMPTE</span><h2>Réinitialiser le mot de passe</h2>
    <form onSubmit={event => {
      event.preventDefault(); setFeedback(''); setSubmitting(true);
      void (async () => {
        if (password !== confirmation) throw new Error('Les deux mots de passe ne correspondent pas.');
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) throw new Error('Le lien est expiré ou invalide. Demandez-en un nouveau.');
        const authorization = { Authorization: `Bearer ${sessionData.session.access_token}` };
        const profileResponse = await fetch('/api/session', { headers: authorization, cache: 'no-store' });
        let mustChangePassword = false;
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          mustChangePassword = profile.mustChangePassword === true;
        }
        if (mustChangePassword) {
          const changed = await fetch('/api/session/password', {
            method: 'POST', headers: { ...authorization, 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
          });
          if (!changed.ok) throw new Error('Le changement n’a pas été confirmé par le service des accès. Réessayez.');
        } else {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
        }
        await supabase.auth.signOut();
        router.replace('/connexion?mot-de-passe-modifie=1');
      })().catch(error => { setFeedback(error instanceof Error ? error.message : 'Réinitialisation impossible.'); setSubmitting(false); });
    }}>
      <label className="form-group">Nouveau mot de passe<input className="input" required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label className="form-group">Confirmer le mot de passe<input className="input" required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
      {feedback && <div className="auth-error" role="alert">{feedback}</div>}
      <button className="btn btn-primary auth-submit" disabled={submitting}>{submitting ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}</button>
    </form>
  </div>;
}
