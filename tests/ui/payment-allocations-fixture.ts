import { evaluationSecurityRoute, loadSecurityApi, securityContext, securityIds as id, uuid } from './security-fixture';
import type { PersistentChange, PersistentContext } from '../../src/types/persistence';

export const financeId = { enrollment: uuid(500), contract: uuid(3000), version: uuid(3001), line: uuid(3002), otherLine: uuid(3003), first: uuid(3004), second: uuid(3005), payment: uuid(3010) };
export function paymentFixture(context: PersistentContext = securityContext(), mutate = false) {
  const f = financeId;
  const snapshot = evaluationSecurityRoute(context).snapshot;
  const tables = snapshot.tables;
  tables.students[0].matricule = 'ESCEN-FIN-001';
  tables.enrollments[0].enrolled_on = '2026-01-01';
  tables.financial_contracts = [{ id: f.contract, enrollment_id: f.enrollment, reference: 'CON-FIN' }];
  tables.contract_versions = [{ id: f.version, contract_id: f.contract, status: 'APPROVED' }];
  tables.contract_lines = [{ id: f.line, contract_id: f.contract, version_id: f.version, amount: 900 }, { id: f.otherLine, contract_id: f.contract, version_id: f.version, amount: 300 }];
  tables.installments = [{ id: f.first, version_id: f.version, due_on: '2026-10-01', position: 2, amount: 600, description: 'Première échéance' }, { id: f.second, version_id: f.version, due_on: '2026-11-01', position: 1, amount: 600, description: 'Deuxième échéance' }];
  tables.payments = [{ id: f.payment, enrollment_id: f.enrollment, amount: 400, reference: 'PAY-INITIAL', paid_on: '2026-09-01', status: 'POSTED' }];
  tables.payment_allocations = [{ id: uuid(3020), payment_id: f.payment, enrollment_id: f.enrollment, contract_id: f.contract, version_id: f.version, line_id: f.line, installment_id: f.first, amount: 300 }, { id: uuid(3021), payment_id: f.payment, enrollment_id: f.enrollment, contract_id: f.contract, version_id: f.version, line_id: f.otherLine, installment_id: f.first, amount: 100 }];
  tables.annual_payment_channels = [{ id: uuid(3030), academic_year_id: id.year, method: 'ESPECES', name: 'Caisse ESCEN' }];
  const transactions: { name: string; args: Record<string, unknown>; changes: PersistentChange[] }[] = [];
  const state = { fail: false };
  const client = { async rpc(name: string, args: Record<string, unknown> = {}) {
    if (name === 'escen_backend_snapshot') return { data: snapshot, error: null };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: id.year }, error: null };
    if (!['escen_payment_transaction', 'escen_backend_transaction'].includes(name)) throw new Error(`RPC inattendue : ${name}`);
    const changes = args.p_changes as PersistentChange[];
    transactions.push({ name, args, changes });
    if (state.fail || args.p_expected_revision !== snapshot.revision) return { data: null, error: new Error('CONCURRENT_UPDATE') };
    if (mutate) {
      for (const change of changes) {
        const collection = tables[change.table] ||= [];
        if (change.operation === 'insert') collection.push(change.record as typeof collection[number]);
        else Object.assign(collection.find(row => row.id === change.record.id)!, change.record);
      }
      snapshot.revision++;
    }
    return { data: mutate ? snapshot.revision : 5, error: null };
  } };
  type Handler = (request: Request, context: { params: Promise<{ matricule: string }> }) => Promise<Response>;
  const api = loadSecurityApi('app/api/students/[matricule]/operations/route.ts', client, context) as { GET: Handler; POST: Handler };
  const params = { params: Promise.resolve({ matricule: 'ESCEN-FIN-001' }) };
  const get = (year = id.year) => api.GET(new Request('http://local.test/api/students/ESCEN-FIN-001/operations', { headers: { 'x-escen-year': year } }), params);
  const post = (body: Record<string, unknown>, year = id.year) => api.POST(new Request('http://local.test/api/students/ESCEN-FIN-001/operations', { method: 'POST', headers: { 'x-escen-year': year }, body: JSON.stringify({ revision: snapshot.revision, enrollmentId: f.enrollment, reason: 'Encaissement vérifié', ...body }) }), params);
  const payment = (amount = 500) => ({ action: 'payment', amount, payer: 'Parent de recette', reference: `PAY-${amount}`, provider: 'Caisse ESCEN', method: 'ESPECES', paidOn: '2026-10-18' });
  const reallocate = () => ({ action: 'reallocate_payment', paymentId: f.payment, targets: [{ installmentId: f.second, amount: 350 }] });
  return { snapshot, transactions, state, get, post, payment, reallocate };
}
