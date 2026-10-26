import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [390, 820, 1440]) {
  test(`Dossier étudiant sans historique ni retrait dépliants à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { problems } = await installResponsiveAudit(page, 'staff');
    await page.goto('/etudiants/ESCEN-TEST-001');
    await expect(page.getByRole('heading', { name: 'Identité et contacts', exact: true })).toBeVisible();
    await expect(page.getByText(/Historique du dossier/)).toHaveCount(0);
    await expect(page.getByText('Retirer ce dossier de l’annuaire', { exact: true })).toHaveCount(0);
    await expect(page.locator('main details')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Modifier les informations civiles', exact: true })).toBeVisible();
    await page.screenshot({ path: `tmp/screenshots/secondary-details/${width}/dossier.png` });
    await page.getByRole('button', { name: 'Frais et versements', exact: true }).click();
    const history = page.getByRole('button', { name: /^Historique des versements/ });
    await expect(history).toBeVisible();
    await history.click();
    const dialog = page.getByRole('dialog', { name: /^Historique des versements/ });
    await expect(dialog).toBeVisible();
    await expect(page.locator('main details')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(history).toBeFocused();
    expect(problems).toEqual([]);
  });
}
