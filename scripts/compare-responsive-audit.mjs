import { readFileSync, writeFileSync, statSync } from 'node:fs';

const widths = [360, 390, 768, 1024, 1440];
const directory = 'tmp/screenshots/responsive-audit';
const stages = Object.fromEntries(['before', 'after'].map(stage => [stage,
  JSON.parse(readFileSync(`${directory}/${stage}/results.json`, 'utf8')),
]));
const key = row => `${row.key}:${row.width}`;
const maps = Object.fromEntries(Object.entries(stages).map(([stage, results]) => {
  const map = new Map(results.map(row => [key(row), row]));
  if (map.size !== results.length) throw new Error(`Capture en double : ${stage}`);
  for (const row of results) {
    if (!widths.includes(row.width)) throw new Error(`Largeur inattendue : ${key(row)}`);
    if (row.status !== (row.issues.length ? 'PROBLÈME' : 'OK')) throw new Error(`État incohérent : ${key(row)}`);
    for (const screenshot of [row.screenshot, row.bottomScreenshot].filter(Boolean)) {
      const file = statSync(screenshot);
      if (!file.isFile() || !file.size) throw new Error(`Image absente ou vide : ${screenshot}`);
    }
  }
  return [stage, map];
}));
if (maps.before.size !== maps.after.size || [...maps.before.keys()].some(value => !maps.after.has(value))) {
  throw new Error('Les périmètres avant et après diffèrent.');
}
const screens = [...new Map(stages.before.map(row => [row.key, row])).values()];
for (const screen of screens) for (const width of widths) {
  if (!maps.before.has(`${screen.key}:${width}`)) throw new Error(`Largeur absente : ${screen.key}:${width}`);
}
const problems = stage => stages[stage].filter(row => row.issues.length).length;
const fixed = stages.before.filter(row => row.issues.length && !maps.after.get(key(row)).issues.length);
const regressions = stages.after.filter(row => row.issues.length && !maps.before.get(key(row)).issues.length);
const remaining = stages.after.filter(row => row.issues.length);
const countImages = stage => stages[stage].reduce((count, row) => count + 1 + Number(Boolean(row.bottomScreenshot)), 0);
const lines = [
  '# Responsive ESCEN — comparaison avant/après (4C)', '',
  `Date : ${new Date().toISOString().slice(0, 10)}. Même périmètre : ${screens.length} écrans et variantes × ${widths.length} largeurs, soit ${maps.after.size} contrôles par passage.`, '',
  `Problèmes : **${problems('before')} avant → ${problems('after')} après**. ${fixed.length} cas corrigés, ${regressions.length} régression(s) détectée(s).`, '',
  `${countImages('before')} images avant et ${countImages('after')} images après (haut et, si nécessaire, bas de page), dont l’existence et la taille ont été vérifiées.`, '',
  'Données de test isolées, Chrome headless, hauteur 900 px et animations réduites. Les limites du relevé sont détaillées dans les rapports avant et après ; les modales et le site public externe sont hors de cette matrice.', '',
  '## Résultat par largeur', '',
  '| Largeur | Avant : problèmes | Après : problèmes |', '|---|---|---|',
  ...widths.map(width => `| ${width}px | ${stages.before.filter(row => row.width === width && row.issues.length).length} | ${stages.after.filter(row => row.width === width && row.issues.length).length} |`), '',
  '## Tableau complet — avant → après', '',
  '| Écran | 360 | 390 | 768 | 1024 | 1440 |', '|---|---|---|---|---|---|',
  ...screens.map(screen => `| ${screen.name} | ${widths.map(width => {
    const id = `${screen.key}:${width}`;
    return `${maps.before.get(id).status} → ${maps.after.get(id).status}`;
  }).join(' | ')} |`), '',
  '## Corrections constatées', '',
  '- Boutons longs : retour à la ligne rétabli sur mobile pour les articles et les formations ouvertes aux candidatures.',
  '- Tableaux larges : défilement contenu dans la carte ou le conteneur du tableau ; les libellés accessibles restent dans cette région.',
  '- Menu du compte : masquage conservé sans `!important`, vérifié au clavier sur mobile et ordinateur.',
  '- Déjà présents avant 4B : un seul `:root`, une seule définition de `--sidebar-width`, seuils 480/768/1024, tableaux en fiches et calendrier en liste à 768px. Les cinq classes Tailwind signalées étaient absentes du code actuel.', '',
  '## Validation', '',
  '- 4B : `npx tsc --noEmit --incremental false`, `npm run lint`, `npx playwright test --config tests/ui/responsive-corrections.config.ts` : 0 erreur TypeScript, 0 erreur ESLint (7 avertissements préexistants), 12 tests réussis.',
  '- 4C : `npx playwright test --config tests/ui/responsive-after.config.ts` : 5 tests réussis, 355 visites, aucun problème de lecture, de rendu ou de responsive ; toutes les routes et largeurs sont obligatoires.',
  '- 4C : `npx tsc --noEmit --incremental false` et `npm run lint` : 0 erreur TypeScript, 0 erreur ESLint (7 avertissements préexistants).',
  '- Génération : `node scripts/report-responsive-audit.mjs after`, puis `node scripts/compare-responsive-audit.mjs` ; vérification du périmètre identique et des images.', '',
  'Rapports : [avant](RESPONSIVE_AVANT_2026-10-19.md), [après](RESPONSIVE_APRES_2026-10-19.md). Index visuel comparatif : `tmp/screenshots/responsive-audit/comparison.html`.', '',
];
if (remaining.length) lines.push('## Problèmes restants', '', ...remaining.map(row => `- ${row.name} à ${row.width}px : ${row.issues.join(' ; ')}`), '');
const report = 'docs/RESPONSIVE_AVANT_APRES_2026-10-19.md';
writeFileSync(report, lines.join('\n'));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const cell = (screen, width) => {
  const id = `${screen.key}:${width}`;
  return `<td>${['before', 'after'].map(stage => {
    const row = maps[stage].get(id);
    const href = `${stage}/${width}/${escape(row.key)}`;
    return `<a href="${href}.png" title="${escape(row.issues.join(' ; '))}">${stage === 'before' ? 'Avant' : 'Après'} : ${escape(row.status)}</a>${row.bottomScreenshot ? ` <a href="${href}-bottom.png">(bas)</a>` : ''}`;
  }).join('<br>')}</td>`;
};
writeFileSync(`${directory}/comparison.html`, `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Responsive avant/après</title><style>body{font:16px system-ui;margin:24px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px}a{color:#075985}</style><h1>Responsive : ${problems('before')} → ${problems('after')} problèmes</h1><table><thead><tr><th>Écran</th>${widths.map(width => `<th>${width}px</th>`).join('')}</tr></thead><tbody>${screens.map(screen => `<tr><th>${escape(screen.name)}</th>${widths.map(width => cell(screen, width)).join('')}</tr>`).join('')}</tbody></table></html>`);
console.log(JSON.stringify({ report, before: problems('before'), after: problems('after'), fixed: fixed.length, regressions: regressions.length, imagesBefore: countImages('before'), imagesAfter: countImages('after') }));
if (remaining.length) process.exitCode = 1;
