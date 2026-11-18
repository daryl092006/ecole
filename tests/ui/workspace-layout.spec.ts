import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PORTAL_ROUTES, MODULE_PATHS, studentPath } from '../../src/constants/portalRoutes';
import { installResponsiveAudit, type AuditAccount } from './responsive-audit-fixture';

const screens = [
  ...PORTAL_ROUTES.map(route => ({ key: route.section, href: route.href, account: (route.section.startsWith('espace_') ? 'student' : 'staff') as AuditAccount })),
  ...Object.entries(MODULE_PATHS).map(([key, href]) => ({ key: `module_${key}`, href, account: 'staff' as const })),
  { key: 'student_record', href: studentPath('ESCEN-TEST-001'), account: 'staff' as const },
  { key: 'connexion', href: '/connexion', account: 'anonymous' as const },
  { key: 'password', href: '/mot-de-passe-oublie', account: 'anonymous' as const },
  { key: 'candidature', href: '/candidature', account: 'anonymous' as const },
  { key: 'candidate_tracking', href: '/candidature/suivi', account: 'anonymous' as const },
];
const root = 'tmp/screenshots/workspace-layout';

async function inspect(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const visible = (element: Element) => { const r = element.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(element).visibility !== 'hidden' && !element.closest('[inert], [hidden], nextjs-portal'); };
    if (document.documentElement.scrollWidth > innerWidth + 1) issues.push(`Page ${document.documentElement.scrollWidth}px > ${innerWidth}px`);
    const main = document.querySelector('main');
    if (main && main.scrollWidth > main.clientWidth + 1) issues.push(`Contenu ${main.scrollWidth}px > ${main.clientWidth}px`);
    const scroll = '.table-wrap, .section-tabs, .record-sections, .schedule-calendar-scroll';
    for (const el of document.querySelectorAll('main h1, main h2, main input:not([type="hidden"]), main select, main textarea, main button, main a[href]')) {
      if (!visible(el) || el.closest(scroll)) continue;
      const bounds = el.getBoundingClientRect();
      if (bounds.left < -1 || bounds.right > innerWidth + 1) issues.push(`Hors écran : ${el.tagName}.${el.className} (${Math.round(bounds.left)}–${Math.round(bounds.right)})`);
    }
    if (innerWidth <= 768) {
      if ([...document.querySelectorAll('.mobile-record-row')].some(row => visible(row) && getComputedStyle(row).display === 'table-row')) issues.push('Tableau sans adaptation en fiches');
      const calendar = document.querySelector('.schedule-calendar-scroll');
      if (calendar && visible(calendar)) issues.push('Calendrier en grille sur mobile');
      for (const control of document.querySelectorAll('main input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), main select, main textarea')) {
        if (visible(control) && parseFloat(getComputedStyle(control).fontSize) < 16) issues.push(`Champ trop petit : ${control.tagName}.${control.className}`);
      }
    }
    return [...new Set(issues)];
  });
}

for (const width of [320, 390, 480, 768, 820, 1024, 1440, 2560]) {
  test(`Architecture commune : ${screens.length} écrans à ${width}px`, async ({ browser }) => {
    const results: { route: string; issues: string[] }[] = [];
    const directory = `${root}/${width}`;
    mkdirSync(directory, { recursive: true });
    try {
      for (const account of ['staff', 'student', 'anonymous'] as const) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const { problems } = await installResponsiveAudit(page, account);
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/api/candidature', route => route.fulfill({ json: { year: { name: '2026-2027' }, intakes: [] } }));
        await page.route('**/api/candidate-dossier', route => route.fulfill({ status: 401, json: { error: 'Connexion requise' } }));
        for (const screen of screens.filter(screen => screen.account === account)) {
          problems.length = 0; errors.length = 0;
          await page.goto(screen.href);
          await expect(page.locator('main')).toBeVisible();
          await expect(page.locator('main .loading-state:visible')).toHaveCount(0);
          await expect(page.locator('main h1:visible, main h2:visible').first()).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          const issues = [...await inspect(page), ...problems, ...errors];
          results.push({ route: screen.href, issues });
          writeFileSync(`${directory}/results.json`, JSON.stringify(results, null, 2));
          expect.soft(issues, `${screen.href} à ${width}px`).toEqual([]);
          await page.screenshot({ path: `${directory}/${screen.key}.png`, animations: 'disabled' });
        }
        await context.close();
      }
    } finally { writeFileSync(`${directory}/results.json`, JSON.stringify(results, null, 2)); }
  });
}

for (const width of [479, 481, 600, 767, 769, 1023, 1025, 1280, 1920]) {
  test(`Transitions responsive et navigation à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 600 });
    await installResponsiveAudit(page, 'staff');
    for (const route of ['/site-web/demandes', '/academique/examens', '/etudiants', '/finance/versements', '/academique/emploi-du-temps', '/personnel', '/site-web/articles', '/systeme/journal']) {
      await page.goto(route);
      await expect(page.locator('main .loading-state:visible')).toHaveCount(0);
      await expect(page.locator('main h1:visible, main h2:visible').first()).toBeVisible();
      expect(await inspect(page), route).toEqual([]);
    }
    if (width <= 1024) {
      await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Navigation principale', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Ouvrir la navigation', exact: true })).toBeFocused();
    }
  });
}
