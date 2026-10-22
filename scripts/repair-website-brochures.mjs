import { readFile, writeFile, realpath, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { protectBrochureSelection } from './website-brochure-selection.mjs';

const root = await realpath(new URL('..', import.meta.url));
const expected = path.resolve(root, '../escen-website');
if (await realpath(expected) !== expected) throw new Error('La copie du site doit être un dossier réel.');
const target = path.join(expected, 'app/components/BrochureModal.vue');
if (await realpath(target) !== target) throw new Error('Le composant ne doit pas être un lien symbolique.');
const before = await readFile(target, 'utf8');
const after = protectBrochureSelection(before);
if (before === after) console.log('La sélection des brochures utilise déjà les références exactes.');
else if (process.argv.includes('--apply')) {
  await writeFile(target, after);
  console.log('Association exacte appliquée uniquement aux brochures de la copie locale.');
} else {
  const preview = await mkdtemp(path.join(os.tmpdir(), 'escen-brochures-preview-'));
  await writeFile(path.join(preview, 'BrochureModal.vue'), after);
  console.log(`Aperçu : ${preview}/BrochureModal.vue`);
}
