import { expect, test } from '@playwright/test';
import { installJournalFixture, auditYearId } from './audit-fixture';
import { uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';
import type { EmailRecord } from '../../src/types/email';
import { expectWorkspaceFits } from './helpers';

const records: EmailRecord[] = ['FAILED', 'UNKNOWN', 'ACCEPTED'].map((status, index) => ({
  id: uuid(950 + index), academic_year_id: auditYearId, event_type: 'course_scheduled', source_table: 'sessions', source_id: uuid(960),
  recipient_email: `destinataire${index}@example.test`, recipient_name: `Destinataire ${index}`, subject: `Cours programmé ${index}`, status: status as EmailRecord['status'], attempts: 1,
  provider_reference: status === 'ACCEPTED' ? 'provider-id' : null, accepted_at: status === 'ACCEPTED' ? '2026-10-19T10:00:00Z' : null,
  last_error_code: status === 'FAILED' ? 'PROVIDER_REJECTED' : status === 'UNKNOWN' ? 'NETWORK_AMBIGUOUS' : null,
  requested_by: null, reason: 'Action métier confirmée', version: 3, created_at: '2026-10-19T10:00:00Z', updated_at: '2026-10-19T10:00:00Z',
}));

for (const width of [390, 1440]) test(`Suivi : états, reprise relue, envoi désactivé et année à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await installJournalFixture(page);
  let rows = structuredClone(records); const mutations: unknown[] = [];
  await page.route('**/api/email-outbox**', async route => {
    if (route.request().method() === 'POST') {
      mutations.push(route.request().postDataJSON()); rows[0].status = 'PENDING'; rows[0].version++;
      return route.fulfill({ json: { version: rows[0].version } });
    }
    return route.fulfill({ json: { yearId: auditYearId, records: rows, total: rows.length, offset: 0, limit: 50, configuration: { ready: false, provider: null, from: null, issue: 'Non configuré' } } });
  });
  await page.goto('/systeme/mails');
  await expect(page.getByText('Envoi non configuré. Les messages restent en attente.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Réessayer l’envoi', exact: true })).toHaveCount(1);
  await expectWorkspaceFits(page);
  await page.getByRole('button', { name: 'Consulter le mail', exact: true }).nth(1).click();
  await expect(page.getByRole('dialog').getByText(/Aucun renvoi automatique/)).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Fermer le détail' }).click();
  await page.getByRole('button', { name: 'Réessayer l’envoi', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Motif', { exact: true }).fill('Adresse expéditrice corrigée');
  await dialog.getByRole('button', { name: 'Vérifier la reprise', exact: true }).click();
  expect(mutations).toHaveLength(0);
  await expect(dialog.getByText('Avant : Échec confirmé')).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirmer la reprise', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Mail remis en attente. Son envoi dépend du service configuré.')).toBeVisible();
  expect(mutations).toEqual([{ id: records[0].id, version: 3, reason: 'Adresse expéditrice corrigée' }]);
  await expect(page.getByRole('button', { name: 'Réessayer l’envoi', exact: true })).toHaveCount(0);
  await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/suivi-mails.png`, fullPage: true });
  rows = [];
  await page.getByLabel('Année consultée', { exact: true }).selectOption('all');
  await expect(page.getByText(/Aucun mail pour cette année/)).toBeVisible();
  await expect(page.getByText('Cours programmé 0', { exact: true })).toHaveCount(0);
});

test('Suivi : direction en lecture, erreur distincte d’une liste vide', async ({ page }) => {
  await installJournalFixture(page, ROLES.DG);
  let failed = true;
  await page.route('**/api/email-outbox**', route => route.fulfill(failed ? { status: 503, json: { error: 'Suivi des mails indisponible.' } } : { json: { yearId: auditYearId, records, total: 3, offset: 0, limit: 50, configuration: { ready: true } } }));
  await page.goto('/systeme/mails');
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(/Suivi des mails indisponible/);
  await expect(page.getByText(/Aucun mail pour cette année/)).toHaveCount(0);
  failed = false;
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(page.getByText('Cours programmé 0', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Réessayer l’envoi', exact: true })).toHaveCount(0);
});
