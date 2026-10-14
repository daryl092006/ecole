import { readFile, readdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { quoteSql, remoteQuery } from './supabase-cli.mjs';

process.loadEnvFile('.env.local');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{ auth:{ persistSession:false,autoRefreshToken:false } });
const directory = join(process.env.HOME,'Downloads','Sauvegardes-ESCEN');
const manifest = JSON.parse(await readFile('.tmp/legacy-database/manifest.json','utf8'));
const batch = remoteQuery(`select id from escen_private.import_batches where archive_sha256=${quoteSql(manifest.archive_sha256)};`)[0]?.id;
if (!batch) throw new Error('Conservation des sources en base non confirmée.');
for (const bucket of ['escen-backups','escen-legacy-files']) {
  const existing = await client.storage.getBucket(bucket);
  if (existing.error) {
    const created = await client.storage.createBucket(bucket,{ public:false,fileSizeLimit:40_000_000 });
    if (created.error) throw new Error('Création du stockage privé refusée.');
  } else if (existing.data.public) throw new Error('Le stockage doit être privé avant tout transfert.');
}
let backups = 0; let files = 0; let bytes = 0;
const existingObjects = new Map(remoteQuery('select bucket,object_path,sha256,byte_size from escen_private.archive_objects;').map(item => [`${item.bucket}/${item.object_path}`,item]));
let registrations = [];
const register = () => {
  if (!registrations.length) return;
  remoteQuery(`insert into escen_private.archive_objects(batch_id,source_name,kind,bucket,object_path,byte_size,sha256,storage_manifest)
    select ${quoteSql(batch)}::uuid,r.source_name,r.kind,r.bucket,r.object_path,r.byte_size,r.sha256,r.storage_manifest
    from jsonb_to_recordset(${quoteSql(JSON.stringify(registrations))}::jsonb)
    as r(source_name text,kind text,bucket text,object_path text,byte_size bigint,sha256 text,storage_manifest jsonb);
    select 1 as confirmed;`);
  registrations = [];
};
const save = async (bucket,path,sourceName,kind,content,mime) => {
  const digest = createHash('sha256').update(content).digest('hex');
  const chunked = content.length > 8 * 1024 * 1024;
  const objectPath = chunked ? path + '.manifest.json' : path;
  const existing = existingObjects.get(`${bucket}/${objectPath}`);
  if (existing) {
    if (existing.sha256 !== digest || Number(existing.byte_size) !== content.length) throw new Error('Empreinte différente pour un objet existant : aucun remplacement.');
    return;
  }
  const put = async (name,data,type) => {
    const upload = await client.storage.from(bucket).upload(name,data,{ contentType:type,upsert:false });
    if (upload.error) {
      const previous = await client.storage.from(bucket).download(name);
      if (previous.error || createHash('sha256').update(Buffer.from(await previous.data.arrayBuffer())).digest('hex') !== createHash('sha256').update(data).digest('hex')) {
        throw new Error('Transfert Storage non confirmé ; aucun objet existant remplacé.');
      }
    }
  };
  let storageManifest = null;
  if (chunked) {
    const parts = [];
    for (let offset = 0,index = 0; offset < content.length; offset += 8 * 1024 * 1024,index++) {
      const data = content.subarray(offset,Math.min(content.length,offset + 8 * 1024 * 1024));
      const name = `${path}.parts/${String(index).padStart(4,'0')}`;
      await put(name,data,'application/octet-stream');
      parts.push({ path:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex') });
    }
    storageManifest = { original_name:sourceName,bytes:content.length,sha256:digest,parts };
    await put(objectPath,Buffer.from(JSON.stringify(storageManifest)),'application/json');
  } else await put(path,content,mime);
  registrations.push({ source_name:sourceName,kind,bucket,object_path:objectPath,byte_size:content.length,sha256:digest,storage_manifest:storageManifest });
  if (registrations.length >= 15) register();
  bytes += content.length;
};
for (const filename of (await readdir(directory)).filter(name => /\.(zip|sql)$/.test(name)).sort()) {
  const content = await readFile(join(directory,filename));
  const digest = createHash('sha256').update(content).digest('hex');
  await save('escen-backups',`${digest}/${filename}`,filename,'BACKUP',content,filename.endsWith('.zip') ? 'application/zip' : 'application/sql');
  backups += 1; console.log(`Sauvegardes privées conservées : ${backups}/4`);
}
const zip = join(directory,manifest.source_name);
const list = spawnSync('python3',['-c',"import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps([f.filename for f in z.infolist() if f.filename.startswith('storage/') and not f.is_dir()]))",zip],{ encoding:'utf8' });
if (list.status !== 0) throw new Error('Inventaire ZIP non confirmé.');
const entries = JSON.parse(list.stdout);
for (const name of entries) {
  const extracted = spawnSync('python3',['-c','import zipfile,sys; sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]))',zip,name],{ encoding:null,maxBuffer:20_000_000 });
  if (extracted.status !== 0) throw new Error('Lecture du fichier source impossible.');
  const mime = name.endsWith('.pdf') ? 'application/pdf' : name.endsWith('.png') ? 'image/png' : 'image/jpeg';
  await save('escen-legacy-files',`${manifest.sql_sha256}/${name}`,name,name.startsWith('storage/configuration/') ? 'CONFIGURATION' : 'DOCUMENT',extracted.stdout,mime);
  files += 1;
  if (files % 10 === 0 || files === entries.length) console.log(`Fichiers historiques privés conservés : ${files}/${entries.length}`);
}
register();
const report = { project:'zmxapemyktxhppdxenzb',backups,files,uploadedBytes:bytes,privateBuckets:true };
await writeFile('.tmp/legacy-database/storage-report.json',JSON.stringify(report,null,2)+'\n',{ mode:0o600 });
console.log(JSON.stringify(report));
