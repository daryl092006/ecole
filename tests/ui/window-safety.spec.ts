import { expect, test, type Locator, type Page } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { projectRelationalCampus } from '../../src/services/relationalCampusAdapter';

const matricule = 'ESCEN-TEST-001';
const year = { id: '10000000-0000-4000-8000-000000000001', name: '2026-2027', status: 'OUVERTE' as const, starts_on: '2026-10-01', ends_on: '2027-07-01' };

async function prepare(page: Page, status = 'SAISIES') {
  await authenticateFixture(page);
  const campus = structuredClone(snapshot);
  campus.academicContext = { currentYearId: year.id, selectedYearId: year.id, selection: 'current', years: [year] };
  Object.assign(campus.tables, {
    academic_years: [year], programs: [{ id: 'PROG', name: 'Informatique' }], levels: [{ id: 'LEVEL', name: 'Licence 1' }],
    curricula: [{ id: 'CUR', program_id: 'PROG', level_id: 'LEVEL' }],
    academic_offerings: [{ id: 'OFF', academic_year_id: year.id, curriculum_id: 'CUR', level_id: 'LEVEL', name: 'Informatique L1' }],
    groups: [{ id: 'GROUP', academic_year_id: year.id, level_id: 'LEVEL', name: 'Groupe A' }],
    enrollments: [{ id: 'ENR', student_id: 'S1', offering_id: 'OFF', status: 'INSCRIT', enrolled_on: '2026-10-01' }],
    enrollment_groups: [{ id: 'LINK', enrollment_id: 'ENR', group_id: 'GROUP', valid_from: '2026-10-01' }],
    subjects: [{ id: 'SUBJ', name: 'Algorithmique' }], curriculum_components: [{ id: 'COMP', subject_id: 'SUBJ', curriculum_id: 'CUR' }],
    teaching_assignments: [{ id: 'ASSIGN', group_id: 'GROUP', offering_id: 'OFF', component_id: 'COMP' }],
    evaluations: [{ id: 'EVAL', name: 'Épreuve de régression', assignment_id: 'ASSIGN', offering_id: 'OFF', kind: 'DEVOIR', status }],
    evaluation_candidates: Array.from({ length: 12 }, (_, index) => ({ id: `C${index}`, evaluation_id: 'EVAL', enrollment_id: 'ENR' })),
    grades: Array.from({ length: 12 }, (_, index) => ({ id: `G${index}`, candidate_id: `C${index}`, value: 12, absence_status: null })),
  });
  let reads = 0;
  let revision = 1;
  let rejectGrades = false;
  let delay: Promise<void> = Promise.resolve();
  const commands: Record<string, unknown>[] = [];
  await page.route('**/api/campus', route => { reads++; return route.fulfill({ json: campus }); });
  await page.route(`**/api/students/${matricule}`, route => route.fulfill({ json: { student: projectRelationalCampus(campus).data.students[0] } }));
  await page.route(`**/api/students/${matricule}/operations`, route => {
    if (route.request().method() === 'POST') { commands.push(route.request().postDataJSON()); return route.fulfill({ json: { revision: 2 } }); }
    return route.fulfill({ json: { revision: 1, enrollments: [{ id: 'ENR', status: 'INSCRIT' }], channels: [{ name: 'Caisse ESCEN', method: 'ESPECES' }], contracts: [], payments: [], paid: 0 } });
  });
  await page.route('**/api/enrollments', route => {
    if (route.request().method() === 'POST') { commands.push(route.request().postDataJSON()); return route.fulfill({ json: { revision: 2 } }); }
    return route.fulfill({ json: { revision: 1, candidates: [{ id: 'NEW', name: 'Nouveau Dossier', matricule: 'NOUVEAU', kind: 'new', eligible: true }], offerings: [{ id: 'OFF', name: 'Informatique L1', programId: 'PROG', levelId: 'LEVEL' }], groups: [{ id: 'GROUP', offeringId: 'OFF', name: 'Groupe A' }], fees: [{ id: 'TUITION', category: 'SCOLARITE', amount: 100000 }, { id: 'REGISTRATION', category: 'INSCRIPTION', amount: 10000 }] } });
  });
  await page.route('**/api/evaluations', async route => {
    const body = route.request().postDataJSON(); commands.push(body);
    await delay;
    if (rejectGrades && body.action === 'enter_grades') return route.fulfill({ status: 409, json: { error: 'Sauvegarde refusée pour le test.' } });
    expect(body.revision).toBe(revision);
    revision += 6;
    if (body.action === 'transition_workflow') campus.tables.evaluations[0].status = body.toStatus;
    // Keep the campus revision stale to exercise the revision returned by each write.
    return route.fulfill({ json: { revision } });
  });
  const articles: Record<string, unknown>[] = [];
  await page.route('**/api/website-management*', route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON(); commands.push(body);
      if (body.action === 'article-save') articles.push({ ...body, id: 'ARTICLE', version: 1 });
      return route.fulfill({ json: { id: 'ARTICLE' } });
    }
    const kind = new URL(route.request().url()).searchParams.get('kind');
    return route.fulfill({ json: kind === 'articles' ? articles : { applications: [], intakes: [], years: [year], programs: [], levels: [] } });
  });
  return { commands, reads: () => reads, rejectGrades: () => { rejectGrades = true; }, delayGrades: (value: Promise<void>) => { delay = value; } };
}

async function visibleActions(page: Page, dialog: Locator, height = 844) {
  const toolbar = dialog.locator('.detail-drawer-actions');
  await expect(toolbar).toBeVisible();
  await expect.poll(async () => { const bounds = await toolbar.boundingBox(); return bounds ? Math.abs(bounds.y + bounds.height - height) : Infinity; }).toBeLessThanOrEqual(4);
  const box = await toolbar.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
  expect(box!.y + box!.height).toBeGreaterThan(height - 4);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of await toolbar.getByRole('button').all()) await expect(button).toBeInViewport();
}

async function reducedViewport(page: Page, dialog: Locator, field: Locator, width: number) {
  await field.focus();
  await page.setViewportSize({ width, height: 430 });
  await visibleActions(page, dialog, 430);
  await expect(field).toBeInViewport();
  const fieldBox = await field.boundingBox();
  const toolbarBox = await dialog.locator('.detail-drawer-actions').boundingBox();
  expect(fieldBox!.y + fieldBox!.height).toBeLessThanOrEqual(toolbarBox!.y + 1);
  await page.setViewportSize({ width, height: 844 });
}

for (const width of [360, 390]) {
  test(`Encaisser : actions mobiles et dossier conservé après sauvegarde à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); const fixture = await prepare(page);
    await page.goto('/etudiants');
    await page.getByRole('button', { name: 'Fiche & Dossier', exact: true }).click();
    const dossier = page.getByRole('dialog', { name: `Dossier étudiant · ${matricule}`, exact: true });
    await dossier.evaluate(element => element.setAttribute('data-preserved-window', 'true'));
    await dossier.getByRole('button', { name: 'Frais et versements', exact: true }).click();
    await dossier.getByRole('button', { name: 'Enregistrer un paiement', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: `Encaisser · ${matricule}`, exact: true });
    await visibleActions(page, dialog);
    await dialog.getByLabel('Montant FCFA', { exact: true }).fill('15000');
    await dialog.getByLabel('Payeur', { exact: true }).fill('Alice Exemple');
    await dialog.getByLabel('Référence du versement', { exact: true }).fill('RECETTE-TEST');
    await dialog.getByLabel('Organisme ou caisse', { exact: true }).fill('Caisse ESCEN');
    await dialog.getByLabel('Date du paiement', { exact: true }).fill('2026-10-18');
    const reason = dialog.getByRole('textbox', { name: 'Motif', exact: true }); await reason.fill('Paiement vérifié');
    await reducedViewport(page, dialog, reason, width);
    await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(dialog.getByText('Quitter sans enregistrer ?', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Continuer la saisie', exact: true }).click();
    await dialog.getByRole('button', { name: 'Vérifier l’opération', exact: true }).click();
    expect(fixture.commands).toHaveLength(0);
    await visibleActions(page, dialog);
    await dialog.getByRole('button', { name: 'Confirmer le paiement', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect.poll(fixture.reads).toBeGreaterThan(1);
    await expect(dossier).toHaveAttribute('data-preserved-window', 'true');
    await expect(dossier.getByRole('status')).toContainText('Paiement et reçu enregistrés.');
  });

  test(`Notes : garde, résumé, verrouillage et révision à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); const fixture = await prepare(page);
    await page.goto('/academique/evaluations'); await page.getByRole('button', { name: 'Saisir / Gérer', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Notes · Épreuve de régression', exact: true });
    await visibleActions(page, dialog);
    const grade = dialog.getByRole('spinbutton').first(); await grade.fill('15');
    const presences = dialog.getByRole('form', { name: 'Saisie des notes' }).getByRole('combobox');
    await presences.nth(1).selectOption('ABSENT'); await presences.nth(2).selectOption('JUSTIFIE');
    await reducedViewport(page, dialog, grade, width);
    await page.keyboard.press('Escape'); await expect(dialog.getByText('Quitter sans enregistrer ?', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Continuer la saisie', exact: true }).click();
    let release!: () => void; fixture.delayGrades(new Promise<void>(resolve => { release = resolve; }));
    await dialog.getByRole('button', { name: 'Enregistrer les notes', exact: true }).click();
    await expect(dialog.getByText('Enregistrement en cours…', { exact: true })).toBeVisible(); await expect(grade).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Fermer le détail', exact: true })).toBeDisabled();
    release(); await expect(dialog.getByRole('status')).toContainText('Notes enregistrées avec succès.');
    await dialog.getByRole('button', { name: 'Soumettre à la direction académique', exact: true }).click();
    await expect(dialog.locator('.action-review')).toContainText('Notes chiffrées'); await expect(dialog.locator('.action-review')).toContainText('Moyenne /20');
    await expect(dialog.locator('.review-values > div').filter({ has: page.locator('dt', { hasText: /^Notes chiffrées$/ }) }).locator('dd')).toHaveText('10');
    await expect(dialog.locator('.review-values > div').filter({ has: page.locator('dt', { hasText: /^Absences$/ }) }).locator('dd')).toHaveText('2');
    await expect(dialog.locator('.review-values > div').filter({ has: page.locator('dt', { hasText: /^Moyenne \/20$/ }) }).locator('dd')).toHaveText('12,3');
    expect(fixture.commands).toHaveLength(1); await visibleActions(page, dialog);
    await dialog.getByRole('button', { name: 'Confirmer la soumission des notes', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('SOUMISES');
    expect(fixture.commands.map(command => [command.action, command.revision])).toEqual([['enter_grades', 1], ['enter_grades', 7], ['transition_workflow', 13]]);
  });

  test(`Nouvelle inscription : actions mobiles et confirmation native du formulaire à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); const fixture = await prepare(page);
    await page.goto('/etudiants'); await page.getByRole('button', { name: 'Nouvelle inscription', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nouvelle inscription', exact: true });
    await dialog.getByRole('combobox', { name: 'Étudiant', exact: true }).selectOption('NEW');
    await dialog.getByRole('combobox', { name: 'Formation de l’année', exact: true }).selectOption('OFF');
    await dialog.getByRole('combobox', { name: 'Groupe', exact: true }).selectOption('GROUP');
    await dialog.getByRole('combobox', { name: 'Tarif de scolarité', exact: true }).selectOption('TUITION');
    await dialog.getByRole('combobox', { name: 'Tarif d’inscription', exact: true }).selectOption('REGISTRATION');
    await dialog.getByLabel('Date d’inscription', { exact: true }).fill('2026-10-18');
    const reason = dialog.getByRole('textbox', { name: 'Motif', exact: true }); await reason.fill('Inscription annuelle vérifiée');
    await visibleActions(page, dialog); await reducedViewport(page, dialog, reason, width);
    await dialog.getByRole('button', { name: 'Vérifier l’inscription', exact: true }).click();
    expect(fixture.commands).toHaveLength(0); await visibleActions(page, dialog);
    await dialog.getByRole('button', { name: 'Confirmer la nouvelle inscription', exact: true }).click();
    await expect(dialog).toHaveCount(0); expect(fixture.commands).toHaveLength(1);
    await expect(page.getByText('Nouvelle inscription enregistrée', { exact: true })).toBeVisible();
  });

  test(`Rédiger un article : actions mobiles et succès visible à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); const fixture = await prepare(page);
    await page.goto('/site-web/articles'); await page.getByRole('button', { name: 'Rédiger un article', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Rédiger un article', exact: true }); await visibleActions(page, dialog);
    await dialog.getByLabel('Titre', { exact: true }).fill('Actualité de test'); await dialog.getByLabel('Adresse de l’article', { exact: true }).fill('actualite-test');
    await dialog.getByLabel('Résumé', { exact: true }).fill('Présentation de cette actualité.');
    await dialog.getByLabel('Contenu de l’article', { exact: true }).fill('Contenu de l’article.\n'.repeat(80));
    const reason = dialog.getByRole('textbox', { name: 'Motif de l’enregistrement', exact: true }); await reason.fill('Rédaction vérifiée');
    await reducedViewport(page, dialog, reason, width);
    await dialog.getByRole('button', { name: 'Relire avant enregistrement', exact: true }).click(); expect(fixture.commands).toHaveLength(0);
    await visibleActions(page, dialog); await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(dialog).toHaveCount(0); await expect(page.getByRole('status').filter({ hasText: 'Brouillon de l’article enregistré.' })).toBeVisible();
  });
}

test('Correction publiée : une valeur vide ou hors limites ne produit aucun appel', async ({ page }) => {
  const fixture = await prepare(page, 'PUBLIEES');
  await page.goto('/academique/evaluations'); await page.getByRole('button', { name: 'Saisir / Gérer', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Corriger', exact: true }).first().click();
  const value = dialog.getByLabel('Nouvelle note / 20', { exact: true });
  await dialog.getByLabel('Motif obligatoire de la correction', { exact: true }).fill('Erreur de report vérifiée');
  for (const invalid of ['', '-1', '21']) { await value.fill(invalid); await expect(dialog.getByRole('button', { name: 'Valider la révision', exact: true })).toBeDisabled(); }
  expect(fixture.commands).toHaveLength(0);
  await value.fill('0'); await dialog.getByRole('button', { name: 'Valider la révision', exact: true }).click();
  expect(fixture.commands).toHaveLength(0); await dialog.getByRole('button', { name: 'Confirmer la révision de note', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Correction enregistrée'); expect(fixture.commands[0].newValue).toBe(0);
});

test('Validation et publication restent sans écriture avant la confirmation', async ({ page }) => {
  const fixture = await prepare(page, 'A_CONTROLER');
  await page.goto('/academique/evaluations'); await page.getByRole('button', { name: 'Saisir / Gérer', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Valider les notes', exact: true }).click(); expect(fixture.commands).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Confirmer la validation des notes', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('VALIDEES');
  await dialog.getByRole('button', { name: 'Publier les résultats', exact: true }).click(); expect(fixture.commands).toHaveLength(1);
  await expect(dialog.locator('.action-consequence')).toContainText('officiels');
  await dialog.getByRole('button', { name: 'Confirmer la publication des résultats', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('PUBLIEES'); expect(fixture.commands).toHaveLength(2);
});

test('FormFeedback suit la dernière modale active et revient au parent après fermeture', async ({ page }) => {
  await prepare(page); await page.goto('/site-web/articles'); await page.getByRole('button', { name: 'Rédiger un article', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Titre', { exact: true }).fill('Article enregistré'); await dialog.getByLabel('Adresse de l’article', { exact: true }).fill('article-enregistre');
  await dialog.getByLabel('Résumé', { exact: true }).fill('Résumé du test'); await dialog.getByLabel('Contenu de l’article', { exact: true }).fill('Contenu du test');
  await dialog.getByRole('textbox', { name: 'Motif de l’enregistrement', exact: true }).fill('Test de retour visible');
  await dialog.getByRole('button', { name: 'Relire avant enregistrement', exact: true }).click(); await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.evaluate(() => {
    for (const id of ['feedback-parent', 'feedback-child']) { const overlay = document.createElement('div'); overlay.className = 'detail-overlay'; overlay.id = id; overlay.innerHTML = '<div class="detail-drawer-feedback"></div>'; document.body.appendChild(overlay); }
    document.getElementById('feedback-parent')!.inert = true;
  });
  await expect(page.locator('#feedback-child').getByRole('status')).toContainText('Brouillon de l’article enregistré.');
  await expect(page.locator('#feedback-parent').getByRole('status')).toHaveCount(0);
  await page.evaluate(() => { document.getElementById('feedback-child')!.remove(); document.getElementById('feedback-parent')!.inert = false; });
  await expect(page.locator('#feedback-parent').getByRole('status')).toContainText('Brouillon de l’article enregistré.');
});
