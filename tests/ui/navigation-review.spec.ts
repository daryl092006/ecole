import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PORTAL_ROUTES, MODULE_PATHS, studentPath } from '../../src/constants/portalRoutes';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { captureWorkspace, expectWorkspaceFits } from './helpers';
import { CRUD_CATALOG } from '../../src/data/crudCatalog';

for (const width of [390, 1440]) {
  test(`Revue de toutes les pages authentifiées à ${width}px`, async ({ page }) => {
    test.setTimeout(600000);
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    await page.route('**/api/website-management?kind=articles', route => route.fulfill({ json: [] }));
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    await page.route('**/api/catalog/*', route => route.fulfill({ json: { revision: 1, tables: Object.fromEntries(CRUD_CATALOG.map(spec => [spec.key, []])), historyLinks: [] } }));
    await page.route('**/api/staff', route => route.fulfill({ json: { revision: 1, records: [{ personId: 'P2', staffId: null, firstname: 'Jean', lastname: 'Technique', email: 'it@example.test', phone: '', employeeNumber: '', contracts: [] }] } }));
    await page.route('**/api/subjects', route => route.fulfill({ json: { revision: 1, subjects: [] } }));
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const reviews: { href: string; title: string[]; content: string; actions: string[] }[] = [];
    const routes = [...PORTAL_ROUTES, ...Object.entries(MODULE_PATHS).map(([tab, href]) => ({ tab, section: `${tab}_overview`, href, title: tab })), { tab: 'etudiants', section: 'student_record', href: studentPath('ESCEN-TEST-001'), title: 'Dossier étudiant' }];
    for (const route of routes) {
      await test.step(route.href, async () => {
        await page.goto(route.href);
        await expect(page.locator('#main-content')).toBeVisible();
        await expect(page.getByRole('region', { name: 'État des données' })).toContainText('1 dossier(s)');
        await expect.soft(page.locator('#main-content h1:visible')).toHaveCount(1);
        await expect(page.locator('#main-content [role=status]').filter({ hasText: /^Chargement/ })).toHaveCount(0);
        try { await captureWorkspace(page, `review-${route.section}`); }
        catch (error) {
          errors.push(`${route.href}: ${String(error)}`);
          await page.screenshot({ path: `.tmp/interface/${width}/review-${route.section}.png`, fullPage: true });
        }
        const content = await page.locator('#main-content').innerText();
        reviews.push({ href: route.href, title: await page.locator('#main-content h1:visible').allTextContents(), content, actions: await page.locator('#main-content button:visible').allTextContents() });
      });
    }
    mkdirSync('.tmp/interface', { recursive: true });
    writeFileSync(`.tmp/interface/review-${width}.json`, JSON.stringify({ reviews, errors }, null, 2));
    expect(errors).toEqual([]);
  });

  test(`Naviguer entre les pages et filtrer les dossiers à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    await page.route('**/api/website-management?kind=articles', route => route.fulfill({ json: [] }));
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    await page.goto('/etudiants');
    await expect(page.getByRole('heading', { name: 'Dossiers étudiants', exact: true })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'ESCEN-TEST-001' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Nationalité', exact: true }).selectOption('__missing__');
    await expect(page.getByRole('row').filter({ hasText: 'ESCEN-TEST-001' })).toBeVisible();
    await page.getByRole('button', { name: 'Effacer les filtres' }).click();
    await page.locator('.student-advanced-filters summary').click();
    await page.getByRole('combobox', { name: 'Filière', exact: true }).selectOption('Informatique');
    await expect(page.locator('.student-advanced-filters summary')).toContainText('(1)');
    await page.getByRole('button', { name: 'Effacer les filtres' }).click();
    if (width < 800) await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
    const navigation = page.getByRole(width < 800 ? 'dialog' : 'complementary', { name: 'Navigation principale' });
    await navigation.getByRole('button', { name: 'Déplier Examens et résultats', exact: true }).click();
    await expect(navigation.getByRole('link', { name: 'Notes et résultats', exact: true })).toBeVisible();
    await navigation.getByRole('link', { name: 'Notes et résultats', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Notes et résultats', exact: true })).toBeVisible();
    await expect(page.getByText(/Aller à une page de/)).toHaveCount(0);
    if (width < 800) await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
    await navigation.getByRole('link', { name: 'Examens', exact: true }).click();
    await expect(page).toHaveURL(/\/academique\/examens$/);
    await expect(page.getByRole('heading', { name: 'Examens', exact: true })).toBeVisible();
    await expectWorkspaceFits(page);
  });

  test(`Revue des écrans de connexion à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const href of ['/connexion', '/mot-de-passe-oublie', '/mot-de-passe-reinitialiser']) {
      await page.goto(href);
      await expect(page.getByRole('main')).toBeVisible();
      await expectWorkspaceFits(page);
      await page.screenshot({ path: `.tmp/interface/${width}/review-auth-${href.slice(1)}.png`, fullPage: true });
    }
    await authenticateFixture(page);
    await page.route('**/api/website-management?kind=articles', route => route.fulfill({ json: [] }));
    await page.goto('/mot-de-passe-modifier');
    await expect(page.getByRole('main')).toBeVisible();
    await expectWorkspaceFits(page);
    await page.screenshot({ path: `.tmp/interface/${width}/review-auth-mot-de-passe-modifier.png`, fullPage: true });
  });
}
