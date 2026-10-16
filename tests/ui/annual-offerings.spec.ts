import { test, expect } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { expectWorkspaceFits } from './helpers';
import type { DatabaseRow } from '../../src/types/persistence';

for (const width of [390, 1440]) {
  test(`Formations annuelles : choisir plusieurs niveaux par filière à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    const years = [{ id: '10000000-0000-4000-8000-000000000099', name: '2025-2026', status: 'OUVERTE', starts_on: '2025-10-13', ends_on: '2026-06-30' }, { id: '10000000-0000-4000-8000-000000000001', name: '2026-2027', status: 'BROUILLON', starts_on: '2026-10-12', ends_on: '2027-06-30' }];
    const levels = [1, 2, 3].map(n => ({ id: `L${n}`, name: `Licence ${n}` }));
    const curricula = [1, 2, 3].map(n => ({ id: `C${n}`, program_id: 'FIN', level_id: `L${n}`, name: `Finance Digitale · Licence ${n}` }));
    const proposals = [
      { id: 'O1', curriculum_id: 'C1', level_id: 'L1', delivery_mode: 'Présentiel' },
      { id: 'O2', curriculum_id: 'C2', level_id: 'L2', delivery_mode: 'Présentiel' },
      { id: 'O3', curriculum_id: 'C3', level_id: 'L3', delivery_mode: 'En ligne' },
      { id: 'O4', curriculum_id: 'C3', level_id: 'L3', delivery_mode: 'Présentiel' },
      { id: 'O5', curriculum_id: 'CM', level_id: 'L1', delivery_mode: 'Présentiel' },
      { id: 'O6', curriculum_id: null, level_id: 'L1', delivery_mode: null },
    ];
    const saved: DatabaseRow[] = [];
    const writes: { values: { academic_year_id: string; program_id: string; variants: { curriculum_id: string; delivery_mode: string | null }[] } }[] = [];
    let failWrite = true;
    await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { selection: 'current', selectedYearId: '10000000-0000-4000-8000-000000000099', currentYearId: '10000000-0000-4000-8000-000000000099', years } } }));
    await page.route('**/api/catalog/*', route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        writes.push(body);
        if (failWrite) { failWrite = false; return route.fulfill({ status: 409, json: { error: 'Modification concurrente. Réessayez.' } }); }
        body.values.variants.forEach((variant: { curriculum_id: string; delivery_mode: string | null }, index: number) => saved.push({ id: `S${index}`, academic_year_id: '10000000-0000-4000-8000-000000000001', ...variant, level_id: curricula.find(row => row.id === variant.curriculum_id)?.level_id }));
        return route.fulfill({ status: 201, json: { revision: 2, count: saved.length } });
      }
      return route.fulfill({ json: { revision: 1, historyLinks: [], tables: {
        academic_years: years, programs: [{ id: 'FIN', name: 'Finance Digitale' }, { id: 'MKT', name: 'Marketing Digital' }], levels,
        curricula: [...curricula, { id: 'CM', program_id: 'MKT', level_id: 'L1', name: 'Marketing Digital · Licence 1' }], academic_offerings: saved,
      } } });
    });
    await page.route('**/api/year-preparation', route => {
      expect(route.request().method()).toBe('GET');
      return route.fulfill({ json: { previousYear: { id: '10000000-0000-4000-8000-000000000099', name: '2025-2026' }, previousSummary: { rawOfferings: proposals, offerings: proposals.map(row => row.id), groups: [], tuitionFees: [], registrationFees: [], paymentChannels: [] }, checks: [{ key: 'offerings', label: 'Formations proposées', ready: saved.length > 0, href: '' }] } });
    });
    await page.goto('/academique/referentiel?collection=academic_years');
    await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
    await page.getByRole('button', { name: 'Configurer formations proposées', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('tbody > tr')).toHaveCount(3);
    const finance = dialog.getByRole('row').filter({ has: page.getByText('Finance Digitale', { exact: true }) });
    await expect(finance).toContainText('Licence 1 · Présentiel');
    await expect(finance).toContainText('Licence 2 · Présentiel');
    await expect(finance).toContainText('Licence 3 · En ligne');
    await expect(finance).toContainText('Licence 3 · Présentiel');
    await expect(dialog.getByText('Filière à préciser', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Programme de formation', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `.tmp/interface/${width}/formations-annuelles-par-filiere.png` });
    await finance.getByRole('button', { name: 'Vérifier les niveaux', exact: true }).click();
    await expect(dialog.getByRole('checkbox', { name: 'Licence 1 · Présentiel', exact: true })).toBeChecked();
    await dialog.getByRole('checkbox', { name: 'Licence 2 · Présentiel', exact: true }).uncheck();
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    expect(writes).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Modification concurrente');
    await dialog.getByRole('button', { name: 'Revenir aux informations', exact: true }).click();
    await expect(dialog.getByRole('checkbox', { name: 'Licence 2 · Présentiel', exact: true })).not.toBeChecked();
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
    expect(writes).toHaveLength(2);
    expect(writes[1].values).toEqual({ academic_year_id: '10000000-0000-4000-8000-000000000001', program_id: 'FIN', variants: [
      { curriculum_id: 'C1', delivery_mode: 'Présentiel' }, { curriculum_id: 'C3', delivery_mode: 'En ligne' }, { curriculum_id: 'C3', delivery_mode: 'Présentiel' },
    ] });
    await page.getByRole('button', { name: 'Consulter formations proposées', exact: true }).click();
    await expect(dialog.getByText('Marketing Digital', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Filière à préciser', { exact: true })).toBeVisible();
    await expectWorkspaceFits(page);
  });
}
