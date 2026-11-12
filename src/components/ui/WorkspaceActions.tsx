import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

export interface WorkspaceAction { label: string; href: string; icon: LucideIcon; description: string; }

/** Authorized destinations are supplied by the caller; presentation is shared by every role. */
export default function WorkspaceActions({ actions, label = 'Accès rapides' }: { actions: WorkspaceAction[]; label?: string }) {
  if (!actions.length) return null;
  return <section className="workspace-actions-section" aria-label={label}>
    <h2>{label}</h2>
    <nav className="workspace-actions" aria-label={label}>
      {actions.map(action => <Link href={action.href} key={action.href} className="workspace-action">
        <span className="workspace-action-icon"><action.icon size={21} aria-hidden="true" /></span>
        <div><strong>{action.label}</strong><span>{action.description}</span></div>
        <ArrowRight size={17} aria-hidden="true" />
      </Link>)}
    </nav>
  </section>;
}
