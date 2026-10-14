import { expect, type Page } from '@playwright/test';
import { ROLES } from '../../src/types/permissions';
import type { RelationalSnapshot } from '../../src/types/persistence';
import type { HistoryCatalog, HistoryRecord } from '../../src/types/history';
import { HISTORY_TABLES } from '../../src/data/historyCatalog';
export const ACCOUNT_IDS = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003'];
const record = (id: string, values: Record<string, unknown>, issues: string[] = []): HistoryRecord => ({ id: `record-${id}`, sourceId: id, batchId: 'batch-fixture', status: 'PENDING', values, issues });
const archiveRows: Record<string, HistoryRecord[]> = {
  etudiants: [record('101', { id: '101', nom: 'Exemple', prenom: 'Alice', email: 'alice@example.test', matricule: 'ESCEN-TEST-001', statut: 'actif' })],
  etudiant_group: [record('201', { etudiant_id: '101', group_id: 'G1', niveau_id: 'L1', filiere_id: 'F1', annee_scolaire_id: 'Y1', statut_scolaire: 'actif' })],
  groups: [record('G1', { nom: 'Groupe A' })], niveaux: [record('L1', { libelle: 'Licence 1' })], filieres: [record('F1', { nom: 'Informatique' })],
  annee_scolaires: [record('Y1', { nom: '2025-2026', date_debut: '2025-10-13', date_fin: '2026-06-30', active: '1' })],
  matieres: [record('M1', { nom: 'Algorithmique', code: 'ALGO' })], unite_valeurs: [record('UV1', { matiere_id: 'M1', coefficient: '2' })],
  notes: [record('N1', { etudiant_id: '101', unite_valeur_id: 'UV1', evaluation_id: 'E1', note: '15', annee_scolaire_id: 'Y1' }), record('N2', { etudiant_id: '404', note: null }, ['SOURCE_PARENT_MISSING'])],
  evaluations: [record('E1', { id: 'E1', unite_valeur_id: 'UV1', group_id: 'G1', date: '2026-06-12', type: 'Examen', published: '1' })],
  frais_etudiants: [record('FE1', { etudiant_id: '101', annee_scolaire_id: 'Y1', montant_initial: '480000', montant_apres_bourse: '480000', statut: 'en_cours' })],
  paiements: [record('PA1', { etudiant_id: '101', montant: '125000', nature_paiement: 'scolarite', mode_paiement: 'especes', status: 'valide', date_paiement: '2026-06-01' })],
  emploi_du_temps: [record('EDT1', { uv_id: 'UV1', group_id: 'G1', debut: '2026-06-12 08:00:00', fin: '2026-06-12 10:00:00', type_programme: 'Cours' })],
  users: [record('102', { nom: 'Technique', prenom: 'Jean', email: 'it@example.test' })],
};
export const historyCatalog: HistoryCatalog = { totalSourceRows: 20, datasets: HISTORY_TABLES.map(spec => ({ table: spec.table, count: archiveRows[spec.table]?.length || 0, flagged: archiveRows[spec.table]?.filter(row => row.issues.length).length || 0 })), references: archiveRows };
export const snapshot: RelationalSnapshot = { revision: 1, tables: {
  people: [{ id: 'P1', firstname: 'Alice', lastname: 'Exemple', email: 'alice@example.test', phone: '90123456' }, { id: 'P2', firstname: 'Jean', lastname: 'Technique', email: 'it@example.test' }, { id: 'P3', firstname: 'Compte', lastname: 'Sans rôle', email: 'sans-role@example.test' }],
  students: [{ id: 'S1', person_id: 'P1', matricule: 'ESCEN-TEST-001' }],
  accounts: [{ id: ACCOUNT_IDS[0], person_id: 'P1', active: false, account_type: 'student' }, { id: ACCOUNT_IDS[1], person_id: 'P2', active: true, account_type: 'staff' }, { id: ACCOUNT_IDS[2], person_id: 'P3', active: true, account_type: 'staff' }],
  roles: [{ id: 'R1', code: 'STUD', active: true }, { id: 'R2', code: 'IT', active: true }],
  role_grants: [{ id: 'G1', account_id: ACCOUNT_IDS[0], role_id: 'R1', valid_from: '2020-01-01T00:00:00Z', valid_until: null }, { id: 'G2', account_id: ACCOUNT_IDS[1], role_id: 'R2', valid_from: '2020-01-01T00:00:00Z', valid_until: null }],
} };
export async function authenticateFixture(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('sb-zmxapemyktxhppdxenzb-auth-token', JSON.stringify({ access_token: 'fixture-auth-token', refresh_token: 'fixture-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'auth-fixture', aud: 'authenticated', role: 'authenticated', email: 'it@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }));
  });
  await page.route('**/auth/v1/**', route => route.fulfill({ json: { id: 'auth-fixture', email: 'it@example.test' } }));
  await page.route('**/api/session', route => route.fulfill({ json: { accountId: ACCOUNT_IDS[1], name: 'Jean Technique', email: 'it@example.test', role: ROLES.IT, availableRoles: [ROLES.IT, ROLES.MKT], studentId: null, teacherId: null, matricule: null, mustChangePassword: false } }));
  await page.route('**/api/history*', async route => {
    expect(route.request().headers().authorization).toBe('Bearer fixture-auth-token');
    const params = new URL(route.request().url()).searchParams;
    const table = params.get('table');
    if (!table) { await route.fulfill({ json: historyCatalog }); return; }
    const query = params.get('query') || ''; const flagged = params.get('flagged') === 'true'; const studentId = params.get('studentId');
    const records = (archiveRows[table] || []).filter(record => (!flagged || record.issues.length) && (!studentId || record.values.etudiant_id === studentId) && JSON.stringify(record.values).includes(query));
    await route.fulfill({ json: { table, total: records.length, records: records.slice(Number(params.get('offset') || 0), Number(params.get('offset') || 0) + 50), offset: Number(params.get('offset') || 0), limit: 50 } });
  });
}
