import type { RelationalSnapshot } from '@/types/persistence';
import { effectivePayments } from './paymentAllocationService';

/** The snapshot must already be filtered by role and academic year. */
export function netPaymentTotal(snapshot: RelationalSnapshot, enrollmentIds?: ReadonlySet<string>): number {
  const refunded = new Map<string, number>();
  for (const refund of snapshot.tables.refunds || []) {
    const id = String(refund.payment_id);
    refunded.set(id, (refunded.get(id) || 0) + Number(refund.amount || 0));
  }
  return effectivePayments(snapshot)
    .filter(payment => !enrollmentIds || enrollmentIds.has(String(payment.enrollment_id)))
    .reduce((sum, payment) => sum + Number(payment.amount || 0) - (refunded.get(payment.id) || 0), 0);
}

export function netContractAmount(snapshot: RelationalSnapshot, versionId: string): number {
  const lines = (snapshot.tables.contract_lines || []).filter(line => line.version_id === versionId);
  const lineIds = new Set(lines.map(line => line.id));
  const discounts = (snapshot.tables.contract_discounts || []).filter(discount => discount.version_id === versionId);
  const credits = (snapshot.tables.credit_notes || []).filter(credit => lineIds.has(String(credit.line_id)));
  return lines.reduce((sum, line) => sum + Number(line.amount || 0), 0)
    - discounts.reduce((sum, discount) => sum + Number(discount.amount || 0), 0)
    - credits.reduce((sum, credit) => sum + Number(credit.amount || 0), 0);
}
