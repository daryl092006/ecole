import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { protectDocumentUploadStore } from './website-adapter.mjs';

const project = await realpath(new URL('..', import.meta.url));
const site = path.resolve(project, '../escen-website');
if (await realpath(site) !== site) throw new Error('La copie du site ne doit pas être un lien symbolique.');
const storePath = path.join(site, 'app/stores/candidature.ts');
if (await realpath(storePath) !== storePath) throw new Error('Le store ne doit pas être un lien symbolique.');
const store = protectDocumentUploadStore(await readFile(storePath, 'utf8'));
const helper = await readFile(new URL('./website-templates/website-document-upload.ts', import.meta.url), 'utf8');
const destination = process.argv.includes('--apply') ? site : path.join(project, 'tmp/website-document-upload-preview');
await mkdir(path.join(destination, 'app/stores'), { recursive: true });
await mkdir(path.join(destination, 'app/utils'), { recursive: true });
await writeFile(path.join(destination, 'app/utils/website-document-upload.ts'), helper);
await writeFile(path.join(destination, 'app/stores/candidature.ts'), store);
console.log(`Envoi des pièces par blocs préparé dans ${destination} (store et utilitaire uniquement).`);
