import { expect, test, type Locator, type Page } from '@playwright/test';
import { attendanceFixture, attendanceId as a } from './attendance-management-fixture';
import { authenticateFixture, snapshot as baseSnapshot } from './persistent-fixture';
import { securityContext, securityIds as id } from './security-fixture';
import { ROLES } from '../../src/types/permissions';

async function connected(page: Page, withAttendance = true, readonly = false) {
  await authenticateFixture(page);
  const fixture = attendanceFixture(securityContext(readonly ? ROLES.LOG : ROLES.IT), true);
  if (!withAttendance) { fixture.snapshot.tables.attendances = []; fixture.snapshot.tables.absence_justifications = []; }
  let campusReads = 0;
  await page.route('**/api/campus', route => {
    campusReads++;
    return route.fulfill({ json: { ...fixture.snapshot, tables: { ...baseSnapshot.tables, ...fixture.snapshot.tables, people: [...baseSnapshot.tables.people, ...fixture.snapshot.tables.people] },
      academicContext: { currentYearId: id.year, currentYearConfigured: true, selectedYearId: id.year, selection: 'current', years: fixture.snapshot.tables.academic_years } } });
  });
  await page.route('**/api/attendances*', async route => {
    const request = route.request();
    expect(request.headers().authorization).toBe('Bearer fixture-auth-token');
    const input = new Request(request.url(), { method: request.method(), headers: request.headers(), ...(request.method() === 'POST' ? { body: request.postData()! } : {}) });
    const response = request.method() === 'POST' ? await fixture.api.POST(input) : await fixture.api.GET(input);
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  await page.goto('/academique/presences');
  await expect(page.getByRole('heading', { name: 'Feuilles de présence', exact: true })).toBeVisible();
  return { ...fixture, campusReads: () => campusReads };
}
async function review(dialog: Locator) {
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Vérification avant enregistrement' })).toBeVisible();
}
async function confirm(dialog: Locator) {
  await dialog.getByRole('button', { name: /^Confirmer :/ }).click();
  await expect(dialog).not.toBeVisible();
}

for (const width of [360, 390, 1440]) {
  test(`Émargement : aucune présence inventée, création, correction motivée et actualisation à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await connected(page, false);
    const initialReads = fixture.campusReads();
    await expect(page.getByText('Non renseignée', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Saisir ou corriger les présences', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Émargement des étudiants', exact: true });
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('au moins une présence');
    expect(fixture.transactions).toHaveLength(0);
    await dialog.getByRole('combobox', { name: 'Présence de Élise Étudiante', exact: true }).selectOption('PRESENT');
    await review(dialog);
    expect(fixture.transactions).toHaveLength(0);
    await confirm(dialog);
    await expect(page.getByRole('cell', { name: /Présent$/ })).toBeVisible();
    expect(fixture.transactions).toHaveLength(1);
    await expect.poll(fixture.campusReads).toBeGreaterThan(initialReads);
    await page.getByRole('button', { name: 'Saisir ou corriger les présences', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Présence de Élise Étudiante', exact: true }).selectOption('RETARD');
    await dialog.getByLabel('Retard de Élise Étudiante (minutes)', { exact: true }).fill('12');
    await expect(dialog.getByRole('textbox', { name: 'Motif', exact: true })).toHaveAttribute('required', '');
    await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Retard vérifié avec le surveillant');
    await review(dialog);
    await expect(dialog.getByText(/Avant : Présent/)).toBeVisible();
    await confirm(dialog);
    await expect(page.getByRole('cell', { name: /En retard$/ })).toBeVisible();
    expect(fixture.snapshot.tables.attendances[0].late_minutes).toBe(12);
    expect(fixture.transactions[1][0].record.reason).toBe('Retard vérifié avec le surveillant');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });

  test(`Présence enseignante : horaires vérifiés puis corrigés à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await connected(page);
    await page.getByRole('button', { name: 'Enregistrer la présence enseignante', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Présence enseignante', exact: true });
    await dialog.getByLabel('Arrivée enseignante', { exact: true }).fill('2026-11-01T08:00');
    await dialog.getByLabel('Départ enseignant', { exact: true }).fill('2026-11-01T10:00');
    await review(dialog); expect(fixture.transactions).toHaveLength(0);
    await confirm(dialog);
    expect(fixture.snapshot.tables.teacher_attendances).toHaveLength(1);
    expect(fixture.snapshot.tables.teacher_attendances[0].session_id).toBe(a.session);
    await page.getByRole('button', { name: 'Enregistrer la présence enseignante', exact: true }).click();
    await dialog.getByLabel('Départ enseignant', { exact: true }).fill('2026-11-01T10:05');
    await dialog.getByLabel('Commentaire enseignant', { exact: true }).fill('Départ confirmé par la surveillance');
    await review(dialog); await confirm(dialog);
    expect(fixture.transactions[1][0].operation).toBe('update');
    expect(fixture.snapshot.tables.teacher_attendances).toHaveLength(1);
  });

  test(`Justificatif : acceptation confirmée, absence justifiée et décision consultable à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await connected(page);
    await page.getByRole('button', { name: 'Accepter', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Accepter le justificatif', exact: true });
    await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Certificat médical vérifié');
    await review(dialog);
    await expect(dialog.getByText(/dans la même transaction/)).toBeVisible();
    expect(fixture.transactions).toHaveLength(0);
    await confirm(dialog);
    await expect(page.getByRole('cell', { name: /Absence justifiée$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accepter', exact: true })).toHaveCount(0);
    await expect(page.getByRole('cell', { name: /Accepté/ })).toBeVisible();
    expect(fixture.snapshot.tables.absence_justifications[0].reason).toBe('Certificat médical');
  });
}

test('Refuser un justificatif conserve la présence ; une erreur de sauvegarde reste dans la fenêtre', async ({ page }) => {
  const fixture = await connected(page); fixture.failures.write = true;
  await page.getByRole('button', { name: 'Refuser', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Refuser le justificatif', exact: true });
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Document insuffisant pour cette absence');
  await review(dialog);
  await dialog.getByRole('button', { name: /^Confirmer :/ }).click();
  await expect(dialog.getByRole('alert')).toContainText('Aucune modification partielle');
  expect(fixture.snapshot.tables.attendances[0].status).toBe('ABSENT');
  expect(fixture.snapshot.tables.absence_justifications[0].status).toBe('EN_ATTENTE');
  fixture.failures.write = false;
  await confirm(dialog);
  await expect(page.getByRole('cell', { name: /Absent$/ })).toBeVisible();
  expect(fixture.snapshot.tables.absence_justifications[0].status).toBe('REFUSE');
});

test('Un formulaire modifié protège sa saisie et la consultation seule n’affiche pas d’action', async ({ page }) => {
  await connected(page);
  await page.getByRole('button', { name: 'Saisir ou corriger les présences', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Émargement des étudiants', exact: true });
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Saisie à conserver');
  page.once('dialog', popup => popup.dismiss());
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Motif', exact: true })).toHaveValue('Saisie à conserver');
});

test('La consultation LOG conserve les données et retire les commandes d’écriture', async ({ page }) => {
  await connected(page, true, true);
  await expect(page.getByRole('cell', { name: /Absent$/ })).toBeVisible();
  for (const label of ['Saisir ou corriger les présences', 'Enregistrer la présence enseignante', 'Accepter', 'Refuser']) await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
});

test('Une correction de statut conserve les secondes des horaires existants', async ({ page }) => {
  const fixture = await connected(page);
  fixture.snapshot.tables.attendances[0].arrived_at = '2026-11-01T08:00:15Z';
  await page.reload();
  await page.getByRole('button', { name: 'Saisir ou corriger les présences', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Émargement des étudiants', exact: true });
  await dialog.getByRole('combobox', { name: 'Présence de Élise Étudiante', exact: true }).selectOption('RETARD');
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Statut corrigé, horaire conservé');
  await review(dialog); await confirm(dialog);
  expect(fixture.transactions[0][0].record.arrived_at).toBe('2026-11-01T08:00:15.000Z');
});
