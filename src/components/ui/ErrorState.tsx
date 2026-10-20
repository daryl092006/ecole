'use client';

import { CircleAlert, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  children?: ReactNode;
}

export default function ErrorState({
  title = 'Chargement impossible', message, onRetry,
  retryLabel = 'Réessayer', children,
}: ErrorStateProps) {
  return <section className="error-state" role="alert">
    <span className="error-state-icon" aria-hidden="true"><CircleAlert size={24} /></span>
    <div className="error-state-content">
      <h1>{title}</h1>
      <p>{message}</p>
      <div className="btn-group">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <RotateCcw size={16} aria-hidden="true" />{retryLabel}
        </button>
        {children}
      </div>
    </div>
  </section>;
}
