import type { RelationalSnapshot } from '@/types/persistence';
import type { PaymentReceiptDocument } from '@/types/paymentReceipt';
import { escapeHtml as h } from '@/utils/printDocument';

export function paymentReceiptDocument(snapshot: RelationalSnapshot, enrollmentIds: Set<string>, receiptId: string): PaymentReceiptDocument | null {
  const rows = (name: string) => snapshot.tables[name] || [];
  const receipt = rows('receipts').find(row => row.id === receiptId);
  const payment = receipt && rows('payments').find(row => row.id === receipt.payment_id && enrollmentIds.has(String(row.enrollment_id)));
  if (!receipt || !payment) return null;
  const enrollment = rows('enrollments').find(row => row.id === payment.enrollment_id);
  const student = enrollment && rows('students').find(row => row.id === enrollment.student_id);
  if (!enrollment || !student) return null;
  const person = rows('people').find(row => row.id === student.person_id);
  const offering = rows('academic_offerings').find(row => row.id === enrollment.offering_id);
  const year = offering && rows('academic_years').find(row => row.id === offering.academic_year_id);
  const cancellation = rows('payment_reversals').find(row => row.payment_id === payment.id);
  const status = cancellation ? 'ANNULE' : payment.status === 'PENDING' ? 'PENDING' : 'POSTED';
  const refunds = rows('refunds').filter(row => row.payment_id === payment.id).map(row => ({ reference: String(row.reference), amount: Number(row.amount), reason: String(row.reason), refundedAt: String(row.refunded_at || '') }));
  const amount = Number(payment.amount), refunded = refunds.reduce((sum, row) => sum + row.amount, 0);
  return { reference: String(receipt.reference), paymentReference: String(payment.reference), issuedAt: String(receipt.issued_at || ''), paidOn: String(payment.paid_on || ''),
    matricule: String(student.matricule), studentName: [person?.firstname, person?.lastname].filter(Boolean).join(' '), academicYear: String(year?.name || ''),
    payer: String(payment.payer_name || ''), method: String(payment.method || ''), provider: String(payment.provider || ''), amount, refunded, net: status === 'POSTED' ? amount - refunded : 0,
    status, cancellationReason: String(cancellation?.reason || ''), refunds };
}

const money = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;
const date = (value: string) => {
  if (!value) return 'Non renseignée';
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('fr-FR', { timeZone: 'Africa/Sao_Tome', ...(value.length === 10 ? { year: 'numeric', month: '2-digit', day: '2-digit' } : {}) });
};
export function paymentReceiptMarkup(receipt: PaymentReceiptDocument): string {
  const status = receipt.status === 'ANNULE' ? 'ANNULÉ' : receipt.status === 'PENDING' ? 'EN ATTENTE DE VALIDATION' : 'VALIDÉ';
  const method = ({ ESPECES: 'Espèces', VIREMENT: 'Virement', CARTE: 'Carte', MOBILE_MONEY: 'Mobile money', CHEQUE: 'Chèque' } as Record<string, string>)[receipt.method] || receipt.method;
  return `<div class="document-heading"><h1>ESCEN</h1><h2>Reçu de paiement · ${h(status)}</h2><p>Référence du reçu : ${h(receipt.reference)}<br>Émis le : ${h(date(receipt.issuedAt))}</p></div>
<p>Étudiant : ${h(receipt.studentName || 'Non renseigné')} · ${h(receipt.matricule)}<br>Année scolaire : ${h(receipt.academicYear || 'Non renseignée')}</p>
<table><tbody><tr><th>Référence du versement</th><td>${h(receipt.paymentReference)}</td></tr><tr><th>Payeur</th><td>${h(receipt.payer || 'Non renseigné')}</td></tr><tr><th>Date du paiement</th><td>${h(date(receipt.paidOn))}</td></tr><tr><th>Mode</th><td>${h(method || 'Non renseigné')}</td></tr><tr><th>Caisse ou organisme</th><td>${h(receipt.provider || 'Non renseigné')}</td></tr><tr><th>Montant initial</th><td>${h(money(receipt.amount))}</td></tr><tr><th>Remboursements</th><td>${h(money(receipt.refunded))}</td></tr><tr><th>Net encaissé</th><td>${h(money(receipt.net))}</td></tr></tbody></table>
${receipt.status === 'ANNULE' ? `<p><strong>REÇU ANNULÉ</strong><br>Motif : ${h(receipt.cancellationReason)}</p>` : receipt.status === 'PENDING' ? '<p><strong>Paiement en attente : ce montant ne compte pas dans les encaissements validés.</strong></p>' : ''}
${receipt.refunds.length ? `<h2>Historique des remboursements</h2><table><thead><tr><th>Référence</th><th>Date</th><th>Montant</th><th>Motif</th></tr></thead><tbody>${receipt.refunds.map(row => `<tr><td>${h(row.reference)}</td><td>${h(date(row.refundedAt))}</td><td>${h(money(row.amount))}</td><td>${h(row.reason)}</td></tr>`).join('')}</tbody></table>` : ''}
<p class="document-footer">Reçu ${h(receipt.reference)} · Versement ${h(receipt.paymentReference)} · État : ${h(status)}</p>`;
}
