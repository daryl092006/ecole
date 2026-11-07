import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`Articles : liste et composition lisibles à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    const yearId = '44444444-4444-4444-8444-444444444444';
    await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { currentYearId: yearId, selectedYearId: yearId, selection: 'current', years: [{ id: yearId, name: '2026-2027', status: 'OUVERTE', starts_on: '2026-09-01', ends_on: '2027-07-31' }] } } }));
    const articles = Array.from({ length: 6 }, (_, index) => ({ id: `article-${index}`, title: index === 0 ? 'Une nouvelle année pour entreprendre, apprendre et construire son avenir à l’ESCEN' : `Vie du campus : les rencontres et ateliers de la semaine ${index}`, slug: `actualite-campus-${index}`, excerpt: 'Étudiants, enseignants et partenaires se retrouvent autour des projets de l’école. Découvrez les temps forts, les échanges et les prochaines rencontres du campus.', content: 'Bienvenue dans cette nouvelle année.\n\nLes ateliers sont ouverts aux étudiants de toutes les filières.', image: '', status: ['PUBLIE', 'BROUILLON', 'RETIRE'][index % 3], version: 1, updated_at: '2026-11-07T10:00:00Z', published_at: null }));
    await page.route('**/api/website-management*', route => route.fulfill({ json: articles }));
    await page.goto('/site-web/articles');
    await expect(page.getByRole('heading', { name: 'Publications du site' })).toBeVisible();
    await expect(page.locator('.editorial-article-card')).toHaveCount(6);
    for (const row of await page.locator('.editorial-article-card').all()) {
      const rowBounds = await row.boundingBox();
      const action = row.getByRole('button', { name: /^Modifier :/ });
      await expect(action).toHaveText('Modifier');
      const actionBounds = await action.boundingBox();
      expect(actionBounds!.x).toBeGreaterThanOrEqual(rowBounds!.x);
      expect(actionBounds!.x + actionBounds!.width).toBeLessThanOrEqual(rowBounds!.x + rowBounds!.width + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const stage = process.env.ESCEN_ARTICLE_SCREENSHOT_STAGE || 'after';
    await page.screenshot({ path: `tmp/screenshots/articles-layout/${stage}/list-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Brouillons (2)', exact: true }).click();
    await expect(page.locator('.editorial-article-card')).toHaveCount(2);
    await page.getByRole('button', { name: 'Tous (6)', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Rechercher un article' }).fill('nouvelle année');
    await expect(page.locator('.editorial-article-card')).toHaveCount(1);
    await page.getByRole('searchbox', { name: 'Rechercher un article' }).fill('');
    await page.getByRole('button', { name: /^Modifier :/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(page.getByRole('textbox', { name: 'Contenu de l’article', exact: true })).toBeVisible();
    const editor = page.locator('.article-editor');
    const bounds = await editor.boundingBox();
    expect(bounds!.width).toBeGreaterThan(width <= 390 ? 240 : 400);
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: `tmp/screenshots/articles-layout/${stage}/editor-${width}.png`, fullPage: true });
  });
}
