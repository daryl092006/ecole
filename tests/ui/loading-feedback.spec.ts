import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

const screens = [
  { route: '/personnel/enseignants', api: 'teachers', label: 'Chargement des enseignants et affectations…', title: 'Enseignants et affectations', error: 'Annuaire indisponible' },
  { route: '/academique/presences', api: 'attendances', label: 'Chargement des feuilles de présence…', title: 'Feuilles de présence', error: 'Présences indisponibles' },
  { route: '/academique/emploi-du-temps', api: 'schedule', label: 'Chargement du planning…', title: 'Séances et emploi du temps', error: 'Planning indisponible' },
  { route: '/academique/sujets', api: 'subjects', label: 'Chargement des sujets…', title: 'Bibliothèque des sujets', error: 'Bibliothèque des sujets indisponible' },
];

for (const width of [390, 1440]) for (const screen of screens) {
  test(`Attente, erreur et reprise : ${screen.api} à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const { problems } = await installResponsiveAudit(page, 'staff');
    let attempts = 0;
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/api/${screen.api}`, async route => {
      attempts++;
      if (attempts > 1) return route.fallback();
      await pending;
      await route.fulfill({ status: 503, json: { error: 'Service temporairement indisponible.' } });
    });
    try {
      await page.goto(screen.route);
      const loading = page.locator('.loading-state').filter({ hasText: screen.label });
      await expect(loading).toBeVisible();
      await expect(loading.locator('[aria-hidden="true"]').last()).toBeVisible();
      await page.screenshot({ path: `tmp/screenshots/loading-feedback/${screen.api}-${width}-loading.png` });
    } finally {
      release();
    }
    const error = page.locator('section.error-state');
    await expect(error.getByRole('heading', { name: screen.error, exact: true })).toBeVisible();
    await expect(error).toContainText('Service temporairement indisponible.');
    await expect(page.getByRole('heading', { name: screen.title, exact: true })).toHaveCount(0);
    await page.screenshot({ path: `tmp/screenshots/loading-feedback/${screen.api}-${width}-error.png` });
    await error.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByRole('heading', { name: screen.title, exact: true })).toBeVisible();
    await expect(page.locator('.error-state')).toHaveCount(0);
    expect(attempts).toBe(2);
    expect(problems).toEqual([]);
    const geometry = await page.locator('main').evaluate(element => [element.scrollWidth, element.clientWidth]);
    expect(geometry[0]).toBeLessThanOrEqual(geometry[1] + 1);
  });
}
