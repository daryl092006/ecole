import type { RoleName } from '@/types/permissions';
export interface SupportTicket {
  id: string; title: string; description: string; author: string; role: RoleName; createdAt: string;
  status: 'OUVERT' | 'EN_COURS' | 'RESOLU';
  history: { date: string; actor: string; role: RoleName; oldValue: string | null; newValue: string; reason: string }[];
}
