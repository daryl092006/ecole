import { expect, test, type Page } from '@playwright/test';
import { complaintsFixture, gradeIds } from './complaints-fixture';
import { ROLES } from '../../src/types/permissions';
import { expectWorkspaceFits } from './helpers';

async function confirmTreatment(page: Page, button: string, reason = 'Vérification académique confirmée', grade?: string) {
  await page.getByRole('button', { name: button, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Avis ou motif', { exact: true }).fill(reason);
  if (grade !== undefined) await dialog.getByLabel('Nouvelle note /20', { exact: true }).fill(grade);
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmer le traitement', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

for (const width of [390, 1440]) {
  test(`Dépôt étudiant confirmé, persistance après rechargement et récupération d’erreur à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const fixture = complaintsFixture(ROLES.STUD);
    await fixture.install(page);
    await page.goto('/academique/reclamations');
    await page.getByRole('button', { name: 'Déposer une réclamation', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const select = dialog.getByRole('combobox', { name: 'Note concernée', exact: true });
    await expect(select.locator('option')).toHaveCount(2);
    await select.selectOption(gradeIds[0]);
    await dialog.getByLabel('Motif de la réclamation').fill('Vérifier le barème de ma copie');
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    expect(fixture.transactions).toHaveLength(0);
    fixture.failNext();
    await dialog.getByRole('button', { name: 'Confirmer le dépôt', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Dépôt de réclamation refusé');
    expect(fixture.snapshot.tables.complaints).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Confirmer le dépôt', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Réclamations (1)', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prendre en charge', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Réclamations (1)', exact: true })).toBeVisible();
    await expectWorkspaceFits(page);
    await page.getByRole('button', { name: 'Déposer une réclamation', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('combobox', { name: /^Note concernée/ }).locator('option')).toHaveCount(1);
  });

  test(`Traitement complet, correction et historique à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const fixture = complaintsFixture(); fixture.addComplaint();
    await fixture.install(page);
    await page.goto('/academique/reclamations');
    await confirmTreatment(page, 'Prendre en charge');
    await confirmTreatment(page, 'Transmettre à l’enseignant');
    await confirmTreatment(page, 'Donner mon avis');
    await confirmTreatment(page, 'Prendre une décision');
    await confirmTreatment(page, 'Demander une correction');
    await confirmTreatment(page, 'Appliquer la correction', 'Deux points non comptabilisés', '14');
    await expect(page.getByRole('heading', { name: 'Réclamations (1)', exact: true })).toBeVisible();
    expect(fixture.snapshot.tables.grades[0].value).toBe(14);
    expect(fixture.snapshot.tables.complaints[0].status).toBe('CLOTUREE');
    await page.reload();
    await page.getByText('Historique du traitement', { exact: true }).click();
    await expect(page.getByText('Correction : 12 → 14/20', { exact: false })).toBeVisible();
    await page.getByLabel('État du traitement').selectOption('EN_COURS');
    await expect(page.getByRole('heading', { name: 'Réclamations (0)', exact: true })).toBeVisible();
    await expectWorkspaceFits(page);
  });

  test(`Enseignant : avis affecté et absence de commandes académiques à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const fixture = complaintsFixture(ROLES.ENS); fixture.addComplaint('TRANSMISE_ENSEIGNANT'); fixture.addComplaint('TRANSMISE_ENSEIGNANT', 2, 'OTHER');
    await fixture.install(page);
    await page.goto('/academique/reclamations');
    await expect(page.getByRole('heading', { name: 'Réclamations (1)', exact: true })).toBeVisible();
    await expect(page.getByText('Alice Test · Épreuve 1', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Déposer une réclamation', exact: true })).toHaveCount(0);
    await confirmTreatment(page, 'Donner mon avis');
    await expect(page.getByRole('button', { name: 'Prendre une décision', exact: true })).toHaveCount(0);
    await expectWorkspaceFits(page);
  });
}

for (const role of [ROLES.DG, ROLES.LOG]) test(`Le navigateur générique reste disponible en lecture seule : ${role}`, async ({ page }) => {
  const fixture = complaintsFixture(role); fixture.addComplaint();
  await fixture.install(page);
  await page.goto('/academique/reclamations');
  await expect(page.getByRole('button', { name: 'Ouvrir le détail', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Déposer une réclamation', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Prendre en charge', exact: true })).toHaveCount(0);
  expect(fixture.transactions).toHaveLength(0);
});

test('Direction académique : traitement disponible et toutes années en consultation', async ({ page }) => {
  const fixture = complaintsFixture(ROLES.DA); fixture.addComplaint();
  await fixture.install(page);
  await page.goto('/academique/reclamations');
  await expect(page.getByRole('button', { name: 'Prendre en charge', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Déposer une réclamation', exact: true })).toHaveCount(0);
  await page.getByLabel('Année consultée', { exact: true }).selectOption('all');
  await expect(page.getByText('Toutes les années : consultation uniquement.', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Réclamations (1)', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prendre en charge', exact: true })).toHaveCount(0);
});

test('Chargement et erreur de lecture ne sont pas affichés comme une liste vide', async ({ page }) => {
  const fixture = complaintsFixture(); await fixture.install(page);
  let release!: () => void;
  const paused = new Promise<void>(resolve => { release = resolve; });
  let failed = true;
  await page.route('**/api/complaints', async route => {
    await paused;
    return route.fulfill({ status: failed ? 503 : 200, json: failed ? { error: 'Lecture indisponible' } : { revision: 1, complaints: [], events: [], revisions: [] } });
  });
  await page.goto('/academique/reclamations');
  await expect(page.getByText('Chargement des réclamations…', { exact: true })).toBeVisible();
  await expect(page.getByText('Aucune réclamation pour ce filtre dans votre périmètre.', { exact: true })).toHaveCount(0);
  release();
  await expect(page.getByRole('alert').filter({ hasText: 'Lecture indisponible' })).toBeVisible();
  failed = false;
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(page.getByText('Aucune réclamation pour ce filtre dans votre périmètre.', { exact: true })).toBeVisible();
});
