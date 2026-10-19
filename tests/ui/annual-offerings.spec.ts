import { test, expect } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { expectWorkspaceFits } from './helpers';
import { annualOfferingChanges } from '../../src/services/annualOfferingService';
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
    let failArchive = true;
    await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { selection: 'current', selectedYearId: '10000000-0000-4000-8000-000000000099', currentYearId: '10000000-0000-4000-8000-000000000099', years } } }));
    await page.route('**/api/catalog/*', route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        if (body.values.archive_ids) {
          if (failArchive) { failArchive = false; return route.fulfill({ status: 409, json: { error: 'Formation rattachée : retrait refusé.' } }); }
          expect(body.values.archive_ids).toEqual(saved.filter(row => !row.archived_at).map(row => row.id));
          saved.forEach(row => { if (body.values.archive_ids.includes(row.id)) row.archived_at = '2026-10-17'; });
          return route.fulfill({ json: { revision: 3 } });
        }
        writes.push(body);
        if (failWrite) { failWrite = false; return route.fulfill({ status: 409, json: { error: 'Modification concurrente. Réessayez.' } }); }
        const changes = annualOfferingChanges({ revision: 1, tables: { academic_years: years, programs: [{ id: 'FIN' }], levels, curricula, academic_offerings: saved } }, body.values.academic_year_id, body.values.program_id, body.values.variants, body.reason);
        for (const change of changes) {
          if (change.operation === 'insert') saved.push(change.record as DatabaseRow);
          else Object.assign(saved.find(row => row.id === change.record.id)!, change.record);
        }
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
    await expect(dialog.locator('tbody > tr')).toHaveCount(2);
    const finance = dialog.getByRole('row').filter({ has: page.getByText('Finance Digitale', { exact: true }) });
    await expect(finance.locator('li').filter({ hasText: 'Licence 1' })).toContainText('Présentiel');
    await expect(finance.locator('li').filter({ hasText: 'Licence 2' })).toContainText('Présentiel');
    await expect(finance.locator('li').filter({ hasText: 'Licence 3' }).filter({ hasText: 'En ligne' })).toHaveCount(1);
    await expect(finance.locator('li').filter({ hasText: 'Licence 3' }).filter({ hasText: 'Présentiel' })).toHaveCount(1);
    await expect(dialog.getByText('Programme de formation', { exact: true })).toHaveCount(0);
    const eye = finance.getByRole('button', { name: 'Vérifier les niveaux', exact: true });
    const trash = finance.getByRole('button', { name: 'Retirer toute la ligne', exact: true });
    const eyeBox = (await eye.boundingBox())!;
    const trashBox = (await trash.boundingBox())!;
    expect(Math.abs(eyeBox.y - trashBox.y)).toBeLessThan(2);
    expect(trashBox.x).toBeGreaterThanOrEqual(eyeBox.x + eyeBox.width);
    expect(eyeBox.width).toBeLessThanOrEqual(48);
    expect(trashBox.width).toBeLessThanOrEqual(48);
    await expect(dialog.getByText(/proposition\(s\) sans filière/)).toHaveCount(0);
    await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/formations.png` });
    await finance.getByRole('button', { name: 'Vérifier les niveaux', exact: true }).click();
    await expect(dialog.getByRole('checkbox', { name: 'Licence 1 · Présentiel', exact: true })).toBeChecked();
    await dialog.getByRole('checkbox', { name: 'Licence 2 · Présentiel', exact: true }).uncheck();
    await dialog.getByRole('button', { name: 'Enregistrer les niveaux', exact: true }).click();
    expect(writes).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Modification concurrente');
    await dialog.getByRole('button', { name: 'Revenir aux informations', exact: true }).click();
    await expect(dialog.getByRole('checkbox', { name: 'Licence 2 · Présentiel', exact: true })).not.toBeChecked();
    await dialog.getByRole('button', { name: 'Enregistrer les niveaux', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
    expect(writes).toHaveLength(2);
    expect(writes[1].values).toEqual({ academic_year_id: '10000000-0000-4000-8000-000000000001', program_id: 'FIN', variants: [
      { curriculum_id: 'C1', delivery_mode: 'Présentiel' }, { curriculum_id: 'C3', delivery_mode: 'En ligne' }, { curriculum_id: 'C3', delivery_mode: 'Présentiel' },
    ] });
    await page.getByRole('button', { name: 'Consulter formations proposées', exact: true }).click();
    await expect(dialog.getByText('Marketing Digital', { exact: true })).toBeVisible();
    // Le niveau écarté ne doit pas revenir comme proposition après réouverture.
    await expect(finance).not.toContainText('Licence 2');
    await finance.getByRole('button', { name: 'Vérifier les niveaux', exact: true }).click();
    const licence3Online = dialog.getByRole('checkbox', { name: 'Licence 3 · En ligne', exact: true });
    await expect(licence3Online).toBeEnabled();
    await licence3Online.uncheck();
    await dialog.getByRole('button', { name: 'Enregistrer les niveaux', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    const archivedId = saved.find(row => row.delivery_mode === 'En ligne')!.id;
    expect(saved.find(row => row.id === archivedId)?.archived_at).toBeTruthy();
    await page.reload();
    await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
    await page.getByRole('button', { name: 'Consulter formations proposées', exact: true }).click();
    await expect(finance).not.toContainText('En ligne');
    await finance.getByRole('button', { name: 'Vérifier les niveaux', exact: true }).click();
    await expect(licence3Online).not.toBeChecked();
    await licence3Online.check();
    await dialog.getByRole('button', { name: 'Enregistrer les niveaux', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    expect(saved.find(row => row.id === archivedId)?.archived_at).toBeNull();
    expect(saved.filter(row => row.delivery_mode === 'En ligne')).toHaveLength(1);
    await expect(finance).toContainText('En ligne');
    await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/apres-enregistrement.png` });

    await finance.getByRole('button', { name: 'Retirer toute la ligne', exact: true }).click();
    await dialog.getByRole('button', { name: 'Conserver la ligne', exact: true }).click();
    await expect(finance).toBeVisible();
    await finance.getByRole('button', { name: 'Retirer toute la ligne', exact: true }).click();
    await dialog.getByLabel('Motif du retrait').fill('Filière non proposée cette année');
    await dialog.getByRole('button', { name: 'Confirmer le retrait de toute la ligne', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('retrait refusé');
    await dialog.getByRole('button', { name: 'Confirmer le retrait de toute la ligne', exact: true }).click();
    await expect(finance).toHaveCount(0);
    const marketing = dialog.getByRole('row').filter({ has: page.getByText('Marketing Digital', { exact: true }) });
    await marketing.getByRole('button', { name: 'Retirer toute la ligne', exact: true }).click();
    await dialog.getByLabel('Motif du retrait').fill('Proposition non retenue');
    await dialog.getByRole('button', { name: 'Confirmer le retrait de toute la ligne', exact: true }).click();
    await expect(marketing).toHaveCount(0);
    expect(writes).toHaveLength(4);
    await expectWorkspaceFits(page);
  });
}
