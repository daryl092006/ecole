import type { ReactNode } from 'react';

interface Props {
  title: string;
  label?: string;
  description?: ReactNode;
  meta?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/** A list keeps its heading, filters, content and result count in explicit slots. */
export default function DataPanel({ title, label, description, meta, toolbar, footer, children }: Props) {
  return <section className="card data-panel" aria-label={label || title}>
    <div className="card-header data-panel-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{meta && <div className="data-panel-meta">{meta}</div>}</div>
    {toolbar && <div className="data-panel-toolbar">{toolbar}</div>}
    <div className="data-panel-content">{children}</div>
    {footer && <div className="data-panel-footer" role="status">{footer}</div>}
  </section>;
}
