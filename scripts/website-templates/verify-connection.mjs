import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

// Run from the website root after generate, before uploading anything.
const settings = JSON.parse(await readFile('escen-connection.json', 'utf8'));
const local = process.argv.includes('--local');
if (!local && !settings.production) throw new Error('Déploiement refusé : site préparé pour le local. Régénérer avec ESCEN_WEBSITE_MODE=production et les deux origines HTTPS.');
for (const key of ['portal', 'site']) {
  const url = new URL(settings[key]);
  if (!local && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error(`Origine ${key} impropre à la production.`);
}
for (const file of ['index.html', 'brochures/index.html', 'inscription/index.html', 'connexion/index.html', 'sitemap.xml', 'robots.txt', '.htaccess', '404.html']) await stat(path.join('dist', file));
const articleRoutes = JSON.parse(await readFile('app/generated/public-article-routes.json', 'utf8'));
for (const route of articleRoutes) {
  const html = await readFile(path.join('dist', route.slice(1), 'index.html'), 'utf8');
  if (!html.split('</head>')[0].includes('BlogPosting')) throw new Error(`Article sans métadonnées éditoriales dans le HTML : ${route}`);
}
const client = await readFile('config.ts', 'utf8');
if (!client.includes(`${settings.portal}/api/website`)) throw new Error('Configuration API différente du portail attendu.');
const login = await readFile('dist/connexion/index.html', 'utf8');
if (!login.includes(`${settings.portal}/connexion`)) throw new Error('Le build ne pointe pas vers le portail attendu.');
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
if (!sitemap.includes(settings.site) || /<loc>[^<]*\/(docs|candidat)(\/|<)/.test(sitemap)) throw new Error('Sitemap incohérent ou routes privées présentes.');
let checked = 0;
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await visit(file); continue; }
    if (!/\.(html|js)$/.test(file)) continue;
    const source = await readFile(file, 'utf8');
    if (!local && /https?:\/\/(?:127\.0\.0\.1|localhost):(?:3000|3200)(?:\/|["'])/.test(source)) throw new Error(`Adresse locale dans le build : ${file}`);
    if (/https?:\/\/escen\.neostart\.tech\/api/.test(source)) throw new Error(`Ancienne API dans le build : ${file}`);
    checked++;
  }
}
await visit('dist');
console.log(`Interconnexion vérifiée : ${checked} fichiers ; site ${settings.site} ; portail ${settings.portal}.`);
