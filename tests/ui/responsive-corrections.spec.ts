import { expect, test, type Page } from '@playwright/test';
import { installResponsiveAudit, type AuditAccount } from './responsive-audit-fixture';

async function open(page: Page, route: string, width: number, account: AuditAccount = 'staff') {
  await page.setViewportSize({ width, height: 900 });
  const { problems } = await installResponsiveAudit(page, account);
  await page.goto(route);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('main .loading-state:visible')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  expect(problems).toEqual([]);
}

async function expectPageFits(page: Page) {
  const dimensions = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, available: innerWidth }));
  expect(dimensions.actual).toBeLessThanOrEqual(dimensions.available + 1);
}

for (const { route, width, label } of [
  { route: '/site-web/articles', width: 360, label: 'Modifier : Ouverture de l’année universitaire et des formations' },
  { route: '/site-web/articles', width: 390, label: 'Modifier : Ouverture de l’année universitaire et des formations' },
  { route: '/site-web/documents', width: 360, label: 'Configurer : Licence professionnelle en informatique' },
]) {
  test(`Le bouton long reste lisible à ${width}px : ${route}`, async ({ page }) => {
    await open(page, route, width);
    const button = page.getByRole('button', { name: label, exact: true });
    await expect(button).toBeVisible();
    const geometry = await button.evaluate(element => {
      const box = element.getBoundingClientRect();
      const text = document.createRange(); text.selectNodeContents(element);
      return { left: box.left, right: box.right, textRight: text.getBoundingClientRect().right, whiteSpace: getComputedStyle(element).whiteSpace };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width);
    expect(geometry.textRight).toBeLessThanOrEqual(geometry.right);
    expect(geometry.whiteSpace).toBe('normal');
    await expectPageFits(page);
  });
}

for (const { route, account } of [
  { route: '/etudiants', account: 'staff' },
  { route: '/finance/versements', account: 'staff' },
  { route: '/finance/rapports', account: 'staff' },
  { route: '/mon-espace/scolarite', account: 'student' },
  { route: '/academique/filieres?collection=curriculum_components', account: 'staff' },
] as const) {
  test(`Le tableau défile dans son conteneur à 1024px : ${route}`, async ({ page }) => {
    await open(page, route, 1024, account);
    const table = page.locator('table').filter({ has: page.locator('tbody tr') }).last();
    await expect(table).toBeVisible();
    await expectPageFits(page);
    const scroll = await table.evaluate(element => {
      const wrapper = element.parentElement!;
      const before = wrapper.scrollLeft;
      wrapper.scrollLeft = wrapper.scrollWidth;
      return { before, after: wrapper.scrollLeft, overflow: getComputedStyle(wrapper).overflowX };
    });
    expect(scroll.overflow).toBe('auto');
    expect(scroll.after).toBeGreaterThan(scroll.before);
    const finalCell = table.locator('tbody tr').first().locator('td').last();
    await finalCell.scrollIntoViewIfNeeded();
    const box = await finalCell.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(1024);
    await expectPageFits(page);
  });
}

for (const width of [768, 769]) {
  test(`Tableaux et calendrier suivent la navigation à ${width}px`, async ({ page }) => {
    await open(page, '/academique/filieres?collection=curriculum_components', width);
    const mobile = width <= 768;
    await expect(page.locator('.sidebar')).toBeVisible({ visible: !mobile });
    const row = page.locator('.mobile-record-row').first();
    await expect(row).toHaveCSS('display', mobile ? 'block' : 'table-row');
    await page.goto('/academique/emploi-du-temps');
    await expect(page.locator('main .loading-state:visible')).toHaveCount(0);
    await expect(page.locator('.schedule-calendar-scroll')).toBeVisible({ visible: !mobile });
    await expect(page.locator('.schedule-calendar-list')).toBeVisible({ visible: mobile });
    await expectPageFits(page);
  });
}

for (const width of [390, 1024]) {
  test(`Le menu du compte se ferme et se rouvre au clavier à ${width}px`, async ({ page }) => {
    await open(page, '/tableau-de-bord', width);
    const summary = page.locator('.account-summary');
    const menu = page.locator('.account-popover');
    await expect(menu).toBeHidden();
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: /déconnexion|déconnecter/i })).toBeVisible();
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
  });
}
