/** Reveal an existing edit form inside the portal's scrolling workspace. */
export function focusForm(form: HTMLFormElement | null): void {
  if (!form) return;
  let ancestor = form.parentElement;
  while (ancestor) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    ancestor = ancestor.parentElement;
  }
  requestAnimationFrame(() => {
    const activeForm = form.isConnected ? form : document.querySelector<HTMLFormElement>('#main-content > .work-page form');
    activeForm?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    activeForm?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')?.focus({ preventScroll: true });
  });
}
