import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { remoteQuery } from './supabase-cli.mjs';

process.loadEnvFile('.env.local');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const anonymous = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const records = remoteQuery('select kind,bucket,object_path,byte_size,sha256,storage_manifest from escen_private.archive_objects order by kind,object_path;');
if (records.filter(row => row.kind === 'BACKUP').length !== 4 || records.filter(row => row.kind !== 'BACKUP').length !== 139) throw new Error('Inventaire distant incomplet.');
const download = async (bucket, path) => {
  const response = await client.storage.from(bucket).download(path);
  if (response.error) throw new Error('Objet distant indisponible.');
  return Buffer.from(await response.data.arrayBuffer());
};
let verified = 0;
for (const record of records) {
  const denied = await anonymous.storage.from(record.bucket).download(record.object_path);
  if (!denied.error) throw new Error('Un objet privé est accessible sans authentification.');
  const hash = createHash('sha256');
  let size = 0;
  if (record.storage_manifest) {
    const content = await download(record.bucket, record.object_path);
    const manifest = JSON.parse(content.toString('utf8'));
    if (JSON.stringify(manifest) !== JSON.stringify(record.storage_manifest)) {
      // PostgreSQL JSONB réordonne les clés : comparer les valeurs utiles.
      if (manifest.sha256 !== record.sha256 || manifest.bytes !== Number(record.byte_size)
        || JSON.stringify(manifest.parts) !== JSON.stringify(record.storage_manifest.parts)) {
        // Les clés des éléments JSONB sont également réordonnées.
        if (manifest.sha256 !== record.sha256 || manifest.bytes !== Number(record.byte_size)
          || manifest.parts.length !== record.storage_manifest.parts.length
          || manifest.parts.some((part, index) => ['path','bytes','sha256'].some(key => part[key] !== record.storage_manifest.parts[index][key]))) throw new Error('Manifeste distant différent.');
      }
    }
    for (const part of manifest.parts) {
      const data = await download(record.bucket, part.path);
      if (data.length !== part.bytes || createHash('sha256').update(data).digest('hex') !== part.sha256) throw new Error('Partie de sauvegarde altérée.');
      hash.update(data); size += data.length;
    }
  } else {
    const data = await download(record.bucket, record.object_path);
    hash.update(data); size = data.length;
  }
  if (size !== Number(record.byte_size) || hash.digest('hex') !== record.sha256) throw new Error('Empreinte de restauration incorrecte.');
  verified += 1;
  if (verified % 10 === 0 || verified === records.length) console.log(`Objets restaurables vérifiés : ${verified}/${records.length}`);
}
const report = { verified, backups: 4, historicalFiles: 139, sha256Verified: true, anonymousAccessDenied: true, checkedAt: new Date().toISOString() };
await writeFile('.tmp/legacy-database/storage-verification.json', JSON.stringify(report,null,2)+'\n', { mode: 0o600 });
console.log(JSON.stringify(report));
