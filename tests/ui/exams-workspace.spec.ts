import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';

for (const width of [390, 1440]) {
  test(`Examens et rattrapages dans un même espace à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await authenticateFixture(page);
    const campus = structuredClone(snapshot);
    campus.tables.evaluations = [
      { id: 'NORMAL', name: 'Épreuve session normale', kind: 'EXAMEN', session_type: 'NORMALE', status: 'BROUILLON' },
      { id: 'RESIT', name: 'Épreuve seconde session', kind: 'EXAMEN', session_type: 'RATTRAPAGE', status: 'BROUILLON' },
    ];
    await page.route('**/api/campus', route => route.fulfill({ json: campus }));
    await page.goto('/academique/examens');
    const sessions = page.getByRole('navigation', { name: 'Session d’examen' });
    await expect(page.getByText('Épreuve session normale', { exact: true })).toBeVisible();
    await expect(page.getByText('Épreuve seconde session', { exact: true })).toHaveCount(0);
    await sessions.getByRole('link', { name: 'Rattrapages' }).click();
    await expect(page).toHaveURL(/\/academique\/examens\?session=rattrapage$/);
    await expect(page.getByText('Épreuve seconde session', { exact: true })).toBeVisible();
    await expect(page.getByText('Épreuve session normale', { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(sessions.getByRole('link', { name: 'Rattrapages' })).toHaveAttribute('aria-current', 'page');
    await sessions.getByRole('link', { name: 'Session normale' }).click();
    await expect(page.getByText('Épreuve session normale', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/academique/rattrapages?groupe=TEST');
    await expect(page).toHaveURL(/\/academique\/examens\?groupe=TEST&session=rattrapage$/);
    await expect(page.getByText('Épreuve seconde session', { exact: true })).toBeVisible();
  });
}
