'use client';
import { useEffect, useState } from 'react';
import { ROLES, type RoleName } from '@/types/permissions';
import type { HistoryCatalog } from '@/types/history';
import { loadHistoryCatalog } from '@/services/historyService';
export function useHistoricalCampus(role: RoleName, accountId: string | undefined, blocked: boolean | undefined, revision: number, yearSelection = 'current') {
  const [catalog, setCatalog] = useState<HistoryCatalog | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const enabled = !!accountId && !blocked && (role === ROLES.IT || role === ROLES.DG);
  useEffect(() => {
    const controller = new AbortController();
    setCatalog(null); setError('');
    if (enabled) void loadHistoryCatalog(role, controller.signal).then(data => { if (!controller.signal.aborted) setCatalog(data); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); });
    return () => controller.abort();
  }, [role, enabled, accountId, reload, revision, yearSelection]);
  return { catalog, error, enabled, retry: () => setReload(value => value + 1) };
}
