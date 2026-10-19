import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { installJournalFixture, journalRecords, archiveRecord, auditYearId } from './audit-fixture';
import { expectWorkspaceFits } from './helpers';
import { ROLES } from '../../src/types/permissions';

async function serveExport(page: Page, failure: 'none' | 'error' | 'changed' = 'none') {
  const offsets: number[] = [];
  await page.route('**/api/audit?**', async route => {
    const params = new URL(route.request().url()).searchParams;
    const exporting = params.get('mode') === 'export';
    const offset = Number(params.get('offset'));
    if (exporting) offsets.push(offset);
    if (exporting && offset === 50 && failure === 'error') return route.fulfill({ status: 503, json: { error: 'Lecture interrompue' } });
    const source = params.get('source');
    const all = route.request().headers()['x-escen-year'] === 'all';
    const rows = source === 'history' ? all ? [archiveRecord] : [] : journalRecords.filter(record => !params.get('query') || record.entityId === params.get('query'));
    return route.fulfill({ json: { source, yearId: all ? null : auditYearId, revision: exporting && offset === 50 && failure === 'changed' ? 2 : 1, total: rows.length, offset, limit: 50, records: rows.slice(offset, offset + 50) } });
  });
  return offsets;
}

for (const width of [390, 1440]) test(`Export complet CSV et JSON, filtres et archives à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await installJournalFixture(page);
  const offsets = await serveExport(page);
  await page.goto('/systeme/export');
  const csv = page.getByRole('button', { name: 'Télécharger le CSV', exact: true });
  await expect(csv).toBeEnabled();
  const pending = page.waitForEvent('download'); await csv.click();
  const download = await pending;
  const text = await readFile((await download.path())!, 'utf8');
  expect(text.split('\r\n')).toHaveLength(52);
  expect(text).toContain('payment-50');
  expect(offsets).toEqual([0, 50]);
  await page.getByRole('searchbox', { name: 'Rechercher un événement', exact: true }).fill('payment-50');
  await page.getByRole('button', { name: 'Appliquer les filtres', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Opérations actuelles (1)', exact: true })).toBeVisible();
  const filtered = page.waitForEvent('download'); await page.getByRole('button', { name: 'Télécharger le JSON', exact: true }).click();
  const json = JSON.parse(await readFile((await (await filtered).path())!, 'utf8'));
  expect(json).toMatchObject({ total: 1, yearId: auditYearId, filters: { query: 'payment-50' } });
  expect(json.records[0].entityId).toBe('payment-50');
  await page.getByLabel('Année consultée', { exact: true }).selectOption('all');
  await page.getByRole('combobox', { name: 'Source du journal', exact: true }).selectOption('history');
  await expect(page.getByRole('heading', { name: 'Journal historique (1)', exact: true })).toBeVisible();
  const historical = page.waitForEvent('download'); await page.getByRole('button', { name: 'Télécharger le JSON', exact: true }).click();
  const history = JSON.parse(await readFile((await (await historical).path())!, 'utf8'));
  expect(history).toMatchObject({ source: 'history', yearId: null, total: 1, records: [{ actorId: '42', actorName: null, sourceId: '77', oldValue: null }] });
  await expectWorkspaceFits(page);
  await page.screenshot({ path: `.tmp/interface/audit-export-${width}.png`, fullPage: true });
});

for (const failure of ['error', 'changed'] as const) test(`Export sans fichier partiel : ${failure}`, async ({ page }) => {
  await installJournalFixture(page);
  await serveExport(page, failure);
  let downloads = 0; page.on('download', () => downloads++);
  await page.goto('/systeme/export');
  const button = page.getByRole('button', { name: 'Télécharger le JSON', exact: true });
  await expect(button).toBeEnabled(); await button.click();
  await expect(page.getByRole('alert').filter({ hasText: failure === 'error' ? 'Lecture interrompue' : 'Le journal a changé' })).toBeVisible();
  await expect(button).toBeEnabled(); expect(downloads).toBe(0);
});

test('Export vide : téléchargement indisponible', async ({ page }) => {
  await installJournalFixture(page); await serveExport(page);
  await page.goto('/systeme/export');
  await page.getByRole('combobox', { name: 'Source du journal', exact: true }).selectOption('history');
  await expect(page.getByRole('heading', { name: 'Journal historique (0)', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Télécharger le JSON', exact: true })).toBeDisabled();
});

test('Export en cours : annulation sans fichier', async ({ page }) => {
  await installJournalFixture(page); await serveExport(page);
  let downloads = 0; page.on('download', () => downloads++);
  await page.goto('/systeme/export');
  const button = page.getByRole('button', { name: 'Télécharger le JSON', exact: true });
  await expect(button).toBeEnabled();
  let release!: () => void;
  const paused = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/audit?mode=export**', async route => {
    await paused;
    await route.fulfill({ json: { source: 'current', yearId: auditYearId, revision: 1, total: 0, offset: 0, limit: 50, records: [] } }).catch(() => {});
  });
  await button.click();
  await expect(page.getByText('Préparation du fichier…', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Annuler l’export', exact: true }).click();
  release();
  await expect(page.getByRole('status').filter({ hasText: 'Export annulé' })).toBeVisible();
  await expect(button).toBeEnabled(); expect(downloads).toBe(0);
});

test('Permission export absente : écran refusé, aucune requête de journal', async ({ page }) => {
  await installJournalFixture(page, ROLES.IT, true, false);
  let reads = 0;
  await page.route('**/api/audit?**', route => { reads++; return route.fulfill({ status: 403, json: { error: 'Interdit' } }); });
  await page.goto('/systeme/export');
  await expect(page.getByRole('button', { name: 'Télécharger le JSON', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Accès refusé', exact: true })).toBeVisible();
  expect(reads).toBe(0);
});
