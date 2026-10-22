import { LoaderCircle } from 'lucide-react';

export interface LoadingStateProps {
  label?: string;
  compact?: boolean;
  variant?: 'default' | 'table' | 'cards' | 'inline';
  rows?: number;
}

export default function LoadingState({
  label = 'Chargement des données…',
  compact = false,
  variant = 'default',
  rows = 3,
}: LoadingStateProps) {
  if (compact || variant === 'inline') {
    return (
      <section
        className="loading-state loading-state-compact"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="loading-state-heading">
          <LoaderCircle className="loading-spinner" size={18} aria-hidden="true" />
          <strong>{label}</strong>
        </div>
      </section>
    );
  }

  if (variant === 'cards') {
    return (
      <section
        className="loading-state loading-state-cards-view"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="loading-state-heading">
          <LoaderCircle className="loading-spinner" size={22} aria-hidden="true" />
          <strong>{label}</strong>
        </div>
        <p>Veuillez patienter, les informations sont en cours de récupération.</p>
        <div className="loading-cards-grid" aria-hidden="true">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="loading-card-skeleton">
              <div className="skeleton-bar skeleton-title" />
              <div className="skeleton-bar skeleton-metric" />
              <div className="skeleton-bar skeleton-subtitle" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (variant === 'table') {
    return (
      <section
        className="loading-state loading-state-table-view"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="loading-state-heading">
          <LoaderCircle className="loading-spinner" size={22} aria-hidden="true" />
          <strong>{label}</strong>
        </div>
        <p>Veuillez patienter, les informations sont en cours de récupération.</p>
        <div className="loading-table-skeleton" aria-hidden="true">
          <div className="skeleton-table-head">
            <span style={{ width: '25%' }} />
            <span style={{ width: '35%' }} />
            <span style={{ width: '20%' }} />
            <span style={{ width: '20%' }} />
          </div>
          {Array.from({ length: Number.isFinite(rows) ? Math.max(1, Math.min(10, Math.floor(rows))) : 3 }, (_, i) => (
            <div key={i} className="skeleton-table-row">
              <span style={{ width: '28%' }} />
              <span style={{ width: '40%' }} />
              <span style={{ width: '15%' }} />
              <span style={{ width: '17%' }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="loading-state"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-state-heading">
        <LoaderCircle className="loading-spinner" size={24} aria-hidden="true" />
        <strong>{label}</strong>
      </div>
      <p>Veuillez patienter, les informations sont en cours de récupération.</p>
      <div className="loading-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
