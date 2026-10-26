'use client';

import { useState, type ReactNode } from 'react';
import WorkPage from './WorkPage';

/** Secondary information stays outside the main page's reading flow. */
export default function SecondaryDetails({ title, children, className = '', inline = false }: {
  title: string;
  children: ReactNode;
  className?: string;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (inline) return <div>{children}</div>;
  return <div className={`secondary-details ${className}`}>
    <button type="button" className="btn btn-outline" aria-haspopup="dialog" onClick={() => setOpen(true)}>{title}</button>
    {open && <WorkPage title={title} onClose={() => setOpen(false)}>{children}</WorkPage>}
  </div>;
}
