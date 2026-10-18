import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
import type { PaymentAdjustmentCommand, PaymentAdjustmentDirectory } from '@/types/paymentAdjustments';
import { activePaymentAllocations } from './paymentAllocationService';

const number = (row: DatabaseRow, key: string) => Number(row[key] || 0);
const rows = (snapshot: RelationalSnapshot, table: string) => snapshot.tables[table] || [];
export class PaymentAdjustmentError extends Error {}

export function receiptStatus(snapshot: RelationalSnapshot, paymentId: unknown): 'ANNULE' | 'POSTED' {
  return rows(snapshot, 'payment_reversals').some(row => row.payment_id === paymentId) ? 'ANNULE' : 'POSTED';
}

export function paymentAdjustmentDirectory(snapshot: RelationalSnapshot, enrollmentIds: Set<string>): PaymentAdjustmentDirectory {
  const active = activePaymentAllocations(snapshot);
  const contracts = rows(snapshot, 'financial_contracts').filter(row => enrollmentIds.has(String(row.enrollment_id)));
  const versions = rows(snapshot, 'contract_versions').filter(row => row.status === 'APPROVED' && contracts.some(contract => contract.id === row.contract_id));
  return {
    payments: rows(snapshot, 'payments').filter(row => enrollmentIds.has(String(row.enrollment_id))).map(row => {
      const refunds = rows(snapshot, 'refunds').filter(refund => refund.payment_id === row.id).map(refund => ({ id: refund.id, amount: number(refund, 'amount'), reference: String(refund.reference), reason: String(refund.reason), refundedAt: String(refund.refunded_at || '') }));
      const refunded = refunds.reduce((sum, refund) => sum + refund.amount, 0);
      const reversal = rows(snapshot, 'payment_reversals').find(reversal => reversal.payment_id === row.id);
      const receipt = rows(snapshot, 'receipts').find(receipt => receipt.payment_id === row.id);
      return { id: row.id, enrollmentId: String(row.enrollment_id), reference: String(row.reference), amount: number(row, 'amount'), refunded,
        available: reversal || row.status === 'PENDING' ? 0 : Math.max(0, number(row, 'amount') - refunded), pending: row.status === 'PENDING', cancelled: !!reversal,
        receipt: receipt ? { id: receipt.id, reference: String(receipt.reference), status: receiptStatus(snapshot, row.id) } : null,
        cancellation: reversal ? { reason: String(reversal.reason), reversedAt: String(reversal.reversed_at || '') } : null, refunds };
    }),
    lines: rows(snapshot, 'contract_lines').filter(row => versions.some(version => version.id === row.version_id)).map(row => {
      const version = versions.find(version => version.id === row.version_id)!;
      const contract = contracts.find(contract => contract.id === version.contract_id)!;
      const discounts = rows(snapshot, 'contract_discounts').filter(discount => discount.line_id === row.id).reduce((sum, discount) => sum + number(discount, 'amount'), 0);
      const notes = rows(snapshot, 'credit_notes').filter(note => note.line_id === row.id).map(note => ({ id: note.id, amount: number(note, 'amount'), reason: String(note.reason), issuedAt: String(note.issued_at || '') }));
      const credits = notes.reduce((sum, note) => sum + note.amount, 0);
      const allocated = active.filter(allocation => allocation.line_id === row.id).reduce((sum, allocation) => sum + number(allocation, 'amount'), 0);
      return { id: row.id, enrollmentId: String(contract.enrollment_id), description: String(row.description || 'Ligne de frais'), contractReference: String(contract.reference), amount: number(row, 'amount'), discounts, credits, allocated,
        available: Math.max(0, number(row, 'amount') - discounts - credits - allocated), notes };
    }),
  };
}

export function assertPaymentAdjustment(snapshot: RelationalSnapshot, enrollmentId: string, command: PaymentAdjustmentCommand) {
  const directory = paymentAdjustmentDirectory(snapshot, new Set([enrollmentId]));
  if (command.action === 'credit_note') {
    const line = directory.lines.find(row => row.id === command.lineId);
    if (!line) throw new PaymentAdjustmentError('Ligne absente du contrat approuvé de cette inscription.');
    if (!Number.isSafeInteger(command.amount) || command.amount <= 0 || command.amount > line.available) throw new PaymentAdjustmentError('L’avoir dépasse le solde non affecté de la ligne après remises et avoirs.');
    return { action: 'credit', entityId: line.id };
  }
  const payment = directory.payments.find(row => row.id === command.paymentId);
  if (!payment) throw new PaymentAdjustmentError('Paiement introuvable dans cette inscription.');
  if (payment.cancelled) throw new PaymentAdjustmentError('Ce paiement est déjà annulé.');
  if (command.action === 'cancel_payment') {
    if (payment.refunded > 0) throw new PaymentAdjustmentError('Un paiement remboursé ne peut plus être annulé.');
    return { action: 'cancel', entityId: payment.id };
  }
  if (payment.pending) throw new PaymentAdjustmentError('Un paiement en attente ne peut pas être remboursé.');
  if (!Number.isSafeInteger(command.amount) || command.amount <= 0 || command.amount > payment.available) throw new PaymentAdjustmentError('Le remboursement dépasse le paiement net disponible.');
  return { action: 'refund', entityId: payment.id };
}
