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
  const tableIssues = await page.evaluate(() => {
    const mobile = window.matchMedia('(max-width: 640px)').matches;
    return [...document.querySelectorAll<HTMLTableRowElement>('#main-content .mobile-record-table .mobile-record-row')]
      .flatMap(row => {
        const issues: string[] = [];
        if (getComputedStyle(row).display !== (mobile ? 'block' : 'table-row')) issues.push('Disposition des lignes inadaptée à la largeur.');
        if (mobile) {
          const cells = [...row.cells];
          if (cells.some(cell => !cell.dataset.label)) issues.push('Libellé manquant dans une fiche mobile.');
          if (row.getBoundingClientRect().width > (row.closest('.card') ?? row.closest('.table-wrap')!).getBoundingClientRect().width + 1) issues.push('Fiche plus large que son conteneur.');
          if (cells.slice(1).some((cell, index) => cell.getBoundingClientRect().top < cells[index].getBoundingClientRect().bottom - 1)) issues.push('Les champs mobiles restent côte à côte.');
        }
        return issues;
      });
  });
  expect(tableIssues).toEqual([]);
  const width = page.viewportSize()!.width;
  const style = await page.addStyleTag({ content: '.app-wrapper { height: auto; overflow: visible; } .app-body, .main-content { overflow: visible; }' });
  await page.screenshot({ path: `.tmp/interface/${width}/${name}.png`, fullPage: true });
  await style.evaluate(element => element.parentNode?.removeChild(element));
}
