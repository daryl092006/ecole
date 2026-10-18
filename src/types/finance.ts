export type InstallmentStatus = 'A venir' | 'Partiellement payée' | 'Payée' | 'En retard' | 'Annulée';

export interface Installment {
  dueDate: string;
  amount: number;
  settledAmount?: number;
  status: InstallmentStatus;
}

export interface StudentBourse {
  active: boolean;
  type: string;
  percent: number;
  amount: number;
}

export interface StudentFinancials {
  available?: boolean;
  expected: number;
  paid: number;
  remaining: number;
  installments: Installment[];
  terms?: { tuition: number; registration: number; other: number; scholarship: number; reason: string };
}

export interface Fee { id: string; code: string; label: string; amount: number; academicYearId: string; active: boolean; }
export type PaymentMethod = 'ESPECES' | 'VIREMENT' | 'CARTE' | 'MOBILE_MONEY' | 'CHEQUE';
export interface Payment { id: string; studentId: string; feeId: string; amount: number; date: string; paymentMethod: PaymentMethod; reference: string; recordedBy: string; status: 'ENREGISTRE' | 'ANNULE'; academicYearId?: string; }
export interface Receipt { id: string; paymentId: string; reference: string; issuedAt: string; studentId: string; amount: number; }
export interface PaymentCancellation { id: string; paymentId: string; reason: string; cancelledBy: string; date: string; }
export interface Scholarship { id: string; studentId: string; label: string; percent: number; amount: number; academicYearId: string; active: boolean; }
