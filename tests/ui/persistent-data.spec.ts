import { openAccountMenu } from './helpers';
import { test, expect } from '@playwright/test';
import { ROLES } from '../../src/types/permissions';
import { captureWorkspace } from './helpers';
import { authenticateFixture, snapshot } from './persistent-fixture';
for (const width of [390, 1440]) {
  test(`Les données réelles et les annuaires séparés restent visibles à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 }); await authenticateFixture(page);
    let requests = 0;
    await page.route('**/api/campus', async route => { requests += 1; expect(route.request().headers()['x-escen-role']).toBe(ROLES.IT); await route.fulfill({ json: snapshot }); });
    await page.goto('/etudiants');
    const record = page.getByRole('row').filter({ hasText: 'ESCEN-TEST-001' });
    await expect(record).toContainText('Alice Exemple'); await expect(record).toContainText('Informatique'); await expect(record).toContainText('Groupe A');
    await expect(record).not.toContainText('0 FCFA'); await captureWorkspace(page, 'refonte-etudiants');
    await record.getByRole('button', { name: 'Fiche & Dossier' }).click();
    await expect(page.getByRole('heading', { name: 'Alice Exemple', exact: true })).toBeVisible();
    await expect(page.locator('.record-details-grid')).toContainText('90123456'); expect(requests).toBe(1);
    await page.getByRole('button',{name:'Fermer le détail'}).click();
    await page.reload(); await record.getByRole('button',{name:'Fiche & Dossier'}).click(); await expect(page.locator('.record-details-grid')).toContainText('90123456'); expect(requests).toBe(2);
    await page.goto('/personnel/utilisateurs'); await expect(page.getByRole('heading', { name: 'Comptes du personnel', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Annuaire (2 / 2)' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'alice@example.test' })).toHaveCount(0);
    await captureWorkspace(page, 'refonte-personnel');
    await page.goto('/etudiants/comptes'); await expect(page.getByRole('heading', { name: 'Comptes étudiants', exact: true })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'alice@example.test' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'it@example.test' })).toHaveCount(0);
    const operational = structuredClone(snapshot);
    Object.assign(operational.tables, {
      enrollments: [{ id: 'EN1', student_id: 'S1' }],
      evaluations: [{ id: 'EV1', name: 'Algorithmique' }],
      evaluation_candidates: [{ id: 'CA1', enrollment_id: 'EN1', evaluation_id: 'EV1' }],
      grades: [{ id: 'GR1', candidate_id: 'CA1', value: 15 }],
      payments: [{ id: 'PAY1', enrollment_id: 'EN1', amount: 125000, status: 'POSTED' }],
    });
    await page.route('**/api/campus', route => route.fulfill({ json: operational }));
    await page.reload();
    await page.goto('/finance/versements'); await expect(page.getByRole('heading', { name: 'Versements et reçus', exact: true })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Alice Exemple' })).toContainText('125'); await captureWorkspace(page, 'refonte-paiements');
    await page.goto('/academique/notes'); await expect(page.getByRole('heading', { name: 'Notes et résultats', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choisir un dossier étudiant' })).toBeVisible();
    await page.getByRole('button', { name: 'Consulter le dossier', exact: true }).click();
    await expect(page.getByRole('row').filter({ hasText: 'Algorithmique' })).toContainText('15');
    await expect(page.getByText('SOURCE_PARENT_MISSING', { exact: true })).toHaveCount(0);
    await captureWorkspace(page, 'refonte-notes');
    await page.goto('/mon-espace'); await expect(page.getByRole('heading', { name: 'Votre espace de gestion' })).toBeVisible();
    await captureWorkspace(page, 'refonte-accueil');
  });
}
test('Un échec de chargement peut être réessayé', async ({ page }) => {
  await authenticateFixture(page); let attempts = 0;
  await page.route('**/api/campus', async route => { attempts += 1; await route.fulfill(attempts === 1 ? { status: 503, json: { error: 'Chargement des dossiers indisponible.' } } : { json: snapshot }); });
  await page.goto('/etudiants'); await expect(page.getByRole('heading', { name: 'Chargement impossible' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dossiers étudiants', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Réessayer le chargement' }).click(); await expect(page.getByRole('row').filter({ hasText: 'ESCEN-TEST-001' })).toBeVisible(); expect(attempts).toBe(2);
});
test('Le changement de rôle retire les données non autorisées', async ({ page }) => {
  await authenticateFixture(page); const roles: string[] = [];
  await page.route('**/api/campus', async route => { const role = route.request().headers()['x-escen-role']; roles.push(role); await route.fulfill({ json: role === ROLES.IT ? snapshot : { revision: 1, tables: { people: [snapshot.tables.people[1]] } } }); });
  await page.goto('/etudiants'); await expect(page.getByRole('row').filter({ hasText: 'ESCEN-TEST-001' })).toBeVisible();
  await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: ROLES.MKT }); await expect(page).toHaveURL(/\/mon-espace$/); await expect(page.locator('#active-role')).toHaveValue(ROLES.MKT);
  await expect(page.getByRole('region', { name: 'État des données' })).toContainText('0 dossier(s)');
  await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: ROLES.IT }); await expect(page.getByRole('region', { name: 'État des données' })).toContainText('1 dossier(s)');
  expect(roles).toEqual([ROLES.IT, ROLES.MKT, ROLES.IT]);
});
test('La suppression d’un compte est enregistrée puis vérifiée par rechargement', async ({ page }) => {
  await authenticateFixture(page); const current = structuredClone(snapshot); let archived = false;
  await page.route('**/api/campus', route => route.fulfill({ json: { ...current, tables: { ...current.tables, accounts: current.tables.accounts.filter(row => !row.archived_at) } } }));
  await page.route('**/api/accounts/*', async route => { expect(route.request().method()).toBe('PATCH'); const input = route.request().postDataJSON(); expect(input.action).toBe('archive'); expect(input.reason).toBe('Compte de test retiré'); const id = route.request().url().split('/').at(-1); current.tables.accounts.find(row => row.id === id)!.archived_at = '2026-10-14T12:00:00Z'; archived = true; await route.fulfill({ json: { revision: 2 } }); });
  await page.goto('/personnel/utilisateurs'); const account = page.getByRole('row').filter({ hasText: 'sans-role@example.test' }); await account.getByRole('button', { name: 'Gérer', exact: true }).click();
  await page.getByRole('button', { name: 'Retirer le compte', exact: true }).click(); await page.getByLabel('Motif', { exact: true }).fill('Compte de test retiré'); await page.getByRole('button', { name: 'Vérifier les changements' }).click();expect(archived).toBe(false);await page.getByRole('button', { name: 'Confirmer le retrait', exact: true }).click();
  await expect(account).toHaveCount(0); expect(archived).toBe(true); await page.reload(); await expect(page.getByRole('heading', { name: 'Annuaire (1 / 1)' })).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`Copies et création du personnel à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 }); await authenticateFixture(page);
    await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
    const historical = { id: 'EXAM', sourceId: 'E1', batchId: 'batch-fixture', status: 'PENDING', values: {}, issues: [] };
    await page.route('**/api/history/exam?*', route => route.fulfill({ json: { exam: historical, tables: {
      exam_questions: [{ ...historical, id: 'Q1', sourceId: 'Q1', values: { content: '<p><strong>Expliquez votre réponse</strong></p><script>window.examUnsafe=true</script>', points: '5', order: 1 } }, { ...historical, id: 'Q2', sourceId: 'Q2', values: { content: '<p>Choisissez une réponse</p>', points: '2', order: 2 } }],
      exam_submissions: [{ ...historical, id: 'A1', sourceId: 'A1', values: { etudiant_id: '101', question_id: 'Q1', reponse: JSON.stringify({ text: '<p>Une réponse conservée</p>', commentaire_correction: 'Argumentation correcte' }), points_obtenus: '4', submitted_at: '2026-06-12' } }, { ...historical, id: 'A2', sourceId: 'A2', values: { etudiant_id: '101', question_id: 'Q2', reponse: JSON.stringify({ option_id: 'OPT', justification: 'Le choix est justifié' }), points_obtenus: '2' } }, { ...historical, id: 'B1', sourceId: 'B1', values: { etudiant_id: '102', question_id: 'Q1', reponse: JSON.stringify({ text: 'Réponse du second étudiant' }), points_obtenus: '1' } }],
      exam_question_options: [{ ...historical, id: 'OPT', sourceId: 'OPT', values: { question_id: 'Q2', text: '<p>La bonne option</p>', order: 1 } }],
      notes: [{ ...historical, id: 'N1', sourceId: 'N1', values: { etudiant_id: '101', note: '15' } }, { ...historical, id: 'N2', sourceId: 'N2', values: { etudiant_id: '102', note: '3' } }],
    } } }));
    await page.goto('/academique/examens'); await page.getByRole('button', { name: 'Voir les copies' }).click();
    const copy = page.getByRole('region', { name: 'Copie sélectionnée' }); await expect(copy).toBeVisible();
    await expect(copy.getByText('Une réponse conservée', { exact: true })).toBeVisible();
    await expect(copy.getByText('Expliquez votre réponse', { exact: true })).toBeVisible();
    await expect(copy.getByText('Argumentation correcte')).toBeVisible();
    await expect(copy.getByText('La bonne option')).toBeVisible();
    await expect(copy.locator('.chosen')).toContainText('Choix de l’étudiant');
    await expect(copy.getByText('Le choix est justifié')).toBeVisible();
    await expect(copy.getByText('15 / 20')).toBeVisible();
    await expect(copy.getByText('Réponse du second étudiant')).toHaveCount(0);
    await expect(copy.getByText('3 / 20')).toHaveCount(0);
    if (width === 390) await page.getByLabel('Copie de l’étudiant').selectOption('102');
    else await page.locator('.exam-roster-list button').filter({ hasText: '#102' }).click();
    await expect(copy.getByText('Réponse du second étudiant')).toBeVisible();
    await expect(copy.getByText('3 / 20')).toBeVisible();
    await expect(copy.getByText('Une réponse conservée')).toHaveCount(0);
    if (width === 390) await page.getByLabel('Copie de l’étudiant').selectOption('101');
    else await page.locator('.exam-roster-list button').filter({ hasText: 'Alice Exemple' }).click();
    await expect(copy.getByText('15 / 20')).toBeVisible();
    expect(await page.evaluate(() => 'examUnsafe' in window)).toBe(false);
    await captureWorkspace(page, 'exam-copie-lisible');
    await page.getByRole('button', { name: 'Tous les examens', exact: false }).click();
    const dialog = page.getByRole('dialog');
    await expect(page.getByRole('button', { name: 'Voir les copies' })).toBeFocused();
    const records: import('../../src/types/staff').PersonnelRecord[] = [{ personId: 'PERSON', staffId: null, firstname: 'Jean', lastname: 'Technique', email: 'it@example.test', phone: '', employeeNumber: '', isTeacher: false, active: true, contracts: [] }];
    let saved = false;
    await page.route('**/api/staff', async route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON(); expect(body.employeeNumber).toBe(''); expect(body.position).toBe('Comptable'); expect(body.firstname).toBe('Marie');
        saved = true; records.push({ ...records[0], personId: 'NEW', staffId: 'STAFF', firstname: body.firstname, lastname: body.lastname, email: body.email, employeeNumber: '', contracts: [{ id: 'C1', position: body.position, type: 'PERMANENT', startsOn: '2026-10-23', endsOn: null }] });
        await route.fulfill({ status: 201, json: { id: 'STAFF' } });
      } else await route.fulfill({ json: { records, revision:1 } });
    });
    await page.goto('/personnel'); await page.getByRole('button', { name: 'Ouvrir', exact: true }).click();
    await expect(dialog.getByText('Aucune fonction enregistrée.', { exact: false })).toBeVisible();
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Nouveau membre du personnel' }).click();
    await expect(dialog.getByLabel('Matricule enseignant (facultatif)')).toHaveCount(0);
    await dialog.getByLabel('Prénom', { exact: true }).fill('Marie'); await dialog.getByLabel('Nom', { exact: true }).fill('Exemple');
    await dialog.getByLabel('Fonction', { exact: true }).fill('Comptable');
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();expect(saved).toBe(false);await dialog.getByRole('button', { name: 'Confirmer la création', exact: true }).click();
    await expect(page.getByText('Dossier enregistré.', { exact: true })).toBeVisible(); expect(saved).toBe(true);
    await expect(page.getByRole('row').filter({ hasText: 'Marie Exemple' })).toBeVisible();
    await page.reload(); await expect(page.getByRole('row').filter({ hasText: 'Marie Exemple' })).toBeVisible();
    await captureWorkspace(page, 'personnel-dossiers');
  });
}
