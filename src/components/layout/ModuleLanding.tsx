'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/hooks/usePortal';
export default function ModuleLanding({ tab }: { tab: string }) {
  const state = usePortal(); const router = useRouter(); const section = state.availableTabs.find(item => item.id === tab)?.subTabs?.[0];
  useEffect(() => { if (state.session && section) router.replace(section.href); }, [state.session, section, router]);
  return <div className="route-loading-inline" role="status">Ouverture du module…</div>;
}
