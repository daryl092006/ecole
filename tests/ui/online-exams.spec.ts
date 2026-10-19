import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture, fixtureCapabilities, snapshot } from './persistent-fixture';
import { ROLES } from '../../src/types/permissions';
import type { OnlineExamCommand, OnlineExamView } from '../../src/types/onlineExam';

async function setup(page: Page, seconds = 180) {
  await authenticateFixture(page);
  await page.route('**/api/session', route => route.fulfill({ json: { capabilities: fixtureCapabilities, accountId: 'exam-account', name: 'Candidat Test', email: 'student@example.test', role: ROLES.STUD, availableRoles: [ROLES.STUD], studentId: 'S1', teacherId: null, matricule: 'EXAM', mustChangePassword: false } }));
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  const deadline = Date.now() + seconds * 1000;
  let view: OnlineExamView = {
    serverNow: new Date().toISOString(), lastSavedAt: null,
    attempt: { id: 'attempt', evaluationId: 'eval', paperId: 'paper', revision: 0, lastSaveId: null, status: 'EN_COURS', startedAt: new Date().toISOString(), deadlineAt: new Date(deadline).toISOString(), submittedAt: null, submissionKind: null, completionStatus: null },
    paper: { id: 'paper', title: 'Examen persistant', parts: [{ id: 'part', title: 'Questions', instructions: 'Rédigez vos réponses.', questions: [{ id: 'q1', kind: 'TEXTE', prompt: 'Première question', points: 10, options: [] }, { id: 'q2', kind: 'TEXTE', prompt: 'Deuxième question', points: 10, options: [] }] }] },
    answers: {},
  };
  const commands: OnlineExamCommand[] = [];
  let fail = false;
  let dropResponse = false;
  function seal() {
    if (view.attempt.status === 'EN_COURS' && Date.now() >= deadline) {
      view.attempt.status = 'EXPIREE'; view.attempt.submittedAt = new Date(deadline).toISOString(); view.attempt.submissionKind = 'AUTO_DEADLINE'; view.attempt.completionStatus = Object.values(view.answers).some(answer => answer.text.trim()) ? 'PARTIELLE' : 'NON_TRAITE'; view.attempt.revision++;
    }
    view.serverNow = new Date().toISOString();
  }
  await page.route('**/api/exam-attempts**', async route => {
    if (fail) return route.abort('failed');
    seal();
    const req = route.request();
    if (req.method() === 'GET' && !new URL(req.url()).searchParams.has('attemptId')) return route.fulfill({ json: { serverNow: view.serverNow, exams: [{ evaluationId: 'eval', name: view.paper.title, kind: 'DEVOIR', opensAt: view.attempt.startedAt, closesAt: view.attempt.deadlineAt, durationMinutes: 30, attemptId: view.attempt.id, status: view.attempt.status, deadlineAt: view.attempt.deadlineAt, submittedAt: view.attempt.submittedAt, completionStatus: view.attempt.completionStatus }] } });
    if (req.method() === 'POST') {
      const command = req.postDataJSON() as OnlineExamCommand; commands.push(command);
      if (command.action !== 'start') {
        if (view.attempt.status !== 'EN_COURS') return route.fulfill({ json: { ...view, accepted: false } });
        if (command.saveId !== view.attempt.lastSaveId) {
          if (command.revision !== view.attempt.revision) return route.fulfill({ status: 409, json: { error: 'Copie modifiée dans un autre onglet.' } });
          command.answers.forEach(answer => { view.answers[answer.questionId] = answer.response; });
          view.attempt.revision++; view.attempt.lastSaveId = command.saveId; view.lastSavedAt = new Date().toISOString();
          if (command.action === 'submit') { view.attempt.status = 'REMISE'; view.attempt.submissionKind = 'MANUAL'; view.attempt.submittedAt = new Date().toISOString(); view.attempt.completionStatus = 'PARTIELLE'; }
        }
        if (dropResponse) { dropResponse = false; return route.abort('failed'); }
      }
    }
    return route.fulfill({ json: { ...view, accepted: true } });
  });
  await page.goto('/mon-espace/epreuves');
  await page.getByRole('button', { name: 'Reprendre ma copie' }).click();
  return { commands, get view() { return view; }, setOffline(value: boolean) { fail = value; }, dropNextResponse() { dropResponse = true; }, concurrentUpdate() { view = { ...view, attempt: { ...view.attempt, revision: view.attempt.revision + 1, lastSaveId: 'other-tab' } }; } };
}

test('Sauvegarde, reprise et remise volontaire avec récapitulatif à 390 px', async ({ page }) => {
  const fixture = await setup(page);
  const input = page.getByRole('textbox', { name: 'Votre réponse' }).first();
  await input.fill('Une réponse conservée après rechargement');
  await expect.poll(() => fixture.view.answers.q1?.text).toBe('Une réponse conservée après rechargement');
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre ma copie' }).click();
  await expect(input).toHaveValue('Une réponse conservée après rechargement');
  await page.getByRole('button', { name: 'Remettre ma copie', exact: true }).click();
  await expect(page.getByLabel('Vérification avant enregistrement')).toContainText('1 / 2');
  expect(fixture.commands.filter(command => command.action === 'submit')).toHaveLength(0);
  await page.getByRole('button', { name: 'Confirmer la remise de ma copie', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /Copie remise/ })).toBeVisible();
  await expect(input).toBeDisabled();
  expect(fixture.commands.filter(command => command.action === 'submit')).toHaveLength(1);
});

test('Réponse réseau perdue : nouvel essai idempotent, sans perdre les nouvelles frappes', async ({ page }) => {
  const fixture = await setup(page);
  fixture.dropNextResponse();
  const input = page.getByRole('textbox', { name: 'Votre réponse' }).first();
  await input.fill('Premier texte');
  await expect.poll(() => fixture.commands.filter(command => command.action === 'save').length).toBeGreaterThan(0);
  await input.fill('Premier texte complété');
  await expect.poll(() => fixture.view.answers.q1?.text).toBe('Premier texte complété');
  const saves = fixture.commands.filter(command => command.action === 'save');
  expect(saves.length).toBeGreaterThanOrEqual(3);
  if (saves[0].action !== 'start' && saves[1].action !== 'start') expect(saves[1].saveId).toBe(saves[0].saveId);
});

test('Fin du temps à 360 px : réponses enregistrées préservées et champs verrouillés', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const fixture = await setup(page, 18);
  await page.getByRole('textbox', { name: 'Votre réponse' }).first().fill('Copie partielle enregistrée');
  await expect.poll(() => fixture.view.answers.q1?.text).toBe('Copie partielle enregistrée');
  await expect(page.getByRole('status').filter({ hasText: /automatiquement à l’échéance/ })).toBeVisible({ timeout: 25000 });
  await expect(page.getByRole('textbox', { name: 'Votre réponse' }).first()).toHaveValue('Copie partielle enregistrée');
  await expect(page.getByRole('textbox', { name: 'Votre réponse' }).first()).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: /Copie remise/ })).toContainText('1 / 2');
  expect(fixture.commands.filter(command => command.action === 'submit')).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Coupure avant la fin : ne jamais ajouter les réponses locales après échéance', async ({ page }) => {
  const fixture = await setup(page, 18);
  const input = page.getByRole('textbox', { name: 'Votre réponse' }).first();
  await input.fill('Texte reçu');
  await expect.poll(() => fixture.view.answers.q1?.text).toBe('Texte reçu');
  fixture.setOffline(true);
  await input.fill('Texte local non reçu');
  await expect(page.getByRole('alert').filter({ hasText: /Connexion|Failed|Enregistrement/ })).toBeVisible();
  await expect(input).toBeDisabled({ timeout: 25000 });
  fixture.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('status').filter({ hasText: /Copie remise/ })).toBeVisible();
  await expect(input).toHaveValue('Texte reçu');
  await expect(page.getByText(/Des changements locaux non enregistrés/)).toBeVisible();
});

test('Deux onglets : conflit visible, la version distante ne peut pas être écrasée', async ({ page }) => {
  const fixture = await setup(page);
  fixture.concurrentUpdate();
  await page.getByRole('textbox', { name: 'Votre réponse' }).first().fill('Mon brouillon');
  await expect(page.getByRole('alert').filter({ hasText: 'autre onglet' })).toContainText('autre onglet');
  await expect(page.getByRole('textbox', { name: 'Votre réponse' }).first()).toBeDisabled();
  expect(fixture.view.answers).toEqual({});
  await page.getByRole('button', { name: 'Recharger la version enregistrée' }).click();
  await expect(page.getByRole('textbox', { name: 'Votre réponse' }).first()).toBeEnabled();
  await expect(page.getByRole('textbox', { name: 'Votre réponse' }).first()).toHaveValue('');
});
