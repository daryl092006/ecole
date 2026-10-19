import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
const year = '44444444-4444-4444-8444-444444444444';
const level = '11111111-1111-4111-8111-111111111111';
const program = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
for (const width of [390, 1440]) {
  test(`Site web : menu unique et pièces obligatoires par niveau à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    let documents = ['diplome_file'];
    const commands: Record<string, unknown>[] = [];
    await page.route('**/api/website-management*', async route => {
      if (route.request().method() === 'POST') {
        const command = route.request().postDataJSON();
        commands.push(command); documents = command.required_documents;
        return route.fulfill({ json: { id } });
      }
      return route.fulfill({ json: { applications: [], intakes: [{ id, academic_year_id: year, level_id: level, program_id: program, label: 'Licence Informatique', level_name: 'Licence 1', program_name: 'Informatique', active: true, required_documents: documents, version: 1 }], years: [{ id: year, name: '2025-2026', status: 'OUVERTE' }], levels: [{ id: level, name: 'Licence 1' }], programs: [{ id: program, name: 'Informatique' }] } });
    });
    await page.goto('/site-web/documents');
    await expect(page.getByRole('heading', { name: 'Formations et pièces', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dossiers reçus du site' })).toHaveCount(0);
    await page.getByLabel('Filtrer par niveau').selectOption(level);
    await page.getByRole('button', { name: 'Configurer : Licence Informatique' }).click();
    await page.getByRole('checkbox', { name: 'Acte de naissance' }).check();
    await page.getByLabel('Motif de la configuration').fill('Pièces requises pour la rentrée');
    await page.getByRole('button', { name: 'Relire la configuration' }).click();
    expect(commands).toHaveLength(0);
    await page.getByRole('button', { name: 'Confirmer la configuration' }).click();
    await expect(page.getByText('Pièces obligatoires : Dernier diplôme, Acte de naissance', { exact: true })).toBeVisible();
    expect(commands[0]).toMatchObject({ action: 'intake-save', id, level_id: level, academic_year_id: year, required_documents: ['diplome_file', 'naissance_file'] });
    if (width < 800) await page.getByRole('button', { name: /Ouvrir (la navigation|le menu)/ }).click();
    const nav = page.locator('#application-navigation');
    await expect(nav.getByRole('button', { name: /Site web/ })).toBeVisible();
    for (const label of ['Demandes en ligne', 'Formations et pièces', 'Brochures', 'Articles']) await expect(nav.getByRole('link', { name: label, exact: true })).toHaveCount(1);
    await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/site-web-menu.png`, fullPage: true });
  });
}
