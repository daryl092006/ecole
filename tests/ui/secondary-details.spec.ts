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
    await page.getByRole('button', { name: 'Années et groupes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Inscriptions et groupes', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Groupes et affectations', exact: true, includeHidden: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Changer le statut scolaire', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer un paiement', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Affectations aux échéances', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Annulations, remboursements et avoirs', exact: true })).toHaveCount(0);
    await expect(page.getByText(/^Encaissements nets des remboursements/)).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Consulter', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Exporter les/ })).toHaveCount(0);
    await page.screenshot({ path: `tmp/screenshots/secondary-details/${width}/annees-groupes.png` });
    await page.getByRole('button', { name: 'Frais et versements', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Enregistrer un paiement', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Changer le statut scolaire', exact: true })).toHaveCount(0);
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
