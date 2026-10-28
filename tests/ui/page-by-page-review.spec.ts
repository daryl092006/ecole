import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { installResponsiveAudit, type AuditAccount } from './responsive-audit-fixture';
import { MODULE_PATHS, PORTAL_ROUTES, studentPath } from '../../src/constants/portalRoutes';

interface Review { route: string; state: string; heading: string; screenshot: string; bottom?: string; error?: string; }
const screens = [
  ...PORTAL_ROUTES.map(route => ({ key: route.section, href: route.href, account: (route.section.startsWith('espace_') && route.section !== 'espace_dashboard' ? 'student' : 'staff') as AuditAccount })),
  ...Object.entries(MODULE_PATHS).map(([key, href]) => ({ key: `module_${key}`, href, account: 'staff' as const })),
  { key: 'student_record', href: studentPath('ESCEN-TEST-001'), account: 'staff' as const },
  { key: 'student_home', href: '/mon-espace', account: 'student' as const },
  ...['connexion', 'mot-de-passe-oublie', 'mot-de-passe-reinitialiser', 'mot-de-passe-modifier'].map(key => ({ key, href: `/${key}`, account: (key === 'mot-de-passe-modifier' ? 'password' : 'anonymous') as AuditAccount })),
];

async function ready(page: Page) {
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.loading-state:visible')).toHaveCount(0);
  await expect(page.locator('main .error-state')).toHaveCount(0);
  await expect(page.locator('main h1:visible, main h2:visible').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function closeDrawers(page: Page) {
  for (let remaining = 0; await page.getByRole('dialog').count(); remaining++) {
    expect(remaining, 'Les fenêtres doivent pouvoir se fermer').toBeLessThan(6);
    const dialog = page.getByRole('dialog').last();
    await dialog.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
    const discard = dialog.getByRole('button', { name: 'Abandonner les modifications', exact: true });
    if (await discard.isVisible()) await discard.click();
  }
}

for (const width of [390, 1440]) test(`Revue des pages, sous-onglets et fenêtres à ${width}px`, async ({ browser }) => {
  const root = `tmp/screenshots/page-by-page-review/${width}`;
  mkdirSync(root, { recursive: true });
  const reviews: Review[] = [];
  const failures: string[] = [];
  let sequence = 0;
  async function capture(page: Page, route: string, state: string) {
    await expect(page.locator('.error-state:visible')).toHaveCount(0);
    const scope = page.getByRole('dialog').last();
    const heading = await (await scope.count() ? scope.locator('h1:visible, h2:visible').first() : page.locator('main h1:visible, main h2:visible').first()).innerText();
    const dimensions = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, available: innerWidth }));
    expect(dimensions.actual).toBeLessThanOrEqual(dimensions.available + 1);
    const file = `${root}/${String(sequence++).padStart(3, '0')}`;
    await page.evaluate(() => {
      const scroll = document.querySelector('.detail-drawer:last-of-type .detail-drawer-body') || document.querySelector('main');
      if (scroll) scroll.scrollTop = 0;
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: `${file}.png`, animations: 'disabled', timeout: 20000 });
    const moved = await page.evaluate(() => {
      const dialogs = [...document.querySelectorAll('.detail-drawer-body')];
      const scroll = dialogs.at(-1) || document.querySelector('main');
      if (scroll && scroll.scrollHeight > scroll.clientHeight + 4 && ['auto', 'scroll'].includes(getComputedStyle(scroll).overflowY)) {
        scroll.scrollTop = scroll.scrollHeight; return true;
      }
      if (document.documentElement.scrollHeight > innerHeight + 4) { window.scrollTo(0, document.documentElement.scrollHeight); return true; }
      return false;
    });
    if (moved) await page.screenshot({ path: `${file}-bottom.png`, animations: 'disabled', timeout: 20000 });
    reviews.push({ route, state, heading, screenshot: `${file}.png`, ...(moved ? { bottom: `${file}-bottom.png` } : {}) });
  }
  async function inspectActions(page: Page, route: string, container: Locator, seen: Set<string>) {
    const candidates = await container.getByRole('button').evaluateAll(buttons => buttons.map(button => ({
      name: button.getAttribute('aria-label') || button.textContent?.trim() || '', disabled: (button as HTMLButtonElement).disabled,
    })).filter(item => /^(Ajouter|Nouvelle?\b|Nouvel\b|Nouveau\b|Créer|Composer|Rédiger|Réinscrire|Déposer|Modifier|Ouvrir|Voir\b|Fiche|Saisir|Affecter|Programmer|Bloquer|Enregistrer la présence|Enregistrer un paiement|Choisir le dossier|Gérer les filières|Configurer|Bilan avant)/i.test(item.name)));
    for (const candidate of candidates) {
      if (candidate.disabled || seen.has(candidate.name)) continue;
      seen.add(candidate.name);
      const button = container.getByRole('button', { name: candidate.name, exact: true }).first();
      if (!await button.count() || !await button.isVisible()) continue;
      await button.click();
      await expect(page.locator('.loading-state:visible')).toHaveCount(0);
      await capture(page, route, `Fenêtre : ${candidate.name}`);
      if (/^Configurer \d/.test(candidate.name)) {
        const steps = await page.locator('.year-preparation-row button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label') || ''));
        for (const step of steps) {
          await page.getByRole('dialog').last().getByRole('button', { name: step, exact: true }).click();
          await expect(page.locator('.loading-state:visible')).toHaveCount(0);
          await capture(page, route, `Préparation de l’année : ${step}`);
          await closeDrawers(page);
          await button.click();
          await expect(page.locator('.loading-state:visible')).toHaveCount(0);
        }
      }
      // No form submission, confirmation or remote write is performed.
      await closeDrawers(page);
    }
  }
  try {
    for (const screen of screens) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      page.setDefaultNavigationTimeout(45000);
      const { problems } = await installResponsiveAudit(page, screen.account);
      page.on('pageerror', error => failures.push(`${screen.href}: ${error.message}`));
      try {
        await page.goto(screen.href, { waitUntil: 'domcontentloaded' });
        if (['acad_assessments', 'acad_resits'].includes(screen.key)) await page.waitForURL(url => url.pathname === '/academique/examens');
        await ready(page);
        await capture(page, screen.href, 'Page initiale');
        const seen = new Set<string>();
        if (screen.key === 'acad_program') {
          await page.getByRole('combobox', { name: '1. Groupe', exact: true }).selectOption({ index: 1 });
          await page.getByRole('combobox', { name: '2. Semestre', exact: true }).selectOption({ index: 1 });
          await capture(page, screen.href, 'Programme et matières après sélection');
        }
        if (screen.key === 'web_documents') {
          for (const summary of await page.locator('main details.card > summary').all()) await summary.click();
          await capture(page, screen.href, 'Filières et niveaux dépliés');
        }
        if (screen.key === 'espace_dashboard' || screen.key === 'student_home') {
          for (const summary of await page.locator('.home-directory-group > summary').all()) await summary.click();
          await capture(page, screen.href, 'Répertoire des rubriques déplié');
        }
        await inspectActions(page, screen.href, page.locator('main'), seen);
        if (screen.key === 'acad_reference') {
          const selector = page.getByRole('combobox', { name: 'Rubrique', exact: true });
          const options = await selector.locator('option').evaluateAll(options => options.map(option => ({ value: (option as HTMLOptionElement).value, label: option.textContent || '' })));
          for (const option of options) {
            await selector.selectOption(option.value);
            await expect(page.locator('.loading-state:visible')).toHaveCount(0);
            await capture(page, screen.href, `Référentiel : ${option.label}`);
            await inspectActions(page, screen.href, page.locator('main'), seen);
          }
        }
        const tabs = page.locator('main .record-sections > button, main .section-tabs > button');
        const names = await tabs.allTextContents();
        for (const name of names) {
          await page.locator('main').getByRole('button', { name: name.trim(), exact: false }).first().click();
          await expect(page.locator('.loading-state:visible')).toHaveCount(0);
          await capture(page, screen.href, `Sous-onglet : ${name.trim()}`);
          await inspectActions(page, screen.href, page.locator('main'), seen);
        }
        expect(problems).toEqual([]);
      } catch (error) {
        const message = `${screen.href}: ${String(error)}`;
        failures.push(message);
        reviews.push({ route: screen.href, state: 'À corriger', heading: '', screenshot: '', error: message });
      } finally { await context.close(); }
    }
  } finally {
    writeFileSync(`${root}/review.json`, JSON.stringify({ width, pages: screens.length, reviews, failures }, null, 2));
  }
  expect(failures).toEqual([]);
});

test('Entrée de l’application et page introuvable', async ({ browser }) => {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 960 } });
    try {
      const page = await context.newPage();
      await installResponsiveAudit(page, 'anonymous');
      await page.goto('/');
      await expect(page).toHaveURL(/\/connexion$/);
      await ready(page);
      const response = await page.goto('/page-inexistante-revue-visuelle');
      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { name: 'Page introuvable', exact: true })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: `tmp/screenshots/page-by-page-review/${width}/404.png`, fullPage: true });
    } finally { await context.close(); }
  }
});
