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
    await expect(page.getByRole('heading', { name: 'Années et groupes', exact: true })).toBeVisible();
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
    for (const name of [/^Historique des versements/, /^Affectations aux échéances$/, /^Annulations, remboursements et avoirs$/, /^Exporter les/]) {
      await expect(page.getByRole('button', { name })).toHaveCount(0);
    }
    await expect(page.getByRole('combobox', { name: 'Consulter', exact: true })).toHaveCount(0);
    await expect(page.getByText(/^Encaissements nets des remboursements/)).toHaveCount(0);
    await expect(page.locator('main table')).toHaveCount(1);
    await expect(page.locator('main table thead th')).toHaveText(['Date', 'Montant', 'Mode', 'Référence']);
    await page.screenshot({ path: `tmp/screenshots/secondary-details/${width}/versements-simples.png` });
    const reference = page.getByRole('button', { name: /^Versement / }).first();
    await reference.click();
    const dialog = page.getByRole('dialog', { name: /^Versement / });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(reference).toBeFocused();
    expect(problems).toEqual([]);
  });
}

test('Le dossier reste protégé pendant la consultation d’un versement et se réactive à la fermeture', async ({ page }) => {
  await installResponsiveAudit(page, 'staff');
  await page.goto('/etudiants');
  await page.getByRole('row').filter({ hasText: 'ESCEN-TEST-001' }).getByRole('button', { name: 'Fiche & Dossier', exact: true }).click();
  const dossier = page.getByRole('dialog', { name: 'Dossier étudiant · ESCEN-TEST-001', exact: true });
  await dossier.getByRole('button', { name: 'Frais et versements', exact: true }).click();
  await dossier.getByRole('button', { name: /^Versement / }).first().click();
  await expect(page.getByRole('dialog', { name: /^Versement / })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /^Versement / })).toHaveCount(0);
  await expect(dossier).toBeVisible();
  expect(await page.locator('.app-wrapper').evaluate(element => (element as HTMLElement).inert)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dossier).toHaveCount(0);
  expect(await page.locator('.app-wrapper').evaluate(element => (element as HTMLElement).inert)).toBe(false);
  await expect(page.locator('.app-wrapper')).not.toHaveAttribute('aria-hidden', 'true');
});
