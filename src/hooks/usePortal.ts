'use client';
import { createContext, useContext } from 'react';
import type { AppState } from '@/hooks/useAppState';
export const PortalContext = createContext<AppState | null>(null);
export function usePortal() {
  const state = useContext(PortalContext);
  if (!state) throw new Error('Espace de travail indisponible.');
  return state;
}
