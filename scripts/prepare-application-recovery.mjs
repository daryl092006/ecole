import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { createDatabase, applyMigrations } from './database-engine.mjs';

// Offline only: the state is an explicitly captured, private remote read.
// No credentials, storage upload or remote apply option in this preparer.
const { values } = parseArgs({ options: Object.fromEntries(['source','state','out'].map(key => [key,{ type:'string' }])) });
for (const key of ['source','state','out']) assert.ok(values[key], `--${key} requis`);
const source = JSON.parse(execFileSync('python3', ['-c', `
import importlib.util,pathlib,json,sys,zipfile,hashlib
s=importlib.util.spec_from_file_location('reader','scripts/prepare-legacy-data.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
t,d=m.read_source(pathlib.Path(sys.argv[1]))
tables={n:[m.redact(r) for r in t[n]['rows']] for n in ['candidatures','documents','tuteurs','annee_scolaires']}
files=[]
with zipfile.ZipFile(sys.argv[1]) as z:
 names=set(z.namelist())
 for row in tables['documents']:
  if row['owner_type']!='App\\\\Models\\\\Candidature': continue
  path='storage/'+row['file_path'].removeprefix('storage/').removeprefix('/')
  if path not in names: continue
  content=z.read(path)
  mime='application/pdf' if content.startswith(b'%PDF-') else 'image/jpeg' if content.startswith(b'\\xff\\xd8\\xff') else 'image/png' if content.startswith(b'\\x89PNG\\r\\n\\x1a\\n') else None
  if not mime or not 1<=len(content)<=5242880: raise Exception('Pièce incompatible : vérifier le format sans altérer la source')
  files.append({'source_id':str(row['id']),'archive_path':path,'filename':path.split('/')[-1],'mime_type':mime,'byte_size':len(content),'sha256':hashlib.sha256(content).hexdigest()})
print(json.dumps({'sql_sha256':d,'tables':tables,'files':files}))
`, resolve(values.source)], { encoding:'utf8',maxBuffer:8_000_000 }));
const state = JSON.parse(await readFile(values.state,'utf8'));
const t = state.tables;
const hash = value => createHash('sha256').update(value).digest('hex');
const stable = key => {
  const h = hash(`${source.sql_sha256}:APPLICATIONS_2026_V1:${key}`);
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
};
const quote = value => `'${String(value).replaceAll("'","''")}'`;
const json = value => `${quote(JSON.stringify(value))}::jsonb`;
const current = grant => Date.parse(grant.valid_from)<=Date.now() && (!grant.valid_until || Date.parse(grant.valid_until)>Date.now());
const role = t.roles.find(row => row.code==='IT' && row.active);
const grants = t.role_grants.filter(row => row.role_id===role.id && current(row) && !row.site_id && !row.group_id && !row.academic_year_id);
const actors = t.accounts.filter(row => row.active && !row.archived_at && row.auth_user_id && grants.some(g => g.account_id===row.id));
assert.equal(actors.length,1,'Auteur IT global unique requis');
const actor = actors[0]; const grant = grants.find(row => row.account_id===actor.id);
const year = t.academic_years.find(row => row.name==='2026-2027' && row.status==='OUVERTE' && !row.archived_at);
assert.ok(year,'Année cible absente');
const batch = state.batches.find(row => row.sql_sha256===source.sql_sha256);
assert.ok(batch,'Lot du 26 octobre déjà enregistré requis');
const resolveSource = (table,id,target) => {
  const ids = [...new Set(state.mappings.filter(m => m.source_table===table && m.source_id===String(id) && m.target_table===target).map(m => m.target_id))];
  assert.ok(ids.length<=1,'Référence ambiguë'); return ids[0] || null;
};
const sources=[]; const mappings=[]; const issues=[]; const intakes=[]; const applications=[]; const documents=[];
const evidence = (table,row) => {
  const existing = state.source_rows?.find(x => x.source_table===table && x.source_id===String(row.id));
  if (existing) { assert.deepEqual(existing.payload,row,'Preuve source différente'); return existing.id; }
  const id=stable(`source:${table}:${row.id}`);
  if (!sources.some(x => x.id===id)) sources.push({ id,batch_id:batch.id,source_table:table,source_id:String(row.id),payload:row,status:'PENDING' });
  return id;
};
const stamp = value => {
  if (!value) return null;
  const normalized = value.replace(' ','T');
  const result = new Date(/[Z+]|-\d\d:\d\d$/.test(normalized.slice(10)) ? normalized : `${normalized}Z`);
  assert.ok(Number.isFinite(result.getTime()),'Date source invalide'); return result.toISOString();
};
const pick = (row,keys) => Object.fromEntries(keys.filter(key => row[key]!=null && row[key]!=='').map(key => [key,String(row[key])]));
for (const row of source.tables.candidatures) {
  const sourceId=evidence('candidatures',row); const id=stable(`application:${row.id}`);
  assert.ok(!t.online_applications.some(x => x.id===id || x.legacy_source_row_id===sourceId),'Candidature déjà reprise');
  const emailMatches=t.online_applications.filter(x => x.identity.email?.trim().toLowerCase()===row.email?.trim().toLowerCase());
  // Email alone is not proof of identity: never merge different names silently.
  assert.ok(!emailMatches.some(x => x.identity.nom?.trim().toLowerCase()===row.nom?.trim().toLowerCase() && x.identity.prenom?.trim().toLowerCase()===row.prenom?.trim().toLowerCase()),'Rapprochement explicite du dossier existant requis');
  if (emailMatches.length) issues.push({row_id:sourceId,code:'APPLICATION_EMAIL_OVERLAP',details:{existing_application_ids:emailMatches.map(x => x.id),automatic_merge:false}});
  const level= row.niveau_id ? resolveSource('niveaux',row.niveau_id,'levels') : null;
  const program= row.filiere_id ? resolveSource('filieres',row.filiere_id,'programs') : null;
  if (row.niveau_id) assert.ok(level,'Niveau non résolu');
  let intake=null;
  if (level && program) {
    const matches=[...t.website_intakes,...intakes].filter(x => x.academic_year_id===year.id && x.level_id===level && x.program_id===program);
    assert.ok(matches.length<=1,'Campagne ambiguë'); intake=matches[0];
    if (!intake) {
      intake={id:stable(`intake:${level}:${program}`),academic_year_id:year.id,level_id:level,program_id:program,
        label:`${t.levels.find(x => x.id===level).name} · ${t.programs.find(x => x.id===program).name}`,
        active:false,required_documents:t.website_level_document_rules.find(x => x.academic_year_id===year.id && x.level_id===level)?.required_documents || [],
        reason:'Reprise des candidatures 2026-2027 ; campagne conservée fermée'};
      intakes.push(intake);
    }
  }
  if (row.filiere_id && !program) issues.push({row_id:sourceId,code:'APPLICATION_PROGRAM_MISSING',details:{source_program_id:row.filiere_id,source_level_id:row.niveau_id,assigned_program:null}});
  const relatedDocs=source.tables.documents.filter(x => x.owner_type==='App\\Models\\Candidature' && String(x.owner_id)===String(row.id));
  const guardians=source.tables.tuteurs.filter(x => x.owner_type==='App\\Models\\Candidature' && String(x.owner_id)===String(row.id));
  for (const guardian of guardians) evidence('tuteurs',guardian);
  const student=row.etudiant_id ? resolveSource('etudiants',row.etudiant_id,'students') : null;
  if (row.etudiant_id) assert.ok(student && t.students.some(x => x.id===student),'Étudiant source non résolu');
  applications.push({id,reference:`LEGACY-2026-2027-${row.id}`,academic_year_id:year.id,intake_id:intake?.id || null,
    identity:pick(row,['nom','prenom','nom_jeune_fille','genre','date_naissance','lieu_naissance','nationalite','pays_residence','adresse','email','tel','tel2','tel3']),
    diploma:pick(row,['dernier_diplome','annee_bac','serie','mention_bac','etablissement_diplome','numero_table']),
    guardians:guardians.map(x => pick(x,['nom','prenom','email','tel','profession','employeur','adresse','responsable_des_frais'])),
    status:!row.soumis_le ? 'BROUILLON' : row.admission==='1' ? 'CLASSE' : 'RECU',created_at:stamp(row.created_at),submitted_at:stamp(row.soumis_le),
    reason:'Reprise de la sauvegarde du 26 octobre ; année cible 2026-2027 demandée par l’utilisateur',legacy_source_row_id:sourceId,legacy_student_id:student,
    legacy_state:{source_year_id:row.annee_scolaire_id,source_year:source.tables.annee_scolaires.find(x => x.id===row.annee_scolaire_id)?.nom,
      admitted:row.admission==='1',admission_date:row.admission_date,validated:row.dossier_valide==='1',fees_paid:row.frais_paye==='1',
      source_program_id:row.filiere_id,program_unresolved:Boolean(row.filiere_id && !program),source_student_id:row.etudiant_id,
      missing_documents:relatedDocs.filter(x => !source.files.some(f => f.source_id===String(x.id))).length}});
  mappings.push({row_id:sourceId,target_table:'online_applications',target_id:id});
  for (const doc of relatedDocs) {
    const docSource=evidence('documents',doc); const file=source.files.find(x => x.source_id===String(doc.id));
    if (!file) { issues.push({row_id:docSource,code:'APPLICATION_FILE_MISSING',details:{source_path:doc.file_path,available:false}}); continue; }
    const docId=stable(`document:${doc.id}`);
    documents.push({id:docId,application_id:id,document_key:doc.document_key,filename:file.filename,mime_type:file.mime_type,byte_size:file.byte_size,
      bucket:'escen-online-applications',object_path:`recovery/${source.sql_sha256}/${docId}`,sha256:file.sha256,created_at:stamp(doc.created_at),reason:'Pièce source reprise sans validation de conformité'});
    mappings.push({row_id:docSource,target_table:'application_documents',target_id:docId});
  }
}
assert.equal(applications.length,93); assert.equal(new Set(applications.map(x => x.id)).size,93);
assert.equal(applications.filter(x => x.legacy_state.admitted).length,20);
assert.equal(applications.filter(x => x.status==='BROUILLON').length,55);
assert.equal(applications.filter(x => x.legacy_state.program_unresolved).length,9);
assert.equal(documents.length,125);
const counts={applications:applications.length,submitted:applications.filter(x => x.submitted_at).length,drafts:55,admitted:20,linkedStudents:applications.filter(x => x.legacy_student_id).length,
  newIntakes:intakes.length,documents:documents.length,missingFiles:issues.filter(x => x.code==='APPLICATION_FILE_MISSING').length,unresolvedPrograms:9,emailOverlaps:issues.filter(x => x.code==='APPLICATION_EMAIL_OVERLAP').length};
const plan={version:1,sourceSha256:source.sql_sha256,batchId:batch.id,runId:stable('run'),actorId:actor.id,actorGrantId:grant.id,expectedRevision:state.revision,yearId:year.id,counts,
  sources,mappings,issues,intakes,applications,documents,files:source.files};
const recordsSql=(schema,table,records) => {
  if (!records.length) return '';
  const cols=[...new Set(records.flatMap(row => Object.keys(row)))];
  return `insert into ${schema}.${table}(${cols.join(',')}) select ${cols.join(',')} from jsonb_populate_recordset(null::${schema}.${table},${json(records)});`;
};
const sql=`do $applications$
declare current_revision bigint;
begin
 perform set_config('lock_timeout','5s',true);
 select revision into current_revision from escen_private.portal_revision where singleton for update;
 if current_revision<>${Number(state.revision)} then raise exception 'CONCURRENT_UPDATE'; end if;
 lock table escen.online_applications,escen.website_intakes in share row exclusive mode;
 lock table escen.accounts,escen.roles,escen.role_grants,escen.permissions,escen.role_permissions in share mode;
 if not exists(select 1 from escen.accounts a join escen.role_grants g on g.account_id=a.id join escen.roles r on r.id=g.role_id
   where a.id=${quote(actor.id)}::uuid and a.active and a.archived_at is null and a.auth_user_id is not null
   and g.id=${quote(grant.id)}::uuid and r.active and r.code='IT' and g.site_id is null and g.group_id is null and g.academic_year_id is null
   and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
   and (select count(distinct p.code) from escen.role_permissions rp join escen.permissions p on p.id=rp.permission_id
     where rp.role_id=r.id and p.code in ('student.view','student.lifecycle.manage'))=2) then raise exception 'Auteur IT global non autorisé'; end if;
 if exists(select 1 from escen_private.import_runs where batch_id=${quote(batch.id)}::uuid and run_code='APPLICATIONS_2026_V1') then raise exception 'Candidatures déjà reprises'; end if;
 if not exists(select 1 from escen.academic_years where id=${quote(year.id)}::uuid and name='2026-2027' and status='OUVERTE' and archived_at is null) then raise exception 'Année cible non ouverte'; end if;
 if not exists(select 1 from escen_private.import_batches where id=${quote(batch.id)}::uuid and sql_sha256=${quote(source.sql_sha256)}) then raise exception 'Lot source non confirmé'; end if;
 if coalesce((select jsonb_agg(to_jsonb(x) order by id) from escen.website_intakes x),'[]')<>${json(t.website_intakes.toSorted((a,b) => a.id.localeCompare(b.id)))} then raise exception 'Campagnes existantes modifiées'; end if;
 if coalesce((select jsonb_agg(to_jsonb(x) order by id) from escen.online_applications x),'[]')<>${json(t.online_applications.map(x => ({...x,legacy_source_row_id:null,legacy_state:null,legacy_student_id:null})).sort((a,b) => a.id.localeCompare(b.id)))} then raise exception 'Dossiers existants modifiés'; end if;
 perform set_config('escen.actor_id',${quote(actor.id)},true);
 ${recordsSql('escen_private','legacy_rows',sources)}
 insert into escen_private.import_runs(id,batch_id,run_code,actor_account_id,counts) values(${quote(plan.runId)}::uuid,${quote(batch.id)}::uuid,'APPLICATIONS_2026_V1',${quote(actor.id)}::uuid,${json(counts)});
 ${recordsSql('escen','website_intakes',intakes)}
 ${recordsSql('escen','online_applications',applications)}
 ${recordsSql('escen','application_documents',documents)}
 insert into escen_private.source_mappings(row_id,target_table,target_id,mapping_method,import_run_id,reason)
 select row_id,target_table,target_id,'SOURCE_EXACT',${quote(plan.runId)}::uuid,'Reprise des candidatures : année cible 2026-2027, provenance historique conservée'
 from jsonb_to_recordset(${json(mappings)}) m(row_id uuid,target_table text,target_id uuid);
 insert into escen_private.import_issues(row_id,code,details) select row_id,code,details from jsonb_to_recordset(${json(issues)}) i(row_id uuid,code text,details jsonb);
 update escen_private.legacy_rows l set status=case when exists(select 1 from escen_private.import_issues i where i.row_id=l.id and i.resolved_at is null) then 'QUARANTINED' else 'MAPPED' end
 where l.id in (select row_id from escen_private.source_mappings where import_run_id=${quote(plan.runId)}::uuid);
 if (select count(*) from escen.online_applications where legacy_source_row_id in (select row_id from escen_private.source_mappings where import_run_id=${quote(plan.runId)}::uuid))<>93 then raise exception 'Lot incomplet'; end if;
 update escen_private.portal_revision set revision=revision+1,actor_id=${quote(actor.id)}::uuid,changed_at=now() where singleton;
end $applications$;
`;
const out=resolve(values.out);
await writeFile(`${out}/application-plan.json`,JSON.stringify(plan),{mode:0o600});
await writeFile(`${out}/application-import.sql`,sql,{mode:0o600});

// Rehearse all 93 source records against the real guards, using a private local DB.
const db=createDatabase();
try {
  await applyMigrations(db);
  const recoveryInstalled=(await db.query("select 1 from information_schema.columns where table_schema='escen' and table_name='online_applications' and column_name='legacy_state'")).rows.length>0;
  if (!recoveryInstalled) await db.exec(await readFile('docs/proposals/RECOVER_APPLICATIONS_2026-10-27.sql','utf8'));
  const insert=async(table,rows) => { if(rows.length) await db.exec(recordsSql('escen',table,rows)); };
  await insert('people',t.people);
  await insert('accounts',t.accounts.map(row => {const copy={...row};delete copy.account_type;return copy;}));
  const localRole=(await db.query("select id from escen.roles where code='IT'")).rows[0];
  await insert('role_grants',[{...grant,role_id:localRole.id,legacy_source_row_id:null,granted_by:actor.id,reason:'Auteur de la recette locale des candidatures'}]);
  for (const b of state.batches) await db.exec(recordsSql('escen_private','import_batches',[b]));
  // Reference provenance is sufficient here; no unrelated business data is changed.
  for (const row of t.levels.filter(x => x.legacy_source_row_id)) {
    const ref=state.mappings.find(x => x.row_id===row.legacy_source_row_id);
    assert.ok(ref,'Preuve du niveau absente');
    await db.exec(recordsSql('escen_private','legacy_rows',[{id:ref.row_id,batch_id:ref.batch_id,source_table:ref.source_table,source_id:ref.source_id,payload:{},status:'PENDING'}]));
  }
  await insert('academic_years',t.academic_years);
  await insert('levels',t.levels.map(row => ({...row,cycle_id:null})));
  await insert('programs',t.programs);
  await insert('students',t.students);
  // Historical campaigns were opened before their year entered closing.
  // Copy that baseline locally; re-enable the guard before rehearsing any write.
  await db.exec('alter table escen.website_intakes disable trigger intake_year_guard');
  await insert('website_intakes',t.website_intakes);
  await db.exec('alter table escen.website_intakes enable trigger intake_year_guard');
  await insert('website_level_document_rules',t.website_level_document_rules);
  await insert('online_applications',t.online_applications);
  await insert('application_documents',t.application_documents);
  await db.query('update escen_private.portal_revision set revision=$1 where singleton',[state.revision]);
  const before=(await db.query('select count(*)::int n from escen.online_applications')).rows[0].n;
  await assert.rejects(db.exec(sql.replace(`current_revision<>${Number(state.revision)}`,`current_revision<>${Number(state.revision)+1}`)),/CONCURRENT_UPDATE/);
  await assert.rejects(db.exec(sql.replace(`g.id=${quote(grant.id)}::uuid`,`g.id=${quote(actor.id)}::uuid`)),/Auteur IT global/);
  const lateFailure=sql.replace("if (select count(*) from escen.online_applications where legacy_source_row_id", "if (select count(*) from escen.online_applications where false and legacy_source_row_id");
  await assert.rejects(db.exec(lateFailure),/Lot incomplet/);
  assert.equal((await db.query('select count(*)::int n from escen.online_applications')).rows[0].n,before);
  assert.equal((await db.query("select count(*)::int n from escen_private.import_runs where run_code='APPLICATIONS_2026_V1'")).rows[0].n,0);
  await db.exec(sql);
  assert.equal((await db.query('select count(*)::int n from escen.online_applications where academic_year_id=$1',[year.id])).rows[0].n,93);
  const visible=(await db.query("select public.escen_website_manage($1,'IT','admissions','{}') result",[actor.id])).rows[0].result;
  assert.equal(visible.applications.filter(x => x.academic_year_id===year.id).length,93);
  assert.ok(visible.applications.flatMap(x => x.documents).every(x => !('bucket' in x) && !('object_path' in x) && !('sha256' in x)));
  for (const doc of documents) {
    const response=(await db.query("select public.escen_website_manage($1,'IT','document',$2) result",[actor.id,JSON.stringify({id:doc.id})])).rows[0].result;
    assert.equal(response?.id,doc.id,'Pièce reprise inaccessible');
  }
  await assert.rejects(db.query("select public.escen_website_manage($1,'IT','admissions','{}')",[stable('unauthorized')]),/refusé/i);
  await assert.rejects(db.exec(sql),/CONCURRENT_UPDATE|déjà reprises/);
  const audits=(await db.query('select count(*)::int n from escen_private.audit_events where actor_id=$1 and action=\'INSERT\' and entity_id=any($2::uuid[])',[actor.id,[...applications,...documents,...intakes].map(x => x.id)])).rows[0].n;
  assert.equal(audits,applications.length+documents.length+intakes.length);
  const validation={...counts,sqlSha256:hash(sql),proposalSha256:hash(await readFile('docs/proposals/RECOVER_APPLICATIONS_2026-10-27.sql')),sourceSha256:source.sql_sha256,expectedRevision:state.revision,localChecks:9,auditEvents:audits,remoteWrites:0};
  await writeFile(`${out}/application-validation.json`,JSON.stringify(validation,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(validation,null,2));
} catch (error) {
  console.error('Recette refusée :', error.message);
  process.exitCode=1;
} finally { await db.close(); }
