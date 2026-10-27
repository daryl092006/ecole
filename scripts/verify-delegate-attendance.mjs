import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function verifyDelegateAttendance(db, check, { year, offering, group, enrollment, session, teacher }) {
 const scalar=async(sql,args=[]) => (await db.query(sql,args)).rows[0].value;
 const insert=async(table,record) => {
  assert.match(table,/^[a-z_]+$/); const keys=Object.keys(record); keys.forEach(key=>assert.match(key,/^[a-z_]+$/));
  return (await db.query(`insert into escen.${table} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(record))).rows[0];
 };
 const auth=randomUUID(); await db.query('insert into auth.users(id) values($1)',[auth]);
 const person=await scalar('select person_id as value from escen.students where id=$1',[enrollment.student_id]);
 const actor=await insert('accounts',{person_id:person,auth_user_id:auth,active:true});
 const role=await scalar("select id as value from escen.roles where code='DEL'");
 const grant=await insert('role_grants',{account_id:actor.id,role_id:role,granted_by:actor.id,valid_from:'2020-01-01T00:00:00Z',reason:'Délégué de recette locale'});
 const target=await insert('sessions',{assignment_id:session.assignment_id,offering_id:offering.id,group_id:group.id,teacher_id:teacher.id,mode:'COURS',starts_at:'2027-09-01T15:00:00Z',ends_at:'2027-09-01T16:00:00Z'});
 const revision=()=>scalar('select revision as value from escen_private.portal_revision where singleton');
 const audits=()=>scalar('select count(*)::int as value from escen_private.audit_events');
 const rpc=async(changes,options={})=>scalar('select public.escen_delegate_attendance_transaction($1,$2,$3,$4,$5::jsonb) as value',[options.actor||actor.id,options.revision??await revision(),options.session||target.id,options.year||year.id,JSON.stringify(changes)]);
 const presence=randomUUID();
 await check('Délégué : deux droits de présence, sans décision de justificatif ni accès aux notes des autres',async()=>{
  assert.deepEqual((await db.query("select p.code from escen.role_permissions rp join escen.permissions p on p.id=rp.permission_id where rp.role_id=$1 and p.code like 'attendance.%' order by p.code",[role])).rows.map(row=>row.code),['attendance.record','attendance.view']);
 });
 await check('Délégué : création puis correction motivée dans son groupe, auteur et audit préservés',async()=>{
  await rpc([{table:'attendances',operation:'insert',record:{id:presence,session_id:target.id,enrollment_id:enrollment.id,offering_id:offering.id,status:'PRESENT',recorded_by:actor.id}}]);
  await assert.rejects(rpc([{table:'attendances',operation:'update',record:{id:presence,status:'RETARD'}}]),/motif/i);
  await rpc([{table:'attendances',operation:'update',record:{id:presence,status:'RETARD',late_minutes:5,reason:'Retard constaté par le délégué'}}]);
  assert.equal(await scalar('select recorded_by as value from escen.attendances where id=$1',[presence]),actor.id);
  assert.equal(await scalar("select old_value->>'status' as value from escen_private.audit_events where entity_id=$1 and action='UPDATE' order by happened_at desc limit 1",[presence]),'PRESENT');
 });
 const teacherPresence=randomUUID();
 await check('Délégué : présence du professeur effectif conservée et auditée',async()=>{
  await rpc([{table:'teacher_attendances',operation:'insert',record:{id:teacherPresence,session_id:target.id,teacher_id:teacher.id,arrived_at:'2027-09-01T15:00:00Z',left_at:'2027-09-01T16:00:00Z',comment:'Présence constatée'}}]);
  assert.equal(await scalar('select recorded_by as value from escen.teacher_attendances where id=$1',[teacherPresence]),actor.id);
  await assert.rejects(rpc([{table:'teacher_attendances',operation:'insert',record:{id:randomUUID(),session_id:target.id,teacher_id:randomUUID(),arrived_at:'2027-09-01T15:00:00Z'}}]),/Enseignant hors/);
 });
 await check('Délégué : une autre année, un étudiant extérieur et une présence d’une autre séance sont refusés',async()=>{
  const correction=[{table:'attendances',operation:'update',record:{id:presence,status:'ABSENT',reason:'Correction de recette'}}];
  await assert.rejects(rpc(correction,{year:randomUUID()}),/hors du groupe/);
  await assert.rejects(rpc(correction,{session:session.id}),/hors de la séance/);
  await assert.rejects(rpc([{table:'attendances',operation:'insert',record:{id:randomUUID(),session_id:target.id,enrollment_id:randomUUID(),offering_id:offering.id,status:'PRESENT'}}]),/Étudiant hors/);
  await assert.rejects(rpc([{table:'attendances',operation:'update',record:{id:presence,enrollment_id:enrollment.id,reason:'Injection de parent'}}]),/Champ non autorisé/);
 });
 await check('Délégué : dispense, justification, autres tables et lots invalides refusés',async()=>{
  for(const status of ['DISPENSE','ABSENT_JUSTIFIE','RETARD_JUSTIFIE']) await assert.rejects(rpc([{table:'attendances',operation:'update',record:{id:presence,status,reason:'Statut interdit'}}]),/réservées/);
  await assert.rejects(rpc([{table:'absence_justifications',operation:'update',record:{id:randomUUID(),status:'VALIDE'}}]),/hors du circuit/);
  await assert.rejects(rpc([]),/Lot vide/);
  await assert.rejects(rpc(Array.from({length:5001},()=>({}))),/trop volumineux/);
  await assert.rejects(rpc([{table:'attendances',operation:'update',record:{id:presence,reason:'Version périmée'}}],{revision:(await revision())-1}),/CONCURRENT_UPDATE/);
 });
 await check('Délégué : un échec tardif annule toutes les corrections, audits et révisions',async()=>{
  const before={audits:await audits(),revision:await revision(),status:await scalar('select status as value from escen.attendances where id=$1',[presence])};
  const changes=Array.from({length:51},()=>({table:'attendances',operation:'update',record:{id:presence,status:'ABSENT',reason:'Correction de lot'}}));
  changes.at(-1).record.late_minutes=-1;
  await assert.rejects(rpc(changes));
  assert.deepEqual({audits:await audits(),revision:await revision(),status:await scalar('select status as value from escen.attendances where id=$1',[presence])},before);
 });
 await check('Délégué : attribution expirée, compte inactif et compte non délégué refusés',async()=>{
  const changes=[{table:'attendances',operation:'update',record:{id:presence,reason:'Correction de recette'}}];
  await db.query("update escen.role_grants set valid_until='2021-01-01T00:00:00Z' where id=$1",[grant.id]);
  await assert.rejects(rpc(changes),/hors du groupe/);
  await db.query('update escen.role_grants set valid_until=null where id=$1',[grant.id]);
  await db.query('update escen.accounts set active=false where id=$1',[actor.id]);
  await assert.rejects(rpc(changes),/hors du groupe/);
  await db.query('update escen.accounts set active=true where id=$1',[actor.id]);
  await assert.rejects(rpc(changes,{actor:randomUUID()}),/hors du groupe/);
 });
}
