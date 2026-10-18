'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDrawer } from './DetailDrawer';

/** Keep native form submission and disabled/hidden states when actions move below the scroller. */
export default function DrawerActions({ children }: { children: ReactNode }) {
  const drawer = useDrawer();
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(false);
  const [source, setSource] = useState({ formId: '', hidden: false, disabled: false });
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const sync = () => setMobile(media.matches);
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useLayoutEffect(() => {
    const node = anchor.current;
    if (!node) return;
    const sync = () => {
      const form = node.closest('form');
      if (form && !form.id) form.id = `drawer-form-${id}`;
      const next = { formId: form?.id || '', hidden: !!node.parentElement?.closest('[hidden]'), disabled: !!node.closest('fieldset:disabled') };
      setSource(previous => previous.formId === next.formId && previous.hidden === next.hidden && previous.disabled === next.disabled ? previous : next);
    };
    sync();
    const observer = new MutationObserver(sync);
    const panel = node.closest('.detail-drawer');
    if (panel) observer.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled'] });
    return () => observer.disconnect();
  }, [id, drawer?.actionsTarget]);
  const target = mobile ? drawer?.actionsTarget : null;
  useLayoutEffect(() => {
    for (const button of actions.current?.querySelectorAll<HTMLButtonElement>('button') || []) {
      if (target && source.formId && button.type === 'submit') button.setAttribute('form', source.formId);
      else button.removeAttribute('form');
    }
  }, [children, target, source.formId, source.hidden]);
  const content = <div ref={actions} className="drawer-form-actions" hidden={source.hidden}><fieldset className="drawer-actions-fields" disabled={source.disabled}><div className="btn-group">{children}</div></fieldset></div>;
  return <><span ref={anchor} hidden />{target ? createPortal(content, target) : content}</>;
}
