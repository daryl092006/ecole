import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

test('Les domaines restent ouverts pendant la navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const { problems } = await installResponsiveAudit(page, 'staff');
  await page.goto('/tableau-de-bord');
  await expect(page.locator('main .loading-state')).toHaveCount(0);
  const groups = page.locator('.sidebar .nav-group-heading > button');
  const first = groups.nth(0);
  const second = groups.nth(1);
  for (const group of [first, second]) {
    if (await group.getAttribute('aria-expanded') !== 'true') await group.click();
  }
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  const targetId = await second.getAttribute('aria-controls');
  await page.locator(`#${targetId} a`).first().click();
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  expect(problems).toEqual([]);
});
