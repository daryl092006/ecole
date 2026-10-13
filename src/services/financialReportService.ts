import type { RoleName, Student } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';
export type FinancialSituation = 'SANS_CONTRAT' | 'SCOLARITE_SOLDEE' | 'A_JOUR' | 'EN_RETARD';
export interface FinancialReportRow { student: Student; situation: FinancialSituation; overdue: number; }
export function getFinancialReport(students: Student[], role: RoleName, asOfDate = new Date().toISOString().slice(0, 10)): FinancialReportRow[] {
  if (!hasPermission(role, 'finance.report.view')) throw new Error('Rapport financier non autorisé.');
  const parsedDate = new Date(asOfDate + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== asOfDate) throw new Error('Date de référence invalide.');
  return students.map(student => {
    let paid = student.financials.paid;
    let overdue = 0;
    for (const installment of [...student.financials.installments].filter(item => item.status !== 'Annulée').sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
      const allocated = Math.min(installment.amount, paid);
      paid -= allocated;
      if (installment.dueDate < asOfDate) overdue += installment.amount - allocated;
    }
    const situation: FinancialSituation = student.financials.expected === 0 ? 'SANS_CONTRAT'
      : student.financials.remaining === 0 ? 'SCOLARITE_SOLDEE' : overdue > 0 ? 'EN_RETARD' : 'A_JOUR';
    return { student, situation, overdue };
  });
}
