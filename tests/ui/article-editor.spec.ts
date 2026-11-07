import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { ARTICLE_DOCUMENT_PREFIX } from '../../src/utils/articleDocument';

const yearId = '44444444-4444-4444-8444-444444444444';
for (const width of [390, 1440]) {
  test(`Articles : rédaction visuelle, aperçu, relecture et enregistrement à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { currentYearId: yearId, selectedYearId: yearId, selection: 'current', years: [{ id: yearId, name: '2026-2027', status: 'OUVERTE', starts_on: '2026-09-01', ends_on: '2027-07-31' }] } } }));
    let payload: Record<string, unknown> | null = null;
    let saved = false;
    let fail = true;
    await page.route('**/api/website-management*', async route => {
      if (route.request().method() === 'POST') {
        payload = route.request().postDataJSON();
        if (fail) return route.fulfill({ status: 409, json: { error: 'Modification concurrente.' } });
        saved = true;
        return route.fulfill({ status: 201, json: { id: '55555555-5555-4555-8555-555555555555' } });
      }
      return route.fulfill({ json: saved ? [{ ...payload, id: '55555555-5555-4555-8555-555555555555', version: 1 }] : [] });
    });
    await page.goto('/site-web/articles');
    await page.getByRole('button', { name: '+ Rédiger un article', exact: true }).click();
    await page.getByLabel('Titre', { exact: true }).fill('Les ateliers du campus');
    await page.getByLabel('Résumé', { exact: true }).fill('Découvrez les ateliers ouverts aux étudiants.');
    const canvas = page.getByRole('textbox', { name: 'Contenu de l’article', exact: true });
    await canvas.fill('Bienvenue aux ateliers ESCEN');
    await canvas.press('Control+a');
    await page.getByRole('button', { name: 'Gras', exact: true }).click();
    await expect(canvas.locator('b, strong')).toHaveText('Bienvenue aux ateliers ESCEN');
    await page.getByRole('button', { name: 'Insérer une image', exact: true }).click();
    await page.getByLabel('Adresse HTTPS').fill('javascript:alert(1)');
    await page.getByLabel('Description de l’image').fill('Les étudiants en atelier');
    await page.getByRole('button', { name: 'Insérer', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'adresse HTTPS' })).toBeVisible();
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await page.getByRole('button', { name: 'Aperçu de l’article', exact: true }).click();
    await expect(page.locator('.article-editor-preview strong')).toHaveText('Bienvenue aux ateliers ESCEN');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Reprendre la rédaction', exact: true }).click();
    await page.getByRole('button', { name: 'Relire avant enregistrement', exact: true }).click();
    expect(payload).toBeNull();
    await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Modification concurrente' })).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Modifier : Les ateliers du campus' })).toBeVisible();
    const content = (payload as unknown as { content: string }).content;
    expect(content.startsWith(ARTICLE_DOCUMENT_PREFIX)).toBe(true);
    expect(JSON.parse(content.slice(ARTICLE_DOCUMENT_PREFIX.length)).blocks[0].content[0]).toEqual({ text: 'Bienvenue aux ateliers ESCEN', bold: true });
    await page.getByRole('button', { name: 'Modifier : Les ateliers du campus' }).click();
    await expect(page.getByRole('textbox', { name: 'Contenu de l’article', exact: true }).locator('strong')).toHaveText('Bienvenue aux ateliers ESCEN');
  });
}
