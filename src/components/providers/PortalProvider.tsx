'use client';
import type { ReactNode } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { PortalContext } from '@/hooks/usePortal';
import { AcademicReferencesContext } from '@/hooks/useAcademicReferences';
export default function PortalProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  return <PortalContext.Provider value={state}><AcademicReferencesContext.Provider value={state.references}>{children}</AcademicReferencesContext.Provider></PortalContext.Provider>;
}
