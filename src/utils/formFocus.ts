/** Reveal an existing edit form inside the portal's scrolling workspace. */
export function focusForm(form: HTMLFormElement | null): void {
  if (!form) return;
  requestAnimationFrame(() => {
    form.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    form.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')?.focus({ preventScroll: true });
  });
}
