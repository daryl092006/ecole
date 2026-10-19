import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { academicYearRequestHeaders } from './academicYearSelection';
import type { RoleName } from '@/types/permissions';
import type { OnlineExamCommand, OnlineExamDirectory, OnlineExamView } from '@/types/onlineExam';

export class OnlineExamError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request(role: RoleName, command?: OnlineExamCommand, attemptId?: string) {
  const session = (await getSupabaseBrowserClient().auth.getSession()).data.session;
  if (!session) throw new OnlineExamError('Reconnectez-vous pour retrouver votre copie enregistrée.', 401);
  const response = await fetch(`/api/exam-attempts${attemptId ? `?attemptId=${encodeURIComponent(attemptId)}` : ''}`, {
    method: command ? 'POST' : 'GET', cache: 'no-store',
    headers: { ...academicYearRequestHeaders(), Authorization: `Bearer ${session.access_token}`, 'x-escen-role': role, 'Content-Type': 'application/json' },
    ...(command ? { body: JSON.stringify(command) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new OnlineExamError(result.error || 'Service des épreuves indisponible.', response.status);
  return result;
}
export const listOnlineExams = (role: RoleName): Promise<OnlineExamDirectory> => request(role);
export const readOnlineExam = (role: RoleName, id: string): Promise<OnlineExamView> => request(role, undefined, id);
export const writeOnlineExam = (role: RoleName, command: OnlineExamCommand): Promise<OnlineExamView> => request(role, command);
