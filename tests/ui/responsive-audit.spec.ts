import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PORTAL_ROUTES, MODULE_PATHS, studentPath } from '../../src/constants/portalRoutes';
import { CRUD_CATALOG, CRUD_SECTIONS } from '../../src/data/crudCatalog';
import { installResponsiveAudit, type AuditAccount } from './responsive-audit-fixture';

interface Screen { key: string; name: string; href: string; account: AuditAccount; destination?: string; readyHeading?: string; }
const screens: Screen[] = [
  { key: 'auth_connexion', name: 'Connexion', href: '/connexion', account: 'anonymous' },
  { key: 'auth_forgot', name: 'Mot de passe oublié', href: '/mot-de-passe-oublie', account: 'anonymous' },
  { key: 'auth_reset', name: 'Réinitialiser le mot de passe', href: '/mot-de-passe-reinitialiser', account: 'anonymous' },
  { key: 'auth_required', name: 'Changement obligatoire du mot de passe', href: '/mot-de-passe-modifier', readyHeading: 'Choisissez un nouveau mot de passe', account: 'password' },
  ...PORTAL_ROUTES.map(route => ({
    key: route.section, name: route.title, href: route.href,
    // These legacy addresses redirect to the connected exam workspace.
    destination: ['acad_assessments', 'acad_resits'].includes(route.section) ? '/academique/examens' : undefined,
    readyHeading: route.section === 'acad_assessments' ? 'Contrôles continus' : route.section === 'acad_resits' ? 'Rattrapages' : undefined,
    account: (route.section.startsWith('espace_') && route.section !== 'espace_dashboard' ? 'student' : 'staff') as AuditAccount,
  })),
  ...Object.entries(MODULE_PATHS).map(([key, href]) => ({ key: `module_${key}`, name: `Accueil ${key}`, href, account: 'staff' as const })),
  { key: 'student_record', name: 'Dossier individuel étudiant', href: studentPath('ESCEN-TEST-001'), account: 'staff' },
  { key: 'student_home', name: 'Accueil étudiant', href: '/mon-espace', account: 'student' },
  { key: 'alias_actualites', name: 'Ancienne adresse des actualités', href: '/communication/actualites', destination: '/site-web/articles', readyHeading: 'Actualités institutionnelles', account: 'staff' },
  { key: 'root', name: 'Racine du site', href: '/', destination: '/connexion', readyHeading: 'Connexion', account: 'anonymous' },
  ...['acad_program', 'acad_reference'].flatMap(section => CRUD_SECTIONS[section].map(key => ({
    key: `catalog_${key}`, name: `Référentiel · ${CRUD_CATALOG.find(spec => spec.key === key)!.title}`,
    href: `${PORTAL_ROUTES.find(route => route.section === section)!.href}?collection=${key}`, account: 'staff' as const,
  }))),
];
const widths = [360, 390, 768, 1024, 1440];
const artifactRoot = process.env.ESCEN_AUDIT_ARTIFACT_ROOT || 'tmp/screenshots/responsive-audit';
const stage = process.env.ESCEN_RESPONSIVE_STAGE || 'before';
if (!['before', 'after'].includes(stage)) throw new Error('Étape responsive invalide.');
const selectedScreens = screens.filter(screen => !process.env.ESCEN_AUDIT_SCREEN || new RegExp(process.env.ESCEN_AUDIT_SCREEN).test(screen.key));

async function inspect(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const width = innerWidth;
    const shown = (element: Element) => {
      const box = element.getBoundingClientRect(), css = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && css.visibility !== 'hidden' && css.display !== 'none'
        && !element.closest('[inert], [hidden], nextjs-portal');
    };
    const name = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].slice(0, 2).join('.')} ${(element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 65)}`;
    if (document.documentElement.scrollWidth > width + 1) issues.push(`Débordement de page : ${document.documentElement.scrollWidth}px pour ${width}px`);
    const scope = document.querySelector('[role="dialog"]') || document.body;
    for (const element of scope.querySelectorAll('button, a[href], input, select, textarea, h1, h2, label')) {
      if (!shown(element)) continue;
      if (element.closest('.skip-link') && element !== document.activeElement) continue;
      // Horizontally scrollable regions are reachable; record them separately below.
      if (element.closest('.table-wrap, .section-tabs, .record-sections, .schedule-calendar-scroll')) continue;
      const tableCard = element.closest('.card > .data-table')?.parentElement;
      if (tableCard && tableCard.scrollWidth > tableCard.clientWidth
        && ['auto', 'scroll'].includes(getComputedStyle(tableCard).overflowX)) continue;
      const box = element.getBoundingClientRect();
      if (box.left < -1 || box.right > width + 1) issues.push(`Élément hors largeur : ${name(element)} (${Math.round(box.left)}–${Math.round(box.right)}px)`);
      const css = getComputedStyle(element);
      if (element instanceof HTMLElement && element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 2 && ['hidden', 'clip'].includes(css.overflowX) && css.textOverflow !== 'ellipsis') issues.push(`Texte coupé : ${name(element)}`);
    }
    if (width <= 768) {
      for (const row of document.querySelectorAll('.mobile-record-row')) {
        if (shown(row) && getComputedStyle(row).display === 'table-row') {
          issues.push('Tableau non transformé en fiches au seuil de navigation mobile'); break;
        }
      }
      const calendar = document.querySelector('.schedule-calendar-scroll');
      if (calendar && shown(calendar)) issues.push('Grille du calendrier affichée sur mobile');
    }
    const scrollRegions = [...scope.querySelectorAll<HTMLElement>('*')].filter(element => shown(element) && element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 2 && ['auto', 'scroll'].includes(getComputedStyle(element).overflowX)).map(name);
    return { issues: [...new Set(issues)], scrollRegions, pageWidth: document.documentElement.scrollWidth };
  });
}

for (const width of widths.filter(value => !process.env.ESCEN_AUDIT_WIDTH || String(value) === process.env.ESCEN_AUDIT_WIDTH)) {
  test(`Captures de ${selectedScreens.length} écrans à ${width}px (${stage})`, async ({ browser }) => {
    const directory = resolve(`${artifactRoot}/${stage}/${width}`); mkdirSync(directory, { recursive: true });
    const sessions = new Map<AuditAccount, { context: BrowserContext; page: Page; problems: string[]; errors: string[] }>();
    const results: Record<string, unknown>[] = [];
    try {
      for (const screen of selectedScreens) {
        if (!sessions.has(screen.account)) {
          const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
          const page = await context.newPage();
          const { problems } = await installResponsiveAudit(page, screen.account);
          const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
          sessions.set(screen.account, { context, page, problems, errors });
        }
        const { page, problems, errors } = sessions.get(screen.account)!;
        problems.length = 0; errors.length = 0;
        const response = await page.goto(`http://127.0.0.1:3117${screen.href}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        if (screen.destination) await page.waitForURL(url => url.pathname === screen.destination, { timeout: 15000 });
        if (screen.readyHeading) await expect(page.getByRole('heading', { name: screen.readyHeading, exact: true })).toBeVisible();
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('main .loading-state:visible')).toHaveCount(0);
        await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise(done => setTimeout(done, 3000))]); await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))); });
        const diagnostic = await inspect(page);
        if (!await page.locator('h1:visible, h2:visible').count()) diagnostic.issues.push('Contenu vide : aucun titre de page après chargement');
        const expectedPath = screen.destination || screen.href.split('?')[0];
        if (new URL(page.url()).pathname !== expectedPath) problems.push(`Redirection inattendue vers ${new URL(page.url()).pathname}`);
        if (response && !response.ok()) problems.push(`HTTP ${response.status()} pour la page`);
        const issues = [...diagnostic.issues, ...problems, ...errors.map(error => `Erreur React : ${error}`)];
        const screenshot = `${artifactRoot}/${stage}/${width}/${screen.key}.png`;
        await page.screenshot({ path: screenshot, animations: 'disabled' });
        const scrolled = await page.evaluate(() => {
          const main = document.querySelector('main');
          if (main && main.scrollHeight > main.clientHeight + 4 && ['auto', 'scroll'].includes(getComputedStyle(main).overflowY)) {
            main.scrollTop = main.scrollHeight; return true;
          }
          const root = document.scrollingElement;
          if (root && root.scrollHeight > innerHeight + 4) { window.scrollTo(0, root.scrollHeight); return true; }
          return false;
        });
        const bottomScreenshot = scrolled ? `${artifactRoot}/${stage}/${width}/${screen.key}-bottom.png` : null;
        if (bottomScreenshot) await page.screenshot({ path: bottomScreenshot, animations: 'disabled' });
        results.push({ ...screen, width, status: issues.length ? 'PROBLÈME' : 'OK', issues, scrollRegions: diagnostic.scrollRegions, screenshot, bottomScreenshot });
        // A baseline layout issue is an audit finding; broken fixtures or failed rendering are test failures.
        expect.soft(problems, `${screen.key} : lectures et route`).toEqual([]);
        expect.soft(errors, `${screen.key} : rendu React`).toEqual([]);
        if (stage === 'after') expect.soft(issues, `${screen.key} : responsive après correction`).toEqual([]);
      }
    } finally {
      const report = resolve(`${artifactRoot}/${stage}/audit-${width}.json`);
      const previous = process.env.ESCEN_AUDIT_SCREEN && existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')) as Record<string, unknown>[] : [];
      const updated = new Set(results.map(row => row.key));
      const complete = [...previous.filter(row => !updated.has(row.key)), ...results]
        .sort((a, b) => screens.findIndex(screen => screen.key === a.key) - screens.findIndex(screen => screen.key === b.key));
      writeFileSync(report, JSON.stringify(complete, null, 2));
      await Promise.all([...sessions.values()].map(session => session.context.close()));
    }
  });
}
