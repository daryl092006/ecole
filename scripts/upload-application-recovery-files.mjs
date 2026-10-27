import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const { values }=parseArgs({options:{plan:{type:'string'},source:{type:'string'},report:{type:'string'},upload:{type:'boolean',default:false}}});
assert.ok(values.plan && values.source && values.report,'--plan, --source, --report requis');
const plan=JSON.parse(await readFile(values.plan,'utf8'));
assert.equal(plan.version,1);
assert.equal(plan.documents.length,125);
const hash=data=>createHash('sha256').update(data).digest('hex');
const report={verified:0,uploaded:0,reused:0,remoteWrites:0};
let client;
if(values.upload){
  process.loadEnvFile('.env.local');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.equal(new URL(url).hostname,'zmxapemyktxhppdxenzb.supabase.co','Projet inattendu');
  client=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const bucket=await client.storage.getBucket('escen-online-applications');
  assert.ok(!bucket.error && bucket.data?.public===false,'Stockage privé existant requis');
}
for(const doc of plan.documents){
  assert.equal(doc.bucket,'escen-online-applications');
  assert.match(doc.object_path,new RegExp(`^recovery/${plan.sourceSha256}/[a-f0-9-]+$`));
  const mapping=plan.mappings.find(x=>x.target_table==='application_documents' && x.target_id===doc.id);
  const source=plan.sources.find(x=>x.id===mapping?.row_id && x.source_table==='documents');
  const file=plan.files.find(x=>x.source_id===source?.source_id);
  assert.ok(file,'Preuve source du fichier absente');
  const bytes=execFileSync('python3',['-c','import sys,zipfile;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]))',values.source,file.archive_path],{maxBuffer:5242881});
  assert.equal(bytes.length,doc.byte_size);assert.equal(hash(bytes),doc.sha256);
  report.verified++;
  if(!client)continue;
  const uploaded=await client.storage.from(doc.bucket).upload(doc.object_path,bytes,{contentType:doc.mime_type,upsert:false});
  if(uploaded.error){
    assert.ok(['409','Duplicate','ResourceAlreadyExists'].includes(String(uploaded.error.statusCode)) || uploaded.error.message==='The resource already exists','Transfert refusé ; aucune donnée affichée');
    report.reused++;
  }else{report.uploaded++;report.remoteWrites++;}
  const downloaded=await client.storage.from(doc.bucket).download(doc.object_path);
  assert.ok(!downloaded.error && downloaded.data,'Lecture de contrôle du fichier refusée');
  const actual=Buffer.from(await downloaded.data.arrayBuffer());
  assert.equal(hash(actual),doc.sha256,'Empreinte distante différente');
}
await writeFile(values.report,JSON.stringify({...report,completedAt:new Date().toISOString()},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(report));
