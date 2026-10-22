import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { ACCOUNT_IDS } from './persistent-fixture';

const articleId = '11111111-1111-4111-8111-111111111111';
const intakeId = '22222222-2222-4222-8222-222222222222';
const yearId = '44444444-4444-4444-8444-444444444444';
const applicationId = '33333333-3333-4333-8333-333333333333';
async function manageFixture(page: Page) {
  await authenticateFixture(page);
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  const articles: Record<string, unknown>[] = [];
  const application = { id: applicationId, reference: 'WEB-RECETTE', identity: { nom: 'Candidate', prenom: 'Alice', email: 'alice@example.test', tel: '+22890000000' }, diploma: { type_diplome_id: 'BAC déclaré' }, guardians: [{ nom: 'Parent', prenom: 'Marie', tel: '+22891000000' }], intake_id: intakeId, intake_label: 'Licence Informatique', status: 'RECU', version: 1, documents: [{ id: articleId, document_key: 'diplome_file', filename: 'diplome.pdf' }] };
  const commands: Record<string, unknown>[] = [];
  let fail = false;
  await page.route('**/api/website-management*', async route => {
    expect(route.request().headers().authorization).toBe('Bearer fixture-auth-token');
    if (route.request().method() === 'POST') {
      const data = route.request().postDataJSON(); commands.push(data);
      if (fail) { await route.fulfill({ status: 409, json: { error: 'Version concurrente : actualisez.' } }); return; }
      if (data.action === 'article-save') {
        const index = articles.findIndex(item => item.id === data.id);
        const saved = { ...data, id: data.id || articleId, version: index < 0 ? 1 : Number(articles[index].version) + 1 };
        if (index < 0) articles.push(saved); else articles[index] = saved;
      } else if (data.action === 'application-status') { application.status = data.status; application.version++; }
      await route.fulfill({ status: 201, json: { id: data.id || articleId } }); return;
    }
    const kind = new URL(route.request().url()).searchParams.get('kind');
    if (kind === 'articles') await route.fulfill({ json: articles });
    else if (kind === 'document') await route.fulfill({ json: { url: 'https://example.test/private-document' } });
    else await route.fulfill({ json: { applications: [application], intakes: [{ id: intakeId, level_id: articleId, program_id: applicationId, label: 'Licence Informatique', active: true, required_documents: ['diplome_file'], version: 1 }], levels: [{ id: articleId, name: 'Licence 1' }], programs: [{ id: applicationId, name: 'Informatique' }] } });
  });
  return { commands, fail: () => { fail = true; } };
}
for (const width of [390, 1440]) {
  test(`Articles : aperçu, confirmation, publication, retrait et rechargement à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 }); const fixture = await manageFixture(page);
    await page.goto('/site-web/articles');
    await page.getByRole('button', { name: 'Rédiger un article', exact: true }).click();
    await page.getByLabel('Titre', { exact: true }).fill('Actualité publiée depuis la plateforme');
    await page.getByLabel('Adresse de l’article', { exact: true }).fill('actualite-plateforme');
    await page.getByLabel('Résumé', { exact: true }).fill('Présentation de cette actualité.');
    await page.getByLabel('Contenu de l’article', { exact: true }).fill('Le texte de cette actualité.\n\nDeuxième paragraphe.');
    await page.getByLabel('Diffusion', { exact: true }).selectOption('PUBLIE');
    await page.getByLabel('Motif de l’enregistrement', { exact: true }).fill('Publication institutionnelle validée');
    await page.getByRole('button', { name: 'Relire avant enregistrement', exact: true }).click();
    expect(fixture.commands).toHaveLength(0);
    await expect(page.getByRole('region', { name: 'Confirmation de l’article' })).toContainText('visible publiquement');
    await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Publications du site' })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Modifier : Actualité publiée depuis la plateforme' }).click();
    await page.getByLabel('Diffusion', { exact: true }).selectOption('RETIRE');
    await page.getByLabel('Motif de l’enregistrement', { exact: true }).fill('Retrait demandé par la rédaction');
    await page.getByRole('button', { name: 'Relire avant enregistrement', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
    await expect(page.getByText('RETIRE · Version 2', { exact: false })).toBeVisible();
    expect(fixture.commands[1]).toMatchObject({ action: 'article-save', id: articleId, version: 1, status: 'RETIRE' });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/articles-site.png`, fullPage: true });
  });
  test(`Dossiers du site : lecture, pièces, suivi confirmé et erreurs à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 }); const fixture = await manageFixture(page);
    await page.goto('/site-web/demandes');
    await expect(page.getByText('WEB-RECETTE', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Télécharger diplome.pdf', exact: true })).toBeVisible();
    await page.getByLabel('Suivi du dossier', { exact: true }).selectOption('EN_ANALYSE');
    await page.getByLabel('Motif du suivi', { exact: true }).fill('Vérification des documents');
    await page.getByRole('button', { name: 'Relire le changement', exact: true }).click();
    expect(fixture.commands).toHaveLength(0);
    await page.getByRole('button', { name: 'Confirmer le suivi', exact: true }).click();
    expect(fixture.commands[0]).toMatchObject({ id: applicationId, version: 1, status: 'EN_ANALYSE' });
    await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
    await page.getByLabel('Motif du suivi', { exact: true }).fill('Autre contrôle conservé'); fixture.fail();
    await page.getByRole('button', { name: 'Relire le changement', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmer le suivi', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Version concurrente' })).toBeVisible();
    await expect(page.getByLabel('Motif du suivi', { exact: true })).toHaveValue('Autre contrôle conservé');
    await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/demandes-en-ligne.png`, fullPage: true });
  });
}
test('Les API de gestion du site refusent un appel sans session', async ({ request }) => {
  expect((await request.get('/api/website-management?kind=articles')).status()).toBe(401);
  expect((await request.get('/api/website-management?kind=admissions')).status()).toBe(401);
  expect((await request.post('/api/website-management', { data: { action: 'article-save', id: ACCOUNT_IDS[0] } })).status()).toBe(401);
  expect((await request.post('/api/website/public/candidature/etape1', { headers: { Origin: 'https://origine-inconnue.example' }, data: { nom: 'Ne doit pas être envoyé' } })).status()).toBe(403);
  expect((await request.get('/api/website/public/candidature/jeton-invalide/brouillon')).status()).toBe(400);
});

const website = process.env.ESCEN_TEST_WEBSITE_URL;
for (const width of [390, 1440]) {
  test(`Site : inscription complète en quatre étapes et article publié à ${width}px`, async ({ page }) => {
    test.skip(!website, 'Lancer la copie du site et fournir ESCEN_TEST_WEBSITE_URL.');
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(() => localStorage.setItem('candidature_prep_seen', '1'));
    const submitted: { action: string; body: string | null }[] = [];
    const token = 'a'.repeat(64);
    await page.route('**/api/website/**', async route => {
      const url = new URL(route.request().url()); const action = url.pathname.split('/api/website/')[1];
      if (action === 'public/niveau/liste') return route.fulfill({ json: [{ id: intakeId, nom: 'Licence 1', libelle: 'Licence 1' }] });
      if (action === 'public/filieres/liste') return route.fulfill({ json: [{ id: articleId, nom: 'Informatique' }] });
      if (action.endsWith('/document-requirements')) return route.fulfill({ json: [{ document_key: 'diplome_file', nom_affichage: 'Dernier diplôme', is_obligatoire: true, is_multiple: false, accepted_formats: 'all' }] });
      if (action === 'public/candidature-config') return route.fulfill({ json: { academic_year: {id:yearId,name:'2026-2027'}, types_diplome: [], champs: [{ champ_key: 'tuteur_tel', label: 'Téléphone du tuteur', obligatoire: true }], moyens_connaissance: [], sigle: 'ESCEN' } });
      if (action === 'public/configurations') return route.fulfill({ json: [] });
      if (action.startsWith('public/blogs')) {
        const article = { id: articleId, slug: 'publication-plateforme', title: 'Publication envoyée depuis la plateforme', excerpt: 'Cette actualité provient de la plateforme.', content: '<p>Contenu public de la publication.</p>', image: '/valeurs/bg.jpg', author: 'ESCEN', date: '2026-10-15', readTime: '1 min', tags: [], comments: [], is_event: false, featured: false };
        return route.fulfill({ json: action === 'public/blogs' ? [article] : article });
      }
      submitted.push({ action, body: route.request().postData() });
      if (action === 'public/candidature/etape1') return route.fulfill({ status: 201, json: { id: applicationId, draft_token: token, reference: 'WEB-INSCRIPTION-RECETTE' } });
      if (action.endsWith('etape4-finaliser')) return route.fulfill({ json: { reference: 'WEB-INSCRIPTION-RECETTE', status: 'RECU' } });
      return route.fulfill({ json: { id: applicationId } });
    });
    await page.route('https://api.country.is/**', route => route.fulfill({ json: { country: 'TG' } }));
    await page.goto(`${website}/inscription/`);
    await page.getByPlaceholder('Nom de famille', { exact: true }).fill('Candidate');
    await page.getByPlaceholder('Prénom(s)', { exact: true }).fill('Alice');
    await page.locator('form select').first().selectOption({ label: 'Féminin' });
    // Choose nationality explicitly; geolocation is optional and asynchronous.
    await page.locator('.nat-btn').click();
    await page.locator('.nat-option').filter({ hasText: 'Togolaise' }).click();
    await page.locator('input[type="date"]').fill('2000-01-01');
    await page.getByPlaceholder('Ville, Pays', { exact: true }).fill('Lomé, Togo');
    await page.locator('input[type="email"]').first().fill('alice@example.test');
    await page.locator('input[type="tel"]').first().fill('90000000');
    await page.getByRole('button', { name: 'Continuer', exact: false }).click();
    await expect(page.getByPlaceholder('Intitulé de votre dernier diplôme')).toBeVisible();
    await page.getByPlaceholder('Intitulé de votre dernier diplôme').fill('Baccalauréat déclaré');
    await page.getByRole('button', { name: 'Continuer', exact: false }).click();
    await page.locator('form select').first().selectOption(intakeId);
    await page.locator('form select').nth(1).selectOption(articleId);
    await page.locator('input[type="file"]').setInputFiles({ name: 'diplome.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nDocument de recette') });
    await page.getByRole('button', { name: 'Continuer', exact: false }).click();
    await page.getByPlaceholder('Nom', { exact: true }).fill('Parent');
    await page.getByPlaceholder('Prénom', { exact: true }).fill('Marie');
    await page.locator('input[type="tel"]').fill('91000000');
    await page.locator('#accept_cgu').check();
    await page.getByRole('button', { name: /Soumettre|Envoyer/ }).click();
    expect(submitted.some(item => item.action.endsWith('etape4-finaliser'))).toBe(false);
    await page.getByRole('button', { name: 'Oui, soumettre', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('WEB-INSCRIPTION-RECETTE');
    expect(submitted.map(item => item.action.split('/').at(-1))).toEqual(['etape1', 'etape2-bac', 'etape3-documents', 'etape4-finaliser']);
    expect(submitted[2].body).toContain('diplome.pdf');
    expect(JSON.parse(submitted[0].body!)).toMatchObject({academic_year_id:yearId});
    expect(submitted[2].body).toContain(yearId);
    expect(await page.evaluate(() => localStorage.getItem('candidature_draft_token'))).toBeNull();
    await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/inscription-site-envoyee.png`, fullPage: true });
    await page.goto(`${website}/blogs/`);
    await expect(page.getByRole('heading', { name: 'Publication envoyée depuis la plateforme', exact: true })).toBeVisible();
    await page.getByRole('link', { name: /Lire/ }).first().click();
    await expect(page.getByText('Contenu public de la publication.', { exact: true })).toBeVisible();
  });
}

test('Copie : lecture réelle des articles avec l’origine CORS autorisée', async ({ page }) => {
  test.skip(!website, 'Lancer la copie du site et le portail local.');
  const responsePromise = page.waitForResponse(response => response.url() === 'http://127.0.0.1:3000/api/website/public/blogs');
  await page.goto(`${website}/blogs/`);
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.headers()['access-control-allow-origin']).toBe(new URL(website!).origin);
  expect(Array.isArray(await response.json())).toBe(true);
});
