import assert from 'node:assert/strict';
import { paymentReceiptDocument, paymentReceiptMarkup } from './paymentReceiptService';
import type { RelationalSnapshot } from '@/types/persistence';

const snapshot: RelationalSnapshot = { revision: 1, tables: {
  people: [{ id: 'PERSON', firstname: 'Élise', lastname: '<img src=x onerror=alert(1)>' }],
  students: [{ id: 'S', person_id: 'PERSON', matricule: 'ETU-1' }],
  enrollments: [{ id: 'E', student_id: 'S', offering_id: 'O' }],
  academic_offerings: [{ id: 'O', academic_year_id: 'Y' }],
  academic_years: [{ id: 'Y', name: '2026-2027' }],
  payments: [{ id: 'P', enrollment_id: 'E', amount: 500, status: 'POSTED', reference: 'PAY-1', payer_name: '<script>evil()</script>', method: 'ESPECES', provider: 'Caisse', paid_on: '2026-09-01' }],
  receipts: [{ id: 'R', payment_id: 'P', reference: 'REC-1', issued_at: '2026-09-01T10:00:00Z', snapshot: { amount: 500, secret: 'private-snapshot' } }],
  refunds: [{ id: 'F', payment_id: 'P', reference: 'REF-1', amount: 100, reason: '<b>Motif</b>', refunded_at: '2026-10-01T10:00:00Z' }],
} };
const original = structuredClone(snapshot);
const document = paymentReceiptDocument(snapshot, new Set(['E']), 'R')!;
assert.equal(document.net, 400); assert.equal(document.refunded, 100);
assert.equal(document.academicYear, '2026-2027'); assert.equal(document.status, 'POSTED');
assert.equal(paymentReceiptDocument(snapshot, new Set(['OTHER']), 'R'), null);
assert.equal(paymentReceiptDocument(snapshot, new Set(['E']), 'MISSING'), null);
const markup = paymentReceiptMarkup(document);
assert.ok(markup.includes('VALIDÉ')); assert.ok(markup.includes('400 FCFA'));
assert.ok(markup.includes('&lt;script&gt;evil()&lt;/script&gt;'));
assert.ok(markup.includes('&lt;img src=x onerror=alert(1)&gt;'));
assert.ok(!markup.includes('<script>')); assert.ok(!markup.includes('private-snapshot'));
assert.deepEqual(snapshot, original);
snapshot.tables.payment_reversals = [{ id: 'X', payment_id: 'P', reason: '<i>Double saisie</i>' }];
const cancelled = paymentReceiptDocument(snapshot, new Set(['E']), 'R')!;
assert.equal(cancelled.net, 0); assert.equal(cancelled.amount, 500);
assert.ok(paymentReceiptMarkup(cancelled).includes('REÇU ANNULÉ'));
assert.ok(paymentReceiptMarkup(cancelled).includes('&lt;i&gt;Double saisie&lt;/i&gt;'));
snapshot.tables.payment_reversals = []; snapshot.tables.payments[0].status = 'PENDING';
const pending = paymentReceiptDocument(snapshot, new Set(['E']), 'R')!;
assert.equal(pending.net, 0); assert.ok(paymentReceiptMarkup(pending).includes('EN ATTENTE DE VALIDATION'));
snapshot.tables.payments[0].paid_on = null;
const undated = paymentReceiptDocument(snapshot, new Set(['E']), 'R')!;
assert.equal(undated.paidOn, '');
assert.ok(paymentReceiptMarkup(undated).includes('<th>Date du paiement</th><td>Non renseignée</td>'));
console.log('Reçus : inscription autorisée, état courant, remboursements, montants d’origine et échappement HTML vérifiés.');
