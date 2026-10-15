'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const openDialogs: string[] = [];

export default function DetailDrawer({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
  const titleId = useId();
  const [dirty,setDirty]=useState(false); const [discard,setDiscard]=useState(false);
  const requestClose=()=>{if(busy || panel.current?.querySelector('form[aria-busy="true"], .work-page[aria-busy="true"]'))return;if(dirty)setDiscard(true);else onClose();};
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!dirty) return; const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener('beforeunload', protect); return () => window.removeEventListener('beforeunload', protect); }, [dirty]);
  const close = useRef(onClose);
  close.current = requestClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const underlying = Array.from(document.querySelectorAll<HTMLElement>('.detail-overlay')).filter(element => !element.contains(panel.current)).map(element => ({ element, inert: element.inert, hidden: element.getAttribute('aria-hidden') }));
    for (const { element } of underlying) { element.inert = true; element.setAttribute('aria-hidden', 'true'); }
    openDialogs.push(titleId);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (openDialogs.at(-1) !== titleId) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]') || []).filter(element => element.getClientRects().length);
      const first = elements[0]; const last = elements.at(-1);
      if (!first) { event.preventDefault(); panel.current?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { const index = openDialogs.indexOf(titleId); if (index >= 0) openDialogs.splice(index, 1); for (const { element, inert, hidden } of underlying) { if (element.isConnected) { element.inert = inert; if (hidden === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', hidden); } } document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); if (previous?.isConnected) previous.focus(); };
  }, [titleId]);
  return createPortal(<div className="detail-overlay" onMouseDown={event => { if (event.target === event.currentTarget) requestClose(); }}><div ref={panel} className="detail-drawer" role="dialog" aria-modal="true" aria-busy={busy} aria-labelledby={titleId} tabIndex={-1}><header className="detail-drawer-header"><h2 id={titleId}>{title}</h2><button type="button" className="btn btn-outline" disabled={busy} onClick={requestClose} aria-label="Fermer le détail">Fermer</button></header><div className="detail-drawer-body" onInputCapture={event=>{const element=event.target as HTMLInputElement;if(element.type!=='search' && panel.current?.contains(element) && element.closest('form'))setDirty(true);}}>{discard && <section className="restricted-box" role="alert"><h3>Quitter sans enregistrer ?</h3><p>Les informations saisies seront abandonnées.</p><div className="btn-group"><button className="btn btn-primary" onClick={()=>setDiscard(false)}>Continuer la saisie</button><button className="btn btn-outline" onClick={onClose}>Abandonner les modifications</button></div></section>}{children}</div></div></div>, document.body);
}
