import type { DatabaseRow } from './persistence';

export const SUPPORT_STATUS_LABELS: Record<string, string> = { OPEN: 'Ouverte', IN_PROGRESS: 'En cours', WAITING: 'En attente', RESOLVED: 'Résolue', CLOSED: 'Clôturée' };
export interface SupportDirectory {
  revision: number;
  canManage: boolean;
  canManageCorrections?: boolean;
  correctionTicketIds?: string[];
  students?: { ticketId: string; matricule: string; name: string }[];
  yearId: string | null;
  tickets: DatabaseRow[];
  messages: DatabaseRow[];
  categories: DatabaseRow[];
}
