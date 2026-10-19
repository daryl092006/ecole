'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props { message: string; error: boolean; }

export default function FormFeedback({ message, error }: Props) {
  const [target, setTarget] = useState<Element | null>(null);
  useEffect(() => {
    const sync = () => {
      const active = Array.from(document.querySelectorAll<HTMLElement>('.detail-overlay'))
        .filter(overlay => !overlay.inert && overlay.getAttribute('aria-hidden') !== 'true').at(-1);
      setTarget(active?.querySelector('.detail-drawer-feedback') || null);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert', 'aria-hidden'] });
    return () => observer.disconnect();
  }, []);
  if (!message) return null;
  const content = <p className={`${error ? 'restricted-box' : 'info-box'} mt-2`} role={error ? 'alert' : 'status'}>{message}</p>;
  return target ? createPortal(content, target) : content;
}
