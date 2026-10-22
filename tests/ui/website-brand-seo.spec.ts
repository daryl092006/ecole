import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const site = process.env.ESCEN_TEST_WEBSITE_URL || 'http://localhost:3200';
const metadataFile = path.resolve('../escen-website/app/generated/website-seo.json');
const articlesFile = path.resolve('../escen-website/app/generated/public-article-routes.json');

test('Toutes les pages statiques ont des métadonnées propres et des entités cohérentes dans le HTML initial', async ({ request }) => {
  const seo = JSON.parse(await readFile(metadataFile, 'utf8'));
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const [route, details] of Object.entries(seo.details) as [string, { type: string }][]) {
    if (route === '/preparation-inscription') continue; // Existing alias redirects to /inscription.
    const response = await request.get(site + route);
    expect(response.ok(), route).toBe(true);
    const html = await response.text();
    const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/)?.[1] || '';
    const title = head.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const description = head.match(/<meta name="description" content="([^"]*)"/i)?.[1] || '';
    expect(title.length, route).toBeGreaterThan(10);
    expect(description.length, route).toBeGreaterThan(40);
    expect(titles.has(title), `Titre unique pour ${route}`).toBe(false);
    expect(descriptions.has(description), `Description unique pour ${route}`).toBe(false);
    titles.add(title); descriptions.add(description);
    expect(head).toContain(`rel="canonical" href="${site}${route}"`);
    if (route === '/brochures') expect(html.includes('/api/website/public/brochures/master-finance-digitale/download'), 'PDF présent sans JavaScript').toBe(true);
    const graphs = [...head.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    const entities = graphs.flatMap(graph => graph['@graph'] || [graph]);
    const school = entities.find(entity => entity['@type'] === 'EducationalOrganization');
    expect(school.logo.url, route).toBe(site + '/logo-escen.png');
    expect(school.address.addressCountry).toBe('TG');
    expect(school.telephone).toBe('+22898012727');
    if (details.type === 'course') {
      expect(entities.some(entity => entity['@type'] === 'Course'), route).toBe(true);
      expect(entities.some(entity => entity['@type'] === 'BreadcrumbList'), route).toBe(true);
    }
    if (route === '/formations') expect(entities.find(entity => entity['@type'] === 'ItemList').itemListElement).toHaveLength(9);
  }
});

test('Les articles publiés ont un vrai HTML, un titre, un seul H1, un schéma éditorial et figurent au sitemap', async ({ request }) => {
  const routes: string[] = JSON.parse(await readFile(articlesFile, 'utf8'));
  const sitemap = await (await request.get(site + '/sitemap.xml')).text();
  for (const route of routes) {
    const response = await request.get(site + route);
    expect(response.ok(), route).toBe(true);
    const html = await response.text();
    const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/)?.[1] || '';
    expect(head.includes('BlogPosting'), route).toBe(true);
    expect(head).not.toContain('Article indisponible');
    expect(head).toContain('content="index, follow"');
    expect((html.match(/<h1\b/g) || []).length, route).toBe(1);
    expect(sitemap).toContain(site + route);
  }
});

for (const width of [390, 1440]) {
  for (const route of ['/', '/inscription/', '/connexion/', '/formations/master-professionnel/finance-digitale/']) {
    test(`Logo officiel et lisible sur ${route} à ${width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 950 });
      await page.addInitScript(() => localStorage.setItem('candidature_prep_seen', '1'));
      await page.goto(site + route);
      const logo = page.locator('img.website-logo').filter({ visible: true }).first();
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute('src', '/logo-escen.png');
      const dimensions = await logo.evaluate(element => {
        const image = element as HTMLImageElement;
        const box = image.getBoundingClientRect();
        return { natural: image.naturalWidth / image.naturalHeight, displayed: box.width / box.height, width: box.width };
      });
      expect(dimensions.width).toBeGreaterThanOrEqual(150);
      expect(Math.abs(dimensions.natural - dimensions.displayed)).toBeLessThan(0.02);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (route === '/inscription/' && width === 390) {
        const labels = await page.locator('.step-label').evaluateAll(elements => elements.map(element => { const box = element.getBoundingClientRect(); return { left: box.left, right: box.right }; }));
        for (let index = 1; index < labels.length; index++) expect(labels[index].left - labels[index - 1].right).toBeGreaterThanOrEqual(4);
      }
      const response = await request.get(site + '/logo-escen.png');
      const expected = await readFile('public/logo-escen.png');
      expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(createHash('sha256').update(expected).digest('hex'));
      await page.screenshot({ path: `tmp/screenshots/website-review/${width}/logo-${route === '/' ? 'accueil' : route.split('/')[1]}.png` });
    });
  }
}

test('Le formulaire distingue le chargement d’une campagne fermée', async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.addInitScript(() => localStorage.setItem('candidature_prep_seen', '1'));
  await page.route('**/api/website/public/candidature-config', async route => {
    await waiting;
    await route.fulfill({ json: { academic_year: null, champs: [], types_diplome: [], moyens_connaissance: [] } });
  });
  await page.goto(site + '/inscription/');
  await expect(page.getByText('Chargement de la campagne de candidature…', { exact: true })).toBeVisible();
  await expect(page.getByText('Aucune année d’inscription n’est ouverte actuellement.', { exact: true })).toHaveCount(0);
  release();
  await expect(page.getByText('Aucune année d’inscription n’est ouverte actuellement.', { exact: true })).toBeVisible();
});
