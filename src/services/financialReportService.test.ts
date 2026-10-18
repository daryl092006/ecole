import assert from 'node:assert/strict';
import { getFinancialReport } from './financialReportService';
import type { Student } from '@/types';
import { ROLES } from '@/types/permissions';

const student = { matricule: 'TEST', financials: { available: true, expected: 1000, paid: 600, remaining: 400, installments: [
  { dueDate: '2026-10-01', amount: 500, settledAmount: 100, status: 'Partiellement payée' },
  { dueDate: '2026-12-01', amount: 500, settledAmount: 500, status: 'Payée' },
] } } as Student;
const report = getFinancialReport([student], ROLES.IT, '2026-11-01')[0];
assert.equal(report.overdue, 400, 'Manual allocation to a future installment must not settle an older one in the report.');
assert.equal(report.situation, 'EN_RETARD');
assert.equal(getFinancialReport([{ ...student, financials: { ...student.financials, installments: student.financials.installments.map(({ dueDate, amount, status }) => ({ dueDate, amount, status })) } }], ROLES.IT, '2026-11-01')[0].overdue, 0, 'Legacy objects without settlement data retain their chronological calculation.');
