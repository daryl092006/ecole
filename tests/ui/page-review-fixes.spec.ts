import { expect, test, type Page } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';
import { fixtureCapabilities } from './persistent-fixture';
import { loadSecurityApi, securityContext, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';

const programId = uuid(8000);
const programs = [
  { id: programId, name: 'Finance Digitale', code: 'FIN', active: true, description: 'Champ non nécessaire au formulaire' },
  { id: uuid(8001), name: 'Inactive', active: false },
  { id: uuid(8002), name: 'Archivée', active: true, archived_at: '2026-10-01' },
];
const marketing = () => securityContext(ROLES.MKT, { roleCode: 'MKT', teacherId: null, grants: [{ role_code: 'MKT', role_name: ROLES.MKT, site_id: null, group_id: null, academic_year_id: null }] });

test('Filières des brochures : le marketing lit les seules références sans accéder aux admissions', async () => {
  const calls: string[] = [];
  const client = { async rpc(name: string) { calls.push(name); return { data: { revision: 1, tables: { programs, online_applications: [{ identity: 'privée' }] } }, error: null }; } };
  const api = loadSecurityApi('app/api/website-management/route.ts', client, marketing());
  const get = api.GET as (request: Request) => Promise<Response>;
  const response = await get(new Request('http://local.test/api/website-management?kind=brochure-programs'));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ programs: [{ id: programId, name: 'Finance Digitale', code: 'FIN' }] });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect((await get(new Request('http://local.test/api/website-management?kind=admissions'))).status).toBe(403);
  expect(calls).toEqual(['escen_backend_snapshot']);
});

test('Filières des brochures : consultation seule, périmètre restreint et panne sont refusés', async () => {
  const context = marketing();
  for (const denied of [
    { ...context, permissions: ['communication.view'] },
    { ...context, grants: [{ ...context.grants[0], group_id: uuid(10) }] },
  ]) {
    const api = loadSecurityApi('app/api/website-management/route.ts', { rpc() { throw new Error('Aucune lecture autorisée.'); } }, denied as ReturnType<typeof marketing>);
    const get = api.GET as (request: Request) => Promise<Response>;
    expect((await get(new Request('http://local.test/api/website-management?kind=brochure-programs'))).status).toBe(403);
  }
  const api = loadSecurityApi('app/api/website-management/route.ts', { async rpc() { return { data: null, error: { code: '503' } }; } }, context);
  const get = api.GET as (request: Request) => Promise<Response>;
  expect((await get(new Request('http://local.test/api/website-management?kind=brochure-programs'))).status).toBe(503);
});

test('Filières des brochures : aucune lecture sans session', async ({ request }) => {
  expect((await request.get('/api/website-management?kind=brochure-programs')).status()).toBe(401);
});

async function mountMarketing(page: Page) {
  await installResponsiveAudit(page, 'staff');
  await page.route('**/api/session', route => route.fulfill({ json: { capabilities: fixtureCapabilities, accountId: marketing().accountId, name: 'Communication ESCEN', role: ROLES.MKT, availableRoles: [ROLES.MKT], studentId: null, teacherId: null, mustChangePassword: false } }));
  let fail = true;
  const requests: string[] = [];
  const api = loadSecurityApi('app/api/website-management/route.ts', { async rpc() { return { data: { revision: 1, tables: { programs } }, error: fail ? { code: '503' } : null }; } }, marketing());
  await page.route('**/api/website-management*', async route => {
    requests.push(new URL(route.request().url()).searchParams.get('kind') || '');
    const get = api.GET as (request: Request) => Promise<Response>;
    const response = await get(new Request(route.request().url()));
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  return { requests, allowReferences: () => { fail = false; } };
}

for (const width of [390, 1440]) {
  test(`Paramètres : les maquettes et les jurys s’ouvrent à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await installResponsiveAudit(page, 'staff');
    await page.goto('/academique/parametres');
    await page.getByRole('link', { name: 'Consulter les maquettes de cours' }).click();
    await expect(page).toHaveURL(/\/academique\/filieres$/);
    await expect(page.getByRole('heading', { name: 'Programmes de cours et matières', exact: true })).toBeVisible();
    await page.goto('/academique/parametres');
    await page.getByRole('link', { name: 'Consulter les jurys enregistrés' }).click();
    await expect(page).toHaveURL(/\/academique\/deliberations$/);
    await expect(page.getByRole('heading', { name: 'Délibérations et relevés', exact: true })).toBeVisible();
  });

  test(`Contrat et versement : le choix du dossier annonce la bonne action à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await installResponsiveAudit(page, 'staff');
    for (const [href, action] of [['/finance/contrats', 'gérer le contrat'], ['/finance/versements', 'encaisser']]) {
      await page.goto(href);
      await page.getByRole('button', { name: `Choisir le dossier pour ${action}`, exact: true }).click();
      await expect(page.getByRole('dialog', { name: `Choisir le dossier pour ${action}`, exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test(`Frais personnels : l’aide reste adaptée à l’étudiant à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await installResponsiveAudit(page, 'student');
    await page.goto('/mon-espace/scolarite');
    await expect(page.locator('.availability-details')).toContainText('votre inscription');
    await expect(page.locator('main')).not.toContainText('Pour encaisser');
    await expect(page.locator('main')).toContainText('contactez la scolarité ou le service financier');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`Brochure marketing : erreur visible, reprise sans perte de saisie et filière sélectionnable à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const fixture = await mountMarketing(page);
    await page.goto('/site-web/brochures');
    await page.getByRole('button', { name: 'Ajouter une brochure', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Ajouter une brochure', exact: true });
    await dialog.getByLabel('Titre', { exact: true }).fill('Brochure Finance');
    await expect(dialog.getByRole('alert')).toContainText('filières des brochures');
    await expect(dialog.getByRole('button', { name: 'Vérifier la brochure', exact: true })).toBeDisabled();
    fixture.allowReferences();
    await dialog.getByRole('button', { name: 'Réessayer les filières', exact: true }).click();
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await expect(dialog.getByLabel('Titre', { exact: true })).toHaveValue('Brochure Finance');
    await dialog.getByLabel('Filière associée (facultatif)').selectOption(programId);
    await expect(dialog.getByRole('button', { name: 'Vérifier la brochure', exact: true })).toBeEnabled();
    expect(fixture.requests).toEqual(['brochure-programs', 'brochure-programs']);
    await page.screenshot({ path: `tmp/screenshots/page-review-fixes/${width}/brochure-marketing.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
