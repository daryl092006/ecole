import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { AUTH_EMAIL_TEMPLATES, renderAuthEmail } from '../supabase/functions/_shared/auth-email-templates.mjs';
export { AUTH_EMAIL_TEMPLATES, renderAuthEmail };

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const directory = fileURLToPath(new URL('../supabase/templates/auth/', import.meta.url));
  await mkdir(directory, { recursive: true });
  for (const template of AUTH_EMAIL_TEMPLATES) await writeFile(`${directory}/${template.type}.html`, renderAuthEmail(template));
  console.log(`${AUTH_EMAIL_TEMPLATES.length} modèles email ESCEN générés dans supabase/templates/auth/. Aucun email envoyé.`);
}
