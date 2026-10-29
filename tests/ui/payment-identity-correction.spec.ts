import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [390, 1440]) test(`Corriger l’identité sans perdre le paiement à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await installResponsiveAudit(page, 'staff');
  const edits: Record<string, unknown>[] = [];
  let revision = 1;
  await page.route('**/api/students/ESCEN-TEST-001', async route => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    edits.push(route.request().postDataJSON());
    revision = 2;
    return route.fulfill({ json: { revision } });
  });
  await page.route('**/api/students/*/operations', route => route.fulfill({ json: {
    revision, enrollments: [{ id: '00000000-0000-4000-8000-000000000101', status: 'INSCRIT' }], payments: [], paid: 0,
  } }));
  await page.goto('/etudiants/ESCEN-TEST-001');
  await page.getByRole('button', { name: 'Frais et versements', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer un paiement', exact: true }).click();
  await page.getByLabel('Montant FCFA', { exact: true }).fill('50000');
  await page.getByLabel('Payeur', { exact: true }).fill('Parent du dossier');
  await page.getByRole('button', { name: 'Corriger le nom, le prénom ou les coordonnées', exact: true }).click();
  await page.getByLabel('Prénom', { exact: true }).fill('Prénom corrigé');
  await page.getByLabel('Nom', { exact: true }).fill('Nom corrigé');
  await page.getByRole('button', { name: 'Vérifier les modifications', exact: true }).click();
  expect(edits).toHaveLength(0);
  await expect(page.getByRole('region', { name: 'Vérification avant enregistrement' })).toContainText('Prénom corrigé');
  await page.getByRole('button', { name: 'Enregistrer les informations civiles', exact: true }).click();
  await expect(page.getByLabel('Montant FCFA', { exact: true })).toHaveValue('50000');
  await expect(page.getByLabel('Payeur', { exact: true })).toHaveValue('Parent du dossier');
  expect(edits).toHaveLength(1);
  expect(edits[0]).toMatchObject({ firstname: 'Prénom corrigé', lastname: 'Nom corrigé' });
});
