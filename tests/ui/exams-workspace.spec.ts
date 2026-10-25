import { expect, test } from '@playwright/test';
import { ACCOUNT_IDS, authenticateFixture, snapshot } from './persistent-fixture';
import { ROLES } from '../../src/types/permissions';
import { installResponsiveAudit } from './responsive-audit-fixture';

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
