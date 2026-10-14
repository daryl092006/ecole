import assert from 'node:assert/strict';
import { historyValue } from './historyDisplayService';
import { enrichHistoricalStudent } from './historyStudentService';
import { HISTORY_TABLES } from '@/data/historyCatalog';
import type { HistoryCatalog, HistoryRecord } from '@/types/history';
const record = (sourceId: string, batchId: string, values: Record<string, unknown>, issues: string[] = []): HistoryRecord => ({ id: `${batchId}:${sourceId}`, sourceId, batchId, values, issues, status: 'PENDING' });
const catalog: HistoryCatalog = { totalSourceRows: 2, datasets: [], references: {
  etudiants: [record('7', 'A', { nom: 'Test', prenom: 'Alice', matricule: 'M1' }), record('7', 'B', { nom: 'Autre archive', matricule: 'M2' })],
  groups: [record('4', 'A', { nom: 'Groupe 4' })],
  filieres: [record('2', 'A', { nom: 'Informatique' })], niveaux: [record('1', 'A', { libelle: 'Licence 1' })],
  etudiant_group: [record('5', 'A', { etudiant_id: '7', group_id: '4', filiere_id: '2', niveau_id: '1', statut_scolaire: 'actif' })],
} };
const payment = record('P1', 'A', { etudiant_id: '7', montant: '125000' });
assert.equal(historyValue('etudiant_id', '7', payment, catalog), 'Alice Test');
assert.equal(historyValue('etudiant_id', '7', { ...payment, batchId: 'C' }, catalog), '#7 · Référence non retrouvée');
assert.equal(historyValue('note', null, payment, catalog), 'Non renseigné');
assert.ok(historyValue('montant', '125000', payment, catalog).endsWith('FCFA'));
assert.equal(historyValue('annule', '0', payment, catalog), 'Non');
assert.ok(HISTORY_TABLES.every(table => !Object.keys(table.fields).some(field => /password|remember_token|qr_token|ip_address|user_agent/.test(field))));
const student = { matricule: 'M1', firstname: 'Identité', lastname: 'Actuelle', filiere: '', niveau: '', groupe: '', status: 'Inscription à reprendre', groupId: '', academicYearId: '' } as Parameters<typeof enrichHistoricalStudent>[0];
const enriched = enrichHistoricalStudent(student, catalog);
assert.equal(enriched.filiere, 'Informatique');
assert.equal(enriched.groupe, 'Groupe 4');
assert.equal(enriched.firstname, 'Identité', 'The current identity must not be overwritten by historical values.');
assert.equal(enriched.groupId, '', 'No historical group identifier may be confused with a canonical identifier.');
assert.equal(enriched.historical?.sourceId, '7');
const ambiguous = { ...catalog, references: { ...catalog.references, etudiant_group: [...catalog.references.etudiant_group, record('6', 'A', { etudiant_id: '7', group_id: '8' })] } };
assert.equal(enrichHistoricalStudent(student, ambiguous).groupe, '', 'Multiple memberships must not be resolved by guessing.');
console.log('Vérification réussie : données historiques, références par archive, identités actuelles préservées et aucun rattachement inventé.');
