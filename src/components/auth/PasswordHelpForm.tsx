'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/hooks/usePortal';
export default function PasswordHelpForm() {
  const state = usePortal(); const [email, setEmail] = useState(''); const [feedback, setFeedback] = useState(''); const [done, setDone] = useState(false);
  return <div className="auth-form-card"><Link className="auth-back-link" href="/connexion">Retour à la connexion</Link><h2>Mot de passe oublié</h2><p className="auth-form-description">Indiquez votre adresse email pour préparer une demande d’aide auprès du service informatique.</p>
    {!done ? <form onSubmit={event => { event.preventDefault(); try { state.requestAccessHelp(email); setDone(true); setFeedback('Votre demande est enregistrée dans la démonstration. Aucun email n’est envoyé dans cette version.'); } catch (error) { setFeedback(error instanceof Error ? error.message : 'Demande impossible.'); } }}><label className="form-group">Adresse email<input required className="input" type="email" maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label><button className="btn btn-primary auth-submit">Demander de l’aide</button></form> : <Link className="btn btn-primary auth-submit" href="/connexion">Revenir à la connexion</Link>}
    {feedback && <div className={done ? 'info-box mt-2' : 'auth-error'} role={done ? 'status' : 'alert'}>{feedback}</div>}
    <p className="auth-help-note">Pour tester l’interface, les identifiants de démonstration sont disponibles sur la page de connexion.</p>
  </div>;
}
