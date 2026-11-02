import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { academicYearRequestHeaders } from './academicYearSelection';
import { roleHeaderValue } from './remoteCampusService';
import type { RoleName } from '@/types/permissions';
import type { FinanceSettingsDirectory, FinanceSettingsAction } from '@/types/financeSettings';

async function headers(role?: RoleName, yearId?: string) {
  const session = await getSupabaseBrowserClient().auth.getSession();
  if (!session.data.session) throw new Error('Connexion requise.');
  return {
    ...academicYearRequestHeaders(true),
    Authorization: `Bearer ${session.data.session.access_token}`,
    ...(role ? { 'x-escen-role': roleHeaderValue(role) } : {}),
    ...(yearId ? { 'x-escen-year': yearId } : {}),
  };
}

async function readResponse<T>(res: Response): Promise<T> {
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    throw new Error(res.ok ? 'Réponse illisible.' : `Erreur serveur (${res.status}).`);
  }
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Une erreur est survenue.');
  }
  return data as T;
}

export async function loadFinanceSettings(
  role: RoleName,
  yearId?: string,
  signal?: AbortSignal
): Promise<FinanceSettingsDirectory> {
  const h = await headers(role, yearId);
  const res = await fetch('/api/finance/fees-and-scholarships', {
    headers: h,
    cache: 'no-store',
    signal,
  });
  return readResponse<FinanceSettingsDirectory>(res);
}

export async function mutateFinanceSettings(
  role: RoleName,
  action: FinanceSettingsAction
): Promise<{ success: boolean; revision: number }> {
  const h = await headers(role);
  const res = await fetch('/api/finance/fees-and-scholarships', {
    method: 'POST',
    headers: { ...h, 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  });
  return readResponse<{ success: boolean; revision: number }>(res);
}

