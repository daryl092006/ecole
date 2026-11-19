import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';
import { subjectProgrammingFixture } from './subject-programming-fixture';
import { loadSecurityApi, securityContext, uuid } from './security-fixture';

const context = '<p>Présentation de l’entreprise et données fictives.</p><table><thead><tr><th>Indicateur</th><th>Période 1</th><th>Période 2</th></tr></thead><tbody><tr><td>Activation</td><td>68 %</td><td>54 %</td></tr></tbody></table><script>window.unsafeSubject = true</script>';

test('Copie : contexte du seul sujet autorisé, sans corrigé ni autres sujets', async () => {
  const calls: string[] = [];
  const client = { rpc: async (name: string) => {
    calls.push(name);
    return name === 'escen_online_exam'
      ? { data: { paper: { id: uuid(1), title: 'Copie', parts: [] } }, error: null }
      : { data: { tables: { exam_papers: [{ id: uuid(1), instructions: context, privateCorrection: 'SECRET' }, { id: uuid(2), instructions: 'AUTRE SUJET' }] } }, error: null };
  } };
  const api = loadSecurityApi('app/api/exam-attempts/route.ts', client, securityContext()) as { GET: (request: Request) => Promise<Response> };
  const response = await api.GET(new Request(`http://local.test/api/exam-attempts?attemptId=${uuid(3)}`));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.paper.instructions).toBe(context);
  expect(JSON.stringify(body)).not.toMatch(/SECRET|AUTRE SUJET/);
  expect(calls).toEqual(['escen_online_exam', 'escen_backend_snapshot']);
});

test('Copie refusée : aucun chargement du contexte du sujet', async () => {
  const calls: string[] = [];
  const client = { rpc: async (name: string) => { calls.push(name); return { error: { code: '42501' } }; } };
  const api = loadSecurityApi('app/api/exam-attempts/route.ts', client, securityContext()) as { GET: (request: Request) => Promise<Response> };
  expect((await api.GET(new Request(`http://local.test/api/exam-attempts?attemptId=${uuid(3)}`))).status).toBe(403);
  expect(calls).toEqual(['escen_online_exam']);
});

for (const width of [390, 1440]) test(`Sujet : paragraphes et tableaux rendus dans les aperçus et à l’impression à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 960 });
  await installResponsiveAudit(page, 'staff');
  const fixture = subjectProgrammingFixture();
  const { exams } = await (await fixture.get()).json();
  const paper = { id: 'formatted-paper', libraryId: 'library', version: 1, archived: false, status: 'BROUILLON', title: 'Cas de finance', instructions: context, durationMinutes: 90, purpose: 'EXAMEN', evaluationId: fixture.subject.evaluationId,
    parts: [{ title: 'Étude de cas', caseStudy: true, instructions: '<p>Analysez le tableau avant de répondre.</p>', questions: [{ prompt: '<p>Expliquez cette évolution.</p>', kind: 'TEXTE', points: 17, options: [], correction: 'Corrigé confidentiel' }] }] };
  await page.route('**/api/subjects', route => route.fulfill({ json: { revision: 1, subjects: [paper], exams } }));
  await page.goto('/academique/sujets?sujet=formatted-paper');
  await page.getByRole('tab', { name: 'Aperçu étudiant', exact: true }).click();
  const preview = page.locator('.subject-preview');
  await expect(preview.getByRole('cell', { name: '54 %', exact: true })).toBeVisible();
  await expect(preview).toContainText('Présentation de l’entreprise');
  await expect(preview).toContainText('Analysez le tableau');
  await expect(preview).not.toContainText('<p>');
  await expect(preview).not.toContainText('Corrigé confidentiel');
  expect(await page.evaluate(() => 'unsafeSubject' in window)).toBe(false);
  await page.evaluate(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow')!;
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { ...descriptor, get() {
      const target = descriptor.get!.call(this) as Window | null;
      if (target) target.print = () => {};
      return target;
    } });
  });
  await page.getByRole('button', { name: 'Imprimer le sujet', exact: true }).click();
  const printed = page.frameLocator('iframe.print-frame');
  await expect(printed.getByRole('cell', { name: '54 %', exact: true })).toHaveText('54 %');
  await expect(printed.locator('body')).not.toContainText('<p>');
  await expect(printed.locator('body')).not.toContainText('Corrigé confidentiel');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
