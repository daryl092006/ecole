import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="page-intro">
      <div>
        <h1>{title}</h1>
      </div>
      {children && <div className="btn-group">{children}</div>}
    </header>
  );
}
