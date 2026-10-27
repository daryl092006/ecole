import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot as base } from './persistent-fixture';
import { loadSecurityApi, securityContext, uuid } from './security-fixture';
import { getPreviousYearConfigSummary, yearPreparation } from '../../src/services/yearPreparationService';
import type { PersistentChange, PersistentContext, RelationalSnapshot } from '../../src/types/persistence';

const yearId = uuid(1), oldYearId = uuid(2), sourceId = uuid(30), cashId = uuid(31);
function fixture(context: PersistentContext = securityContext()) {
  const snapshot: RelationalSnapshot = { revision: 1, tables: {
    academic_years: [
      { id: yearId, name: '2026-2027', status: 'BROUILLON', starts_on: '2026-10-12', ends_on: '2027-06-30' },
      { id: oldYearId, name: '2025-2026', status: 'CLOTUREE', starts_on: '2025-10-13', ends_on: '2026-06-30' },
    ],
    annual_payment_channels: [
      { id: sourceId, academic_year_id: oldYearId, name: 'TMoney', method: 'MOBILE_MONEY' },
      { id: cashId, academic_year_id: yearId, name: 'Caisse principale', method: 'ESPECES' },
    ],
  } };
  const transactions: PersistentChange[][] = [];
  let reject = false;
  const client = { rpc: async (name: string, args?: Record<string, unknown>) => {
    if (name === 'escen_backend_snapshot') return { data: structuredClone(snapshot), error: null };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: yearId }, error: null };
    if (name === 'escen_catalog_history_links') return { data: [], error: null };
    if (name !== 'escen_backend_transaction') throw new Error(`RPC inattendue : ${name}`);
    const changes = args!.p_changes as PersistentChange[];
    transactions.push(changes);
    if (reject) return { data: null, error: { message: 'Échec du retrait' } };
    for (const change of changes) {
      const existing = snapshot.tables.annual_payment_channels.find(row => row.id === change.record.id);
      if (existing) Object.assign(existing, change.record);
      else snapshot.tables.annual_payment_channels.push({ ...change.record, id: String(change.record.id) });
    }
    return { data: ++snapshot.revision, error: null };
  } };
  const api = loadSecurityApi('app/api/catalog/[collection]/route.ts', client, context) as {
    GET(request: Request, context: { params: Promise<{ collection: string }> }): Promise<Response>;
    POST(request: Request, context: { params: Promise<{ collection: string }> }): Promise<Response>;
  };
  const itemApi = loadSecurityApi('app/api/catalog/[collection]/[id]/route.ts', client, context) as {
    DELETE(request: Request, context: { params: Promise<{ collection: string; id: string }> }): Promise<Response>;
  };
  const post = (source = sourceId, revision = snapshot.revision, year = yearId) => api.POST(new Request('http://localhost/api/catalog/annual_payment_channels', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-escen-year': year },
    body: JSON.stringify({ revision, reason: 'Moyen proposé non retenu pour cette année', values: { academic_year_id: yearId, dismiss_proposal_id: source } }),
  }), { params: Promise.resolve({ collection: 'annual_payment_channels' }) });
  return { snapshot, api, itemApi, post, transactions, reject: (value: boolean) => { reject = value; } };
}

test('Retrait de proposition : autorisation, année, concurrence, idempotence et source intacte', async () => {
  const f = fixture();
  expect((await f.post(sourceId, 0)).status).toBe(409);
  expect((await f.post(sourceId, 1, 'all')).status).toBe(409);
  expect((await f.post(cashId)).status).toBe(409);
  expect((await f.post(uuid(99))).status).toBe(409);
  expect(f.transactions).toHaveLength(0);
  f.reject(true);
  expect((await f.post()).status).toBe(409);
  expect(f.snapshot.tables.annual_payment_channels).toHaveLength(2);
  f.reject(false);
  expect((await f.post()).status).toBe(200);
  expect(f.snapshot.tables.annual_payment_channels.filter(row => row.academic_year_id === yearId && !row.archived_at)).toHaveLength(1);
  expect(f.snapshot.tables.annual_payment_channels.find(row => row.id === sourceId)?.archived_at).toBeUndefined();
  expect((await f.post()).status).toBe(200);
  expect(f.transactions).toHaveLength(2);
  const forbidden = fixture(securityContext(undefined, { permissions: ['finance.view'] }));
  expect((await forbidden.post()).status).toBe(403);
  expect(forbidden.transactions).toHaveLength(0);
});

for (const width of [390, 1440]) test(`Retirer, terminer, rouvrir et recharger l’encaissement à ${width}px`, async ({ page }) => {
  const f = fixture();
  await page.setViewportSize({ width, height: 1000 });
  await authenticateFixture(page);
  await page.route('**/api/campus', route => route.fulfill({ json: { ...base, academicContext: { selection: 'current', currentYearId: yearId, selectedYearId: yearId, years: f.snapshot.tables.academic_years } } }));
  await page.route('**/api/year-preparation', route => route.fulfill({ json: {
    checks: yearPreparation(f.snapshot, yearId).filter(check => check.key === 'payments'),
    previousYear: { id: oldYearId, name: '2025-2026' }, previousSummary: getPreviousYearConfigSummary(f.snapshot, oldYearId),
  } }));
  await page.route('**/api/catalog/**', async route => {
    const req = route.request();
    const [, , , collection, id] = new URL(req.url()).pathname.split('/');
    const request = new Request(req.url(), { method: req.method(), headers: req.headers(), ...(req.method() !== 'GET' ? { body: req.postData()! } : {}) });
    const response = req.method() === 'DELETE'
      ? await f.itemApi.DELETE(request, { params: Promise.resolve({ collection, id }) })
      : await f.api[req.method() === 'POST' ? 'POST' : 'GET'](request, { params: Promise.resolve({ collection }) });
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  const openYear = async () => {
    await page.getByRole('button', { name: 'Ouvrir l’année 2026-2027', exact: true }).click();
    await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
  };
  const open = () => page.getByRole('button', { name: 'Consulter encaissement', exact: true }).click();
  const mobile = () => page.getByRole('row').filter({ hasText: 'TMoney' });
  await page.goto('/academique/referentiel?collection=academic_years');
  await openYear();
  await open();
  await mobile().getByRole('button', { name: 'Retirer', exact: true }).click();
  await page.getByRole('button', { name: 'Vérifier le retrait', exact: true }).click();
  expect(f.transactions).toHaveLength(0);
  f.reject(true);
  await page.getByRole('button', { name: 'Confirmer le retrait', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Retrait non enregistré');
  expect(f.snapshot.tables.annual_payment_channels).toHaveLength(2);
  f.reject(false);
  await page.getByRole('button', { name: 'Confirmer le retrait', exact: true }).click();
  await expect(mobile()).toHaveCount(0);
  await page.getByRole('button', { name: 'Terminer la rubrique', exact: true }).click();
  await open();
  await expect(mobile()).toHaveCount(0);
  await page.reload();
  await openYear();
  await open();
  await expect(mobile()).toHaveCount(0);
  const cash = page.getByRole('row').filter({ hasText: 'Caisse principale' });
  await cash.getByRole('button', { name: 'Archiver', exact: true }).click();
  await page.getByLabel('Motif', { exact: true }).fill('Caisse non utilisée cette année');
  await page.getByRole('button', { name: 'Vérifier l’archivage', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer l’archivage', exact: true }).click();
  await page.getByRole('button', { name: 'Terminer la rubrique', exact: true }).click();
  await page.getByRole('button', { name: 'Configurer encaissement', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Caisse principale' })).toHaveCount(0);
  await expect(mobile()).toHaveCount(0);
  expect(f.snapshot.tables.annual_payment_channels.filter(row => row.academic_year_id === yearId && !row.archived_at)).toHaveLength(0);
  expect(f.snapshot.tables.annual_payment_channels.find(row => row.id === sourceId)?.archived_at).toBeUndefined();
});
