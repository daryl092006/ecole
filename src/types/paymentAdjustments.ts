export type PaymentAdjustmentCommand =
  | { action: 'cancel_payment'; paymentId: string }
  | { action: 'refund_payment'; paymentId: string; amount: number; reference: string }
  | { action: 'credit_note'; lineId: string; amount: number };

export interface AdjustmentPayment {
  id: string; enrollmentId: string; reference: string;
  amount: number; refunded: number; available: number;
  pending: boolean; cancelled: boolean;
  receipt: { id: string; reference: string; status: 'ANNULE' | 'POSTED' } | null;
  cancellation: { reason: string; reversedAt: string } | null;
  refunds: { id: string; amount: number; reference: string; reason: string; refundedAt: string }[];
}
export interface CreditableLine {
  id: string; enrollmentId: string; description: string; contractReference: string;
  amount: number; discounts: number; credits: number; allocated: number; available: number;
  notes: { id: string; amount: number; reason: string; issuedAt: string }[];
}
export interface PaymentAdjustmentDirectory { payments: AdjustmentPayment[]; lines: CreditableLine[]; }
