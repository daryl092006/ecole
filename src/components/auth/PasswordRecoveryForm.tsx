'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { clearPasswordRecovery, passwordRecoverySession } from '@/lib/supabase/passwordRecovery';
import LoadingState from '@/components/ui/LoadingState';

export default function PasswordRecoveryForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [linkState, setLinkState] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const pending = useRef(false);
  const cleanup = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(cleanup.current);
    let cancelled = false;
    void passwordRecoverySession().then(() => { if (!cancelled) setLinkState('valid'); }).catch(() => { if (!cancelled) setLinkState('invalid'); });
    return () => { cancelled = true; cleanup.current = setTimeout(clearPasswordRecovery, 0); };
  }, []);

  if (linkState === 'loading') return <div className="auth-form-card"><LoadingState label="Vérification du lien de réinitialisation…" /></div>;
  if (linkState === 'invalid') return <div className="auth-form-card"><h2>Lien de réinitialisation invalide</h2><p role="alert">Ce lien est absent, expiré ou déjà utilisé. Demandez un nouveau lien pour choisir votre mot de passe.</p><Link className="btn btn-primary auth-submit" href="/mot-de-passe-oublie">Demander un nouveau lien</Link></div>;

  return <div className="auth-form-card">
    <Link className="auth-back-link" href="/connexion" onClick={clearPasswordRecovery}>Retour à la connexion</Link>
    <span className="auth-eyebrow">SÉCURITÉ DU COMPTE</span><h2>Réinitialiser le mot de passe</h2>
    <form onSubmit={event => {
      event.preventDefault(); if (pending.current) return; pending.current = true; setFeedback(''); setSubmitting(true);
      void (async () => {
        if (password !== confirmation) throw new Error('Les deux mots de passe ne correspondent pas.');
        const { client: supabase, session } = await passwordRecoverySession();
        const authorization = { Authorization: `Bearer ${session.access_token}` };
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
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw new Error('Mot de passe modifié, mais la fermeture de session a échoué. Réessayez de fermer cette page.');
        const { error: localError } = await getSupabaseBrowserClient().auth.signOut({ scope: 'local' });
        if (localError) throw new Error('Mot de passe modifié. Fermez votre session avant de vous reconnecter.');
        clearPasswordRecovery();
        router.replace('/connexion?mot-de-passe-modifie=1');
      })().catch(error => { setFeedback(error instanceof Error ? error.message : 'Réinitialisation impossible.'); }).finally(() => { pending.current = false; setSubmitting(false); });
    }}>
      <label className="form-group">Nouveau mot de passe<input className="input" required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label className="form-group">Confirmer le mot de passe<input className="input" required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
      {feedback && <div className="auth-error" role="alert">{feedback}</div>}
      <button className="btn btn-primary auth-submit" disabled={submitting}>{submitting ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}</button>
    </form>
  </div>;
}
