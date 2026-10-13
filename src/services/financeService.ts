import type { Fee, Payment, PaymentCancellation, PaymentMethod, Receipt, Student, RoleName } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';

export function recordLocalPayment(student: Student, fee: Fee, amount: number, method: PaymentMethod, recordedBy: RoleName, sequence: number) {
  if (!hasPermission(recordedBy, 'payment.record')) throw new Error('Encaissement non autorisé.');
  if (!['ESPECES', 'VIREMENT', 'CARTE', 'MOBILE_MONEY', 'CHEQUE'].includes(method)) throw new Error('Mode de paiement invalide.');
  if (!fee.active || fee.academicYearId !== student.academicYearId) throw new Error('Frais incompatibles avec le dossier Étudiant.');
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Le montant en FCFA doit être un entier strictement positif.');
  if (amount > student.financials.remaining) throw new Error('Le versement dépasse le solde restant.');
  const date = new Date().toISOString();
  const payment: Payment = { id: `PAY-${String(sequence).padStart(3, '0')}`, studentId: student.matricule, feeId: fee.id, amount, date, paymentMethod: method, reference: `${method}-${Date.now()}`, recordedBy, status: 'ENREGISTRE' };
  const receipt: Receipt = { id: `RCT-${String(sequence).padStart(3, '0')}`, paymentId: payment.id, reference: `REC-${new Date().getFullYear()}-${String(sequence).padStart(6, '0')}`, issuedAt: date, studentId: student.matricule, amount };
  const installments = reconcileInstallments(student.financials.installments, student.financials.paid + amount);
  const updatedStudent: Student = { ...student, financials: { ...student.financials, paid: student.financials.paid + amount, remaining: student.financials.remaining - amount, installments }, history: student.history };
  return { updatedStudent, payment, receipt };
}

export function cancelLocalPayment(payment: Payment, student: Student, reason: string, cancelledBy: RoleName): { payment: Payment; student: Student; cancellation: PaymentCancellation } {
  if (!hasPermission(cancelledBy, 'payment.cancel')) throw new Error('Annulation non autorisée.');
  if (payment.studentId !== student.matricule) throw new Error('Paiement incompatible avec cet Étudiant.');
  if (payment.status === 'ANNULE') throw new Error('Ce paiement est déjà annulé.');
  if (!reason.trim()) throw new Error("Le motif d'annulation est obligatoire.");
  return {
    payment: { ...payment, status: 'ANNULE' },
    student: { ...student, financials: { ...student.financials, paid: Math.max(0, student.financials.paid - payment.amount), remaining: student.financials.remaining + payment.amount, installments: reconcileInstallments(student.financials.installments, Math.max(0, student.financials.paid - payment.amount)) } },
    cancellation: { id: `CAN-${Date.now()}`, paymentId: payment.id, reason: reason.trim(), cancelledBy, date: new Date().toISOString() },
  };
}

function reconcileInstallments(installments: Student['financials']['installments'], totalPaid: number): Student['financials']['installments'] {
  let remainingPaid = totalPaid;
  return installments.map(item => {
    if (item.status === 'Annulée') return item;
    const allocated = Math.min(item.amount, remainingPaid);
    remainingPaid -= allocated;
    return { ...item, status: allocated === item.amount ? 'Payée' : allocated > 0 ? 'Partiellement payée' : item.dueDate < new Date().toISOString().slice(0, 10) ? 'En retard' : 'A venir' };
  });
}
