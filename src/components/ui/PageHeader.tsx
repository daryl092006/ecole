import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <header className="page-intro">
      <div className="page-header-copy">
        {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="btn-group page-header-actions">{children}</div>}
    </header>
  );
}
