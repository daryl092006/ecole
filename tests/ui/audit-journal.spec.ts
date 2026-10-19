import { expect, test, type Page } from '@playwright/test';
import { installJournalFixture, journalRecords, archiveRecord, auditYearId, type JournalPage } from './audit-fixture';
import { ROLES } from '../../src/types/permissions';
import { expectWorkspaceFits } from './helpers';

async function serveJournal(page: Page) {
  await page.route('**/api/audit?**', route => {
    expect(route.request().headers().authorization).toBe('Bearer fixture-auth-token');
    const params = new URL(route.request().url()).searchParams;
    const source = params.get('source') || 'current';
    const allYears = route.request().headers()['x-escen-year'] === 'all';
    const rows = source === 'history' ? allYears ? [archiveRecord] : [] : journalRecords;
    const filtered = rows.filter(row => (!params.get('query') || `${row.entityId} ${row.reason}`.includes(params.get('query')!))
      && (!params.get('author') || `${row.actorId} ${row.actorName}`.includes(params.get('author')!))
      && (!params.get('table') || row.table === params.get('table'))
      && (!params.get('action') || row.action === params.get('action'))
      && (!params.get('start') || !!row.date && row.date.slice(0, 10) >= params.get('start')!)
      && (!params.get('end') || !!row.date && row.date.slice(0, 10) <= params.get('end')!));
    const offset = Number(params.get('offset') || 0);
    const response: JournalPage = { source, yearId: allYears ? null : auditYearId, total: filtered.length, offset, limit: 50, records: filtered.slice(offset, offset + 50) };
    return route.fulfill({ json: response });
  });
}

for (const width of [390, 1440]) test(`Journal actuel, pagination, filtres et archives séparées à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await installJournalFixture(page);
  await serveJournal(page);
  await page.goto('/systeme/journal');
  await expect(page.getByRole('heading', { name: 'Opérations actuelles (51)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Consulter l’événement', exact: true })).toHaveCount(1);
  await expect(page.getByText('payment-50', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Précédent', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Rechercher un événement', exact: true }).fill('payment-0');
  await page.getByLabel('Auteur : nom ou référence', { exact: true }).fill('Jean');
  await page.getByLabel('Table exacte', { exact: true }).fill('payments');
  await page.getByLabel('Action exacte', { exact: true }).fill('UPDATE');
  await page.getByLabel('Du', { exact: true }).fill('2026-10-16');
  await page.getByLabel('Au', { exact: true }).fill('2026-10-16');
  await page.getByRole('button', { name: 'Appliquer les filtres', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Opérations actuelles (1)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Consulter l’événement', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Anciennes valeurs', exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Nouvelles valeurs', exact: true })).toBeVisible();
  await expect(dialog.getByText('150', { exact: true })).toBeVisible();
  await page.screenshot({ path: `.tmp/interface/audit-detail-${width}.png`, fullPage: true });
  await dialog.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
  await expectWorkspaceFits(page);
  await page.getByLabel('Année consultée', { exact: true }).selectOption('all');
  await page.getByRole('combobox', { name: 'Source du journal', exact: true }).selectOption('history');
  await expect(page.getByRole('heading', { name: 'Journal historique (1)', exact: true })).toBeVisible();
  await expect(page.getByText('Auteur source #42', { exact: true })).toBeVisible();
  await expect(page.getByText('payment-0', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Consulter l’événement', exact: true }).click();
  await expect(dialog.getByText('archive-batch', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Anciennes valeurs', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
  await page.screenshot({ path: `.tmp/interface/audit-history-${width}.png`, fullPage: true });
  await expectWorkspaceFits(page);
});

test('Archives sans année confirmée : aucune substitution par les événements actuels', async ({ page }) => {
  await installJournalFixture(page);
  await serveJournal(page);
  await page.goto('/systeme/journal');
  await page.getByRole('combobox', { name: 'Source du journal', exact: true }).selectOption('history');
  await expect(page.getByRole('heading', { name: 'Journal historique (0)', exact: true })).toBeVisible();
  await expect(page.getByText('Choisissez Toutes les années pour consulter les événements historiques sans rattachement annuel confirmé.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Consulter l’événement', exact: true })).toHaveCount(0);
});

test('DG global peut consulter ; IT restreint et autres rôles ne déclenchent aucune lecture', async ({ page }) => {
  await installJournalFixture(page, ROLES.DG);
  await serveJournal(page);
  await page.goto('/systeme/journal');
  await expect(page.getByRole('heading', { name: 'Opérations actuelles (51)', exact: true })).toBeVisible();
});

for (const [role, global] of [[ROLES.IT, false], [ROLES.DGA, true]] as const) test(`Journal refusé en interface : ${role}, global=${global}`, async ({ page }) => {
  await installJournalFixture(page, role, global);
  let reads = 0;
  await page.route('**/api/audit?**', route => { reads++; return route.fulfill({ status: 403, json: { error: 'Interdit' } }); });
  await page.goto('/systeme/journal');
  await expect(page.getByText(role === ROLES.IT ? 'Cette consultation est réservée au DG et à l’Informaticien avec accès global et permission d’audit.' : 'Cette page n’est pas disponible pour votre rôle.', { exact: true })).toBeVisible();
  expect(reads).toBe(0);
});

test('Chargement, erreur et reprise du journal ne deviennent jamais une fausse liste vide', async ({ page }) => {
  await installJournalFixture(page);
  let release!: () => void;
  const paused = new Promise<void>(resolve => { release = resolve; });
  let unavailable = true;
  await page.route('**/api/audit?**', async route => {
    await paused;
    return unavailable ? route.fulfill({ status: 503, json: { error: 'Lecture indisponible' } }) : route.fulfill({ json: { source: 'current', yearId: auditYearId, total: 0, offset: 0, limit: 50, records: [] } });
  });
  await page.goto('/systeme/journal');
  await expect(page.getByText('Chargement du journal…', { exact: true })).toBeVisible();
  await expect(page.getByText('Aucun événement pour cette source et ces filtres.', { exact: true })).toHaveCount(0);
  release();
  await expect(page.getByRole('alert').filter({ hasText: 'Lecture indisponible' })).toBeVisible();
  unavailable = false;
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(page.getByText('Aucun événement pour cette source et ces filtres.', { exact: true })).toBeVisible();
});
