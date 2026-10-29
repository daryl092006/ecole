import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, reviewSpreadsheet } from './review-spreadsheet-finances.mjs';

const headers = ['Matricule', 'Nom & Prénoms', 'Niveau', 'Filières Abrév.', "Frais d'inscription", "Total à payer sans frais d'inscription", "Total à payer avec frais d'inscription", 'Modalité de paiement', 'Nb échéances', 'Inscription payée', ...Array.from({ length: 15 }, (_, i) => `Payé M${i + 1}`)];
const row = ['EXISTANT', 'DOE Jane', 'L1', 'IA', '50000', '100000', '150000', 'Annuel', '1', '50000', '', '', '100000', ...Array(12).fill('')];
const snapshot = { revision: 72, tables: {
  academic_years: [{ id: 'year', code: '2026-2027' }],
  academic_offerings: [{ id: 'offering', academic_year_id: 'year', curriculum_id: 'curriculum', level_id: 'level' }],
  curricula: [{ id: 'curriculum', program_id: 'program' }],
  levels: [{ id: 'level', code: 'L1' }], programs: [{ id: 'program', code: 'IA-GL' }],
  students: [{ id: 'student', person_id: 'person', matricule: 'EXISTANT' }],
  people: [{ id: 'person', firstname: 'Jane', lastname: 'DOE' }],
  enrollments: [{ id: 'enrollment', student_id: 'student', offering_id: 'offering' }],
  payments: [{ id: 'payment', enrollment_id: 'enrollment', amount: 100000, status: 'POSTED' }],
} };
const raw = rows => [headers, ...rows].map(cells => cells.join('\t')).join('\n');

test('rapproche IA-GL et conserve les montants déjà encaissés sans inventer de métadonnées', () => {
  const report = reviewSpreadsheet(raw([row]), snapshot);
  assert.equal(report.summary.missingOrAmbiguousOfferings, 0);
  assert.equal(report.summary.recordedInSpreadsheet, 150000);
  assert.equal(report.rows[0].payments[1].month, '2026-10');
  assert.equal(report.rows[0].payments[1].paidOn, null);
  assert.equal(report.rows[0].payments[1].method, null);
  assert.equal(report.rows[0].existingPayments.length, 1);
  assert.equal(report.remoteWrites, 0);
});
test('ne supprime pas silencieusement les lignes présumées en double', () => {
  assert.equal(reviewSpreadsheet(raw([row, row]), snapshot).rows.length, 2);
});
test('signale les données financières invalides plutôt que de les convertir en zéro', () => {
  assert.throws(() => parseAmount('50O00'));
  assert.throws(() => parseAmount('-100'));
  assert.throws(() => parseAmount('1,5'));
  assert.equal(parseAmount('50 000'), 50000);
  const bad = [...row]; bad[4] = 'inconnu';
  assert.equal(reviewSpreadsheet(raw([bad]), snapshot).rows[0].registrationFee, null);
});
test('bloque le rapprochement ambigu et les colonnes absentes', () => {
  const ambiguous = structuredClone(snapshot);
  ambiguous.tables.academic_offerings.push({ ...ambiguous.tables.academic_offerings[0], id: 'other' });
  assert.equal(reviewSpreadsheet(raw([row]), ambiguous).summary.missingOrAmbiguousOfferings, 1);
  assert.throws(() => reviewSpreadsheet('Matricule\tNom & Prénoms', snapshot), /Colonne manquante/);
});
