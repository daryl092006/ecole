import { expect, test } from '@playwright/test';
import { subjectProgrammingFixture } from './subject-programming-fixture';
import { installResponsiveAudit } from './responsive-audit-fixture';
import { securityContext, securityIds as id, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';

test('Le sujet appartient à un examen programmé et conserve ses horaires', async () => {
  const fixture = subjectProgrammingFixture();
  const directory = await (await fixture.get()).json();
  expect(directory.exams.find((exam: { id: string }) => exam.id === id.evaluation(0))).toMatchObject({ issue: null, durationMinutes: 120 });
  expect((await fixture.post({ evaluationId: null })).status).toBe(400);
  expect((await fixture.post({ durationMinutes: 60 })).status).toBe(409);
  expect((await fixture.post({ purpose: 'RATTRAPAGE' })).status).toBe(409);
  expect(fixture.transactions).toHaveLength(0);
  expect((await fixture.post()).status).toBe(201);
  expect(fixture.transactions[0][0].record.evaluation_id).toBe(id.evaluation(0));
  expect((await fixture.post()).status).toBe(409);
});

for (const state of ['non programmé', 'commencé', 'annulé', 'avec copie', 'avec notes', 'sujet autorisé']) test(`Composition refusée : examen ${state}`, async () => {
  const fixture = subjectProgrammingFixture();
  const tables = fixture.snapshot.tables;
  if (state === 'non programmé') tables.exam_deliveries = [];
  if (state === 'commencé') {
    tables.sessions[0].starts_at = new Date(Date.now() - 60000).toISOString();
    tables.exam_deliveries[0].access_opens_at = tables.sessions[0].starts_at;
  }
  if (state === 'annulé') tables.sessions[0].cancelled_at = new Date().toISOString();
  if (state === 'avec copie') tables.exam_attempts = [{ id: uuid(991), evaluation_id: id.evaluation(0), candidate_id: id.candidate(0) }];
  if (state === 'avec notes') tables.grades = [{ id: uuid(992), candidate_id: id.candidate(0), value: 12 }];
  if (state === 'sujet autorisé') tables.exam_papers = [{ id: uuid(993), evaluation_id: id.evaluation(0), status: 'AUTORISE' }];
  expect((await fixture.post()).status).toBe(409);
  expect(fixture.transactions).toHaveLength(0);
});

test('Un examen hors affectation ne peut pas recevoir de sujet', async () => {
  const fixture = subjectProgrammingFixture(securityContext(ROLES.ENS, { teacherId: uuid(21) }));
  expect((await fixture.post()).status).toBe(409);
  const directory = await (await fixture.get()).json();
  expect(directory.exams.some((exam: { id: string }) => exam.id === id.evaluation(0))).toBe(false);
  expect(fixture.transactions).toHaveLength(0);
});

for (const width of [390, 1440]) test(`Choisir l’examen avant de rédiger et conserver le sujet à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  await installResponsiveAudit(page, 'staff');
  const fixture = subjectProgrammingFixture();
  await page.route('**/api/subjects', async route => {
    const request = route.request();
    const response = await fixture.route[request.method() === 'POST' ? 'POST' : 'GET'](new Request(request.url(), {
      method: request.method(), headers: request.headers(), ...(request.method() === 'POST' ? { body: request.postData()! } : {}),
    }));
    await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
  });
  await page.goto('/academique/sujets?nouveau=1');
  await expect(page.getByRole('heading', { name: 'Examen à préparer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enregistrer le brouillon' })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Examen programmé', exact: true }).selectOption(id.evaluation(0));
  await page.getByRole('button', { name: 'Ouvrir la composition du sujet' }).click();
  await expect(page.getByText('Début de l’examen', { exact: true })).toBeVisible();
  await expect(page.getByText('Fin de l’examen', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Épreuve historique associée')).toHaveCount(0);
  await expect(page.getByLabel('Durée en minutes')).toHaveCount(0);
  await expect(page.getByText('Sujet libre ou toutes formations')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ajouter une partie', exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter une question', exact: true }).click();
  await page.locator('.subject-prompt').fill('Expliquez le risque financier.');
  await page.getByRole('button', { name: 'Enregistrer le brouillon', exact: true }).click();
  expect(fixture.transactions).toHaveLength(0);
  await page.getByRole('button', { name: 'Confirmer la sauvegarde du brouillon' }).click();
  await expect(page).toHaveURL(/sujet=/);
  expect(fixture.transactions).toHaveLength(1);
  await page.reload();
  await expect(page.locator('.subject-prompt')).toHaveValue('Expliquez le risque financier.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `tmp/screenshots/subject-programming-${width}.png`, fullPage: true });
  fixture.snapshot.tables.sessions[0].starts_at = new Date(Date.now() - 60000).toISOString();
  fixture.snapshot.tables.exam_deliveries[0].access_opens_at = fixture.snapshot.tables.sessions[0].starts_at;
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Consulter le sujet' })).toBeVisible();
  await expect(page.getByText('Expliquez le risque financier.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enregistrer le brouillon' })).toHaveCount(0);
});

test('Aucun examen à venir : pas de formulaire de sujet libre', async ({ page }) => {
  await installResponsiveAudit(page, 'staff');
  await page.route('**/api/subjects', route => route.fulfill({ json: { revision: 1, subjects: [], exams: [] } }));
  await page.goto('/academique/sujets?nouveau=1&source=ancienne-epreuve');
  await expect(page.getByText('Aucun examen programmé à venir n’est disponible pour la composition dans l’année consultée.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enregistrer le brouillon' })).toHaveCount(0);
});
