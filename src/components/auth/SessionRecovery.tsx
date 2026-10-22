'use client';

export default function SessionRecovery({ message, onRetry, onExit }: { message: string; onRetry: () => void; onExit: () => Promise<void> }) {
  return <section className="auth-form-card" role="alert">
    <h2>Vérification de connexion impossible</h2>
    <p className="auth-form-description">{message}</p>
    <div className="btn-group">
      <button type="button" className="btn btn-primary" onClick={onRetry}>Réessayer</button>
      <button type="button" className="btn btn-outline" onClick={() => { void onExit().catch(() => { /* Local access has already been cleared. */ }); }}>Utiliser un autre compte</button>
    </div>
  </section>;
}
