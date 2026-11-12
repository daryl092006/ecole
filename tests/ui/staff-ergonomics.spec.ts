import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ROLES } from '../../src/types/permissions';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';
import { getAvailableTabs } from '../../src/permissions/navigation';
import { installResponsiveAudit } from './responsive-audit-fixture';

const staffRoles = Object.entries(ROLES).filter(([code]) => !['STUD', 'DEL'].includes(code));

for (const [code, role] of staffRoles) for (const width of [390, 1440]) {
  test(`Ergonomie ${code} : accueil et pages autorisées à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const { problems } = await installResponsiveAudit(page, 'staff', role);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const directory = `tmp/screenshots/staff-ergonomics/${code}/${width}`;
    mkdirSync(directory, { recursive: true });
    const pages = getAvailableTabs(role, ROLE_ACCESS[role].permissions, true).flatMap(tab => tab.subTabs || []);
    const report: { section: string; href: string; problems: string[]; errors: string[] }[] = [];
    try {
      await page.goto('/mon-espace');
      await expect(page.getByRole('heading', { name: 'Bonjour Jean.', exact: true })).toBeVisible();
      if (width <= 768) expect((await page.locator('main .page-intro').boundingBox())!.height).toBeLessThan(240);
      await expect(page.locator('main .page-eyebrow').first()).toHaveText(role);
      await expect(page.getByRole('navigation', { name: 'Navigation étudiante', exact: true })).toHaveCount(0);
      const actions = page.getByRole('navigation', { name: 'Accès rapides', exact: true });
      await expect(actions).toBeVisible();
      await expect(page.locator('main .kpi-chart').first()).toBeVisible();
      for (const href of await actions.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')))) {
        expect(pages.some(destination => destination.href === href), `${code} : destination ${href}`).toBe(true);
      }
      await page.screenshot({ path: `${directory}/home.png` });
      for (const destination of pages) {
        problems.length = 0; errors.length = 0;
        const response = await page.goto(destination.href, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('main .loading-state:visible')).toHaveCount(0);
        await expect(page.locator('main .error-state:visible')).toHaveCount(0);
        await expect(page.locator('main .route-denied')).toHaveCount(0);
        await expect(page.locator('main h1').first()).toBeVisible();
        expect.soft(response?.ok(), `${code} : HTTP ${destination.href}`).toBe(true);
        expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${code} : largeur ${destination.href}`).toBe(true);
        await page.screenshot({ path: `${directory}/${destination.id}.png` });
        report.push({ section: destination.id, href: destination.href, problems: [...problems], errors: [...errors] });
        expect.soft(problems, `${code} : API ${destination.href}`).toEqual([]);
        expect.soft(errors, `${code} : React ${destination.href}`).toEqual([]);
      }
    } finally {
      writeFileSync(`${directory}/audit.json`, JSON.stringify({ role, width, pages: report }, null, 2));
    }
  });
}
