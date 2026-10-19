import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { projectRelationalCampus } from '../../src/services/relationalCampusAdapter';
import { captureWorkspace } from './helpers';

for (const width of [390, 1440]) {
  test(`Accueil et encaissement avec contexte conservé à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    await page.route('**/api/students/ESCEN-TEST-001', route => route.fulfill({ json: { student: projectRelationalCampus(snapshot).data.students[0] } }));
    await page.route('**/api/students/ESCEN-TEST-001/operations', route => route.fulfill({ json: { revision: 1, enrollments: [], payments: [], paid: 0 } }));
    await page.goto('/mon-espace');
    const directory = page.locator('.home-navigation');
    await expect(directory.locator('details[open]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Saisir les notes', exact: true })).toHaveCount(0);
    const students = directory.getByRole('region', { name: 'Dossiers étudiants', exact: true });
    await students.locator('summary').click();
    await expect(students.getByRole('link', { name: 'Réinscriptions et statuts', exact: true })).toBeVisible();
    await captureWorkspace(page, 'clarity-home');
    await page.goto('/finance/versements');
    await page.getByRole('searchbox', { name: 'Rechercher un étudiant ou une référence' }).fill('REFERENCE-A-CONSERVER');
    await page.getByRole('button', { name: 'Choisir le dossier pour encaisser', exact: true }).click();
    const picker = page.getByRole('dialog');
    await picker.getByRole('searchbox', { name: 'Rechercher un dossier' }).fill('introuvable');
    await expect(picker.getByText('Aucun dossier ne correspond à cette recherche.')).toBeVisible();
    await picker.getByRole('searchbox', { name: 'Rechercher un dossier' }).fill('alice');
    await picker.getByRole('button', { name: 'Consulter le dossier', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Dossier étudiant · ESCEN-TEST-001', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('Une inscription est nécessaire avant un encaissement.');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('searchbox', { name: 'Rechercher un étudiant ou une référence' })).toHaveValue('REFERENCE-A-CONSERVER');
    await expect(page).toHaveURL(/\/finance\/versements$/);
    await captureWorkspace(page, 'clarity-payments');
  });
}
