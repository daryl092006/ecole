import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { localBusinessFixture } from './local-business-fixture.mjs';
import { authenticateFixture } from './persistent-fixture';

type Local = Awaited<ReturnType<typeof localBusinessFixture>>;
let local: Local;
test.beforeEach(async () => {
  // Native import keeps the local PGlite harness and its .mjs dependencies in ESM.
  const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<{ localBusinessFixture: typeof localBusinessFixture }>;
  const fixture = await nativeImport(pathToFileURL(resolve('tests/ui/local-business-fixture.mjs')).href);
  local = await fixture.localBusinessFixture();
});
test.afterEach(async () => { await local?.close(); });

async function connect(page: Page) {
  page.on('pageerror', error => { throw error; });
  await authenticateFixture(page);
  await page.route('**/api/**', async route => {
    if (!new URL(route.request().url()).pathname.startsWith('/api/')) return route.fallback();
    if (new URL(route.request().url()).pathname.startsWith('/api/history')) return route.fulfill({ json: { totalSourceRows: 0, datasets: [], references: {} } });
    const request = route.request();
    const body = request.postDataBuffer();
    const response = await local.dispatch(new Request(request.url(), { method: request.method(), headers: request.headers(), ...(body ? { body: new Uint8Array(body) } : {}) }));
    if (!response.ok) console.error('Local recipe response', new URL(request.url()).pathname, response.status, await response.clone().text());
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
  });
  await page.goto('/mon-espace');
  await selectIT(page);
}

async function selectIT(page: Page) {
  await page.getByLabel('Mon compte et mon rôle').click();
  await page.getByLabel('Rôle autorisé', { exact: true }).selectOption('Informaticien');
  if (await page.locator('.account-control').getAttribute('open') !== null) await page.getByLabel('Mon compte et mon rôle').click();
}

for (const width of [390, 1440]) test(`Écrans et PostgreSQL local : création, pièces communes, relecture et année à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await connect(page);
  await page.goto('/academique/filieres');
  await selectIT(page);
  await page.getByLabel('1. Groupe').selectOption({ index: 1 });
  const semesterId = await local.value('select id as value from escen.curriculum_semesters where curriculum_id=$1 and position=1', [local.curricula[0].id]);
  await page.getByLabel('2. Semestre').selectOption(semesterId);
  await page.getByRole('button', { name: 'Ajouter une matière', exact: true }).click();
  const name = `Finance de recette ${width}`;
  await page.getByLabel('Nom', { exact: true }).fill(name);
  await page.getByLabel('Sigle de discipline REESAO (3 lettres)').fill('ECN');
  await page.getByLabel('Crédits', { exact: true }).fill('3.75');
  await page.getByLabel('Coefficient', { exact: true }).fill('0.625');
  await page.getByRole('textbox', { name: 'Motif', exact: true }).fill('Recette complète sur PostgreSQL local');
  await page.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  expect(await local.value('select count(*)::integer as value from escen.subjects where name=$1', [name])).toBe(0);
  await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Matières du semestre' })).toContainText(name);
  expect(await local.value('select count(*)::integer as value from escen.subjects s join escen.curriculum_components c on c.subject_id=s.id join escen.teaching_units u on u.id=c.unit_id where s.name=$1 and c.credits=3.75 and c.coefficient=0.625 and u.code=s.code', [name])).toBe(1);
  await page.reload();
  await selectIT(page);
  await page.getByLabel('1. Groupe').selectOption({ index: 1 });
  await page.getByLabel('2. Semestre').selectOption(semesterId);
  await expect(page.getByRole('region', { name: 'Matières du semestre' })).toContainText(name);
  await page.getByRole('row').filter({ hasText: name }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `tmp/screenshots/business-review/${width}/programme.png`, fullPage: true });

  await page.goto('/site-web/documents');
  await selectIT(page);
  await expect(page.getByRole('region', { name: 'Configuration des formations' })).toContainText('2 formations affichées sur 2');
  await page.getByRole('button', { name: `Configurer les pièces : Master 1 · ${local.year.name}`, exact: true }).click();
  await page.getByRole('checkbox', { name: 'Curriculum vitæ', exact: true }).check();
  await page.getByLabel('Motif de la configuration').fill('Pièces communes vérifiées dans le navigateur');
  await page.getByRole('button', { name: 'Relire les pièces du niveau', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Vérification avant enregistrement' })).toContainText('Marketing Digital');
  await page.getByRole('button', { name: 'Confirmer les pièces du niveau', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Pièces communes par niveau' })).toContainText('Curriculum vitæ');
  expect(await local.value("select count(*)::integer as value from escen.website_intakes where academic_year_id=$1 and required_documents @> '[\"cv_file\"]'::jsonb", [local.year.id])).toBe(2);
  for (const program of local.programs) {
    const requirements = await local.dispatch(new Request(`http://local.test/api/website/public/niveau/${local.level.id}/document-requirements?filiere_id=${program.id}`));
    expect(requirements.status).toBe(200);
    const documents = await requirements.json() as { document_key: string; is_obligatoire: boolean }[];
    expect(documents.filter(item => item.is_obligatoire).map(item => item.document_key)).toEqual(['cv_file']);
  }
  await page.reload();
  await selectIT(page);
  await expect(page.getByRole('region', { name: 'Pièces communes par niveau' })).toContainText('Curriculum vitæ');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `tmp/screenshots/business-review/${width}/pieces.png`, fullPage: true });
  await page.getByLabel('Année consultée', { exact: true }).selectOption(local.nextYear.id);
  await expect(page.getByRole('region', { name: 'Configuration des formations' })).toContainText(`Aucune formation pour ${local.nextYear.name}`);
  await expect(page.getByRole('button', { name: /^Configurer les pièces :/ })).toHaveCount(0);
});

test('Pièces : conflit réel, relecture des versions et protection de la saisie', async ({ page }) => {
  await connect(page);
  await page.goto('/site-web/documents');
  await selectIT(page);
  await page.getByRole('button', { name: `Configurer les pièces : Master 1 · ${local.year.name}`, exact: true }).click();
  await page.getByRole('checkbox', { name: 'Acte de naissance', exact: true }).check();
  await page.getByLabel('Motif de la configuration').fill('Configuration concurrente de recette');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Quitter sans enregistrer ?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer la saisie', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Acte de naissance', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Relire les pièces du niveau', exact: true }).click();
  const intakes = await local.value("select jsonb_agg(jsonb_build_object('id',id,'version',version)) as value from escen.website_intakes where academic_year_id=$1", [local.year.id]);
  const version = await local.value('select (select version from escen.website_level_document_rules where academic_year_id=$1 and level_id=$2) as value', [local.year.id, local.level.id]);
  const concurrent = await local.client.rpc('escen_website_level_documents', { p_actor_id: local.account.id, p_role_code: 'IT', p_academic_year_id: local.year.id, p_level_id: local.level.id, p_required_documents: ['cv_file'], p_expected_intakes: intakes, p_expected_rule_version: version, p_reason: 'Sauvegarde depuis un autre onglet de recette' });
  expect(concurrent.error).toBeNull();
  await page.getByRole('button', { name: 'Confirmer les pièces du niveau', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Vérification avant enregistrement' }).getByRole('alert')).toContainText('Enregistrement refusé');
  await expect.soft(page.getByRole('region', { name: 'Vérification avant enregistrement' }).getByRole('alert')).toBeInViewport();
  expect(await local.value('select required_documents as value from escen.website_level_document_rules where academic_year_id=$1 and level_id=$2', [local.year.id, local.level.id])).toEqual(['cv_file']);
  await page.screenshot({ path: 'tmp/screenshots/business-review/conflit-pieces.png', fullPage: true });
});

test('Ouverture : fermer une filière conserve les autres et modifie réellement le catalogue public', async ({ page }) => {
  await connect(page);
  await page.goto('/site-web/documents');
  await selectIT(page);
  const intake = (await local.db.query<{ id: string; label: string }>('select id,label from escen.website_intakes where program_id=$1', [local.programs[0].id])).rows[0];
  const section = page.getByRole('region', { name: 'Configuration des formations' });
  await section.locator('summary').filter({ hasText: 'Finance Digitale' }).click();
  await section.getByRole('button', { name: `Configurer l’ouverture : ${intake.label}`, exact: true }).click();
  await page.getByRole('checkbox', { name: 'Ouvrir aux inscriptions sur le site', exact: true }).uncheck();
  await page.getByLabel('Motif de la configuration').fill('Fermer cette filière pour la recette');
  await page.getByRole('button', { name: 'Relire la configuration', exact: true }).click();
  expect(await local.value('select active as value from escen.website_intakes where id=$1', [intake.id])).toBe(true);
  await page.getByRole('button', { name: 'Confirmer la configuration', exact: true }).click();
  await expect(section).toContainText('1 ouverte');
  await expect.poll(() => local.value('select active as value from escen.website_intakes where id=$1', [intake.id])).toBe(false);
  expect(await local.value('select count(*)::integer as value from escen.website_intakes where active')).toBe(1);
  const publicPrograms = await local.dispatch(new Request(`http://local.test/api/website/public/filieres/liste?niveau_id=${local.level.id}`));
  expect(await publicPrograms.json()).toEqual([{ id: local.programs[1].id, nom: 'Marketing Digital' }]);
  const audit = await local.value("select new_value as value from escen_private.audit_events where table_name='website_intakes' and entity_id=$1 and actor_id=$2 order by happened_at desc limit 1", [intake.id, local.account.id]);
  expect(audit).toMatchObject({ active: false, reason: 'Fermer cette filière pour la recette' });
  await page.screenshot({ path: 'tmp/screenshots/business-review/fermeture-filiere.png', fullPage: true });
});

test('Rôles et années : consultation globale sans écriture et refus métier effectif', async ({ page }) => {
  await connect(page);
  await page.goto('/site-web/documents');
  await selectIT(page);
  await page.getByLabel('Année consultée', { exact: true }).selectOption('all');
  await expect(page.getByRole('button', { name: /^Configurer les pièces :/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Configurer l’ouverture :/ })).toHaveCount(0);
  await page.getByLabel('Mon compte et mon rôle').click();
  await page.getByLabel('Rôle autorisé', { exact: true }).selectOption('Responsable marketing');
  await page.getByLabel('Mon compte et mon rôle').click();
  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.getByRole('button', { name: /^Configurer les pièces :/ })).toHaveCount(0);
  const response = await local.dispatch(new Request('http://local.test/api/website-management?kind=admissions', { headers: { Authorization: 'Bearer fixture-auth-token', 'x-escen-role': 'Responsable marketing' } }));
  expect(response.status).toBe(403);
  await page.screenshot({ path: 'tmp/screenshots/business-review/role-refuse.png', fullPage: true });
});

test('Relevé : impression du snapshot enregistré, date figée, zéro distinct du vide et contenu incomplet refusé', async ({ page }) => {
  await connect(page);
  await page.goto('/etudiants/cartes');
  await selectIT(page);
  await page.getByRole('button', { name: 'Consulter le dossier', exact: true }).click();
  await page.getByRole('button', { name: 'Documents établis', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'REL-LOCAL-INCOMPLET' }).getByRole('button', { name: 'Ouvrir le détail', exact: true }).click();
  await page.getByRole('button', { name: 'Imprimer le relevé · A4, une page' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('détails figés');
  await page.keyboard.press('Escape');
  await page.getByRole('row').filter({ hasText: 'REL-LOCAL-COMPLET' }).getByRole('button', { name: 'Ouvrir le détail', exact: true }).click();
  await page.evaluate(() => {
    new MutationObserver(() => {
      const frame = document.querySelector<HTMLIFrameElement>('.transcript-print-frame');
      if (frame?.contentWindow) frame.contentWindow.print = () => { document.documentElement.dataset.reviewPrinted = 'true'; };
    }).observe(document.body, { childList: true });
  });
  await page.getByRole('button', { name: 'Imprimer le relevé · A4, une page' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-review-printed', 'true');
  const frame = page.frameLocator('.transcript-print-frame');
  await expect(frame.locator('.transcript-identity')).toContainText('Alice Recette');
  await expect(frame.locator('.transcript-signature')).toContainText('20 octobre 2026');
  await expect(frame.getByRole('row').filter({ hasText: 'Note absente de recette' }).getByRole('cell').nth(3)).toHaveText('—');
  await expect(frame.getByRole('row').filter({ hasText: 'Note zéro de recette' }).getByRole('cell').nth(3)).toHaveText('0');
  expect(local.requests.some(request => request.path === `/api/transcripts/${local.documents[0].id}` && request.status === 200)).toBe(true);
  const printFrame = page.frames().find(item => item !== page.mainFrame())!;
  const preview = await page.context().newPage();
  await preview.setContent(await printFrame.content());
  await preview.emulateMedia({ media: 'print' });
  await preview.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).map(image => image.decode())); });
  await preview.pdf({ path: 'tmp/screenshots/business-review/releve.pdf', preferCSSPageSize: true, printBackground: true });
  await preview.locator('.transcript-sheet').screenshot({ path: 'tmp/screenshots/business-review/releve.png' });
  await preview.close();
});

test('Site public : pièces communes réelles, dépôt en quatre étapes et dossier reçu dans le portail', async ({ page }) => {
  const website = process.env.ESCEN_TEST_WEBSITE_URL;
  test.skip(!website, 'Lancer la copie du site et fournir ESCEN_TEST_WEBSITE_URL.');
  process.env.ESCEN_WEBSITE_URL = website;
  const intakes = await local.value("select jsonb_agg(jsonb_build_object('id',id,'version',version)) as value from escen.website_intakes where academic_year_id=$1", [local.year.id]);
  const saved = await local.client.rpc('escen_website_level_documents', { p_actor_id: local.account.id, p_role_code: 'IT', p_academic_year_id: local.year.id, p_level_id: local.level.id, p_required_documents: ['cv_file'], p_expected_intakes: intakes, p_expected_rule_version: null, p_reason: 'Pièce commune pour recette du formulaire public' });
  expect(saved.error).toBeNull();
  await connect(page);
  await page.route('https://api.country.is/**', route => route.fulfill({ json: { country: 'TG' } }));
  await page.goto(`${website}/inscription/`);
  await page.getByRole('combobox', { name: 'Pour quel niveau postulez-vous ?' }).selectOption(local.level.id);
  await expect(page.getByText('Curriculum vitæ', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'tmp/screenshots/business-review/inscription-pieces.png', fullPage: true });
  await page.getByRole('button', { name: "J'ai compris, commencer" }).click();
  await page.getByPlaceholder('Nom de famille', { exact: true }).fill('Candidate');
  await page.getByPlaceholder('Prénom(s)', { exact: true }).fill('Recette');
  await page.locator('form select').first().selectOption({ label: 'Féminin' });
  await page.locator('input[type="date"]').fill('2000-01-01');
  await page.getByPlaceholder('Ville, Pays', { exact: true }).fill('Lomé, Togo');
  await expect(page.locator('.nat-value')).toHaveText('Togolaise');
  await page.locator('input[type="email"]').first().fill('candidate-recette@example.test');
  await page.locator('input[type="tel"]').first().fill('90000000');
  await page.getByRole('button', { name: 'Continuer', exact: false }).click();
  await expect(page.getByLabel('Dernier diplôme obtenu')).toBeVisible();
  expect(await local.value("select count(*)::integer as value from escen.online_applications where status='BROUILLON'")).toBe(1);
  await page.getByLabel('Dernier diplôme obtenu').selectOption('Master');
  await page.getByLabel('Année d’obtention du diplôme', { exact: false }).fill('2024');
  await page.getByLabel('Spécialité du diplôme', { exact: false }).fill('Finance');
  await page.getByRole('button', { name: 'Continuer', exact: false }).click();
  await page.locator('form select').first().selectOption(local.level.id);
  await page.locator('form select').nth(1).selectOption(local.programs[0].id);
  await page.getByRole('button', { name: 'Continuer', exact: false }).click();
  await expect(page.getByText('Documents obligatoires manquants', { exact: false }).first()).toBeVisible();
  expect(local.files.size).toBe(0);
  await page.locator('.dropzone').filter({ hasText: 'Curriculum vitæ' }).locator('input[type="file"]').setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nCurriculum vitae de recette') });
  await page.getByRole('button', { name: 'Continuer', exact: false }).click();
  await page.getByPlaceholder('Nom', { exact: true }).fill('Parent');
  await page.getByPlaceholder('Prénom', { exact: true }).fill('Recette');
  await page.locator('input[type="tel"]').fill('91000000');
  await page.locator('#accept_cgu').check();
  await page.getByRole('button', { name: /Soumettre|Envoyer/ }).click();
  expect(await local.value("select count(*)::integer as value from escen.online_applications where status='RECU'")).toBe(0);
  await page.getByRole('button', { name: 'Oui, soumettre', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('WEB-');
  await expect(page.getByRole('status').filter({ hasText: 'Dossier reçu par ESCEN' })).toBeVisible();
  await expect(page.locator('.swal-overlay')).toHaveCSS('opacity', '0');
  await expect.soft(page.getByRole('status').filter({ hasText: 'Dossier reçu par ESCEN' })).toBeInViewport();
  expect(await local.value("select count(*)::integer as value from escen.online_applications where status='RECU'")).toBe(1);
  expect(local.files.size).toBe(1);
  await page.getByRole('status').filter({ hasText: 'Dossier reçu par ESCEN' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'tmp/screenshots/business-review/inscription-envoyee.png', fullPage: true, animations: 'disabled' });
  await page.goto('/site-web/demandes');
  await selectIT(page);
  await expect(page.getByRole('row').filter({ hasText: 'candidate-recette@example.test' })).toContainText('Reçu');
  await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('cv.pdf');
  await page.screenshot({ path: 'tmp/screenshots/business-review/dossier-recu.png', fullPage: true });
});
