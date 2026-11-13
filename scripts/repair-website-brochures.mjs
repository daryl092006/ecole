import { readFile, writeFile, realpath, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { protectBrochureSelection, protectBrochureListing } from './website-brochure-selection.mjs';

const root = await realpath(new URL('..', import.meta.url));
const expected = path.resolve(root, '../escen-website');
if (await realpath(expected) !== expected) throw new Error('La copie du site doit être un dossier réel.');
const changes = [];
for (const [relative, transform] of [
  ['app/components/BrochureModal.vue', protectBrochureSelection],
  ...['licence-professionnelle', 'master-professionnel', 'executive-education'].map(cycle => [`app/pages/formations/${cycle}/index.vue`, protectBrochureListing]),
]) {
  const target = path.join(expected, relative);
  if (await realpath(target) !== target) throw new Error('La cible ne doit pas être un lien symbolique.');
  const before = await readFile(target, 'utf8');
  const after = transform(before);
  if (before !== after) changes.push({ relative, target, after });
}
if (!changes.length) console.log('La sélection des brochures utilise déjà les références exactes.');
else {
  const apply = process.argv.includes('--apply');
  const preview = apply ? null : await mkdtemp(path.join(os.tmpdir(), 'escen-brochures-preview-'));
  for (const [index, change] of changes.entries()) {
    const destination = apply ? change.target : path.join(preview, `${index}-${path.basename(change.target)}`);
    await writeFile(destination, change.after);
    console.log(`${apply ? 'Corrigé' : 'Aperçu'} : ${apply ? change.relative : destination}`);
  }
}
