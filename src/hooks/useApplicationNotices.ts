'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePortal } from './usePortal';
import { admissionNotices, admissionsOperation } from '@/services/remoteCampusService';
import type { ApplicationNotice } from '@/types/admissions';

function formatNoticeMessage(message: string, appRow?: Record<string, unknown>): string {
  const normalized = message
    .replace(/\b(WEB-[A-Za-z0-9]{4})[A-Za-z0-9]+([A-Za-z0-9]{4})\b/g, '$1…$2')
    .replace(/\s*:\s*(WEB-)/g, ' · $1');
  if (!appRow) return normalized;
  const identity = (appRow.identity && typeof appRow.identity === 'object' ? appRow.identity : {}) as Record<string, unknown>;
  const fullName = [identity.prenom, identity.nom].map(v => String(v || '').trim()).filter(Boolean).join(' ');
  if (!fullName || normalized.includes(fullName)) return normalized;
  const parts = normalized.split(/\s*(?:·|\s-\s)\s*/);
  if (parts.length >= 2) {
    return `${parts[0]} · ${fullName} (${parts.slice(1).join(' - ')})`;
  }
  return `${normalized} · ${fullName}`;
}

export function useApplicationNotices() {
  const portal = usePortal(); const role = portal.activeRole; const year = portal.academicYearContext?.selectedYearId;
  const [rawNotices, setRawNotices] = useState<ApplicationNotice[]>([]);
  const enabled = Boolean(portal.session && portal.campusLoad.status === 'ready' && portal.globalAccess && portal.perms.permissions.includes('application.view'));
  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!enabled) return;
    try { const response = await admissionNotices(role,signal); if (!signal?.aborted) setRawNotices(response.notices); }
    catch { if (!signal?.aborted) setRawNotices([]); }
  }, [role,enabled]);
  useEffect(() => {
    const controller = new AbortController(); setRawNotices([]); void refresh(controller.signal);
    const changed = () => { void refresh(controller.signal); };
    const interval = enabled ? window.setInterval(changed,60000) : null;
    window.addEventListener('escen:admissions-changed',changed);
    return () => { controller.abort(); if (interval) clearInterval(interval); window.removeEventListener('escen:admissions-changed',changed); };
  }, [refresh,year,enabled]);

  const notices = useMemo(() => {
    const apps = portal.relationalSnapshot.tables.online_applications || [];
    const appById = new Map(apps.map(row => [String(row.id), row]));
    return rawNotices.map(item => ({
      ...item,
      message: formatNoticeMessage(item.message, appById.get(String(item.application_id))),
    }));
  }, [rawNotices, portal.relationalSnapshot.tables.online_applications]);

  async function markRead() {
    if (!rawNotices.length) return;
    await admissionsOperation(role,{action:'read_notices',ids:rawNotices.map(item => item.id)}); await portal.refreshCampus(); await refresh();
  }
  return { notices, markRead };
}
