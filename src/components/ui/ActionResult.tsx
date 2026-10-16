'use client';

import IconButton from '@/components/ui/IconButton';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface Props { title: string; children: ReactNode; href?: string; nextLabel?: string; onNext?: () => void; onDismiss?: () => void; }
export default function ActionResult({ title, children, href, nextLabel, onNext, onDismiss }: Props) {
  return <section className="action-result" role="status" aria-label="Résultat de l’opération"><div><strong>{title}</strong><p>{children}</p></div><div className="btn-group">{href && nextLabel && <Link className="btn btn-outline" href={href}>{nextLabel}</Link>}{onNext && nextLabel && <button className="btn btn-outline" type="button" onClick={onNext}>{nextLabel}</button>}{onDismiss && <IconButton className="btn btn-outline" type="button" onClick={onDismiss} label="Fermer" />}</div></section>;
}
