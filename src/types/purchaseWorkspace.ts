import type { DatabaseRow } from './persistence';
export interface PurchaseDirectory {
  revision: number; yearId: string | null;
  canCreate: boolean; canApprove: boolean; canReceive: boolean; requiresSite: boolean;
  purchases: DatabaseRow[]; lines: DatabaseRow[]; receipts: DatabaseRow[]; expenses: DatabaseRow[];
  suppliers: DatabaseRow[]; sites: DatabaseRow[];
}
export const PURCHASE_STATUS_LABELS: Record<string, string> = { DEMANDE: 'Demandée', APPROUVE: 'Approuvée', REFUSE: 'Refusée', RECEPTION_PARTIELLE: 'Réception partielle', RECU: 'Reçue' };
