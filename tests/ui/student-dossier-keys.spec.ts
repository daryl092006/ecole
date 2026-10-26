import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [390, 820, 1440]) {
  for (const modal of [false, true]) {
    test(`Clés uniques du dossier ${modal ? 'en fenêtre' : 'en page'} à ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const { problems } = await installResponsiveAudit(page, 'staff');
      const keyWarnings: string[] = [];
      const errors: string[] = [];
      page.on('console', message => {
        if (/same key|unique.+key/i.test(message.text())) keyWarnings.push(message.text());
      });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(modal ? '/etudiants' : '/etudiants/ESCEN-TEST-001');
      if (modal) await page.getByRole('row').filter({ hasText: 'ESCEN-TEST-001' }).getByRole('button', { name: 'Fiche & Dossier', exact: true }).click();
      const panel = modal ? page.getByRole('dialog', { name: 'Dossier étudiant · ESCEN-TEST-001', exact: true }) : page.locator('main');
      const tabs = panel.getByRole('navigation', { name: 'Sections du dossier étudiant' });
      for (const section of ['Frais et versements', 'Notes', 'Pièces du dossier', 'Frais et versements', 'Années et groupes', 'Identité et contacts']) {
        await tabs.getByRole('button', { name: section, exact: true }).click();
        await expect(tabs.getByRole('button', { name: section, exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expect(panel.getByRole('heading', { name: 'Versements', exact: true })).toHaveCount(section === 'Frais et versements' ? 1 : 0);
      }
      expect(keyWarnings).toEqual([]);
      expect(errors).toEqual([]);
      expect(problems).toEqual([]);
    });
  }
}
