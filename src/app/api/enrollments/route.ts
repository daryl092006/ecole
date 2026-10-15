import {z} from 'zod';
import {requireAccount,requirePermission,RequestError,errorResponse} from '@/server/auth';
import {resolveAcademicYear} from '@/server/academicYearContext';
import {assertYearPrepared} from '@/services/yearPreparationService';
import {previousAcademicYear} from '@/services/reenrollmentService';
import {filterRelationalSnapshot} from '@/services/persistentPermissionsService';
import {connectedRecordName} from '@/services/connectedRecordDisplayService';
import type {RelationalSnapshot,PersistentChange} from '@/types/persistence';
export const dynamic='force-dynamic';
async function directory(request:Request){
 const auth=await requireAccount(request);requirePermission(auth.context,'student.lifecycle.manage');
 if(!auth.context.grants.some(grant=>!grant.site_id && !grant.group_id && !grant.academic_year_id))throw new RequestError(403,'Gestion globale des inscriptions requise.');
 const result=await auth.client.rpc('escen_backend_snapshot');if(result.error)throw new RequestError(503,'Inscriptions indisponibles.');
 const snapshot=result.data as RelationalSnapshot;const year=await resolveAcademicYear(request,auth.client,auth.context,snapshot);
 if(!year.selectedYearId)throw new RequestError(409,'Choisissez une année précise.');
 const catalog=await auth.client.rpc('escen_history_catalog');if(catalog.error)throw new RequestError(503,'Vérification des anciens dossiers indisponible.');
 const historicalMatricules=new Set<string>((catalog.data.references.etudiants || []).map((row:{values:{matricule:string}})=>row.values.matricule));
 const scoped=filterRelationalSnapshot(snapshot,auth.context);
 const offerings=(snapshot.tables.academic_offerings || []).filter(row=>row.academic_year_id===year.selectedYearId && !row.archived_at);
 const offeringIds=new Set(offerings.map(row=>row.id));
 const registered=new Set((snapshot.tables.enrollments || []).filter(row=>offeringIds.has(String(row.offering_id))).map(row=>row.student_id));
 const previous=previousAcademicYear(snapshot.tables.academic_years,snapshot.tables.academic_years.find(row=>row.id===year.selectedYearId)!);
 const previousOfferingIds=new Set((snapshot.tables.academic_offerings || []).filter(row=>row.academic_year_id===previous?.id).map(row=>row.id));
 const previousStudents=new Set((snapshot.tables.enrollments || []).filter(row=>previousOfferingIds.has(String(row.offering_id))).map(row=>row.student_id));
 const candidates=(scoped.tables.students || []).filter(row=>!row.archived_at && !registered.has(row.id)).map(row=>{
  const person=snapshot.tables.people?.find(person=>person.id===row.person_id);
  const knownOld=historicalMatricules.has(String(row.matricule)) || snapshot.tables.enrollments?.some(enrollment=>enrollment.student_id===row.id);
  return {id:row.id,matricule:row.matricule,name:[person?.firstname,person?.lastname].filter(Boolean).join(' '),kind:knownOld?'reenroll':'new',eligible:!knownOld || previousStudents.has(row.id)};
 });
 return {...auth,snapshot,year,offerings,candidates,previous,previousOfferingIds};
}
export async function GET(request:Request){try{
 const data=await directory(request);const tables=data.snapshot.tables;
 return Response.json({revision:data.snapshot.revision,candidates:data.candidates,offerings:data.offerings.map(row=>({id:row.id,name:connectedRecordName('academic_offerings',row,data.snapshot),levelId:row.level_id,deliveryMode:row.delivery_mode,programId:tables.curricula?.find(item=>item.id===row.curriculum_id)?.program_id})),groups:(tables.group_offerings || []).filter(link=>data.offerings.some(offering=>offering.id===link.offering_id)).map(link=>({id:link.group_id,offeringId:link.offering_id,name:tables.groups?.find(group=>group.id===link.group_id)?.name})),fees:(tables.annual_fee_schedules || []).filter(row=>row.academic_year_id===data.year.selectedYearId && !row.archived_at),previousYear:data.previous?.name || null},{headers:{'Cache-Control':'no-store'}});
}catch(error){return errorResponse(error);}}
const schema=z.object({kind:z.enum(['new','reenroll']),studentId:z.uuid(),offeringId:z.uuid(),groupId:z.uuid(),tuitionId:z.uuid(),registrationId:z.uuid(),revision:z.number().int().nonnegative(),enrolledOn:z.iso.date(),reason:z.string().trim().min(3).max(1000)}).strict();
export async function POST(request:Request){try{
 const data=await directory(request);const body=schema.parse(await request.json());
 requirePermission(data.context,'payment.record');
 try{assertYearPrepared(data.snapshot,data.year.selectedYearId!);}catch(error){throw new RequestError(409,error instanceof Error?error.message:'Année non prête.');}
 const target=data.year.years.find(year=>year.id===data.year.selectedYearId)!;
 if(target.status!=='OUVERTE')throw new RequestError(409,'Ouvrez l’année après sa préparation avant toute inscription.');
 const candidate=data.candidates.find(row=>row.id===body.studentId && row.kind===body.kind);
 if(!candidate || !candidate.eligible)throw new RequestError(409,'Ce dossier ne correspond pas à ce parcours. Les anciens dossiers exigent la reprise de l’inscription précédente avant réinscription.');
 const offering=data.offerings.find(row=>row.id===body.offeringId);
 const tables=data.snapshot.tables;
 if(!offering || !tables.group_offerings?.some(link=>link.group_id===body.groupId && link.offering_id===offering.id))throw new RequestError(409,'Choisissez un groupe relié à cette formation annuelle.');
 if(body.enrolledOn<target.starts_on || body.enrolledOn>target.ends_on)throw new RequestError(400,'La date d’inscription doit appartenir à l’année cible.');
 if(body.kind==='reenroll'){
  const previous=tables.enrollments?.filter(row=>row.student_id===body.studentId && data.previousOfferingIds.has(String(row.offering_id))) || [];
  if(previous.length!==1)throw new RequestError(409,'Inscription précédente absente ou ambiguë.');
  const previousOffering=tables.academic_offerings.find(row=>row.id===previous[0].offering_id)!;
  if(previousOffering.level_id!==offering.level_id)throw new RequestError(409,'Le passage de niveau doit être validé par les décisions académiques avant réinscription. La reconduction au même niveau est disponible ici.');
  if(tables.curricula.find(row=>row.id===previousOffering.curriculum_id)?.program_id!==tables.curricula.find(row=>row.id===offering.curriculum_id)?.program_id)throw new RequestError(409,'Le changement de filière exige une décision académique distincte.');
 }
 const programId=tables.curricula.find(row=>row.id===offering.curriculum_id)?.program_id;
 const chosen=[['SCOLARITE',body.tuitionId],['INSCRIPTION',body.registrationId]].map(([category,id])=>{
  const fee=tables.annual_fee_schedules?.find(row=>row.id===id && row.category===category && row.academic_year_id===target.id && !row.archived_at && (!row.program_id || row.program_id===programId) && (!row.level_id || row.level_id===offering.level_id) && (!row.delivery_mode || row.delivery_mode===offering.delivery_mode));
  if(!fee)throw new RequestError(409,'Tarif absent ou incompatible avec cette formation et cette année.');return fee;
 });
 const enrollmentId=crypto.randomUUID(),contractId=crypto.randomUUID(),versionId=crypto.randomUUID();
 const changes:PersistentChange[]=[{table:'enrollments',operation:'insert',record:{id:enrollmentId,student_id:body.studentId,offering_id:offering.id,status:body.kind==='new'?'INSCRIT':'REINSCRIT',enrolled_on:body.enrolledOn,created_by:data.context.accountId}},{table:'enrollment_groups',operation:'insert',record:{id:crypto.randomUUID(),enrollment_id:enrollmentId,offering_id:offering.id,group_id:body.groupId,valid_from:body.enrolledOn,changed_by:data.context.accountId,reason:body.reason}},{table:'enrollment_events',operation:'insert',record:{id:crypto.randomUUID(),enrollment_id:enrollmentId,new_status:body.kind==='new'?'INSCRIT':'REINSCRIT',actor_id:data.context.accountId,reason:body.reason}},{table:'financial_contracts',operation:'insert',record:{id:contractId,enrollment_id:enrollmentId,reference:`CON-${enrollmentId}`}},{table:'contract_versions',operation:'insert',record:{id:versionId,contract_id:contractId,version:1,status:'DRAFT',reason:body.reason}}];
 for(const fee of chosen){let type=tables.fee_types?.find(row=>row.code===`ANNUAL-${fee.category}`);
  if(!type){type={id:crypto.randomUUID(),code:`ANNUAL-${fee.category}`,name:fee.category==='SCOLARITE'?'Scolarité':'Inscription',category:fee.category};changes.push({table:'fee_types',operation:'insert',record:type});}
  changes.push({table:'contract_lines',operation:'insert',record:{id:crypto.randomUUID(),contract_id:contractId,version_id:versionId,fee_type_id:type.id,description:`${fee.category} · ${target.name} · tarif ${fee.id}`,amount:fee.amount}});
 }
 const saved=await data.client.rpc('escen_backend_transaction',{p_actor_id:data.context.accountId,p_expected_revision:body.revision,p_changes:changes});
 if(saved.error)throw new RequestError(409,'Inscription refusée : vérifiez les références ou actualisez. Aucune inscription ni contrat partiel n’a été conservé.');
 return Response.json({revision:saved.data,enrollmentId,contractId},{status:201});
}catch(error){return errorResponse(error);}}
