import { adjustmentFixture } from './payment-adjustments-fixture';
import { financeId as f } from './payment-allocations-fixture';
import { securityContext, uuid } from './security-fixture';
import type { PersistentContext } from '../../src/types/persistence';

export function financialProjectionFixture(context: PersistentContext = securityContext()) {
  const fixture = adjustmentFixture(context);
  const tables = fixture.snapshot.tables;
  tables.people = [{ id: uuid(8100), firstname: 'Élise', lastname: 'Finance' }];
  tables.students[0].person_id = uuid(8100);
  tables.contract_discounts = [{ id: uuid(8101), version_id: f.version, line_id: f.line, amount: 100 }];
  tables.credit_notes = [{ id: uuid(8102), line_id: f.line, amount: 200 }];
  tables.refunds = [{ id: uuid(8103), payment_id: f.payment, amount: 100 }];
  tables.payment_allocations[0].amount = 200;
  tables.payments.push(
    { id: uuid(8110), enrollment_id: f.enrollment, status: 'PENDING', amount: 500, reference: 'PAY-PENDING', paid_on: '2026-10-18' },
    { id: uuid(8111), enrollment_id: f.enrollment, status: 'POSTED', amount: 700, reference: 'PAY-CANCELLED', paid_on: '2026-10-18' },
  );
  tables.payment_reversals = [{ id: uuid(8112), payment_id: uuid(8111), reason: 'Double saisie vérifiée' }];
  tables.enrollments.push({ id: uuid(8120), student_id: tables.students[0].id, offering_id: uuid(41), status: 'INSCRIT' });
  tables.financial_contracts.push({ id: uuid(8121), enrollment_id: uuid(8120), reference: 'CON-OTHER-YEAR' });
  tables.contract_versions.push({ id: uuid(8122), contract_id: uuid(8121), status: 'APPROVED' });
  tables.contract_lines.push({ id: uuid(8123), contract_id: uuid(8121), version_id: uuid(8122), amount: 20000 });
  tables.credit_notes.push({ id: uuid(8124), line_id: uuid(8123), amount: 1000 });
  tables.payments.push({ id: uuid(8125), enrollment_id: uuid(8120), status: 'POSTED', amount: 9000, reference: 'PAY-OTHER-YEAR', paid_on: '2026-10-18' });
  tables.refunds.push({ id: uuid(8126), payment_id: uuid(8125), amount: 3000 });
  return fixture;
}
