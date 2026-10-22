import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

export function websiteOrigins(environment = process.env) {
  if (environment.ESCEN_WEBSITE_MODE && !['local', 'production'].includes(environment.ESCEN_WEBSITE_MODE)) throw new Error('ESCEN_WEBSITE_MODE doit être local ou production.');
  const production = environment.ESCEN_WEBSITE_MODE === 'production';
  const parse = (value, label) => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error(`${label} doit être une origine HTTP(S).`);
    if (production && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error(`${label} doit être une origine HTTPS publique en production.`);
    return url.origin;
  };
  if (production && (!environment.ESCEN_PORTAL_URL || !environment.ESCEN_PUBLIC_SITE_URL)) throw new Error('Production : définir ESCEN_PORTAL_URL et ESCEN_PUBLIC_SITE_URL explicitement.');
  return { production, portal: parse(environment.ESCEN_PORTAL_URL || 'http://127.0.0.1:3000', 'ESCEN_PORTAL_URL'), site: parse(environment.ESCEN_PUBLIC_SITE_URL || 'http://localhost:3200', 'ESCEN_PUBLIC_SITE_URL') };
}

export async function prepareWebsiteRelease(root, origins) {
  const pages = {};
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { await visit(file); continue; }
      if (!entry.name.endsWith('.vue') || file.includes('[')) continue;
      const relative = path.relative(path.join(root, 'app/pages'), file).replaceAll(path.sep, '/');
      if (/^(docs|candidat)\//.test(relative)) continue;
      const route = '/' + relative.replace(/(?:^|\/)index\.vue$/, '').replace(/\.vue$/, '').replace(/\/$/, '');
      const source = await readFile(file, 'utf8');
      const h1 = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
        || source.match(/<Breadcrumb\b[^>]*?\btitle="([^"]+)"/i)?.[1];
      const title = h1?.replace(/<[^>]*>/g, ' ').replace(/\{\{[\s\S]*?\}\}/g, '').replace(/\s+/g, ' ').trim();
      if (title) pages[route || '/'] = title;
      // Existing decorative assets, referenced under obsolete filenames.
      let corrected = source;
      for (const [missing, existing] of Object.entries({ 'finance-digitale.jpg': 'financedigital.jpg', 'management-projets.jpg': 'managementprojet.jpg', 'marketing-digital.jpg': 'marketingDigital.jpg', 'ia-genie-logiciel.jpg': 'intelligenceartificielle.jpg' })) {
        corrected = corrected.replaceAll(`/formations/${missing}`, `/formations/${existing}`);
      }
      if (corrected !== source) await writeFile(file, corrected);
    }
  }
  await visit(path.join(root, 'app/pages'));
  await mkdir(path.join(root, 'app/generated'), { recursive: true });
  await writeFile(path.join(root, 'app/generated/website-seo.json'), JSON.stringify({ origin: origins.site, pages }, null, 2) + '\n');
  await writeFile(path.join(root, 'app/app.vue'), await readFile(new URL('./website-templates/app.vue', import.meta.url), 'utf8'));
  await writeFile(path.join(root, 'app/components/WebsiteActions.vue'), await readFile(new URL('./website-templates/WebsiteActions.vue', import.meta.url), 'utf8'));
  const sliderFile = path.join(root, 'app/components/Slider.vue');
  let slider = await readFile(sliderFile, 'utf8');
  if (!slider.includes('<WebsiteActions inline')) {
    slider = slider.replace(/(\r?\n)([ \t]*)<\/div>\r?\n([ \t]*)<\/Transition>/, '$1$2  <WebsiteActions inline />$1$2</div>$1$3</Transition>');
    await writeFile(sliderFile, slider);
  }
  for (const name of ['AboutUS.vue', 'Temoignage.vue']) {
    const file = path.join(root, 'app/components', name);
    let source = await readFile(file, 'utf8');
    source = source.replace(/<img\b(?![^>]*\bloading=)/g, '<img loading="lazy" decoding="async"');
    await writeFile(file, source);
  }
  await mkdir(path.join(root, 'app/middleware'), { recursive: true });
  await writeFile(path.join(root, 'app/middleware/portal.global.ts'), `// Candidate authentication belongs to the connected portal.\nexport default defineNuxtRouteMiddleware(to => {\n  if (to.path === '/candidat' || to.path.startsWith('/candidat/')) return navigateTo('/connexion', { redirectCode: 301 });\n});\n`);
  let nuxt = await readFile(path.join(root, 'nuxt.config.ts'), 'utf8');
  nuxt = nuxt.replace(/url: 'https:\/\/www\.escen\.university'/, `url: ${JSON.stringify(origins.site)}`);
  nuxt = nuxt.replace(/url: "http:\/\/localhost:3200"|url: "https?:\/\/[^\"]+"/, `url: ${JSON.stringify(origins.site)}`);
  if (!nuxt.includes('ESCEN connected sitemap')) nuxt = nuxt.replace('  colorMode:', `  // ESCEN connected sitemap: public information only.\n  sitemap: { exclude: ['/docs/**', '/candidat/**', '/connexion', '/inscription', '/preparation-inscription/**', '/verif/**'] },\n\n  colorMode:`);
  await writeFile(path.join(root, 'nuxt.config.ts'), nuxt);
  await writeFile(path.join(root, 'public/robots.txt'), `User-agent: *\nDisallow: /candidat/\nDisallow: /docs/\nSitemap: ${origins.site}/sitemap.xml\n`);
  // Serve generated pages and preserve real 404s instead of returning the home page.
  await writeFile(path.join(root, 'public/.htaccess'), await readFile(new URL('./website-templates/htaccess.txt', import.meta.url), 'utf8'));
  await mkdir(path.join(root, 'scripts'), { recursive: true });
  await writeFile(path.join(root, 'scripts/verify-connection.mjs'), await readFile(new URL('./website-templates/verify-connection.mjs', import.meta.url), 'utf8'));
  const deploymentFile = path.join(root, '.github/workflows/deploy.yml');
  let deployment = await readFile(deploymentFile, 'utf8');
  deployment = deployment.replace('local-dir: ./.output/public/', 'local-dir: ./dist/');
  if (!deployment.includes('Vérifier l’interconnexion')) deployment = deployment.replace('      - name: Déployer vers', '      - name: Vérifier l’interconnexion avant publication\n        run: node scripts/verify-connection.mjs\n\n      - name: Déployer vers');
  await writeFile(deploymentFile, deployment);
  await writeFile(path.join(root, 'escen-connection.json'), JSON.stringify(origins, null, 2) + '\n');
}
