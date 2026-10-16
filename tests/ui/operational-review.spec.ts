import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { PORTAL_ROUTES, MODULE_PATHS } from '../../src/constants/portalRoutes';
import { CRUD_CATALOG } from '../../src/data/crudCatalog';
import { captureWorkspace, expectWorkspaceFits } from './helpers';

for (const width of [390, 1440]) {
  test(`Les données reprises sont des données métier dans les mêmes écrans à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    const campus = structuredClone(snapshot);
    Object.assign(campus.tables, {
      enrollments: [{ id: 'EN1', student_id: 'S1' }],
      groups: [{ id: 'GROUP1', name: 'Groupe opérationnel' }],
      teaching_assignments: [{ id: 'ASSIGN1', group_id: 'GROUP1' }],
      evaluations: [{ id: 'EV1', name: 'Épreuve opérationnelle', kind: 'EXAMEN', status: 'PUBLIEES', assignment_id: 'ASSIGN1', legacy_source_row_id: 'record-E1' }],
      evaluation_candidates: [{ id: 'CA1', enrollment_id: 'EN1', evaluation_id: 'EV1' }],
      grades: [{ id: 'GR1', candidate_id: 'CA1', value: 17, absence_status: 'PRESENT' }],
      financial_contracts: [{ id: 'CONTRACT1', enrollment_id: 'EN1' }],
      contract_versions: [{ id: 'VERSION1', contract_id: 'CONTRACT1', status: 'EN_COURS' }],
      contract_lines: [{ id: 'LINE1', version_id: 'VERSION1', amount: 100000 }],
      payments: [{ id: 'PAY1', enrollment_id: 'EN1', amount: 30000, status: 'PENDING', reference: 'PAIEMENT-ATTENTE' }, { id: 'PAY2', enrollment_id: 'EN1', amount: 20000, status: 'POSTED', reference: 'PAIEMENT-VALIDE' }],
    });
    await page.route('**/api/campus', route => route.fulfill({ json: campus }));
    await page.goto('/mon-espace');
    await expect(page.locator('.home-metrics')).toContainText('Paiements');
    await expect(page.locator('.home-metrics')).not.toContainText('conservé');
    await expect(page.locator('.home-metrics > div').filter({ hasText: 'Notes' })).toContainText('1');
    await page.goto('/finance');
    await expect(page.locator('.data-summary dd')).toHaveText(['100 000 FCFA', '20 000 FCFA', '80 000 FCFA']);
    await captureWorkspace(page, 'finance-operationnelle');
    await page.goto('/academique/examens');
    await expect(page.getByRole('cell', { name: /Épreuve opérationnelle$/ })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Publiées$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Ouvrir le détail', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Alice Exemple');
    await expect(page.getByRole('dialog')).toContainText('17');
    await page.screenshot({ path: `.tmp/interface/${width}/epreuve-operationnelle.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await page.goto('/academique/examens?epreuve=record-E1');
    await expect(page.getByRole('dialog')).toContainText('17');
    await page.keyboard.press('Escape');
    campus.tables.evaluations.push({ ...campus.tables.evaluations[0], id: 'EV2', name: 'Épreuve autre formation' });
    await page.reload();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Ce lien concerne plusieurs formations. Choisissez l’épreuve de la formation à consulter.')).toBeVisible();
    await page.getByRole('row').filter({ hasText: 'Épreuve opérationnelle' }).getByRole('button', { name: 'Ouvrir le détail', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('17');
    await page.keyboard.press('Escape');
    await page.getByRole('searchbox', { name: 'Rechercher une épreuve' }).fill('introuvable');
    await expect(page.getByText('Aucune épreuve pour cette catégorie et ces filtres.')).toBeVisible();
    await page.goto('/finance/versements');
    await expect(page.getByRole('row').filter({ hasText: 'PAIEMENT-ATTENTE' })).toContainText('En attente');
    campus.tables.payments = [];
    await page.reload();
    await expect(page.getByText('Aucun enregistrement pour cette rubrique dans l’année et le dossier consultés.')).toBeVisible();
    await expect(page.getByText('125000')).toHaveCount(0);
    await expectWorkspaceFits(page);
  });

  test(`Cliquer les actions de chaque page à ${width}px`, async ({ page }) => {
    test.setTimeout(600000);
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    await page.route('**/api/catalog/*', route => route.fulfill({ json: { revision: 1, tables: Object.fromEntries(CRUD_CATALOG.map(spec => [spec.key, []])), historyLinks: [] } }));
    await page.route('**/api/staff', route => route.fulfill({ json: { revision: 1, records: [] } }));
    await page.route('**/api/subjects', route => route.fulfill({ json: { revision: 1, subjects: [] } }));
    await page.route('**/api/website-management?kind=articles', route => route.fulfill({ json: [] }));
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const review: { href: string; action: string; result: string }[] = [];
    mkdirSync('.tmp/interface', { recursive: true });
    const routes = [...PORTAL_ROUTES, ...Object.entries(MODULE_PATHS).map(([, href]) => ({ href }))];
    for (const { href } of routes) {
      await page.goto(href);
      await expect(page.getByRole('region', { name: 'État des données' })).toContainText('1 dossier(s)');
      const actions = await page.locator('#main-content button:visible').evaluateAll(buttons => buttons.map(button => ({ name: button.getAttribute('aria-label') || (button as HTMLElement).innerText.trim().replace(/\s+/g, ' '), disabled: (button as HTMLButtonElement).disabled })));
      for (const [index, action] of actions.entries()) {
        if (action.disabled) { review.push({ href, action: action.name, result: 'Indisponible : prérequis ou permission' }); continue; }
        expect(action.name, `${href} : action sans nom`).not.toBe('');
        if (index) { await page.goto(href); await expect(page.getByRole('region', { name: 'État des données' })).toContainText('1 dossier(s)'); }
        const button = page.getByRole('button', { name: action.name, exact: true }).first();
        await button.click();
        await expectWorkspaceFits(page);
        const dialog = page.getByRole('dialog').last();
        const result = await dialog.isVisible() ? `Fenêtre : ${await dialog.getAttribute('aria-labelledby').then(async id => id ? page.locator(`[id="${id}"]`).innerText() : '')}` : `Écran : ${new URL(page.url()).pathname}`;
        review.push({ href, action: action.name, result });
        if (await dialog.isVisible()) {
          await expect(dialog.getByRole('heading').first()).toBeVisible();
          await page.keyboard.press('Escape');
        }
      }
      writeFileSync(`.tmp/interface/actions-${width}.json`, JSON.stringify({ review, errors }, null, 2));
    }
    mkdirSync('.tmp/interface', { recursive: true });
    writeFileSync(`.tmp/interface/actions-${width}.json`, JSON.stringify({ review, errors }, null, 2));
    expect(errors).toEqual([]);
  });
}
