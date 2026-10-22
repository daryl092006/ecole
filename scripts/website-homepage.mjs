import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function prepareWebsiteHomepage(root) {
  await writeFile(path.join(root, 'app/pages/index.vue'), await readFile(new URL('./website-templates/home.vue', import.meta.url), 'utf8'));
}
