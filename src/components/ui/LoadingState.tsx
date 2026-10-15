import { LoaderCircle } from 'lucide-react';
export default function LoadingState({label = 'Chargement des données…', compact = false}: {label?: string; compact?: boolean}) {
  return <section className={`loading-state${compact ? ' loading-state-compact' : ''}`} role="status" aria-live="polite" aria-busy="true"><div className="loading-state-heading"><LoaderCircle className="loading-spinner" size={24} aria-hidden="true" /><strong>{label}</strong></div>{!compact && <><p>Veuillez patienter, les informations sont en cours de récupération.</p><div className="loading-skeleton" aria-hidden="true"><span /><span /><span /></div></>}</section>;
}
