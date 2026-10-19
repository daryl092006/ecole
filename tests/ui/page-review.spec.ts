import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PORTAL_ROUTES } from '../../src/constants/portalRoutes';
import { getAvailableTabs } from '../../src/permissions/navigation';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './legacy-demo-fixture';
import { ROLES, type RoleName } from '../../src/types/permissions';
import { expectWorkspaceFits } from './helpers';

for (const width of [390, 1440]) {
  test(`Relevé individuel des ${PORTAL_ROUTES.length} pages à ${width}px`, async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    const reviews: { url: string; role: string; heading: string; fields: number; actions: string[]; disclosures: string[]; visibleWords: number }[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const roles = [ROLES.LOG, ROLES.DA, ROLES.RAF, ROLES.DG, ROLES.MKT, ROLES.ACHATS, ROLES.SITE, ROLES.IT, ROLES.STUD];
    const preferredRoles: Record<string, RoleName> = { acad_reference: ROLES.DA, acad_grades: ROLES.ENS, acad_attendance: ROLES.SURV, acad_jury: ROLES.DA, log_purchases: ROLES.ACHATS, log_assets: ROLES.SITE, sys_logs: ROLES.IT };
    mkdirSync(`.tmp/page-review/${width}`, { recursive: true });
    for (const route of PORTAL_ROUTES) {
      await test.step(`${route.href} — ${route.title}`, async () => {
        const role = preferredRoles[route.section] || roles.find(value => getAvailableTabs(value).some(tab => tab.subTabs?.some(section => section.href === route.href)));
        expect(role, `Un rôle autorisé doit être défini pour ${route.href}`).toBeTruthy();
        await page.goto('/connexion?retour=' + encodeURIComponent(route.href));
        await page.getByLabel('Adresse email', { exact: true }).fill(DEMO_ACCOUNTS.find(item => item.role === role)!.email);
        await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
        await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
        await expect(page).toHaveURL('http://127.0.0.1:3105' + route.href);
        const heading = page.locator('#main-content h1');
        await expect(heading).toHaveCount(1);
        await expect(heading).toBeVisible();
        await expectWorkspaceFits(page);
        await expect(page.locator('#main-content a[href="#"]')).toHaveCount(0);
        await expect(page.locator('#main-content table tbody:empty')).toHaveCount(0);
        const actions = await page.locator('#main-content button:visible').allTextContents();
        expect(actions.every(value => value.trim().length > 0)).toBe(true);
        const disclosures = await page.locator('#main-content details.action-panel > summary').allTextContents();
        for (const summary of await page.locator('#main-content details.action-panel > summary').all()) {
          await summary.click();
          await expectWorkspaceFits(page);
          await summary.click();
        }
        if (route.section === 'acad_schedule') await expect(page.locator('#main-content table')).toHaveCount(1);
        reviews.push({ url: route.href, role: role!, heading: (await heading.textContent())!.trim(), fields: await page.locator('#main-content input, #main-content select, #main-content textarea').count(), actions: actions.map(value => value.trim()), disclosures: disclosures.map(value => value.trim()), visibleWords: (await page.locator('#main-content').innerText()).split(/\s+/).filter(Boolean).length });
        await page.screenshot({ path: `.tmp/page-review/${width}/${route.section}.png`, fullPage: true });
      });
    }
    writeFileSync(`.tmp/page-review/${width}.json`, JSON.stringify({ width, reviews, errors }, null, 2));
    expect(reviews).toHaveLength(PORTAL_ROUTES.length);
    expect(errors).toEqual([]);
  });
}
