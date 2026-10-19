import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const stage = process.argv[2] || 'before';
if (!['before', 'after'].includes(stage)) throw new Error('Utiliser before ou after.');
const widths = [360, 390, 768, 1024, 1440];
const directory = `tmp/screenshots/responsive-audit/${stage}`;
const results = widths.flatMap(width => JSON.parse(readFileSync(`${directory}/audit-${width}.json`, 'utf8')));
const screens = [...new Map(results.map(row => [row.key, row])).values()];
function pageRoutes(directory = 'src/app', segments = []) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) return pageRoutes(`${directory}/${entry.name}`, entry.name.startsWith('(') ? segments : [...segments, entry.name]);
    return entry.name === 'page.tsx' ? ['/' + segments.join('/')] : [];
  });
}
const sourceRoutes = pageRoutes();
const visitedRoutes = screens.map(screen => screen.href.split('?')[0]);
for (const route of sourceRoutes) {
  const pattern = new RegExp('^' + route.replace(/\[[^\]]+\]/g, '[^/]+') + '$');
  if (!visitedRoutes.some(path => pattern.test(path))) throw new Error(`Page non couverte : ${route}`);
}
for (const screen of screens) for (const width of widths) {
  if (!results.some(row => row.key === screen.key && row.width === width)) throw new Error(`Capture absente : ${screen.key} à ${width}px`);
}
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const css = readFileSync('src/app/globals.css', 'utf8');
const cssBreakpoints = [...new Set([...css.matchAll(/@media\s*\(max-width:\s*(\d+)px\)/g)].map(match => Number(match[1])))].sort((a, b) => a - b);
const lines = [
  `# Audit responsive ESCEN — ${stage === 'before' ? 'avant corrections (4A)' : 'après corrections (4C)'}`,
  '', `Date : ${new Date().toISOString().slice(0, 10)}. ${sourceRoutes.length} routes source couvertes, ${screens.length} écrans et variantes, ${results.length} captures principales.`,
  '', 'Build local optimisé, Chrome headless, hauteur 900 px, animations réduites. Une capture du haut de chaque écran et une capture complémentaire en bas lorsqu’il défile. Ce format conserve le défilement interne du portail. Données isolées et comptes authentifiés simulés ; aucun accès distant, aucune mutation.',
  '', 'Les captures reflètent l’arbre de travail actuel, y compris les modifications préexistantes à cette sous-étape.',
  '', 'Le périmètre couvre les routes du dépôt, les vues personnelles avec un compte étudiant et les collections du référentiel. Le site public distinct de cette application ne fait pas partie de ce dépôt. Les écrans modaux ne sont pas couverts par cette matrice des routes.',
  '', '« OK » signifie : pas de débordement détecté, aucun contrôle hors largeur, pas de texte masqué détecté, tableaux et calendrier adaptés au seuil mobile, aucun échec de lecture ou de rendu. Les régions avec défilement horizontal volontaire sont relevées séparément. Ce relevé ne remplace pas une recette d’accessibilité complète.',
  '', '| Écran | Route | 360 | 390 | 768 | 1024 | 1440 |', '|---|---|---|---|---|---|---|',
];
for (const screen of screens) lines.push(`| ${screen.name} | \`${screen.href}\` | ${widths.map(width => results.find(row => row.key === screen.key && row.width === width).status).join(' | ')} |`);
lines.push('', '## Problèmes constatés', '');
for (const result of results.filter(row => row.issues.length)) lines.push(`- **${result.name} — ${result.width}px** : ${result.issues.join(' ; ')}`);
if (!results.some(row => row.issues.length)) lines.push('Aucun problème détecté par les contrôles automatisés.');
lines.push('', '## Vérification des constats CSS dans le code actuel', '',
  `- Définitions de \`:root\` dans globals.css : ${(css.match(/:root\s*\{/g) || []).length}.`,
  `- Définitions de \`--sidebar-width\` : ${(css.match(/--sidebar-width\s*:/g) || []).length}.`,
  `- Seuils max-width de globals.css : ${cssBreakpoints.join(', ')} px.`,
  '- La transformation des tableaux en fiches et la liste du calendrier mobile sont contrôlées dans les pages où ces composants sont présents.',
);
lines.push('', '## Défilements horizontaux internes', '');
for (const result of results.filter(row => row.scrollRegions.length)) lines.push(`- ${result.name} — ${result.width}px : ${result.scrollRegions.join(' ; ')}`);
lines.push('', 'Captures et index visuel : `tmp/screenshots/responsive-audit/' + stage + '/index.html`.', '');
mkdirSync('docs', { recursive: true });
const report = `docs/RESPONSIVE_${stage === 'before' ? 'AVANT' : 'APRES'}_2026-10-19.md`;
writeFileSync(report, lines.join('\n'));
writeFileSync(`${directory}/results.json`, JSON.stringify(results, null, 2));
writeFileSync(`${directory}/index.html`, `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Audit responsive ${stage}</title><style>body{font:16px system-ui;margin:24px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px}a{color:#075985}.issue{background:#fff0e6}</style><h1>Audit responsive ${escape(stage)}</h1><table><thead><tr><th>Écran</th>${widths.map(width => `<th>${width}px</th>`).join('')}</tr></thead><tbody>${screens.map(screen => `<tr><th>${escape(screen.name)}</th>${widths.map(width => { const row = results.find(row => row.key === screen.key && row.width === width); return `<td class="${row.issues.length ? 'issue' : ''}"><a href="${width}/${escape(row.key)}.png" title="${escape(row.issues.join(' ; '))}">${escape(row.status)}</a>${row.bottomScreenshot ? `<br><a href="${width}/${escape(row.key)}-bottom.png">Bas de page</a>` : ''} </td>`; }).join('')}</tr>`).join('')}</tbody></table></html>`);
console.log(JSON.stringify({ report: resolve(report), screens: screens.length, captures: results.length, problems: results.filter(row => row.issues.length).length }));
