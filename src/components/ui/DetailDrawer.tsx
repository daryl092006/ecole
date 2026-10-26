'use client';
import IconButton from '@/components/ui/IconButton';
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const openDialogs: string[] = [];
const blockedElements = new Map<HTMLElement, { count: number; inert: boolean; hidden: string | null }>();
let originalBodyOverflow = '';

const DrawerContext = createContext<{ requestClose: (onAccepted?: () => void) => void; markSaved: () => void; actionsTarget: HTMLDivElement | null } | null>(null);

export function useDrawer() { return useContext(DrawerContext); }

/** Render inside the drawer so the nearest window owns the abandonment guard. */
export function DrawerCloseButton({ onClose, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & { onClose?: () => void }) {
  const drawer = useDrawer();
  return <button {...props} type="button" onClick={() => drawer ? drawer.requestClose(onClose) : onClose?.()} />;
}

export default function DetailDrawer({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
  const titleId = useId();
  const overlay = useRef<HTMLDivElement>(null);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);
  const [dirty,setDirty]=useState(false); const [discard,setDiscard]=useState<(() => void) | null>(null);
  const discardNotice = useRef<HTMLElement>(null);
  const isBusy = () => busy || !!panel.current?.querySelector('form[aria-busy="true"]');
  const requestClose=(onAccepted: () => void = onClose)=>{if(isBusy())return;if(dirty)setDiscard(() => onAccepted);else onAccepted();};
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!dirty) return; const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener('beforeunload', protect); return () => window.removeEventListener('beforeunload', protect); }, [dirty]);
  const close = useRef(requestClose);
  close.current = requestClose;
  const drawerContext = useMemo(() => ({ requestClose: (onAccepted?: () => void) => close.current(onAccepted), markSaved: () => setDirty(false), actionsTarget }), [actionsTarget]);
  useEffect(() => { if (discard) { discardNotice.current?.focus(); discardNotice.current?.scrollIntoView({ block: 'nearest' }); } }, [discard]);
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    const revealField = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && panel.current?.contains(active) && active.matches('input, textarea, select')) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    };
    const resize = () => {
      if (window.matchMedia('(max-width: 768px)').matches) {
        overlay.current?.style.setProperty('--drawer-viewport-height', `${viewport?.height || window.innerHeight}px`);
        overlay.current?.style.setProperty('--drawer-viewport-top', `${viewport?.offsetTop || 0}px`);
        revealField();
      }
    };
    resize();
    panel.current?.addEventListener('focusin', revealField);
    const currentPanel = panel.current;
    window.addEventListener('resize', resize);
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    return () => { cancelAnimationFrame(frame); currentPanel?.removeEventListener('focusin', revealField); window.removeEventListener('resize', resize); viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize); };
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const underlying = Array.from(document.querySelectorAll<HTMLElement>('.app-wrapper, .skip-link, .detail-overlay')).filter(element => !element.contains(panel.current));
    for (const element of underlying) {
      const existing = blockedElements.get(element);
      if (existing) existing.count++;
      else blockedElements.set(element, { count: 1, inert: element.inert, hidden: element.getAttribute('aria-hidden') });
      element.inert = true; element.setAttribute('aria-hidden', 'true');
    }
    if (!openDialogs.length) originalBodyOverflow = document.body.style.overflow;
    openDialogs.push(titleId);
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
    return () => {
      const index = openDialogs.indexOf(titleId);
      if (index >= 0) openDialogs.splice(index, 1);
      for (const element of underlying) {
        const original = blockedElements.get(element);
        if (!original || --original.count > 0) continue;
        if (element.isConnected) {
          element.inert = original.inert;
          if (original.hidden === null) element.removeAttribute('aria-hidden');
          else element.setAttribute('aria-hidden', original.hidden);
        }
        blockedElements.delete(element);
      }
      if (!openDialogs.length) document.body.style.overflow = originalBodyOverflow;
      document.removeEventListener('keydown', keyboard);
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus();
      else if (!openDialogs.length) document.getElementById('main-content')?.focus();
    };
  }, [titleId]);
  return createPortal(<DrawerContext.Provider value={drawerContext}><div ref={overlay} className="detail-overlay" onMouseDown={event => { if (event.target === event.currentTarget) requestClose(); }}><div ref={panel} className="detail-drawer" role="dialog" aria-modal="true" aria-busy={busy} aria-labelledby={titleId} tabIndex={-1}><header className="detail-drawer-header"><h2 id={titleId}>{title}</h2><IconButton type="button" className="btn btn-outline" disabled={busy} onClick={() => requestClose()} aria-label="Fermer le détail" label="Fermer" /></header><div className="detail-drawer-body" onInputCapture={event=>{const element=event.target as HTMLInputElement;if(element.type!=='search' && panel.current?.contains(element) && element.closest('form'))setDirty(true);}}><div className="detail-drawer-feedback" />{discard && <section ref={discardNotice} tabIndex={-1} className="restricted-box" role="alert"><h3>Quitter sans enregistrer ?</h3><p>Les informations saisies seront abandonnées.</p><div className="btn-group"><button type="button" className="btn btn-primary" onClick={()=>setDiscard(null)}>Continuer la saisie</button><button type="button" className="btn btn-outline" disabled={busy} onClick={() => { if (!isBusy()) { setDiscard(null); discard(); } }}>Abandonner les modifications</button></div></section>}{children}</div><div ref={setActionsTarget} className="detail-drawer-actions" /></div></div></DrawerContext.Provider>, document.body);
}
