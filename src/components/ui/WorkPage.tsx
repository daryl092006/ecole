'use client';
import type { ReactNode } from 'react';
import DetailDrawer from './DetailDrawer';

/** Shared editor: keeps the current screen and its filters behind the popup. */
export default function WorkPage({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
  return <DetailDrawer title={title} onClose={onClose} busy={busy}>{children}</DetailDrawer>;
}
