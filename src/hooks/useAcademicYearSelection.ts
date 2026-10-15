'use client';
import { useCallback, useEffect, useState } from 'react';
import { setAcademicYearRequestSelection } from '@/services/academicYearSelection';
import type { RoleName } from '@/types/permissions';
export function useAcademicYearSelection(accountId: string | undefined, role: RoleName) {
  const [selection, setSelection] = useState('current');
  useEffect(() => {
    let value = 'current';
    try { if (accountId) value = localStorage.getItem(`escen-year:${accountId}:${role}`) || 'current'; } catch { /* A blocked browser store must not prevent consultation. */ }
    if (!['current', 'all'].includes(value) && !/^[a-f0-9-]{36}$/i.test(value)) value = 'current';
    setAcademicYearRequestSelection(value); setSelection(value);
  }, [accountId, role]);
  const change = useCallback((value: string) => {
    setAcademicYearRequestSelection(value); setSelection(value);
    try { if (accountId) localStorage.setItem(`escen-year:${accountId}:${role}`, value); } catch { /* Selection still works for this session. */ }
  }, [accountId, role]);
  return { selection, change };
}
