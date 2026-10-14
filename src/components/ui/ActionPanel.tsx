import type { ReactNode } from 'react';

interface ActionPanelProps {
  label: string;
  children: ReactNode;
}

export default function ActionPanel({ label, children }: ActionPanelProps) {
  return <details className="action-panel mb-2">
    <summary>{label}</summary>
    <div className="action-panel-content">{children}</div>
  </details>;
}
