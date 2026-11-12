import { expect, test } from '@playwright/test';
import { securityIds, uuid } from './security-fixture';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`Listes du site : structure et filtres à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const fixture = await installResponsiveAudit(page, 'staff');
    const programs = Array.from({ length: 6 }, (_, i) => ({ id: uuid(8500 + i), name: `Formation ${i + 1} en ingénierie informatique et systèmes de gestion` }));
    const levels = Array.from({ length: 3 }, (_, i) => ({ id: uuid(8600 + i), name: `Licence ${i + 1}` }));
    const intakes = programs.flatMap((program, i) => levels.map((level, j) => ({ id: uuid(8700 + i * 3 + j), academic_year_id: securityIds.year, level_id: level.id, program_id: program.id, label: `${program.name} · ${level.name}`, level_name: level.name, program_name: program.name, active: (i + j) % 2 === 0, required_documents: ['diplome_file'], version: 1 })));
    await page.route('**/api/website-management*', route => route.fulfill({ json: { articles: [], applications: [], intakes, programs, levels, years: fixture.snapshot.tables.academic_years, level_document_rules: [] } }));
    for (const path of ['/site-web/demandes', '/site-web/documents']) {
      await page.goto(path);
      const panel = page.locator('.data-panel').last();
      await expect(panel).toBeVisible();
      await expect(page.locator('main h1')).toHaveCount(1);
      await expect(panel.locator('.card')).toHaveCount(0);
      const search = panel.getByRole('searchbox');
      await expect(search).toBeVisible();
      const geometry = await search.evaluate(element => {
        const input = element.getBoundingClientRect();
        const card = element.closest('.data-panel')!.getBoundingClientRect();
        return { gutter: input.left - card.left, right: input.right, viewport: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth };
      });
      expect(geometry.gutter).toBeGreaterThanOrEqual(12);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
      await search.fill('aucun-resultat-de-recette');
      await expect(panel.getByText(/Aucun.*correspond|Aucune candidature pour ce filtre/)).toBeVisible();
      await panel.getByRole('button', { name: 'Réinitialiser les filtres' }).click();
      await expect(search).toHaveValue('');
      if (path.endsWith('documents')) {
        await expect(panel.locator('tbody tr')).toHaveCount(10);
        await panel.getByRole('button', { name: 'Suivant', exact: true }).click();
        await expect(panel.locator('tbody tr')).toHaveCount(8);
        await panel.getByRole('button', { name: 'Première page', exact: true }).click();
        await panel.getByRole('combobox', { name: 'Filtrer par filière', exact: true }).selectOption(programs[0].id);
        await expect(panel.locator('tbody tr')).toHaveCount(3);
        await panel.getByRole('combobox', { name: 'Ouverture sur le site', exact: true }).selectOption('closed');
        await expect(panel.locator('tbody tr')).toHaveCount(1);
        await panel.getByRole('button', { name: 'Réinitialiser les filtres' }).click();
        await expect(panel.locator('tbody tr')).toHaveCount(10);
      }
      await expect(panel.locator('tbody tr').first()).toBeVisible();
      await page.locator('main').evaluate(element => { element.scrollTop = 0; });
      await page.screenshot({ path: `tmp/screenshots/page-layout/${width}/${path.split('/').pop()}.png`, fullPage: true });
      if (path.endsWith('documents')) {
        await page.locator('main').evaluate(element => { element.scrollTop = element.scrollHeight; });
        await page.screenshot({ path: `tmp/screenshots/page-layout/${width}/documents-bas.png`, fullPage: true });
        await page.getByRole('button', { name: /Configurer l’ouverture :/ }).first().click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.locator('main .data-panel')).toHaveCount(2);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(search).toBeVisible();
      }
    }
    expect(fixture.problems).toEqual([]);
  });
}
