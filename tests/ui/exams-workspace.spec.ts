import { expect, test } from '@playwright/test';
import { ACCOUNT_IDS, authenticateFixture, snapshot } from './persistent-fixture';
import { ROLES } from '../../src/types/permissions';
import { installResponsiveAudit } from './responsive-audit-fixture';

test('Une copie QCM présente ensemble le choix et sa justification sans note inventée', async ({ page }) => {
  await authenticateFixture(page);
  const campus = structuredClone(snapshot);
  campus.tables.evaluations = [{ id: 'E', name: 'Analyse financière', kind: 'EXAMEN', status: 'SAISIES' }];
  campus.tables.evaluation_candidates = [{ id: 'C', evaluation_id: 'E', enrollment_id: 'N', eligibility: 'ELIGIBLE' }];
  campus.tables.exam_deliveries = [{ id: 'D', evaluation_id: 'E', access_opens_at: '2026-10-01T08:00:00Z', access_closes_at: '2026-10-01T10:00:00Z', duration_minutes: 120 }];
  campus.tables.exam_attempts = [{ id: 'A', evaluation_id: 'E', candidate_id: 'C', paper_id: 'P', status: 'REMISE', completion_status: 'PARTIELLE' }];
  campus.tables.exam_questions = [{ id: 'Q', paper_id: 'P', kind: 'QCM_SIMPLE', prompt: 'Choisissez un financement.' }];
  campus.tables.exam_options = [{ id: 'O', question_id: 'Q', label: 'Financement bancaire' }];
  campus.tables.exam_answers = [{ id: 'R', attempt_id: 'A', question_id: 'Q', response: { text: 'La trésorerie est préservée.', option_ids: ['O'] } }];
  campus.tables.grades = [];
  await page.route('**/api/campus', route => route.fulfill({ json: campus }));
  await page.goto('/academique/examens');
  await page.getByRole('button', { name: 'Ouvrir le détail', exact: true }).click();
  await page.getByRole('button', { name: 'Copies en ligne', exact: true }).click();
  await page.getByRole('button', { name: 'Lire les réponses', exact: true }).click();
  await expect(page.getByText('Choix : Financement bancaire', { exact: true })).toBeVisible();
  await expect(page.getByText('Justification : La trésorerie est préservée.', { exact: true })).toBeVisible();
  await expect(page.getByRole('article').getByText('Copie remise · À corriger', { exact: true })).toBeVisible();
});

for (const width of [390, 1440]) for (const [path, session] of [['evaluations', 'controle'], ['rattrapages', 'rattrapage']]) {
  test(`Entrée directe ${path} conserve les filtres à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    const { problems } = await installResponsiveAudit(page, 'staff');
    await page.goto(`/academique/${path}?groupe=TEST&filtre=a&filtre=b&session=ancienne`);
    await expect(page).toHaveURL(url => url.pathname === '/academique/examens' && url.searchParams.get('session') === session);
    const query = new URL(page.url()).searchParams;
    expect(query.get('groupe')).toBe('TEST');
    expect(query.getAll('filtre')).toEqual(['a', 'b']);
    await expect(page.getByRole('navigation', { name: 'Type d’évaluation' }).getByRole('link', { name: session === 'controle' ? 'Contrôles continus' : 'Rattrapages' })).toHaveAttribute('aria-current', 'page');
    expect(problems).toEqual([]);
  });
}

test('Accès aux contrôles sans élargir l’accès aux examens', async ({ page }) => {
  await authenticateFixture(page);
  await page.route('**/api/session', route => route.fulfill({ json: { accountId: ACCOUNT_IDS[1], name: 'Consultation des notes', role: ROLES.IT, availableRoles: [ROLES.IT], mustChangePassword: false, capabilities: { [ROLES.IT]: { permissions: ['grade.view'], globalAccess: true } } } }));
  const campus = structuredClone(snapshot);
  campus.tables.evaluations = [{ id: 'CONTROL', name: 'Contrôle autorisé', kind: 'DEVOIR', status: 'BROUILLON' }];
  await page.route('**/api/campus', route => route.fulfill({ json: campus }));
  await page.goto('/academique/examens');
  const choices = page.getByRole('navigation', { name: 'Type d’évaluation' });
  await expect(choices.getByRole('link', { name: 'Contrôles continus' })).toBeVisible();
  await expect(choices.getByRole('link', { name: 'Session normale' })).toHaveCount(0);
  await expect(choices.getByRole('link', { name: 'Rattrapages' })).toHaveCount(0);
  await expect(page.getByText('Contrôle autorisé', { exact: true })).toBeVisible();
  await page.goto('/academique/examens?session=rattrapage');
  await expect(page.getByRole('heading', { name: 'Accès refusé' })).toBeVisible();
});

test('Un examen passé ne propose plus sa mise en place', async ({ page }) => {
  await authenticateFixture(page);
  const campus = structuredClone(snapshot);
  campus.tables.evaluations = [{ id: 'PAST', name: 'Examen passé', kind: 'EXAMEN', status: 'PUBLIEES', held_on: '2020-05-04' }];
  await page.route('**/api/campus', route => route.fulfill({ json: campus }));
  await page.goto('/academique/examens');
  await page.getByRole('button', { name: 'Ouvrir le détail', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('region', { name: 'Préparation de l’épreuve' })).toHaveCount(0);
  await expect(dialog.getByRole('link', { name: /Composer le sujet|Modifier le sujet|Planifier la date/ })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: /Programmer la diffusion|Modifier la diffusion/ })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Saisir / Gérer les notes' })).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`Examens et rattrapages dans un même espace à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await authenticateFixture(page);
    const campus = structuredClone(snapshot);
    campus.tables.evaluations = [
      { id: 'CONTROL', name: 'Devoir continu', kind: 'DEVOIR', status: 'BROUILLON' },
      { id: 'NORMAL', name: 'Épreuve session normale', kind: 'EXAMEN', session_type: 'NORMALE', status: 'BROUILLON' },
      { id: 'RESIT', name: 'Épreuve seconde session', kind: 'EXAMEN', session_type: 'RATTRAPAGE', status: 'BROUILLON' },
    ];
    await page.route('**/api/campus', route => route.fulfill({ json: campus }));
    await page.goto('/academique/examens');
    await expect(page.getByRole('link', { name: 'Composer une épreuve' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Nouvelle évaluation' })).toBeVisible();
    const sessions = page.getByRole('navigation', { name: 'Type d’évaluation' });
    await expect(page.getByText('Épreuve session normale', { exact: true })).toBeVisible();
    await expect(page.getByText('Épreuve seconde session', { exact: true })).toHaveCount(0);
    await sessions.getByRole('link', { name: 'Rattrapages' }).click();
    await expect(page).toHaveURL(/\/academique\/examens\?session=rattrapage$/);
    await expect(page.getByText('Épreuve seconde session', { exact: true })).toBeVisible();
    await expect(page.getByText('Épreuve session normale', { exact: true })).toHaveCount(0);
    await sessions.getByRole('link', { name: 'Contrôles continus' }).click();
    await expect(page.getByText('Devoir continu', { exact: true })).toBeVisible();
    await expect(page.getByText('Épreuve seconde session', { exact: true })).toHaveCount(0);
    await sessions.getByRole('link', { name: 'Rattrapages' }).click();
    await expect(page).toHaveURL(/session=rattrapage$/);
    await page.reload();
    await expect(sessions.getByRole('link', { name: 'Rattrapages' })).toHaveAttribute('aria-current', 'page');
    await sessions.getByRole('link', { name: 'Session normale' }).click();
    await expect(page.getByText('Épreuve session normale', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/academique/evaluations?groupe=TEST');
    await expect(page).toHaveURL(/\/academique\/examens\?groupe=TEST&session=controle$/);
    await expect(page.getByText('Devoir continu', { exact: true })).toBeVisible();
    await page.goto('/academique/rattrapages?groupe=TEST');
    await expect(page).toHaveURL(/\/academique\/examens\?groupe=TEST&session=rattrapage$/);
    await expect(page.getByText('Épreuve seconde session', { exact: true })).toBeVisible();
  });
}
