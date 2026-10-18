import { paymentFixture, financeId as f } from './payment-allocations-fixture';
import { loadSecurityApi, securityContext, securityIds as id, uuid } from './security-fixture';
import type { PersistentContext } from '../../src/types/persistence';

export function adjustmentFixture(context: PersistentContext = securityContext(), mutate = false) {
  const snapshot = paymentFixture(context).snapshot;
  const tables = snapshot.tables;
  tables.contract_lines.forEach((row, index) => { row.description = `Frais ${index + 1}`; });
  tables.receipts = [{ id: uuid(6000), payment_id: f.payment, reference: 'REC-INITIAL', issued_at: '2026-09-01T10:00:00Z', snapshot: { amount: 400 } }];
  const transactions: Record<string, unknown>[] = [];
  const state = { fail: false };
  const client = { async rpc(name: string, args: Record<string, unknown> = {}) {
    if (name === 'escen_backend_snapshot') return { data: snapshot, error: null };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: id.year }, error: null };
    if (name !== 'escen_payment_adjustment') throw new Error(`RPC inattendue : ${name}`);
    transactions.push(args);
    if (state.fail || args.p_expected_revision !== snapshot.revision) return { data: null, error: new Error('SQL_ERROR') };
    if (mutate) {
      const entity = String(args.p_entity_id), amount = Number(args.p_amount);
      const recordId = crypto.randomUUID();
      if (args.p_action === 'cancel') (tables.payment_reversals ||= []).push({ id: recordId, payment_id: entity, actor_id: context.accountId, reason: args.p_reason, reversed_at: '2026-10-18T10:00:00Z' });
      if (args.p_action === 'refund') (tables.refunds ||= []).push({ id: recordId, payment_id: entity, amount, reference: args.p_reference, actor_id: context.accountId, reason: args.p_reason, refunded_at: '2026-10-18T10:00:00Z' });
      if (args.p_action === 'credit') (tables.credit_notes ||= []).push({ id: recordId, line_id: entity, amount, actor_id: context.accountId, reason: args.p_reason, issued_at: '2026-10-18T10:00:00Z' });
      snapshot.revision++;
    }
    return { data: mutate ? snapshot.revision : 5, error: null };
  } };
  type Handler = (request: Request, params: { params: Promise<{ matricule: string }> }) => Promise<Response>;
  const api = loadSecurityApi('app/api/students/[matricule]/operations/route.ts', client, context) as { GET: Handler; POST: Handler };
  const params = { params: Promise.resolve({ matricule: 'ESCEN-FIN-001' }) };
  const get = (year = id.year) => api.GET(new Request('http://local.test/api/students/ESCEN-FIN-001/operations', { headers: { 'x-escen-year': year } }), params);
  const getReceipt = (receiptId: string, year = id.year) => api.GET(new Request(`http://local.test/api/students/ESCEN-FIN-001/operations?receiptId=${encodeURIComponent(receiptId)}`, { headers: { 'x-escen-year': year } }), params);
  const post = (body: Record<string, unknown>, year = id.year) => api.POST(new Request('http://local.test/api/students/ESCEN-FIN-001/operations', { method: 'POST', headers: { 'x-escen-year': year }, body: JSON.stringify({ revision: snapshot.revision, enrollmentId: f.enrollment, reason: 'Décision financière vérifiée', ...body }) }), params);
  const cancel = () => ({ action: 'cancel_payment', paymentId: f.payment });
  const refund = (amount = 100) => ({ action: 'refund_payment', paymentId: f.payment, amount, reference: 'REF-TEST' });
  const credit = (amount = 100) => ({ action: 'credit_note', lineId: f.line, amount });
  return { snapshot, transactions, state, get, getReceipt, post, cancel, refund, credit };
}
