import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';

for (const width of [390, 1440]) {
  test(`Accès direct aux candidatures à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    await page.route('**/api/website-management*', route => route.fulfill({
      json: { applications: [], intakes: [], years: [], levels: [], programs: [] },
    }));
    await page.goto('/site-web/documents');
    await expect(page.getByRole('heading', { name: 'Formations et pièces', exact: true })).toBeVisible();
    if (width < 768) await page.getByRole('button', { name: /Ouvrir (la navigation|le menu)/ }).click();
    const nav = page.locator('#application-navigation');
    const applications = nav.getByRole('link', { name: 'Candidatures', exact: true });
    await expect(applications).toBeVisible();
    await expect(applications).toHaveCount(1);
    await expect(applications).toHaveAttribute('href', '/site-web/demandes');
    await applications.click();
    await expect(page.getByRole('heading', { name: 'Candidatures', exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Fil d’Ariane' }).getByText('Candidatures', { exact: true })).toHaveCount(1);
    if (width < 768) await page.getByRole('button', { name: /Ouvrir (la navigation|le menu)/ }).click();
    await expect(applications).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Site web', exact: true })).toHaveAttribute('href', '/site-web/documents');
  });
}
