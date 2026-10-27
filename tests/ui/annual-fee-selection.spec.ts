import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot as base } from './persistent-fixture';
import { loadSecurityApi, securityContext, uuid } from './security-fixture';
import type { PersistentChange, PersistentContext, RelationalSnapshot } from '../../src/types/persistence';

const yearId = uuid(1), levelId = uuid(10), firstProgram = uuid(11), secondProgram = uuid(12), masterProgram = uuid(13), masterLevel = uuid(14);
function fixture(context: PersistentContext = securityContext()) {
  const snapshot: RelationalSnapshot = { revision: 1, tables: {
    academic_years: [{ id: yearId, name: '2026-2027', status: 'BROUILLON', starts_on: '2026-10-12', ends_on: '2027-06-30' }],
    programs: [{ id: firstProgram, name: 'Finance Digitale' }, { id: secondProgram, name: 'Marketing Digital' }, { id: masterProgram, name: 'Management de Projets & Transformation Digitale' }],
    levels: [{ id: levelId, name: 'Licence 1' }, { id: masterLevel, name: 'Master 1' }], annual_fee_schedules: [],
    curricula: [
      { id: uuid(20), program_id: firstProgram, level_id: levelId },
      { id: uuid(21), program_id: secondProgram, level_id: levelId },
      { id: uuid(22), program_id: masterProgram, level_id: masterLevel },
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
    if (reject) return { data: null, error: { message: 'Échec du lot' } };
    for (const change of changes) {
      const existing = snapshot.tables.annual_fee_schedules.find(row => row.id === change.record.id);
      if (existing) Object.assign(existing, change.record);
      else snapshot.tables.annual_fee_schedules.push(change.record as typeof existing & { id: string });
    }
    return { data: ++snapshot.revision, error: null };
  } };
  const api = loadSecurityApi('app/api/catalog/[collection]/route.ts', client, context) as {
    GET(request: Request, context: { params: Promise<{ collection: string }> }): Promise<Response>;
    POST(request: Request, context: { params: Promise<{ collection: string }> }): Promise<Response>;
  };
  const itemApi = loadSecurityApi('app/api/catalog/[collection]/[id]/route.ts', client, context) as {
    PATCH(request: Request, context: { params: Promise<{ collection: string; id: string }> }): Promise<Response>;
  };
  const values = { academic_year_id: yearId, category: 'SCOLARITE', program_ids: [firstProgram, secondProgram], level_id: levelId, delivery_mode: 'Présentiel', amount: 480000 };
  const post = (input: Record<string, unknown> = values, revision = snapshot.revision, selectedYear = yearId) => api.POST(new Request('http://localhost/api/catalog/annual_fee_schedules', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-escen-year': selectedYear },
    body: JSON.stringify({ revision, reason: 'Tarif validé pour les filières choisies', values: input }),
  }), { params: Promise.resolve({ collection: 'annual_fee_schedules' }) });
  const patch = (id: string, input: Record<string, unknown> = values) => itemApi.PATCH(new Request(`http://localhost/api/catalog/annual_fee_schedules/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-escen-year': yearId },
    body: JSON.stringify({ revision: snapshot.revision, reason: 'Modifier le tarif existant', values: input }),
  }), { params: Promise.resolve({ collection: 'annual_fee_schedules', id }) });
  return { snapshot, transactions, api, itemApi, values, post, patch, reject: (value: boolean) => { reject = value; } };
}

test('Tarifs multiples : autorisation, année, révision, doublons et échec du lot', async () => {
  const f = fixture();
  expect((await f.post(f.values, 0)).status).toBe(409);
  expect((await f.post(f.values, 1, 'all')).status).toBe(409);
  expect((await f.post({ ...f.values, program_ids: [firstProgram, firstProgram] })).status).toBe(400);
  expect((await f.post({ ...f.values, program_ids: [firstProgram, uuid(99)] })).status).toBe(400);
  expect((await f.post({ ...f.values, program_ids: [masterProgram] })).status).toBe(400);
  const { program_ids: _programIds, ...singleValues } = f.values;
  void _programIds;
  expect((await f.post({ ...singleValues, program_id: masterProgram })).status).toBe(400);
  expect(f.transactions).toHaveLength(0);
  f.reject(true);
  expect((await f.post()).status).toBe(409);
  expect(f.snapshot.tables.annual_fee_schedules).toHaveLength(0);
  f.reject(false);
  expect((await f.post()).status).toBe(201);
  expect(f.snapshot.tables.annual_fee_schedules).toHaveLength(2);
  expect(f.transactions[1].map(change => change.record.program_id)).toEqual([firstProgram, secondProgram]);
  expect((await f.post()).status).toBe(400);
  expect(f.transactions).toHaveLength(2);
  const forbidden = fixture(securityContext(undefined, { permissions: ['finance.view'] }));
  expect((await forbidden.post()).status).toBe(403);
  expect(forbidden.transactions).toHaveLength(0);
  const editing = fixture();
  expect((await editing.post({ ...editing.values, program_ids: [firstProgram] })).status).toBe(201);
  const originalId = editing.snapshot.tables.annual_fee_schedules[0].id;
  expect((await editing.patch(originalId)).status).toBe(400);
  expect(editing.transactions).toHaveLength(1);
  expect((await editing.patch(originalId, { ...editing.values, program_ids: [secondProgram], amount: 500000 })).status).toBe(200);
  expect(editing.transactions[1].map(change => change.operation)).toEqual(['update']);
  expect(editing.snapshot.tables.annual_fee_schedules).toHaveLength(1);
  expect(editing.snapshot.tables.annual_fee_schedules[0].id).toBe(originalId);
  expect(editing.snapshot.tables.annual_fee_schedules[0]).toMatchObject({ program_id: secondProgram, amount: 500000 });
});

for (const width of [390, 1440]) test(`Cocher plusieurs filières, vérifier et enregistrer un tarif à ${width}px`, async ({ page }) => {
  const f = fixture();
  await page.setViewportSize({ width, height: 1000 });
  await authenticateFixture(page);
  await page.route('**/api/campus', route => route.fulfill({ json: { ...base, academicContext: { selection: 'current', currentYearId: yearId, selectedYearId: yearId, years: f.snapshot.tables.academic_years } } }));
  await page.route('**/api/year-preparation', route => route.fulfill({ json: { checks: [{ key: 'tuition', label: 'Scolarité', ready: f.snapshot.tables.annual_fee_schedules.length > 0, href: '' }] } }));
  await page.route('**/api/catalog/**', async route => {
    const req = route.request();
    const [, , , collection, id] = new URL(req.url()).pathname.split('/');
    const request = new Request(req.url(), { method: req.method(), headers: req.headers(), ...(req.method() !== 'GET' ? { body: req.postData()! } : {}) });
    const response = req.method() === 'PATCH'
      ? await f.itemApi.PATCH(request, { params: Promise.resolve({ collection, id }) })
      : await f.api[req.method() === 'POST' ? 'POST' : 'GET'](request, { params: Promise.resolve({ collection }) });
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  await page.goto('/academique/referentiel');
  await page.getByRole('button', { name: 'Ouvrir l’année 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Configurer frais de scolarité', exact: true }).click();
  const all = page.getByRole('checkbox', { name: 'Toutes les filières', exact: true });
  await expect(all).toBeChecked();
  const level = page.getByRole('combobox', { name: 'Niveau (facultatif)', exact: true });
  const master = page.getByRole('checkbox', { name: 'Management de Projets & Transformation Digitale', exact: true });
  await expect(master).toBeVisible();
  await master.check();
  await level.selectOption(levelId);
  await expect(master).toHaveCount(0);
  await expect(all).not.toBeChecked();
  await all.uncheck();
  await page.getByLabel('Montant FCFA', { exact: true }).fill('480000');
  await page.getByRole('button', { name: 'Enregistrer le tarif', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Cochez au moins une filière');
  await page.getByRole('checkbox', { name: 'Finance Digitale', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Marketing Digital', exact: true }).check();
  await expect(all).not.toBeChecked();
  await level.selectOption(masterLevel);
  await expect(page.getByRole('checkbox', { name: 'Finance Digitale', exact: true })).toHaveCount(0);
  await expect(master).not.toBeChecked();
  await level.selectOption(levelId);
  await expect(page.getByRole('checkbox', { name: 'Finance Digitale', exact: true })).not.toBeChecked();
  await page.getByRole('checkbox', { name: 'Finance Digitale', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Marketing Digital', exact: true }).check();
  await page.getByRole('combobox', { name: 'Mode de formation (facultatif)', exact: true }).selectOption('Présentiel');
  await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/frais-filieres-cochees.png` });
  await page.getByRole('button', { name: 'Enregistrer le tarif', exact: true }).click();
  const review = page.getByRole('region', { name: 'Vérification avant enregistrement' });
  await expect(review).toContainText('Finance Digitale, Marketing Digital');
  expect(f.transactions).toHaveLength(0);
  f.reject(true);
  await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Aucun tarif enregistré');
  await expect(review).toContainText('Finance Digitale, Marketing Digital');
  expect(f.snapshot.tables.annual_fee_schedules).toHaveLength(0);
  f.reject(false);
  await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
  expect(f.snapshot.tables.annual_fee_schedules).toHaveLength(2);
  expect(f.transactions[1]).toHaveLength(2);
  await page.getByRole('button', { name: 'Consulter frais de scolarité', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Finance Digitale' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Marketing Digital' })).toBeVisible();
  const edit = page.getByRole('button', { name: 'Modifier', exact: true }).first();
  await expect(edit.locator('span')).toHaveClass('sr-only');
  expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const originalId = f.snapshot.tables.annual_fee_schedules.find(row => row.program_id === firstProgram)!.id;
  await edit.click();
  const finance = page.getByRole('checkbox', { name: 'Finance Digitale', exact: true });
  const marketing = page.getByRole('checkbox', { name: 'Marketing Digital', exact: true });
  await expect(finance).toBeChecked();
  await marketing.check();
  await expect(finance).not.toBeChecked();
  await finance.check();
  await expect(marketing).not.toBeChecked();
  await page.getByLabel('Montant FCFA', { exact: true }).fill('500000');
  await page.getByLabel('Motif', { exact: true }).fill('Correction du tarif existant');
  await page.getByRole('button', { name: 'Enregistrer le tarif', exact: true }).click();
  await expect(review).toContainText('Le tarif existant sera mis à jour en conservant son identifiant');
  expect(f.transactions).toHaveLength(2);
  await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Finance Digitale' })).toContainText(/500\s000 FCFA/);
  expect(f.snapshot.tables.annual_fee_schedules).toHaveLength(2);
  expect(f.snapshot.tables.annual_fee_schedules.find(row => row.id === originalId)?.amount).toBe(500000);
  expect(f.transactions[2]).toHaveLength(1);
  expect(f.transactions[2][0]).toMatchObject({ operation: 'update', record: { id: originalId } });
});
