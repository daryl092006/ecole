export interface PaymentReceiptDocument {
  reference: string; paymentReference: string; issuedAt: string; paidOn: string;
  matricule: string; studentName: string; academicYear: string;
  payer: string; method: string; provider: string;
  amount: number; refunded: number; net: number;
  status: 'POSTED' | 'PENDING' | 'ANNULE';
  cancellationReason: string;
  refunds: { reference: string; amount: number; reason: string; refundedAt: string }[];
}
