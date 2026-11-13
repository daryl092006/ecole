import { expect, test, type Page } from '@playwright/test';
import type { localBusinessFixture as LocalFixture } from './local-business-fixture.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { isRouteAllowed } from '../../src/permissions/navigation';
import { ROLES } from '../../src/types/permissions';

const website = process.env.ESCEN_TEST_WEBSITE_URL || 'http://127.0.0.1:3200';
const publicOrigin = 'https://escen.university';
async function localBusinessFixture() {
  const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<{ localBusinessFixture: typeof LocalFixture }>;
  return (await nativeImport(pathToFileURL(resolve('tests/ui/local-business-fixture.mjs')).href)).localBusinessFixture();
}
async function ready(page: Page) {
  await page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt') as Element & { __vue_app__?: { config: { globalProperties: { $nuxt?: { isHydrating: boolean } } } } };
    return root?.__vue_app__?.config.globalProperties.$nuxt?.isHydrating === false;
  });
}

test('Prospects : validation, origine, authentification, droits, année et pagination par les vraies API', async () => {
  const f = await localBusinessFixture();
  try {
    const data = { request_id: crypto.randomUUID(), full_name: 'Visiteur de recette', email: 'contact@example.test', phone: '+228 90 00 00 00' };
    const post = (body: unknown, origin = publicOrigin) => f.dispatch(new Request(`${publicOrigin}/api/website/public/brochure-requests`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }));
    const get = (headers: Record<string, string> = {}, query = '') => f.dispatch(new Request(`${publicOrigin}/api/website-prospects${query}`, { headers }));
    expect((await post(data, 'https://untrusted.example')).status).toBe(403);
    expect((await post({ ...data, email: 'bad' })).status).toBe(400);
    expect((await post({ ...data, phone: 'not a phone' })).status).toBe(400);
    expect((await post({ ...data, formation: 'unexpected' })).status).toBe(400);
    expect((await post(data)).status).toBe(201);
    expect((await post(data)).status).toBe(201);
    expect(await f.value('select count(*)::int as value from escen.website_prospects')).toBe(1);
    expect((await get()).status).toBe(401);
    const auth = { Authorization: 'Bearer fixture-auth-token', 'x-escen-role': 'IT' };
    const response = await get(auth);
    expect(response.status).toBe(200);
    expect((await response.json()).prospects).toHaveLength(1);
    expect((await get({ ...auth, 'x-escen-year': f.nextYear.id })).status).toBe(200);
    expect((await (await get({ ...auth, 'x-escen-year': f.nextYear.id })).json()).prospects).toHaveLength(0);
    expect((await get(auth, '?beforeId=bad')).status).toBe(400);
    expect((await get({ ...auth, 'x-escen-role': 'MKT' })).status).toBe(200);
    const raf = await f.value("select id as value from escen.roles where code='RAF'");
    await f.insert('role_grants', { account_id: f.account.id, role_id: raf, granted_by: f.account.id, valid_from: '2020-01-01', reason: 'Vérifier le refus de lecture des prospects' });
    expect((await get({ ...auth, 'x-escen-role': 'RAF' })).status).toBe(403);
    expect((await f.dispatch(new Request(`${publicOrigin}/api/website/public/prospects`))).status).toBe(404);
    for (const role of [ROLES.DG, ROLES.DGA, ROLES.CC, ROLES.MKT, ROLES.IT]) expect(isRouteAllowed('/site-web/prospects', role)).toBe(true);
    for (const role of [ROLES.STUD, ROLES.ENS, ROLES.SITE, ROLES.LOG]) expect(isRouteAllowed('/site-web/prospects', role)).toBe(false);
  } finally { await f.close(); }
});

for (const width of [390, 1440]) test(`Formulaire brochure puis prospects persistés à ${width}px`, async ({ page, context }) => {
  const f = await localBusinessFixture();
  try {
    await page.setViewportSize({ width, height: 950 });
    let writes = 0;
    let fail = true;
    const requestIds: string[] = [];
    await context.route('**/api/website/**', async route => {
      const request = route.request();
      if (request.url().endsWith('/public/brochure-requests')) {
        writes++;
        const body = request.postDataJSON();
        expect(Object.keys(body).sort()).toEqual(['email', 'full_name', 'phone', 'request_id']);
        requestIds.push(body.request_id);
        // Simulate a lost response after the database committed, then retry.
        const saved = await f.dispatch(new Request(`${publicOrigin}/api/website/public/brochure-requests`, {
          method: 'POST', headers: { Origin: publicOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        }));
        if (fail) return route.fulfill({ status: 503, json: { error: 'Réponse perdue.' } });
        return route.fulfill({ status: saved.status, json: await saved.json() });
      }
      return route.fulfill({ json: request.url().endsWith('/public/brochures') ? [{ id: 'master-mde', title: 'Master Marketing Digital',
        slug: 'master-marketing', cycle: 'MASTER', program_code: 'MDE', filename: 'master.pdf', byte_size: 1000 }] : [] });
    });
    await page.goto(`${website}/formations/master-professionnel`);
    await ready(page);
    await page.getByRole('button', { name: 'Télécharger la brochure', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Recevoir une brochure', exact: true })).toBeVisible();
    await expect(dialog.getByRole('textbox')).toHaveCount(3);
    await expect(dialog.getByRole('link', { name: 'Télécharger la brochure', exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Accéder à la brochure', exact: true }).click();
    expect(writes).toBe(0);
    await dialog.getByLabel('Nom complet', { exact: true }).fill('Contact Brochure');
    await dialog.getByLabel('Adresse email', { exact: true }).fill('CONTACT@example.test');
    await dialog.getByLabel('Téléphone', { exact: true }).fill('+228 90 00 00 00');
    await dialog.getByRole('button', { name: 'Accéder à la brochure', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Réessayez');
    await expect(dialog.getByLabel('Nom complet', { exact: true })).toHaveValue('Contact Brochure');
    await expect(dialog.getByRole('link', { name: 'Télécharger la brochure', exact: true })).toHaveCount(0);
    fail = false;
    await dialog.getByRole('button', { name: 'Accéder à la brochure', exact: true }).click();
    await expect(dialog.getByRole('link', { name: 'Télécharger la brochure', exact: true })).toHaveAttribute('href', /master-marketing\/download$/);
    expect(requestIds[0]).toBe(requestIds[1]);
    expect(await f.value('select count(*)::int as value from escen.website_prospects')).toBe(1);
    const portalPage = await context.newPage();
    await portalPage.setViewportSize({ width, height: 950 });
    await authenticateFixture(portalPage);
    await portalPage.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: {
      currentYearId: f.year.id, selectedYearId: f.year.id, selection: 'current', years: [{ ...f.year, name: 'Année de recette' }],
    } } }));
    await portalPage.route('**/api/website-prospects*', async route => {
      const response = await f.dispatch(new Request(route.request().url(), { headers: await route.request().allHeaders() }));
      return route.fulfill({ status: response.status, json: await response.json() });
    });
    await portalPage.goto('/site-web/prospects');
    await expect(portalPage.getByRole('heading', { name: 'Prospects', exact: true })).toBeVisible();
    await expect(portalPage.getByRole('table')).toContainText('Contact Brochure');
    await expect(portalPage.getByRole('link', { name: 'contact@example.test', exact: true })).toHaveAttribute('href', 'mailto:contact@example.test');
    await portalPage.reload();
    await expect(portalPage.getByRole('table')).toContainText('Contact Brochure');
    expect(await portalPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await f.close(); }
});
