import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createDatabase, applyMigrations } from './database-engine.mjs';
const db=createDatabase(); let checks=0;
try {
 await applyMigrations(db);
 assert.equal((await db.query("select 1 from information_schema.columns where table_schema='escen' and table_name='online_applications' and column_name='workflow_stage'")).rows.length,1,'Le circuit doit être installé par les migrations');
 const run=async(sql,args=[])=> (await db.query(sql,args)).rows;
 const rpc=async(name,args)=> (await run(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args))[0].result;
 const roles=Object.fromEntries((await run('select id,code from escen.roles')).map(x=>[x.code,x.id]));
 const actors={};
 for(const role of ['IT','CC','LOG','DA','RAF','MKT','ENS','DG','DGA']){
  const person=randomUUID();const account=randomUUID();actors[role]=account;
  await run('insert into escen.people(id,firstname,lastname,email) values($1,$2,$3,$4)',[person,role,'Recette',role.toLowerCase()+'@example.test']);
  await run('insert into escen.accounts(id,person_id,auth_user_id,active) values($1,$2,$3,true)',[account,person,randomUUID()]);
  await run('insert into escen.role_grants(account_id,role_id,granted_by,valid_from,reason) values($1,$2,$1,now(),$3)',[account,roles[role],'Recette locale']);
 }
 // Le transfert est limité aux admissions ; les fonctions académiques et financières sont préservées.
 const permissions=async(role)=>(await run('select p.code from escen.role_permissions rp join escen.permissions p on p.id=rp.permission_id where rp.role_id=$1 order by p.code',[roles[role]])).map(row=>row.code);
 assert.deepEqual(await permissions('CC'),['academic.view','application.followup','application.payment.confirm','application.review','application.view','schedule.view','student.view']);checks++;
 for(const role of ['LOG','RAF']){
  assert.ok(!(await permissions(role)).some(code=>code.startsWith('application.')));
  await assert.rejects(rpc('escen_admissions_context',[actors[role],role,null]),/refusé/);checks++;
 }
 await assert.rejects(run("delete from escen.role_permissions where role_id=$1",[roles.CC]),/Suppression interdite/);checks++;
 assert.ok((await permissions('LOG')).includes('academic.group.manage'));
 assert.ok((await permissions('RAF')).includes('payment.record'));checks++;
 assert.equal((await run("select count(*)::int n from escen.role_grants g join escen.roles r on r.id=g.role_id where r.code='CC'"))[0].n,1,'Seule l’attribution de recette doit exister');checks++;
 const year=randomUUID(),cycle=randomUUID(),level=randomUUID(),program=randomUUID(),intake=randomUUID(),channel=randomUUID();
 await run("insert into escen.academic_years(id,code,name,starts_on,ends_on,status) values($1,'2026-2027','2026-2027','2026-09-01','2027-08-31','OUVERTE')",[year]);
 await rpc('escen_academic_year_command',[actors.IT,'IT','current',year,0,'Année de la recette locale',null]);
 await run("insert into escen.cycles(id,code,name) values($1,'LOCAL','Cycle local')",[cycle]);
 await run("insert into escen.levels(id,cycle_id,code,name,position) values($1,$2,'LOCAL-L1','Licence locale',1)",[level,cycle]);
 await run("insert into escen.programs(id,code,name) values($1,'LOCAL','Formation locale')",[program]);
 await run("insert into escen.website_intakes(id,academic_year_id,level_id,program_id,label,active,required_documents,reason) values($1,$2,$3,$4,'Formation locale',true,'[\"diplome_file\"]','Recette locale')",[intake,year,level,program]);
 await run("insert into escen.annual_fee_schedules(academic_year_id,category,amount,reason) values($1,'INSCRIPTION',50000,'Tarif local')",[year]);
 await run("insert into escen.annual_payment_channels(id,academic_year_id,name,method,reason) values($1,$2,'Caisse locale','ESPECES','Recette locale')",[channel,year]);
 const token=createHash('sha256').update('jeton local non exploitable').digest('hex');
 const payload={identity:{nom:'Candidat',prenom:'Local',genre:'M',date_naissance:'2000-01-01',lieu_naissance:'Lomé',nationalite:'Togo',email:'candidate@example.test',tel:'+22890000000',adresse:'Adresse locale'},diploma:{type_diplome_id:'BAC'},guardians:[{nom:'Parent',prenom:'Local',lien:'Parent',tel:'+22890000001'}],intake_id:intake,consent:true};
 await rpc('escen_website_public',['create','b'.repeat(64),JSON.stringify({...payload.identity,academic_year_id:year})]);
 assert.equal((await rpc('escen_admissions_context',[actors.CC,'CC',year])).applications.length,0,'Les nouveaux brouillons restent privés');checks++;
 const submitted=await rpc('escen_application_submit',[null,null,year,token,JSON.stringify(payload),'https://escen.example.test/candidature/suivi#access=local']);
 assert.ok(submitted.id);checks++;
 const noticeRoles=async(action)=>(await run('select distinct n.role_code from escen.application_notifications n join escen.application_events e on e.id=n.event_id where e.application_id=$1 and e.action=$2 order by n.role_code',[submitted.id,action])).map(row=>row.role_code);
 assert.deepEqual(await noticeRoles('submit'),['CC','IT']);checks++;
 await assert.rejects(rpc('escen_application_submit',[actors.LOG,'LOG',year,'d'.repeat(64),JSON.stringify(payload),null]),/refusée/);checks++;
 for(const role of ['DG','DGA']){
  assert.equal((await rpc('escen_admissions_context',[actors[role],role,year])).applications.length,1);
  const context=await rpc('escen_admissions_context',[actors[role],role,year]);
  assert.ok(Object.values(context.capabilities).every(value=>value===false));checks++;
 }

 assert.equal((await run('select count(*)::int n from escen.application_documents'))[0].n,0,'Le dépôt sans pièce doit être possible');checks++;
 assert.equal((await rpc('escen_application_submit',[null,null,year,token,JSON.stringify(payload),'https://escen.example.test/candidature/suivi#access=local'])).id,submitted.id);checks++;
 const app=async()=> (await run('select * from escen.online_applications where id=$1',[submitted.id]))[0];
 const command=async(role,action,extra={})=>{const a=await app();return rpc('escen_application_command',[actors[role],role,year,action,JSON.stringify({id:a.id,version:a.version,reason:'Motif de recette du circuit',...extra})]);};
 await assert.rejects(command('DA','study'),/hors de votre étape|Transmission/);checks++;
 await assert.rejects(command('RAF','review'),/refusée/);checks++;
 await command('CC','review');
 await assert.rejects(rpc('escen_application_command',[actors.CC,'CC',year,'incomplete',JSON.stringify({id:submitted.id,version:1,reason:'Ancienne version'})]),/concurrente/);checks++;
 await assert.rejects(command('CC','transmit'),/complet requis/);checks++;
 await assert.rejects(command('CC','complete',{identity_checked:true,guardians_checked:true,checked_documents:[]}),/pièces requises/);checks++;
 await assert.rejects(command('CC','admissible'),/refusée/);checks++;
 await command('CC','request_changes');
 assert.deepEqual(await noticeRoles('request_changes'),['CC','MKT']);checks++;
 assert.equal((await rpc('escen_admissions_context',[actors.MKT,'MKT',year])).applications.length,1);checks++;
 await command('MKT','contact');
 assert.ok((await rpc('escen_admissions_context',[actors.MKT,'MKT',year])).applications[0].events.some(x=>x.action==='contact'));
 assert.ok(!(await rpc('escen_candidate_dossier',[token,'read','{}'])).application.events.some(x=>x.action==='contact'));checks++;
 const doc=randomUUID();let current=await app();
 await rpc('escen_candidate_dossier',[token,'documents',JSON.stringify({version:current.version,documents:[{id:doc,document_key:'diplome_file',filename:'diplome.pdf',mime_type:'application/pdf',byte_size:20,object_path:current.id+'/'+doc,sha256:'a'.repeat(64)}]})]);
 current=await app();await rpc('escen_candidate_dossier',[token,'update',JSON.stringify({...payload,version:current.version})]);
 assert.equal((await app()).workflow_stage,'NOUVELLE');checks++;
 const document=await rpc('escen_admission_document',[actors.CC,'CC',year,doc]);
 assert.equal(document.filename,'diplome.pdf');assert.equal(document.object_path,submitted.id+'/'+doc);checks++;
 for(const role of ['LOG','RAF','MKT','ENS','DA']){
  await assert.rejects(rpc('escen_admission_document',[actors[role],role,year,doc]),/refusé|périmètre/);checks++;
 }
 await assert.rejects(rpc('escen_admission_document',[actors.CC,'CC',randomUUID(),doc]),/périmètre/);checks++;
 await assert.rejects(rpc('escen_admission_document',[actors.CC,'CC',year,randomUUID()]),/périmètre/);checks++;
 await assert.rejects(rpc('escen_admission_document',[actors.LOG,'CC',year,doc]),/refusé/);checks++;
 assert.ok(!(await run("select grantee from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid='public.escen_admission_document(uuid,text,uuid,uuid)'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE'")).length,'La RPC ne doit pas être exécutable par PUBLIC');checks++;

 await command('CC','review');await command('CC','complete',{identity_checked:true,guardians_checked:true,checked_documents:[doc]});await command('CC','transmit');
 assert.equal((await rpc('escen_admissions_context',[actors.DA,'DA',year])).applications.length,1);checks++;
 assert.deepEqual(await noticeRoles('transmit'),['DA']);checks++;
 assert.equal((await rpc('escen_admission_document',[actors.DA,'DA',year,doc])).filename,'diplome.pdf');checks++;
 await command('DA','study');
 await run("insert into escen.annual_fee_schedules(academic_year_id,category,program_id,amount,reason) values($1,'INSCRIPTION',$2,50000,'Tarif programme de recette')",[year,program]);
 await run("insert into escen.annual_fee_schedules(academic_year_id,category,level_id,amount,reason) values($1,'INSCRIPTION',$2,50000,'Tarif niveau de recette')",[year,level]);
 await assert.rejects(command('DA','admissible'),/absent ou ambigu/);checks++;
 await run("update escen.annual_fee_schedules set archived_at=now() where program_id=$1 or level_id=$2",[program,level]);
 await command('DA','admissible');
 assert.deepEqual(await noticeRoles('admissible'),['CC']);checks++;
 assert.equal(Number((await app()).registration_fee_due),50000);checks++;
 await assert.rejects(command('RAF','confirm_payment',{amount:50000,channel_id:channel,reference:'LOCAL-001'}),/refusée/);checks++;
 await command('CC','confirm_payment',{amount:20000,channel_id:channel,reference:'LOCAL-001'});
 assert.equal((await app()).workflow_stage,'ATTENTE_PAIEMENT');checks++;
 await assert.rejects(command('CC','confirm_payment',{amount:40000,channel_id:channel,reference:'LOCAL-OVER'}),/supérieur/);checks++;
 await db.exec("create function escen_private.fail_test_admission_mail() returns trigger language plpgsql as $$ begin if new.subject='Confirmation de votre admission officielle à ESCEN' then raise exception 'Échec tardif de recette'; end if; return new; end $$; create trigger fail_test_mail before insert on escen.email_outbox for each row execute function escen_private.fail_test_admission_mail();");
 const beforeLateFailure={app:await app(),payments:await run('select * from escen.application_registration_payments order by id'),letters:await run('select * from escen.application_letters order by id'),events:await run('select * from escen.application_events order by id')};
 await assert.rejects(command('CC','confirm_payment',{amount:30000,channel_id:channel,reference:'LOCAL-002'}),/Échec tardif/);
 assert.deepEqual({app:await app(),payments:await run('select * from escen.application_registration_payments order by id'),letters:await run('select * from escen.application_letters order by id'),events:await run('select * from escen.application_events order by id')},beforeLateFailure);checks++;
 await db.exec('drop trigger fail_test_mail on escen.email_outbox; drop function escen_private.fail_test_admission_mail();');
 await command('CC','confirm_payment',{amount:30000,channel_id:channel,reference:'LOCAL-002'});
 assert.equal((await app()).workflow_stage,'ADMIS_OFFICIEL');checks++;
 assert.deepEqual(await noticeRoles('confirm_payment'),['CC']);checks++;
 await command('CC','create_student',{matricule:'ESCEN-LOCAL-001',existing_student_id:null});
 assert.ok((await app()).student_id);checks++;
 await assert.rejects(command('CC','create_student',{matricule:'ESCEN-LOCAL-002',existing_student_id:null}),/matricule requis/);checks++;
 const payment=(await run("select id from escen.application_registration_payments where reference='LOCAL-002'"))[0];await command('CC','reverse_payment',{payment_id:payment.id});
 assert.equal((await app()).workflow_stage,'ATTENTE_PAIEMENT');assert.ok((await app()).student_id);checks++;
 assert.deepEqual(await noticeRoles('reverse_payment'),['CC']);checks++;
 const view=await rpc('escen_candidate_dossier',[token,'read','{}']);assert.equal(Number(view.application.registration_fee_paid),20000);assert.equal(view.application.letters.length,2);checks++;
 const snapshot=await rpc('escen_backend_snapshot',[]);for(const key of ['application_events','application_letters','application_registration_payments','application_notifications'])assert.ok(!(key in snapshot.tables));checks++;
 await assert.rejects(rpc('escen_admissions_context',[actors.ENS,'ENS',year]),/refusé/);checks++;
 await assert.rejects(run("update escen.online_applications set workflow_stage='ADMIS_OFFICIEL' where id=$1",[submitted.id]),/Commande/);checks++;
 await assert.rejects(run('delete from escen.application_registration_payments'),/immuable|immutable|modifi|suppression/i);checks++;
 assert.equal((await run('select count(*)::int n from escen.students'))[0].n,1);checks++;
 assert.ok((await run("select count(*)::int n from escen.email_outbox where status='PENDING'"))[0].n>=8);checks++;
 const physical=await rpc('escen_application_submit',[actors.CC,'CC',year,'c'.repeat(64),JSON.stringify({...payload,identity:{...payload.identity,email:'physical@example.test'}}),'https://escen.example.test/candidature/suivi#access=physical']);
 assert.equal((await run('select entry_channel from escen.online_applications where id=$1',[physical.id]))[0].entry_channel,'ACCUEIL');checks++;
 console.log(JSON.stringify({admissionsChecks:checks,documentsOptionalAtSubmission:true,academicDecisionSeparateFromPayment:true,officialAdmissionAfterFullPayment:true,remoteWrites:0}));
}catch(error){console.error('Recette admissions :',error.message);process.exitCode=1;}finally{await db.close();}
