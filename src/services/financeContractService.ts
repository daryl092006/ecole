import type { Fee, RoleName, Student } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';
import { createMockId } from '@/utils/createMockId';
export function createFinancialContract(student: Student, amount: number, dueDates: string[], role: RoleName): { student: Student; fee: Fee } {
  if (!hasPermission(role, 'payment.record')) throw new Error('Permission financière insuffisante.');
  if (student.financials.expected !== 0 || student.financials.paid !== 0) throw new Error('Un contrat existe déjà. Sa révision nécessite un workflow dédié.');
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Montant entier positif obligatoire.');
  if (!dueDates.length || dueDates.some(date => !/^\d{4}-\d{2}-\d{2}$/.test(date)) || new Set(dueDates).size !== dueDates.length) throw new Error('Dates d’échéance distinctes et valides obligatoires.');
  const dates = [...dueDates].sort();
  const base = Math.floor(amount / dates.length);
  if (!base) throw new Error('Montant trop petit pour cet échéancier.');
  const installments = dates.map((dueDate, index) => ({ dueDate, amount: base + (index === dates.length - 1 ? amount % dates.length : 0), status: 'A venir' as const }));
  return {
    fee: { id: createMockId('FEE'), code: `SCOL-${student.matricule}`, label: 'Frais de scolarité', amount, academicYearId: student.academicYearId, active: true },
    student: { ...student, financials: { expected: amount, paid: 0, remaining: amount, installments }, history: [...student.history, { date: new Date().toISOString(), text: `Contrat financier ${amount} FCFA enregistré par ${role}` }] },
  };
}
