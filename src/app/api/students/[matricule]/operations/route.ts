import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import type { PersistentChange, RelationalSnapshot } from '@/types/persistence';
export const dynamic='force-dynamic';
async function scope(request: Request, matricule: string) {
  const auth=await requireAccount(request); requirePermission(auth.context,'student.view');
  const result=await auth.client.rpc('escen_backend_snapshot');
  if(result.error)throw new RequestError(503,'Dossier indisponible.');
  const snapshot=result.data as RelationalSnapshot;
  const year=await resolveAcademicYear(request,auth.client,auth.context,snapshot);
  if(!year.selectedYearId)throw new RequestError(409,'Choisissez une année précise.');
  const scoped=filterRelationalSnapshot(snapshot,auth.context);
  const student=scoped.tables.students?.find(row=>row.matricule===matricule && !row.archived_at);
  if(!student)throw new RequestError(404,'Dossier introuvable ou non autorisé.');
  const offeringIds=new Set((scoped.tables.academic_offerings || []).filter(row=>row.academic_year_id===year.selectedYearId).map(row=>row.id));
  // RAF may read enrollment relations without academic catalog access.
  const enrollments=(scoped.tables.enrollments || []).filter(row=>row.student_id===student.id && (offeringIds.has(String(row.offering_id)) || snapshot.tables.academic_offerings?.some(offering=>offering.id===row.offering_id && offering.academic_year_id===year.selectedYearId)));
  return {...auth,snapshot,scoped,student,enrollments,year};
}
type Params={params:Promise<{matricule:string}>};
export async function GET(request:Request,{params}:Params){try{
  const {snapshot,scoped,enrollments,context}=await scope(request,(await params).matricule);
  const ids=new Set(enrollments.map(row=>row.id));
  const payments=context.permissions.includes('finance.view')?(scoped.tables.payments || []).filter(row=>ids.has(String(row.enrollment_id))):[];
  const reversals=new Set((scoped.tables.payment_reversals || []).map(row=>row.payment_id));
  return Response.json({revision:snapshot.revision,channels:context.permissions.includes('finance.view')?(snapshot.tables.annual_payment_channels || []).filter(row=>row.academic_year_id=== (enrollments[0] ? snapshot.tables.academic_offerings.find(offering=>offering.id===enrollments[0].offering_id)?.academic_year_id : null) && !row.archived_at).map(row=>({name:row.name,method:row.method})):[],enrollments:enrollments.map(row=>({id:row.id,status:row.status})),payments:payments.map(row=>({id:row.id,reference:row.reference,amount:row.amount,paidOn:row.paid_on,cancelled:reversals.has(row.id),pending:row.status==='PENDING'})),paid:payments.reduce((sum,row)=>sum+(reversals.has(row.id)||row.status==='PENDING'?0:Number(row.amount)),0)},{headers:{'Cache-Control':'no-store'}});
}catch(error){return errorResponse(error);}}
const common={revision:z.number().int().nonnegative(),enrollmentId:z.uuid(),reason:z.string().trim().min(3).max(1000)};
const schema=z.discriminatedUnion('action',[
  z.object({...common,action:z.literal('payment'),amount:z.number().int().positive().max(2147483647),payer:z.string().trim().min(2).max(160),reference:z.string().trim().min(2).max(160),provider:z.string().trim().min(2).max(160),method:z.enum(['ESPECES','MOBILE_MONEY','VIREMENT','CHEQUE','CARTE']),paidOn:z.iso.date()}).strict(),
  z.object({...common,action:z.literal('status'),status:z.enum(['SUSPENDU','ABANDON','INSCRIT'])}).strict(),
]);
export async function POST(request:Request,{params}:Params){try{
  const data=await scope(request,(await params).matricule);
  const body=schema.parse(await request.json());
  requirePermission(data.context,body.action==='payment'?'payment.record':'student.lifecycle.manage');
  const enrollment=data.enrollments.find(row=>row.id===body.enrollmentId);
  if(!enrollment)throw new RequestError(409,'L’inscription officielle doit être enregistrée dans cette année avant cette opération.');
  const changes:PersistentChange[]=[];
  if(body.action==='payment'){
    const selected=data.year.years.find(year=>year.id===data.year.selectedYearId);
    if(selected?.status!=='CLOTUREE' && !data.snapshot.tables.annual_payment_channels?.some(channel=>channel.academic_year_id===data.year.selectedYearId && !channel.archived_at && channel.method===body.method && channel.name===body.provider)) throw new RequestError(409,'Choisissez une caisse et un mode configurés pour cette année.');
    const id=crypto.randomUUID();
    changes.push({table:'payments',operation:'insert',record:{id,enrollment_id:enrollment.id,payer_name:body.payer,amount:body.amount,method:body.method,provider:body.provider,reference:body.reference,paid_on:body.paidOn,recorded_by:data.context.accountId,comment:body.reason}});
    changes.push({table:'receipts',operation:'insert',record:{id:crypto.randomUUID(),payment_id:id,reference:`REC-${id}`,snapshot:{matricule:data.student.matricule,academicYearId:data.year.selectedYearId,amount:body.amount,reference:body.reference,payer:body.payer,method:body.method,paidOn:body.paidOn},issued_by:data.context.accountId}});
  }else{
    if(['DIPLOME','ABANDON'].includes(String(enrollment.status)) || body.status===enrollment.status)throw new RequestError(409,'Ce changement de statut nécessite une décision académique distincte.');
    changes.push({table:'enrollments',operation:'update',record:{id:enrollment.id,status:body.status}});
    changes.push({table:'enrollment_events',operation:'insert',record:{id:crypto.randomUUID(),enrollment_id:enrollment.id,old_status:enrollment.status,new_status:body.status,actor_id:data.context.accountId,reason:body.reason}});
  }
  const saved=await data.client.rpc('escen_backend_transaction',{p_actor_id:data.context.accountId,p_expected_revision:body.revision,p_changes:changes});
  if(saved.error)throw new RequestError(409,'Enregistrement refusé : actualisez le dossier et vérifiez les références. Aucune opération partielle n’a été enregistrée.');
  return Response.json({revision:saved.data},{status:201});
}catch(error){return errorResponse(error);}}
