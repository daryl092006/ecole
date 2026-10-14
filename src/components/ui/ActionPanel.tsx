'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import WorkPage from './WorkPage';

const InActionPage = createContext(false);

interface ActionPanelProps {
  label: string;
  children: ReactNode;
}

export default function ActionPanel({ label, children }: ActionPanelProps) {
  const nested = useContext(InActionPage);
  const [open, setOpen] = useState(false);
  if (nested) return <details className="action-panel mb-2"><summary>{label}</summary><div className="action-panel-content">{children}</div></details>;
  return <><details className="action-panel mb-2" open={open} onToggle={event => setOpen(event.currentTarget.open)} onClick={event => { if (event.target instanceof Element && event.target.closest('summary')) { event.preventDefault(); setOpen(true); } }}>
    <summary>{label}</summary>
    {!open && <div className="action-panel-content">{children}</div>}
  </details>{open && <WorkPage title={label} onClose={() => setOpen(false)}><InActionPage.Provider value={true}>{children}</InActionPage.Provider></WorkPage>}</>;
}
