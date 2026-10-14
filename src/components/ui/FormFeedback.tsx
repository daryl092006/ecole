'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props { message: string; error: boolean; }

export default function FormFeedback({ message, error }: Props) {
  const [target, setTarget] = useState<Element | null>(null);
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    const sync = () => setTarget(main.querySelector(':scope > .work-page .work-page-feedback'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(main, { childList: true });
    return () => observer.disconnect();
  }, []);
  if (!message) return null;
  const content = <p className={`${error ? 'restricted-box' : 'info-box'} mt-2`} role={error ? 'alert' : 'status'}>{message}</p>;
  return target ? createPortal(content, target) : content;
}
