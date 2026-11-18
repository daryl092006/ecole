import type { ReactNode } from 'react';

interface SummaryItem {
  label: string;
  value: ReactNode;
  description: string;
  icon: ReactNode;
  tone?: 'primary' | 'warning';
}

/** Shared, responsive overview for connected workspace pages. */
export default function WorkspaceSummary({ label, items }: { label: string; items: SummaryItem[] }) {
  return <section className="workspace-summary" aria-label={label}>
    {items.map(item => <div key={item.label} className={`workspace-summary-card${item.tone ? ` workspace-summary-${item.tone}` : ''}`}>
      <span className="workspace-summary-icon" aria-hidden="true">{item.icon}</span>
      <div><span className="workspace-summary-label">{item.label}</span><strong>{item.value}</strong><span className="workspace-summary-description">{item.description}</span></div>
    </div>)}
  </section>;
}
