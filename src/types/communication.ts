import type { RoleName } from '@/types/permissions';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: string;
  author: string;
  date: string;
  expiresOn?: string;
  withdrawnAt?: string;
  history?: AnnouncementHistory[];
}

export interface AnnouncementHistory {
  date: string;
  actor: string;
  role: RoleName;
  action: 'PUBLICATION' | 'RETRAIT';
  oldValue: 'ACTIVE' | null;
  newValue: 'ACTIVE' | 'RETIREE';
  reason: string;
}
