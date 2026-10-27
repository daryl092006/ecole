'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePortal } from './usePortal';
import { admissionNotices, admissionsOperation } from '@/services/remoteCampusService';
import type { ApplicationNotice } from '@/types/admissions';
export function useApplicationNotices() {
  const portal = usePortal(); const role = portal.activeRole; const year = portal.academicYearContext?.selectedYearId;
  const [notices, setNotices] = useState<ApplicationNotice[]>([]);
  const enabled = portal.perms.permissions.includes('application.view');
  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!enabled) return;
    try { const response = await admissionNotices(role,signal); if (!signal?.aborted) setNotices(response.notices); }
    catch { if (!signal?.aborted) setNotices([]); }
  }, [role,enabled]);
  useEffect(() => {
    const controller = new AbortController(); setNotices([]); void refresh(controller.signal);
    const changed = () => { void refresh(controller.signal); };
    const interval = enabled ? window.setInterval(changed,60000) : null;
    window.addEventListener('escen:admissions-changed',changed);
    return () => { controller.abort(); if (interval) clearInterval(interval); window.removeEventListener('escen:admissions-changed',changed); };
  }, [refresh,year,enabled]);
  async function markRead() {
    if (!notices.length) return;
    await admissionsOperation(role,{action:'read_notices',ids:notices.map(item => item.id)}); await portal.refreshCampus(); await refresh();
  }
  return { notices, markRead };
}
