'use client';

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type FormEventHandler } from 'react';
import LoadingState from './LoadingState';
import DrawerActions from './DrawerActions';

export interface ReviewField { label: string; value: string; previous?: string; }
interface Props extends Omit<ComponentPropsWithoutRef<'form'>, 'onSubmit'> {
  onConfirm: FormEventHandler<HTMLFormElement>;
  fields: ReviewField[];
  consequence: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string;
  danger?: boolean;
  completionKey?: string;
  validate?: () => string | null;
  reviewInitially?: boolean;
  onCancelReview?: () => void;
}

export default function ReviewedForm({ onConfirm, fields, consequence, confirmLabel, busy = false, error, danger = false, completionKey, validate, reviewInitially = false, onCancelReview, children, ...props }: Props) {
  const [reviewing, setReviewing] = useState(reviewInitially);
  const [validationError, setValidationError] = useState('');
  const review = useRef<HTMLElement>(null);
  useEffect(() => { if (reviewing) review.current?.focus(); }, [reviewing]);
  useEffect(() => { setReviewing(reviewInitially); setValidationError(''); }, [completionKey, reviewInitially]);
  return <form {...props} aria-busy={busy} onSubmit={event => {
    event.preventDefault();
    if (busy) return;
    if (!reviewing) { const issue = validate?.(); setValidationError(issue || ''); if (!issue) setReviewing(true); return; }
    onConfirm(event);
  }}>
    {busy && <LoadingState compact label="Enregistrement en cours…" />}
    <fieldset disabled={busy} className="reviewed-form-fields"><div hidden={reviewing}>{children}</div></fieldset>
    {validationError && !reviewing && <p className="restricted-box" role="alert">{validationError}</p>}
    {reviewing && <section className="action-review" ref={review} tabIndex={-1} aria-label="Vérification avant enregistrement">
      <span className="page-eyebrow">VÉRIFIER AVANT DE CONFIRMER</span>
      <h2>{confirmLabel}</h2>
      <dl className="review-values">{fields.map(field => <div key={field.label}><dt>{field.label}</dt><dd>{field.previous !== undefined && field.previous !== field.value && <span className="review-previous">Avant : {field.previous || 'Non renseigné'}<br /></span>}{field.value || 'Non renseigné'}</dd></div>)}</dl>
      <p className="action-consequence">{consequence}</p>
      {error && <p className="restricted-box" role="alert">{error}</p>}
      <DrawerActions><button type="submit" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>{busy ? 'Enregistrement…' : confirmLabel}</button><button type="button" className="btn btn-outline" disabled={busy} onClick={() => onCancelReview ? onCancelReview() : setReviewing(false)}>Revenir aux informations</button></DrawerActions>
    </section>}
  </form>;
}
