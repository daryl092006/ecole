import { readFile, writeFile, realpath, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { protectRegistrationDocuments } from './website-registration-resilience.mjs';

const root = await realpath(new URL('..', import.meta.url));
const expected = path.resolve(root, '../escen-website');
if (await realpath(expected) !== expected) throw new Error('La copie du site doit être un dossier réel.');
const target = path.join(expected, 'app/pages/inscription/index.vue');
if (await realpath(target) !== target) throw new Error('Le formulaire ne doit pas être un lien symbolique.');
const before = await readFile(target, 'utf8');
const after = protectRegistrationDocuments(before);
if (before === after) {
  console.log('Le formulaire possède déjà la protection des pièces.');
} else if (process.argv.includes('--apply')) {
  await writeFile(target, after);
  console.log('Protection appliquée uniquement au formulaire de la copie locale.');
} else {
  const preview = await mkdtemp(path.join(os.tmpdir(), 'escen-registration-preview-'));
  await writeFile(path.join(preview, 'index.vue'), after);
  console.log(`Aperçu du formulaire corrigé : ${preview}/index.vue`);
  console.log('Pour appliquer uniquement ce correctif : node scripts/repair-website-registration.mjs --apply');
}
