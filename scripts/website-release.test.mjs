import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { websiteOrigins, prepareWebsiteRelease } from './website-release.mjs';

test('Une publication exige les origines publiques explicites et refuse les adresses locales', () => {
  assert.throws(() => websiteOrigins({ ESCEN_WEBSITE_MODE: 'production' }), /explicitement/);
  for (const origin of ['http://portail.example.org', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://user:password@portail.example.org', 'https://portail.example.org/api', 'https://portail.example.org/?key=value']) {
    assert.throws(() => websiteOrigins({ ESCEN_WEBSITE_MODE: 'production', ESCEN_PORTAL_URL: origin, ESCEN_PUBLIC_SITE_URL: 'https://escen.university' }));
  }
  assert.deepEqual(websiteOrigins({}), { production: false, portal: 'http://127.0.0.1:3000', site: 'http://localhost:3200' });
});

test('La régénération conserve les titres des composants, reste idempotente et change les origines ensemble', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'escen-website-release-'));
  for (const directory of ['app/pages/formations/master-professionnel', 'app/components', 'public', '.github/workflows']) await mkdir(path.join(root, directory), { recursive: true });
  await writeFile(path.join(root, 'app/components/Slider.vue'), '<template><Transition><div>Accueil\r\n  </div>\r\n</Transition></template>');
  for (const name of ['AboutUS.vue', 'Temoignage.vue']) await writeFile(path.join(root, 'app/components', name), '<template><img src="/image.jpg"></template>');
  await writeFile(path.join(root, 'app/pages/formations/master-professionnel/finance-digitale.vue'), '<template><Breadcrumb title="Master Professionnel en Finance Digitale" /></template>');
  await writeFile(path.join(root, 'nuxt.config.ts'), "export default { site: { url: 'https://www.escen.university' }, colorMode: {} };");
  await writeFile(path.join(root, '.github/workflows/deploy.yml'), '      - name: Déployer vers le cPanel\n        with:\n          local-dir: ./.output/public/\n');
  await prepareWebsiteRelease(root, websiteOrigins({}));
  const first = await readFile(path.join(root, 'app/generated/website-seo.json'), 'utf8');
  assert.equal(JSON.parse(first).pages['/formations/master-professionnel/finance-digitale'], 'Master Professionnel en Finance Digitale');
  await prepareWebsiteRelease(root, websiteOrigins({}));
  assert.equal(await readFile(path.join(root, 'app/generated/website-seo.json'), 'utf8'), first);
  const production = websiteOrigins({ ESCEN_WEBSITE_MODE: 'production', ESCEN_PORTAL_URL: 'https://portail.example.org', ESCEN_PUBLIC_SITE_URL: 'https://escen.university' });
  await prepareWebsiteRelease(root, production);
  const nuxt = await readFile(path.join(root, 'nuxt.config.ts'), 'utf8');
  assert.ok(nuxt.includes('https://escen.university'));
  assert.ok(!nuxt.includes('http://localhost:3200'));
  const workflow = await readFile(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  assert.equal(workflow.split('Vérifier l’interconnexion').length, 2);
  assert.ok(workflow.includes('local-dir: ./dist/'));
  assert.ok(!(await readFile(path.join(root, 'app/components/Slider.vue'), 'utf8')).includes('<WebsiteActions inline />'));
  const apache = await readFile(path.join(root, 'public/.htaccess'), 'utf8');
  assert.ok(!apache.includes(' /index.html'));
});
