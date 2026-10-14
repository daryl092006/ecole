import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

export const quoteSql = value => "'" + String(value).replaceAll("'","''") + "'";
export function remoteQuery(sql) {
  const directory = resolve('.tmp/remote-sql');
  mkdirSync(directory,{ recursive:true,mode:0o700 });
  const filename = `${directory}/${randomUUID()}.sql`;
  writeFileSync(filename,sql,{ mode:0o600 });
  const result = spawnSync('npx',['--yes','supabase','db','query','--linked','--file',filename,'--output','json'],{ encoding:'utf8',maxBuffer:8_000_000,timeout:120000 });
  if (result.status !== 0) throw new Error('Requête Supabase refusée ; détails conservés dans le fichier SQL privé, aucune donnée affichée.');
  let response;
  try { response = JSON.parse(result.stdout.slice(result.stdout.indexOf('{'))); }
  catch { throw new Error('Réponse SQL inattendue ; aucune donnée affichée.'); }
  if (!Array.isArray(response.rows)) throw new Error('Résultat SQL non confirmé.');
  return response.rows;
}
