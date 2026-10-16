import { test, expect } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';

for (const width of [390, 1440]) {
  test(`Enregistrer les niveaux directement dans la filière à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    let submitted: Record<string, unknown> | undefined;
    await page.route('**/api/catalog/programs*', route => {
      if (route.request().method() === 'POST') {
        submitted = route.request().postDataJSON().values;
        return route.fulfill({ status: 201, json: { revision: 2 } });
      }
      return route.fulfill({ json: { revision: 1, historyLinks: [], tables: {
        programs: [], levels: [{ id: 'L1', name: 'Licence 1' }, { id: 'L2', name: 'Licence 2' }],
      } } });
    });
    await page.goto('/academique/filieres?collection=programs');
    await page.getByRole('button', { name: 'Ajouter une filière', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Code', { exact: true }).fill('INFO');
    await dialog.getByLabel('Nom', { exact: true }).fill('Informatique');
    await dialog.getByRole('checkbox', { name: 'Licence 1', exact: true }).check();
    await dialog.getByRole('checkbox', { name: 'Licence 2', exact: true }).check();
    await expect(dialog.getByLabel('Version', { exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    expect(submitted).toBeUndefined();
    await expect(dialog).toContainText('Licence 1, Licence 2');
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect.poll(() => submitted).toMatchObject({ name: 'Informatique', level_ids: ['L1', 'L2'] });
  });
}
