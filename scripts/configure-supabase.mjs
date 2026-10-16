import { spawnSync } from 'node:child_process';
import { readFile, writeFile, chmod } from 'node:fs/promises';

const reference = 'zmxapemyktxhppdxenzb';
const windows = process.platform === 'win32';
const result = spawnSync(windows ? 'cmd.exe' : 'npx', windows
  ? ['/d', '/s', '/c', `supabase projects api-keys --project-ref ${reference} --output json`]
  : ['--yes', 'supabase', 'projects', 'api-keys', '--project-ref', reference, '--output', 'json'], { encoding: 'utf8', maxBuffer: 2_000_000 });
if (result.status !== 0) {
  console.error('Impossible de récupérer les clés du projet connecté. Aucune clé affichée.');
  process.exit(1);
}
let keys;
try { keys = JSON.parse(result.stdout.slice(result.stdout.indexOf('['))); }
catch { console.error('Réponse CLI inattendue ; aucune clé affichée.'); process.exit(1); }
const browser = keys.find(key => key.name === 'anon') || keys.find(key => key.type === 'publishable');
const server = keys.find(key => key.name === 'service_role') || keys.find(key => key.type === 'secret');
if (!browser?.api_key || !server?.api_key) throw new Error('Clés publique/serveur non trouvées.');
let env = '';
try { env = await readFile('.env.local','utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const values = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${reference}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: browser.api_key,
  SUPABASE_SERVICE_ROLE_KEY: server.api_key,
};
for (const [key,value] of Object.entries(values)) {
  const line = `${key}=${value}`;
  const pattern = new RegExp('^' + key + '=.*$','m');
  env = pattern.test(env) ? env.replace(pattern,() => line) : env.replace(/\n?$/, '\n') + line + '\n';
}
await writeFile('.env.local',env,{ mode:0o600 });
await chmod('.env.local',0o600);
console.log('Connexion configurée dans .env.local : URL et clés présentes. Aucun secret affiché.');
