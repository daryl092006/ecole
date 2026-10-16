import { expect, test } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { projectRelationalCampus } from '../../src/services/relationalCampusAdapter';

for (const width of [390, 1440]) {
  test(`Dossier récent : parcours et notes restent dans le dossier à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await authenticateFixture(page);
    const campus = structuredClone(snapshot);
    campus.tables.people.push({ id: 'PN', firstname: 'Nouvelle', lastname: 'Étudiante' });
    campus.tables.students.push({ id: 'SN', person_id: 'PN', matricule: 'NATIVE-001' });
    campus.tables.enrollments = [{ id: 'EN', student_id: 'SN', status: 'INSCRIT', enrolled_on: '2026-10-15' }, { id: 'OTHER', student_id: 'S1', status: 'INSCRIT' }];
    campus.tables.evaluations = [{ id: 'EV', name: 'Évaluation du dossier' }];
    campus.tables.evaluation_candidates = [{ id: 'CN', enrollment_id: 'EN', evaluation_id: 'EV' }, { id: 'CO', enrollment_id: 'OTHER', evaluation_id: 'EV' }];
    campus.tables.grades = [{ id: 'GN', candidate_id: 'CN', value: 14 }, { id: 'GO', candidate_id: 'CO', value: 19 }];
    await page.route('**/api/campus', route => route.fulfill({ json: campus }));
    await page.route('**/api/students/NATIVE-001', route => route.fulfill({ json: { student: projectRelationalCampus(campus).data.students.find(student => student.matricule === 'NATIVE-001') } }));
    await page.route('**/api/students/NATIVE-001/operations', route => route.fulfill({ json: { revision: 1, enrollments: [], payments: [], paid: 0 } }));
    await page.goto('/etudiants/NATIVE-001');
    await page.getByRole('navigation', { name: 'Sections du dossier étudiant' }).getByRole('button', { name: 'Notes', exact: true }).click();
    await expect(page.getByRole('cell', { name: /(?:^| )14$/ })).toBeVisible();
    await expect(page.getByRole('cell', { name: /(?:^| )19$/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Choisir un dossier étudiant' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Gérer la scolarité' })).toHaveCount(0);
    await expect(page.locator('#main-content h1')).toHaveCount(1);
    await page.getByRole('navigation', { name: 'Sections du dossier étudiant' }).getByRole('button', { name: 'Années et groupes', exact: true }).click();
    await expect(page.getByRole('row').filter({ hasText: 'Nouvelle Étudiante' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Alice Exemple' })).toHaveCount(0);
    await page.screenshot({ path: `.tmp/interface/${width}/dossier-parcours-contextuel.png` });
  });
}

test('Préparation : créer un groupe et ses deux filières ensemble', async ({ page }) => {
  await authenticateFixture(page);
  const yearId = '10000000-0000-4000-8000-000000000001';
  const tables: Record<string, Record<string, unknown>[]> = {
    academic_years: [{ id: yearId, name: '2026-2027', status: 'BROUILLON' }],
    levels: [{ id: 'LEVEL', name: 'Licence 1' }], sites: [{ id: 'SITE', name: 'Lieu existant' }],
    academic_offerings: [{ id: 'OFFER', name: 'Informatique L1', level_id: 'LEVEL', academic_year_id: yearId }, { id: 'OFFER2', name: 'Gestion L1', level_id: 'LEVEL', academic_year_id: yearId }], groups: [], group_offerings: [],
  };
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  await page.route('**/api/catalog/*', route => {
    const collection = new URL(route.request().url()).pathname.split('/').at(-1)!;
    if (route.request().method() === 'POST') { tables[collection].push({ id: 'GROUP', ...route.request().postDataJSON().values }); return route.fulfill({ status: 201, json: { revision: 2 } }); }
    return route.fulfill({ json: { revision: 1, tables, historyLinks: [] } });
  });
  await page.route('**/api/year-preparation', route => route.fulfill({ json: { checks: [{ key: 'groups', label: 'Groupes', ready: false, href: '' }] } }));
  await page.goto('/academique/referentiel?collection=academic_years');
  await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Configurer groupes', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('searchbox', { name: 'Rechercher', exact: true })).toHaveCount(0);
  const form = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Ajouter un groupe · 2026-2027', exact: true }) });
  await form.getByLabel('Nom', { exact: true }).fill('Groupe informatique A');
  await form.getByRole('checkbox', { name: 'Informatique L1' }).check();
  await form.getByRole('checkbox', { name: 'Gestion L1' }).check();
  await expect(form.getByRole('combobox', { name: 'Site', exact: true })).toHaveCount(0);
  await form.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  await form.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(form).toHaveCount(0);
  const linkForm = page.getByRole('dialog', { name: 'Ajouter un rattachement de groupe · 2026-2027', exact: true });
  await expect(linkForm).toHaveCount(0);
  expect(tables.groups[0].offering_ids).toEqual(['OFFER', 'OFFER2']);
  await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
});

test('Préparation : les bases sont enregistrées avant les formations, sans changer de page', async ({ page }) => {
  await authenticateFixture(page);
  const tables: Record<string, Record<string, unknown>[]> = {
    academic_years: [{ id: '10000000-0000-4000-8000-000000000001', name: '2026-2027', status: 'BROUILLON' }],
    programs: [], cycles: [], levels: [], sites: [{ id: 'SITE', name: 'Lieu existant' }], curricula: [], academic_offerings: [],
  };
  const saved: string[] = [];
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  await page.route('**/api/catalog/*', route => {
    const collection = new URL(route.request().url()).pathname.split('/').at(-1)!;
    if (route.request().method() === 'POST') { saved.push(collection); tables[collection].push({ id: collection, ...route.request().postDataJSON().values }); return route.fulfill({ status: 201, json: { revision: saved.length + 1 } }); }
    return route.fulfill({ json: { revision: saved.length + 1, tables, historyLinks: [] } });
  });
  await page.route('**/api/year-preparation', route => route.fulfill({ json: { checks: [{ key: 'offerings', label: 'Formations', ready: tables.academic_offerings.length > 0, href: '' }] } }));
  await page.goto('/academique/referentiel?collection=academic_years');
  await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer : Formations proposées', exact: true }).click();
  for (const step of [
    { title: 'Ajouter une filière', code: 'INFO', name: 'Informatique' },
    { title: 'Ajouter un cycle', code: 'LIC', name: 'Licence' },
    { title: 'Ajouter un niveau', code: 'L1', name: 'Licence 1', position: true },
    { title: 'Ajouter un programme de formation' },
    { title: 'Choisir une filière et ses niveaux', annual: true },
  ]) {
    const form = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: `${step.title} · 2026-2027`, exact: true }) });
    await expect(form).toBeVisible();
    if (step.code) await form.getByLabel('Code', { exact: true }).fill(step.code);
    if (step.name) await form.getByLabel('Nom', { exact: true }).fill(step.name);
    if (step.position) await form.getByLabel('Ordre dans le cycle', { exact: true }).fill('1');
    if ('annual' in step) { await form.getByRole('combobox', { name: 'Filière', exact: true }).selectOption('programs'); await form.getByRole('checkbox', { name: 'Licence 1 · Présentiel', exact: true }).check(); }
    const before = saved.length;
    await form.getByRole('button', { name: 'Vérifier les informations', exact: true }).click(); expect(saved).toHaveLength(before);
    await form.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  }
  expect(saved).toEqual(['programs', 'cycles', 'levels', 'curricula', 'academic_offerings']);
  await expect(page.getByRole('heading', { name: 'Préparer l’année · 2026-2027', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/referentiel\?collection=academic_years$/);
});

test('Nouvelle inscription : créer l’identité sur place puis continuer avec ce dossier', async ({ page }) => {
  await authenticateFixture(page);
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  let created = false;
  await page.route('**/api/students', route => { expect(route.request().method()).toBe('POST'); created = true; return route.fulfill({ status: 201, json: { matricule: 'NEW-001' } }); });
  await page.route('**/api/enrollments', route => route.fulfill({ json: { revision: 1, candidates: created ? [{ id: 'NEW', name: 'Nouvelle Personne', matricule: 'NEW-001', kind: 'new', eligible: true }] : [], offerings: [{ id: 'O', name: 'Informatique L1', programId: 'P', levelId: 'L' }], groups: [], fees: [] } }));
  await page.goto('/etudiants');
  await page.getByRole('button', { name: 'Nouvelle inscription', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Formation de l’année', exact: true })).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Ajouter un dossier étudiant', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Ajouter un dossier étudiant', exact: true });
  await form.getByLabel('Matricule officiel', { exact: true }).fill('NEW-001');
  await form.getByLabel('Prénom', { exact: true }).fill('Nouvelle'); await form.getByLabel('Nom', { exact: true }).fill('Personne');
  await form.getByRole('button', { name: 'Vérifier les informations', exact: true }).click(); expect(created).toBe(false);
  await form.getByRole('button', { name: 'Confirmer la création du dossier', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Nouvelle inscription', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Étudiant', exact: true })).toHaveValue('NEW');
  await expect(page.getByRole('combobox', { name: 'Formation de l’année', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Groupe', exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/etudiants$/);
});

test('Dossier sans inscription : régulariser sur place avec le bon parcours ancien étudiant', async ({ page }) => {
  await authenticateFixture(page);
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  await page.route('**/api/students/*/operations', route => route.fulfill({ json: { revision: 1, enrollments: [], payments: [], paid: 0 } }));
  await page.route('**/api/enrollments', route => route.fulfill({ json: { revision: 1, candidates: [{ id: 'OLD', name: 'Alice Exemple', matricule: 'ESCEN-TEST-001', kind: 'reenroll', eligible: true }], offerings: [{ id: 'O', name: 'Informatique L1', programId: 'P', levelId: 'L' }], groups: [], fees: [] } }));
  await page.goto('/etudiants/ESCEN-TEST-001');
  await page.getByRole('button', { name: 'Régulariser l’inscription ici', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Réinscrire un ancien étudiant', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Étudiant', exact: true })).toHaveValue('OLD');
  await expect(page.getByRole('combobox', { name: 'Formation de l’année', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/etudiants\/ESCEN-TEST-001$/);
});
