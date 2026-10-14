import { expect, type Page } from '@playwright/test';

export async function openActionPanel(page: Page, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const summary = page.locator('details.action-panel > summary').filter({ hasText: new RegExp('^' + escaped + '$') });
  await expect(summary).toHaveCount(1);
  if (!await summary.evaluate(element => (element.parentElement as HTMLDetailsElement).open)) await summary.click();
}

export async function expectWorkspaceFits(page: Page) {
  expect(await page.evaluate(() => {
    const main = document.getElementById('main-content');
    return document.documentElement.scrollWidth <= window.innerWidth && (!main || main.scrollWidth <= main.clientWidth + 1);
  })).toBe(true);
  expect(await page.evaluate(() => [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('#main-content input:not([type=hidden]), #main-content select, #main-content textarea')]
    .filter(element => element.getClientRects().length && !element.labels?.length && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby'))
    .map(element => element.outerHTML.slice(0, 160)))).toEqual([]);
}

export async function captureWorkspace(page: Page, name: string) {
  await expectWorkspaceFits(page);
  const width = page.viewportSize()!.width;
  const style = await page.addStyleTag({ content: '.app-wrapper { height: auto; overflow: visible; } .app-body, .main-content { overflow: visible; }' });
  await page.screenshot({ path: `.tmp/interface/${width}/${name}.png`, fullPage: true });
  await style.evaluate(element => element.parentNode?.removeChild(element));
}
