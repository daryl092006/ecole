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

function classify(expected: number, paid: number, available: boolean | undefined) {
  return getFinancialReport([{ ...student, financials: { ...student.financials, expected, paid, remaining: expected - paid, available } }], ROLES.IT, '2026-11-01')[0];
}
assert.equal(classify(700, 600, true).overdue, 100, 'A credit must cap arrears to the positive net remaining amount.');
assert.equal(classify(0, 0, true).situation, 'SCOLARITE_SOLDEE', 'A fully credited established contract is settled.');
assert.equal(classify(0, 0, true).overdue, 0);
assert.equal(classify(500, 600, true).situation, 'SCOLARITE_SOLDEE', 'Overpayments must also classify as settled.');
assert.equal(classify(500, 600, true).overdue, 0);
assert.equal(classify(0, 0, undefined).situation, 'SANS_CONTRAT', 'Legacy objects without an established contract retain their classification.');
assert.equal(classify(0, 0, false), undefined, 'Unknown financial data remains excluded.');
assert.throws(() => getFinancialReport([student], ROLES.IT, '2026-02-30'), /invalide/);
