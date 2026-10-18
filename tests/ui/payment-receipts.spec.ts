import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { adjustmentFixture } from './payment-adjustments-fixture';
import { securityContext, uuid } from './security-fixture';

async function mount(page: Page, state: 'POSTED' | 'PENDING' | 'ANNULE' = 'POSTED', fail = false) {
  await page.addInitScript(() => {
    const host = window as unknown as { receiptPrints: string[] };
    host.receiptPrints = [];
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof HTMLIFrameElement && node.classList.contains('print-frame') && node.contentWindow) {
          node.contentWindow.print = () => { host.receiptPrints.push(node.contentDocument?.body.innerText || ''); };
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await authenticateFixture(page);
  const fixture = adjustmentFixture(securityContext(), true);
  fixture.snapshot.tables.people = [{ id: uuid(6200), firstname: 'Élise', lastname: '<b>Test</b>' }];
  fixture.snapshot.tables.students[0].person_id = uuid(6200);
  fixture.snapshot.tables.payments[0].payer_name = '<img src=x onerror=alert(1)>';
  fixture.snapshot.tables.payments[0].method = 'ESPECES';
  fixture.snapshot.tables.payments[0].provider = 'Caisse ESCEN';
  if (state === 'ANNULE') fixture.snapshot.tables.payment_reversals = [{ id: uuid(6100), payment_id: fixture.snapshot.tables.payments[0].id, reason: 'Double saisie vérifiée' }];
  else fixture.snapshot.tables.payments[0].status = state;
  let reads = 0;
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  await page.route('**/api/students/*/operations*', async route => {
    const receiptId = new URL(route.request().url()).searchParams.get('receiptId');
    if (receiptId) {
      reads++;
      expect(route.request().headers().authorization).toBe('Bearer fixture-auth-token');
      if (fail) return route.fulfill({ status: 503, json: { error: 'Reçu indisponible pour la recette.' } });
    }
    const response = receiptId ? await fixture.getReceipt(receiptId) : await fixture.get();
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  await page.goto('/etudiants/ESCEN-TEST-001');
  await page.getByText('Annulations, remboursements et avoirs', { exact: true }).click();
  return { ...fixture, reads: () => reads };
}
const printed = (page: Page) => page.evaluate(() => (window as unknown as { receiptPrints: string[] }).receiptPrints);

for (const width of [390, 1440]) test(`Impression connectée du reçu à ${width}px : contenu échappé et lecture unique`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const fixture = await mount(page);
  await page.getByRole('button', { name: 'Imprimer REC-INITIAL', exact: true }).click();
  await expect.poll(async () => (await printed(page)).length).toBe(1);
  const text = (await printed(page))[0];
  expect(text).toContain('Reçu de paiement · VALIDÉ');
  expect(text).toContain('REC-INITIAL'); expect(text).toContain('PAY-INITIAL');
  expect(text).toContain('400 FCFA'); expect(text).toContain('Élise <b>Test</b>');
  expect(text).toContain('<img src=x onerror=alert(1)>');
  await expect(page.frameLocator('iframe.print-frame').locator('script')).toHaveCount(0);
  await expect(page.frameLocator('iframe.print-frame').locator('img')).toHaveCount(1);
  expect(fixture.reads()).toBe(1); expect(fixture.transactions).toEqual([]);
});

test('Impression d’un reçu annulé : mention explicite, motif et montant original conservé', async ({ page }) => {
  const fixture = await mount(page, 'ANNULE');
  await page.getByRole('button', { name: 'Imprimer REC-INITIAL', exact: true }).click();
  await expect.poll(async () => (await printed(page)).length).toBe(1);
  const text = (await printed(page))[0];
  expect(text).toContain('REÇU ANNULÉ'); expect(text).toContain('Double saisie vérifiée');
  expect(text).toContain('400 FCFA'); expect(text).toContain('0 FCFA');
  expect(fixture.snapshot.tables.receipts[0].snapshot).toEqual({ amount: 400 });
});

test('Impression d’un paiement en attente : statut et absence d’encaissement explicites', async ({ page }) => {
  await mount(page, 'PENDING');
  await page.getByRole('button', { name: 'Imprimer REC-INITIAL', exact: true }).click();
  await expect.poll(async () => (await printed(page)).length).toBe(1);
  const text = (await printed(page))[0];
  expect(text).toContain('EN ATTENTE DE VALIDATION');
  expect(text).toContain('ce montant ne compte pas dans les encaissements validés');
});

test('Lecture du reçu refusée : erreur visible, aucune impression et bouton réutilisable', async ({ page }) => {
  const fixture = await mount(page, 'POSTED', true);
  const button = page.getByRole('button', { name: 'Imprimer REC-INITIAL', exact: true });
  await button.click();
  await expect(page.getByRole('alert').filter({ hasText: 'Reçu indisponible pour la recette.' })).toBeVisible();
  await expect(button).toBeEnabled();
  expect(await printed(page)).toEqual([]); expect(fixture.reads()).toBe(1);
});
