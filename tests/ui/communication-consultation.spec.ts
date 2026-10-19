import { test, expect, type Page } from '@playwright/test';
import { ROLES, type RoleName } from '../../src/types/permissions';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';
import { filterRelationalSnapshot } from '../../src/services/persistentPermissionsService';
import { filterSnapshotForAcademicYear } from '../../src/services/academicYearScopeService';
import type { PersistentContext, RelationalSnapshot } from '../../src/types/persistence';
import { authenticateFixture, fixtureCapabilities, historyCatalog } from './persistent-fixture';
import { expectWorkspaceFits } from './helpers';

const year = '10000000-0000-4000-8000-000000000001';
const otherYear = '10000000-0000-4000-8000-000000000002';
const source: RelationalSnapshot = { revision: 1, tables: {
  academic_years: [year, otherYear].map((id, index) => ({ id, name: index ? '2025-2026' : '2026-2027', status: 'OUVERTE', starts_on: index ? '2025-10-01' : '2026-10-01', ends_on: index ? '2026-07-01' : '2027-07-01' })),
  people: [{ id: 'P1', firstname: 'Alice', lastname: 'Exemple' }], students: [{ id: 'S1', person_id: 'P1', matricule: 'ETU-001' }],
  academic_offerings: [{ id: 'O1', academic_year_id: year }], enrollments: [{ id: 'N1', student_id: 'S1', offering_id: 'O1' }],
  groups: [{ id: 'G1', academic_year_id: year }], group_offerings: [{ id: 'GO1', group_id: 'G1', offering_id: 'O1' }], enrollment_groups: [{ id: 'EG1', enrollment_id: 'N1', group_id: 'G1' }],
  communications: [
    { id: 'C1', title: 'Annonce commune', content: 'Consultez le planning validé.', academic_year_id: year, published_at: '2000-01-01T00:00:00Z' },
    { id: 'C2', title: 'Brouillon réservé', content: 'Préparation privée.', academic_year_id: year, published_at: null },
    { id: 'C3', title: 'Autre année', content: 'Ancienne activité.', academic_year_id: otherYear, published_at: '2000-01-01T00:00:00Z' },
    { id: 'C4', title: 'Message retiré', content: 'Ne plus diffuser.', academic_year_id: year, published_at: '2000-01-01T00:00:00Z', withdrawn_at: '2001-01-01T00:00:00Z', withdrawal_reason: 'Information remplacée.' },
  ],
  communication_audiences: ['C1','C2','C3','C4'].map(id => ({ id: `A-${id}`, communication_id: id, all_accounts: true })),
  communication_files: [{ id: 'F1', communication_id: 'C1', file_id: 'PRIVATE' }],
} };

async function install(page: Page, role: RoleName, unavailable = false, empty = false) {
  await authenticateFixture(page);
  const roleCode = Object.entries(ROLES).find(([, name]) => name === role)![0];
  const context: PersistentContext = { accountId: 'ACCOUNT', personId: 'P1', authUserId: 'AUTH', roleCode, role,
    permissions: ROLE_ACCESS[role].permissions, studentId: role === ROLES.STUD ? 'S1' : null, teacherId: null,
    grants: [{ role_code: roleCode, role_name: role, site_id: null, group_id: null, academic_year_id: null }] };
  await page.route('**/api/session', route => route.fulfill({ json: { capabilities: { ...fixtureCapabilities, [role]: { permissions: context.permissions, globalAccess: role !== ROLES.STUD } }, accountId: 'ACCOUNT', name: 'Alice Exemple', email: 'alice@example.test', role, availableRoles: [role], studentId: context.studentId, teacherId: null, matricule: context.studentId ? 'ETU-001' : null, mustChangePassword: false } }));
  let reads = 0;
  await page.route('**/api/campus', route => {
    reads++;
    if (unavailable) return route.fulfill({ status: 503, json: { error: 'Communications indisponibles.' } });
    const selection = route.request().headers()['x-escen-year'];
    const selected = selection === 'all' ? null : selection === otherYear ? otherYear : year;
    const currentSource = empty ? { ...source, tables: { ...source.tables, communications: [], communication_audiences: [], communication_files: [] } } : source;
    const scoped = filterSnapshotForAcademicYear(filterRelationalSnapshot(currentSource, context), selected);
    return route.fulfill({ json: { ...scoped, academicContext: { currentYearId: year, selectedYearId: selected, selection: selection || 'current', years: source.tables.academic_years } } });
  });
  return () => reads;
}

for (const width of [390,1440]) for (const role of [ROLES.MKT,ROLES.STUD]) test(`Consultation connectée ${role} à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const reads = await install(page, role);
  await page.goto(role === ROLES.MKT ? '/communication/annonces' : '/mon-espace/annonces');
  await expect(page.getByRole('row').filter({ hasText: 'Annonce commune' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Autre année' })).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'Brouillon réservé' })).toHaveCount(role === ROLES.MKT ? 1 : 0);
  await expect(page.getByRole('row').filter({ hasText: 'Message retiré' })).toHaveCount(role === ROLES.MKT ? 1 : 0);
  await page.getByRole('row').filter({ hasText: 'Annonce commune' }).getByRole('button', { name: 'Ouvrir le détail', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Consultez le planning validé.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
  await page.locator('main input[type="search"]').fill('aucun résultat attendu');
  await expect(page.getByText('Aucun résultat pour cette recherche.', { exact: true })).toBeVisible();
  await page.locator('main input[type="search"]').fill('');
  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: 'Annonce commune' })).toBeVisible();
  expect(reads()).toBeGreaterThanOrEqual(2);
  await expectWorkspaceFits(page);
  await page.screenshot({ path: `.tmp/interface/communication-${role === ROLES.MKT ? 'gestion' : 'destinataire'}-${width}.png`, fullPage: true });
});

for (const width of [390,1440]) for (const route of ['/communication/annonces','/mon-espace/annonces']) test(`Communications vides sans substitution d’archives : ${route} à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await install(page, ROLES.IT, false, true);
  const archiveReads: string[] = [];
  let catalogReads = 0;
  await page.route('**/api/history*', route => {
    const table = new URL(route.request().url()).searchParams.get('table');
    if (table) {
      archiveReads.push(table);
      return route.fulfill({ json: { table, total: 1, offset: 0, limit: 50, records: [{ id: 'archive-only', sourceId: 'old-1', batchId: 'old-batch', status: 'PENDING', issues: [], values: { title: 'Archive à ne pas substituer', content: 'Ancienne publication' } }] } });
    }
    catalogReads++;
    return route.fulfill({ json: { ...historyCatalog, datasets: historyCatalog.datasets.map(dataset => dataset.table === 'blogs' ? { ...dataset, count: 1 } : dataset) } });
  });
  await page.goto(route);
  await expect(page.getByText('Aucun enregistrement pour cette rubrique dans l’année et le dossier consultés.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lire les publications', exact: true })).toHaveCount(0);
  await expect(page.getByText('Archive à ne pas substituer', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Exporter les 0 résultat(s)', exact: true })).toBeDisabled();
  await page.getByLabel('Année consultée', { exact: true }).selectOption('all');
  await expect(page.getByText('Aucun enregistrement pour cette rubrique dans l’année et le dossier consultés.', { exact: true })).toBeVisible();
  expect(archiveReads).toEqual([]);
  expect(catalogReads).toBeGreaterThan(0);
  await expectWorkspaceFits(page);
});

test('Erreur de chargement des communications distincte d’un résultat vide', async ({ page }) => {
  await install(page, ROLES.MKT, true);
  await page.goto('/communication/annonces');
  await expect(page.getByRole('heading', { name: 'Chargement impossible', exact: true })).toBeVisible();
  await expect(page.getByText('Communications indisponibles.', { exact: true })).toBeVisible();
  await expect(page.getByText('Aucun résultat pour cette recherche.', { exact: true })).toHaveCount(0);
});
