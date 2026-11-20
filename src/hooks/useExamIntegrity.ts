'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { RoleName } from '@/types/permissions';
import type { ExamIntegrityEvent, ExamIntegrityEventKind } from '@/types/onlineExam';
import { recordExamIntegrityEvents } from '@/services/onlineExamService';

export async function enterExamFullscreen(root: HTMLElement | null) {
  if (!root?.requestFullscreen) throw new Error('Ce navigateur ne permet pas le plein écran requis. Utilisez un navigateur compatible avant de commencer ou contactez le responsable de l’épreuve.');
  if (document.fullscreenElement !== root) await root.requestFullscreen();
  if (document.fullscreenElement !== root) throw new Error('Le plein écran doit être autorisé pour composer.');
}

export function useExamIntegrity({ enabled, active, attemptId, accountId, role, root }: {
  enabled: boolean; active: boolean; attemptId: string; accountId?: string; role: RoleName; root: RefObject<HTMLDivElement | null>;
}) {
  const [allowed, setAllowed] = useState(false);
  const [warning, setWarning] = useState('');
  const [syncPending, setSyncPending] = useState(false);
  const queue = useRef<ExamIntegrityEvent[]>([]);
  const emit = useRef<(kind: ExamIntegrityEventKind, message?: string) => void>(() => {});
  const flush = useRef<(drain?: boolean) => void>(() => {});
  const key = `escen:exam:integrity:${accountId}:${attemptId}`;

  // Transport indépendant du statut de la copie et de la sauvegarde des réponses.
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let flight = false;
    let draining = false;
    const persist = () => {
      try { localStorage.setItem(key, JSON.stringify(queue.current)); } catch { /* Logging never interrupts answer saving. */ }
    };
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) || '[]');
      queue.current = Array.isArray(stored) ? stored.filter((event): event is ExamIntegrityEvent =>
        !!event && typeof event === 'object' && typeof event.id === 'string' && typeof event.kind === 'string' && typeof event.observedAt === 'string'
      ).slice(-100) : [];
    } catch { queue.current = []; }
    const sync = async () => {
      if (flight || !queue.current.length || !navigator.onLine) return;
      flight = true;
      let sent = false;
      const batch = queue.current.slice(0, 20);
      try {
        await recordExamIntegrityEvents(role, attemptId, batch);
        const ids = new Set(batch.map(event => event.id));
        queue.current = queue.current.filter(event => !ids.has(event.id));
        persist(); sent = true;
        if (live) setSyncPending(queue.current.length > 0);
      } catch {
        if (live) setSyncPending(true);
      } finally {
        flight = false;
        if (sent && queue.current.length && (draining || !live)) void sync();
        if (!queue.current.length) draining = false;
      }
    };
    flush.current = (drain = false) => { draining ||= drain; void sync(); };
    emit.current = (kind, message) => {
      if (queue.current.length < 100) queue.current.push({ id: crypto.randomUUID(), kind, observedAt: new Date().toISOString() });
      persist();
      if (message) setWarning(message);
      if (!navigator.onLine) setSyncPending(true);
    };
    const online = () => flush.current();
    const timer = window.setInterval(() => flush.current(), 30000);
    window.addEventListener('online', online);
    void sync();
    return () => {
      live = false; draining = true;
      window.clearInterval(timer);
      window.removeEventListener('online', online);
      void sync();
    };
  }, [enabled, key, attemptId, role]);

  useEffect(() => {
    if (!enabled || !active) return;
    let focused = document.hasFocus();
    const check = () => setAllowed(document.fullscreenElement === root.current && document.visibilityState === 'visible' && focused);
    const add = (kind: ExamIntegrityEventKind, message?: string) => emit.current(kind, message);
    const visibility = () => {
      add(document.hidden ? 'WINDOW_HIDDEN' : 'WINDOW_RETURNED'); check();
      if (document.hidden) flush.current();
    };
    const fullscreen = () => {
      if (document.fullscreenElement !== root.current) add('FULLSCREEN_EXIT', 'Sortie du plein écran enregistrée. Revenez au plein écran pour poursuivre.');
      check();
    };
    const blur = () => { focused = false; add('FOCUS_LOST'); check(); };
    const focus = () => { focused = true; add('FOCUS_RETURNED'); check(); };
    const clipboard = (event: ClipboardEvent) => {
      event.preventDefault();
      add(event.type === 'copy' ? 'COPY_BLOCKED' : event.type === 'cut' ? 'CUT_BLOCKED' : 'PASTE_BLOCKED', 'La copie, la coupe et le collage sont restreints pendant cette épreuve. Vos réponses restent enregistrées automatiquement.');
    };
    const contextMenu = (event: MouseEvent) => { event.preventDefault(); add('CONTEXT_MENU_BLOCKED', 'Le menu contextuel est restreint pendant cette épreuve.'); };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'PrintScreen') add('CAPTURE_SHORTCUT', 'Raccourci de capture signalé. Les captures système ne peuvent pas être bloquées par le site.');
      if (!(event.ctrlKey || event.metaKey)) return;
      const kinds: Record<string, ExamIntegrityEventKind> = { c: 'COPY_BLOCKED', x: 'CUT_BLOCKED', v: 'PASTE_BLOCKED', p: 'PRINT_BLOCKED' };
      const kind = kinds[event.key.toLowerCase()];
      if (kind) { event.preventDefault(); add(kind, 'Cette action est restreinte pendant le mode strict.'); }
    };
    const beforePrint = () => add('PRINT_BLOCKED', 'La copie ne peut pas être imprimée pendant l’épreuve.');
    document.addEventListener('fullscreenchange', fullscreen);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('copy', clipboard, true);
    document.addEventListener('cut', clipboard, true);
    document.addEventListener('paste', clipboard, true);
    document.addEventListener('contextmenu', contextMenu, true);
    document.addEventListener('keydown', keyboard, true);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    window.addEventListener('beforeprint', beforePrint);
    check();
    return () => {
      document.removeEventListener('fullscreenchange', fullscreen);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('copy', clipboard, true);
      document.removeEventListener('cut', clipboard, true);
      document.removeEventListener('paste', clipboard, true);
      document.removeEventListener('contextmenu', contextMenu, true);
      document.removeEventListener('keydown', keyboard, true);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
      window.removeEventListener('beforeprint', beforePrint);
    };
  }, [enabled, active, root]);

  useEffect(() => {
    if (enabled && !active) flush.current(true);
  }, [enabled, active]);

  return { allowed: !enabled || !active || allowed, warning: enabled && active ? warning : '', syncPending: enabled && syncPending };
}
