import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [800, 820, 834, 1024]) {
  test(`Espaces de travail et fenêtre financière sur tablette à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1112 });
    const { problems } = await installResponsiveAudit(page, 'staff');
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const path of ['/mon-espace', '/etudiants', '/finance/versements', '/academique/referentiel', '/academique/notes', '/academique/emploi-du-temps']) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('main .loading-state:visible')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Ouvrir la navigation', exact: true })).toBeVisible();
      await expect(page.locator('#application-navigation')).not.toBeVisible();
      const layout = await page.evaluate(() => {
        const main = document.querySelector('main')!;
        return {
          fits: document.documentElement.scrollWidth <= innerWidth && main.scrollWidth <= main.clientWidth + 1
            && main.getBoundingClientRect().width >= innerWidth - 40,
          overflow: [...main.querySelectorAll<HTMLElement>('*')].filter(element => element.getClientRects().length
            && element.getBoundingClientRect().right > innerWidth + 1 && !element.closest('.table-wrap'))
            .map(element => `${element.tagName}.${element.className}: ${Math.round(element.getBoundingClientRect().right)}`).slice(0, 12),
        };
      });
      expect(layout.fits, `${path}: ${JSON.stringify(layout.overflow)}`).toBe(true);
      await page.screenshot({ path: `tmp/screenshots/tablet-layout/${width}/${path.slice(1).replaceAll('/', '-')}.png` });
    }
    await page.goto('/finance/versements');
    await page.getByRole('button', { name: 'Enregistrer un paiement', exact: true }).click();
    await page.getByRole('button', { name: 'Consulter le dossier', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Dossier étudiant · ESCEN-TEST-001' });
    await expect(drawer).toBeVisible();
    const box = await drawer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: `tmp/screenshots/tablet-layout/${width}/dossier-financier.png` });
    expect(errors).toEqual([]);
    expect(problems).toEqual([]);
  });
}
