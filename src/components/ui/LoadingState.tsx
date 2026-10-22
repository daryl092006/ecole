export default function LoadingState({label = 'Chargement des données…', compact = false}: {label?: string; compact?: boolean}) {
  return (
    <section className={`loading-state${compact ? ' loading-state-compact' : ''}`} role="status" aria-live="polite" aria-busy="true">
      <span className={compact ? 'loading-state-label' : 'sr-only'}>{label}</span>
      <div className="loading-skeleton" aria-hidden="true">
        {!compact && <span className="loading-skeleton-title" />}
        <span /><span /><span />
      </div>
    </section>
  );
}
