import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PortalScreen from '../../src/components/layout/PortalScreen';
import { PortalContext } from '../../src/hooks/usePortal';
import type { AppState } from '../../src/hooks/useAppState';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';
import { ROLES } from '../../src/types/permissions';
import { installResponsiveAudit } from './responsive-audit-fixture';

test('Une rubrique authentifiée non montée explique son indisponibilité', () => {
  const state = {
    activeRole: ROLES.IT, perms: ROLE_ACCESS[ROLES.IT], session: { accountId: 'account' },
    history: { enabled: false }, relationalSnapshot: { tables: {}, revision: 0 },
  } as unknown as AppState;
  const render = () => renderToStaticMarkup(createElement(PortalContext.Provider, { value: state },
    createElement(PortalScreen, { tab: 'systeme', section: 'not_mounted' })));
  expect(render()).toContain('Cette fonction n’est pas encore disponible.');
  state.session = null;
  expect(render()).toBe('');
});

for (const width of [390, 1440]) {
  for (const route of ['/systeme/support', '/communication/annonces', '/logistique/achats']) {
    test(`Les limites de disponibilité sont visibles à ${width}px : ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { problems } = await installResponsiveAudit(page, 'staff');
      await page.goto(route);
      const information = page.locator('.availability-details');
      await expect(information).toBeVisible();
      await expect(information.locator('p')).toBeVisible();
      await expect(information.locator('p')).toContainText(/ne sont pas.*activ|ne sont pas.*disponible/);
      await expect(page.locator('table')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await expect(page.getByRole('heading', { name: 'Fonction indisponible', exact: true })).toHaveCount(0);
      expect(problems).toEqual([]);
    });
  }
  for (const route of ['/systeme/journal', '/systeme/export', '/academique/reclamations']) {
    test(`L’écran connecté reste monté à ${width}px : ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { problems } = await installResponsiveAudit(page, 'staff');
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('main .loading-state:visible')).toHaveCount(0);
      await expect(page.getByText('Cette fonction n’est pas encore disponible.', { exact: true })).toHaveCount(0);
      if (route === '/academique/reclamations') await expect(page.getByRole('heading', { name: /Réclamations \(/ })).toBeVisible();
      else if (route === '/systeme/export') await expect(page.getByRole('button', { name: 'Télécharger le CSV', exact: true })).toBeVisible();
      else await expect(page.getByRole('button', { name: 'Consulter l’événement', exact: true }).first()).toBeVisible();
      expect(problems).toEqual([]);
    });
  }
}
