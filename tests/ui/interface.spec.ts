import { openAccountMenu } from './helpers';
import { test, expect, type Page } from '@playwright/test';
import { ROLES } from '../../src/types/permissions';
import { getAvailableTabs, isRouteAllowed } from '../../src/permissions/navigation';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../src/services/demoSessionService';
import { captureWorkspace } from './helpers';

async function follow(page: Page, href: string) {
  const menu = page.getByRole('button', { name: 'Ouvrir la navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.locator(`#application-navigation a[href="${href}"]`).first().click();
  await expect(page).toHaveURL(`http://127.0.0.1:3105${href}`);
  await expect(page.locator('#application-navigation .subnav-item.active')).toHaveAttribute('href', href);
}

for (const width of [320, 640, 768, 1024, 1440]) {
  test(`Toutes les pages et tous les rôles à ${width}px`, async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/connexion');
    await page.getByLabel('Adresse email', { exact: true }).fill(DEMO_ACCOUNTS[0].email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect(page).toHaveURL(/\/mon-espace$/);
    const issues: string[] = [];
    const captured = new Set<string>();
    async function inspect(path: string, role: string) {
      await expect(page.locator('#main-content h1').first()).toBeVisible();
      const findings = await page.evaluate(() => {
        const main = document.querySelector('#main-content')!;
        const unnamed = [...main.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input:not([type=hidden]), select, textarea')]
          .filter(element => element.getClientRects().length && !element.labels?.length && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby'))
          .map(element => element.outerHTML.slice(0, 160));
        return {
          overflow: document.documentElement.scrollWidth > window.innerWidth || main.scrollWidth > main.clientWidth + 1,
          unnamed,
          emptyTables: main.querySelectorAll('table tbody:empty').length,
          editable: [...main.querySelectorAll<HTMLInputElement>('form input, form select, form textarea')].some(element => !element.matches(':disabled')),
        };
      });
      if (findings.overflow) issues.push(`${role} ${path} : débordement horizontal`);
      findings.unnamed.forEach(value => issues.push(`${role} ${path} : champ sans libellé ${value}`));
      if (findings.emptyTables) issues.push(`${role} ${path} : tableau vide sans explication`);
      const captureKey = findings.editable ? `${path}-${role}` : path;
      if (!captured.has(captureKey)) {
        captured.add(captureKey);
        await captureWorkspace(page, captureKey.replaceAll('/', '-'));
      }
    }
    for (const role of Object.values(ROLES)) {
      const previousPath = new URL(page.url()).pathname;
      await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: role });
      if (!isRouteAllowed(previousPath, role)) await expect(page).toHaveURL('http://127.0.0.1:3105/mon-espace');
      await expect(page.locator('.role-scope-banner strong')).toHaveText(role);
      for (const tab of getAvailableTabs(role)) {
        await follow(page, tab.href);
        for (const section of tab.subTabs || []) {
          await follow(page, section.href);
          await inspect(section.href, role);
          if (section.id === 'acad_reference') {
            const names = await page.locator('#main-content .btn-group').first().getByRole('button').allTextContents();
            for (const name of names) {
              await page.locator('#main-content .btn-group').first().getByRole('button', { name: name.trim(), exact: true }).click();
              await inspect(`${section.href}/${name.trim()}`, role);
            }
          }
        }
      }
    }
    expect(errors).toEqual([]);
    expect([...new Set(issues)]).toEqual([]);
  });
}

test('Le menu mobile se ferme au clavier et conserve le focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/connexion');
  await page.getByLabel('Adresse email', { exact: true }).fill(DEMO_ACCOUNTS[0].email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  const toggle = page.getByRole('button', { name: 'Ouvrir la navigation', exact: true });
  await toggle.click();
  const drawer = page.getByRole('dialog', { name: 'Navigation principale' });
  const close = drawer.getByRole('button', { name: 'Fermer le menu' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(drawer.locator('a[href], button:not(:disabled)').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await toggle.click();
  await close.click();
  await expect(toggle).toBeFocused();
});

test('La recherche fonctionne au clavier et explique les résultats absents', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel('Adresse email', { exact: true }).fill(DEMO_ACCOUNTS[0].email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Rechercher une page ou un dossier autorisé' });
  await search.fill('finance');
  await search.press('ArrowDown');
  await expect(page.locator('.search-result').first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.search-result').nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.search-result').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(search).toBeFocused();
  await expect(page.locator('#portal-search-results')).toHaveCount(0);
  await search.fill('bourses');
  await search.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/finance\/contrats$/);
  await search.fill('aucun-resultat-escen');
  await expect(page.getByText('Aucun résultat', { exact: true })).toBeVisible();
  await captureWorkspace(page, 'recherche-sans-resultat');
});

test('Les adresses des modules ouvrent leur premier écran autorisé', async ({ page }) => {
  for (const [path, role] of [['/academique', ROLES.DA], ['/communication', ROLES.MKT], ['/logistique', ROLES.ACHATS], ['/systeme', ROLES.IT]] as const) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/connexion/);
    await page.getByLabel('Adresse email', { exact: true }).fill(DEMO_ACCOUNTS.find(account => account.role === role)!.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    const first = getAvailableTabs(role).find(tab => tab.id === ({ '/academique': 'academique', '/communication': 'marketing', '/logistique': 'logistique', '/systeme': 'systeme' })[path])!;
    await expect(page).toHaveURL(`http://127.0.0.1:3105${first.href}`);
    await expect(page.locator('#main-content h1')).toBeVisible();
  }
});
