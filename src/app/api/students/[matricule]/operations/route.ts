import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { PaymentAllocationError, paymentAllocationDirectory, planPaymentAllocations } from '@/services/paymentAllocationService';
import { PaymentAdjustmentError, assertPaymentAdjustment, paymentAdjustmentDirectory } from '@/services/paymentAdjustmentService';
import { paymentReceiptDocument } from '@/services/paymentReceiptService';
import { netContractAmount, netPaymentTotal } from '@/services/financialProjectionService';
import { availableEnrollmentGroupLinks } from '@/services/enrollmentGroupReferenceService';
import { ROLES } from '@/types/permissions';
import type { PersistentChange, RelationalSnapshot } from '@/types/persistence';
export const dynamic='force-dynamic';
async function scope(request: Request, matricule: string) {
  const auth=await requireAccount(request);
  if (auth.context.role !== ROLES.STUD && auth.context.role !== ROLES.DEL) requirePermission(auth.context,'student.view');
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
  const {snapshot,scoped,enrollments,context,year}=await scope(request,(await params).matricule);
  const ids=new Set(enrollments.map(row=>row.id));
  if(new URL(request.url).searchParams.has('receiptId')){
    if (context.role !== ROLES.STUD && context.role !== ROLES.DEL) requirePermission(context,'finance.view');
    const receiptId=z.uuid().parse(new URL(request.url).searchParams.get('receiptId'));
    const receipt=paymentReceiptDocument(scoped,ids,receiptId);
    if(!receipt)throw new RequestError(404,'Reçu introuvable dans ce dossier et cette année.');
    receipt.academicYear=year.years.find(item=>item.id===year.selectedYearId)?.name || receipt.academicYear;
    return Response.json({receipt},{headers:{'Cache-Control':'no-store'}});
  }
  const payments=context.permissions.includes('finance.view')?(scoped.tables.payments || []).filter(row=>ids.has(String(row.enrollment_id))):[];
  const reversals=new Set((scoped.tables.payment_reversals || []).map(row=>row.payment_id));
  const contracts=context.permissions.includes('finance.view')?enrollments.flatMap(enrollment=>{
    const contract=(scoped.tables.financial_contracts || []).find(row=>row.enrollment_id===enrollment.id);
    if(!contract)return [];
    const versions=(scoped.tables.contract_versions || []).filter(row=>row.contract_id===contract.id);
    const activeVersion=versions.find(row=>['APPROVED','EN_COURS'].includes(String(row.status))) || versions.find(row=>row.status==='DRAFT');
    if(!activeVersion)return [];
    const amount=netContractAmount(scoped,activeVersion.id);
    return [{id:contract.id,versionId:activeVersion.id,enrollmentId:enrollment.id,reference:String(contract.reference || contract.id),status:String(activeVersion.status),amount}];
  }):[];
  const enrichedEnrollments=enrollments.map(row=>{
    const activeGroupRows=(scoped.tables.enrollment_groups || [])
      .filter(eg=>eg.enrollment_id===row.id && !eg.valid_until)
      .sort((a,b)=>String(b.valid_from || '').localeCompare(String(a.valid_from || '')));
    const currentGroupRow=activeGroupRows[0];
    const currentGroup=currentGroupRow ? (snapshot.tables.groups || []).find(g=>g.id===currentGroupRow.group_id) : undefined;
    const offeringLinks=availableEnrollmentGroupLinks(snapshot,(snapshot.tables.academic_offerings || []).filter(o=>o.id===row.offering_id));
    const availableGroups=offeringLinks.map(link=>{
      const grp=(snapshot.tables.groups || []).find(g=>g.id===link.group_id);
      return {id:String(link.group_id),name:String(grp?.name || link.group_id)};
    });
    return {
      id:row.id,
      status:row.status,
      enrolledOn:row.enrolled_on,
      currentGroupId:currentGroupRow ? String(currentGroupRow.group_id) : null,
      currentGroupName:currentGroup ? String(currentGroup.name || currentGroup.id) : null,
      currentGroupValidFrom:currentGroupRow?.valid_from ? String(currentGroupRow.valid_from) : null,
      availableGroups,
    };
  });
  return Response.json({revision:snapshot.revision,adjustmentDirectory:context.permissions.includes('finance.view')?paymentAdjustmentDirectory(scoped,ids):{payments:[],lines:[]},allocationDirectory:context.permissions.includes('finance.view')?paymentAllocationDirectory(scoped,ids):{payments:[],installments:[]},channels:context.permissions.includes('finance.view')?(snapshot.tables.annual_payment_channels || []).filter(row=>row.academic_year_id=== (enrollments[0] ? snapshot.tables.academic_offerings.find(offering=>offering.id===enrollments[0].offering_id)?.academic_year_id : null) && !row.archived_at).map(row=>({name:row.name,method:row.method})):[],enrollments:enrichedEnrollments,contracts,payments:payments.map(row=>({id:row.id,reference:row.reference,amount:row.amount,paidOn:row.paid_on,cancelled:reversals.has(row.id),pending:row.status==='PENDING'})),paid:context.permissions.includes('finance.view')?netPaymentTotal(scoped,ids):0},{headers:{'Cache-Control':'no-store'}});
}catch(error){return errorResponse(error);}}
const common={revision:z.number().int().nonnegative(),enrollmentId:z.uuid(),reason:z.string().trim().min(3).max(1000)};
const schema=z.discriminatedUnion('action',[
  z.object({...common,action:z.literal('payment'),amount:z.number().int().positive().max(2147483647),payer:z.string().trim().min(2).max(160),reference:z.string().trim().min(2).max(160),provider:z.string().trim().min(2).max(160),method:z.enum(['ESPECES','MOBILE_MONEY','VIREMENT','CHEQUE','CARTE']),paidOn:z.iso.date(),category:z.enum(['INSCRIPTION','SCOLARITE','ANNEXE']).optional()}).strict(),
  z.object({...common,action:z.literal('reallocate_payment'),paymentId:z.uuid(),targets:z.array(z.object({installmentId:z.uuid(),amount:z.number().int().positive().max(2147483647)}).strict()).min(1)}).strict(),
  z.object({...common,action:z.literal('cancel_payment'),paymentId:z.uuid()}).strict(),
  z.object({...common,action:z.literal('refund_payment'),paymentId:z.uuid(),amount:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),reference:z.string().trim().min(2).max(160)}).strict(),
  z.object({...common,action:z.literal('credit_note'),lineId:z.uuid(),amount:z.number().int().positive().max(Number.MAX_SAFE_INTEGER)}).strict(),
  z.object({...common,action:z.literal('status'),status:z.enum(['SUSPENDU','ABANDON','INSCRIT'])}).strict(),
  z.object({...common,action:z.literal('change_group'),groupId:z.uuid(),effectiveOn:z.iso.date()}).strict(),
  z.object({...common,action:z.literal('approve_contract'),dueOn:z.iso.date().optional()}).strict(),
]);
export async function POST(request:Request,{params}:Params){try{
  const data=await scope(request,(await params).matricule);
  const body=schema.parse(await request.json());
  requirePermission(data.context,(body.action==='status' || body.action==='change_group')?'student.lifecycle.manage':body.action==='cancel_payment'?'payment.cancel':'payment.record');
  const enrollment=data.enrollments.find(row=>row.id===body.enrollmentId);
  if(!enrollment)throw new RequestError(409,'L’inscription officielle doit être enregistrée dans cette année avant cette opération.');
  if(body.action==='cancel_payment' || body.action==='refund_payment' || body.action==='credit_note'){
    requirePermission(data.context,'finance.view');
    const allowed=body.action==='cancel_payment'?['DG','IT']:['RAF','IT'];
    if(!allowed.includes(data.context.roleCode))throw new RequestError(403,'Autorisation financière insuffisante.');
    const target=assertPaymentAdjustment(data.scoped,enrollment.id,body);
    const saved=await data.client.rpc('escen_payment_adjustment',{p_actor_id:data.context.accountId,p_expected_revision:body.revision,p_action:target.action,p_entity_id:target.entityId,p_amount:body.action==='cancel_payment'?null:body.amount,p_reference:body.action==='refund_payment'?body.reference:null,p_reason:body.reason});
    if(saved.error)throw new RequestError(409,'Opération financière refusée : actualisez le dossier et vérifiez les montants et références. Aucune opération partielle n’a été enregistrée.');
    return Response.json({revision:saved.data},{status:201});
  }
  const changes:PersistentChange[]=[];
  let paymentId:string|undefined;
  let allocationResult:{allocated:number;unallocated:number}|undefined;
  if(body.action==='payment' || body.action==='reallocate_payment'){
    requirePermission(data.context,'finance.view');
    if(!['RAF','IT'].includes(data.context.roleCode))throw new RequestError(403,'Autorisation financière RAF ou IT requise.');
  }
  if(body.action==='payment'){
    const selected=data.year.years.find(year=>year.id===data.year.selectedYearId);
    if(selected?.status!=='CLOTUREE' && !data.snapshot.tables.annual_payment_channels?.some(channel=>channel.academic_year_id===data.year.selectedYearId && !channel.archived_at && channel.method===body.method && channel.name===body.provider)) throw new RequestError(409,'Choisissez une caisse et un mode configurés pour cette année.');
    const id=crypto.randomUUID();
    changes.push({table:'payments',operation:'insert',record:{id,enrollment_id:enrollment.id,payer_name:body.payer,amount:body.amount,method:body.method,provider:body.provider,reference:body.reference,paid_on:body.paidOn,recorded_by:data.context.accountId,comment:body.reason}});
    changes.push({table:'receipts',operation:'insert',record:{id:crypto.randomUUID(),payment_id:id,reference:`REC-${id}`,snapshot:{matricule:data.student.matricule,academicYearId:data.year.selectedYearId,amount:body.amount,reference:body.reference,payer:payerName(body.payer),method:body.method,paidOn:body.paidOn,category:body.category,reason:body.reason},issued_by:data.context.accountId}});
    paymentId=id;
    const plan=planPaymentAllocations(data.scoped,{paymentId:id,enrollmentId:enrollment.id,amount:body.amount,actorId:data.context.accountId});
    changes.push(...plan.changes);
    allocationResult={allocated:plan.allocated,unallocated:plan.unallocated};
  }else if(body.action==='reallocate_payment'){
    paymentId=body.paymentId;
    const plan=planPaymentAllocations(data.scoped,{paymentId,enrollmentId:enrollment.id,amount:0,actorId:data.context.accountId,targets:body.targets,reason:body.reason});
    changes.push(...plan.changes);
    allocationResult={allocated:plan.allocated,unallocated:plan.unallocated};
  }else if(body.action==='approve_contract'){
    const contract=(data.snapshot.tables.financial_contracts || []).find(row=>row.enrollment_id===enrollment.id);
    const version=contract && (data.snapshot.tables.contract_versions || []).find(row=>row.contract_id===contract.id && row.status==='DRAFT');
    if(!contract || !version)throw new RequestError(409,'Aucun contrat en brouillon à approuver pour cette inscription.');
    const lines=(data.snapshot.tables.contract_lines || []).filter(row=>row.version_id===version.id);
    const discounts=(data.snapshot.tables.contract_discounts || []).filter(row=>row.version_id===version.id);
    const netTotal=lines.reduce((sum,row)=>sum+Number(row.amount || 0),0)-discounts.reduce((sum,row)=>sum+Number(row.amount || 0),0);
    if(!lines.length || netTotal<0)throw new RequestError(409,'Le contrat en brouillon ne comporte aucune ligne de frais valide.');
    const existingInstallments=(data.snapshot.tables.installments || []).filter(row=>row.version_id===version.id);
    const existingDue=existingInstallments.reduce((sum,row)=>sum+Number(row.amount || 0),0);
    if(existingDue!==netTotal){
      if(existingInstallments.length>0)throw new RequestError(409,'L’échéancier existant ne correspond pas au montant net du contrat.');
      if(netTotal>0){
        const dueDate=body.dueOn || String(enrollment.enrolled_on || new Date().toISOString().slice(0,10));
        changes.push({table:'installments',operation:'insert',record:{id:crypto.randomUUID(),version_id:version.id,position:1,due_on:dueDate,amount:netTotal,description:`Échéance contractuelle · ${contract.reference || contract.id}`}});
      }
    }
    changes.push({table:'contract_versions',operation:'update',record:{id:version.id,status:'APPROVED',approved_by:data.context.accountId,approved_at:new Date().toISOString(),reason:body.reason}});
  }else if(body.action==='change_group'){
    if(!['INSCRIT','REINSCRIT'].includes(String(enrollment.status)))throw new RequestError(409,'Seul un étudiant inscrit ou réinscrit peut changer de groupe.');
    const selected=data.year.years.find(year=>year.id===data.year.selectedYearId);
    if(!selected || selected.status==='CLOTUREE')throw new RequestError(409,'L’année scolaire est clôturée : le changement de groupe n’est plus autorisé.');
    if(body.effectiveOn<selected.starts_on || body.effectiveOn>selected.ends_on)throw new RequestError(400,'La date d’effet doit appartenir à l’année scolaire sélectionnée.');
    const offeringLinks=availableEnrollmentGroupLinks(data.snapshot,(data.snapshot.tables.academic_offerings || []).filter(o=>o.id===enrollment.offering_id));
    if(!offeringLinks.some(link=>link.group_id===body.groupId))throw new RequestError(409,'Choisissez un groupe actif rattaché à la même formation et au même niveau.');
    const activeGroupRows=(data.snapshot.tables.enrollment_groups || [])
      .filter(eg=>eg.enrollment_id===enrollment.id && !eg.valid_until)
      .sort((a,b)=>String(b.valid_from || '').localeCompare(String(a.valid_from || '')));
    const currentGroupRow=activeGroupRows[0];
    if(currentGroupRow?.group_id===body.groupId)throw new RequestError(409,'L’étudiant est déjà affecté à ce groupe.');
    if(currentGroupRow){
      if(currentGroupRow.valid_from && body.effectiveOn<=String(currentGroupRow.valid_from))throw new RequestError(400,'La date d’effet doit être postérieure au début de l’affectation de groupe actuelle.');
      changes.push({table:'enrollment_groups',operation:'update',record:{id:currentGroupRow.id,valid_until:body.effectiveOn,changed_by:data.context.accountId,reason:body.reason}});
    }
    changes.push({table:'enrollment_groups',operation:'insert',record:{id:crypto.randomUUID(),enrollment_id:enrollment.id,offering_id:enrollment.offering_id,group_id:body.groupId,valid_from:body.effectiveOn,changed_by:data.context.accountId,reason:body.reason}});
  }else{
    if(['DIPLOME','ABANDON'].includes(String(enrollment.status)) || body.status===enrollment.status)throw new RequestError(409,'Ce changement de statut nécessite une décision académique distincte.');
    changes.push({table:'enrollments',operation:'update',record:{id:enrollment.id,status:body.status}});
    changes.push({table:'enrollment_events',operation:'insert',record:{id:crypto.randomUUID(),enrollment_id:enrollment.id,old_status:enrollment.status,new_status:body.status,actor_id:data.context.accountId,reason:body.reason}});
  }
  const saved=await data.client.rpc(paymentId?'escen_payment_transaction':'escen_backend_transaction',{p_actor_id:data.context.accountId,p_expected_revision:body.revision,p_changes:changes,...(paymentId?{p_action:body.action==='payment'?'record':'reallocate',p_payment_id:paymentId}:{})});
  if(saved.error)throw new RequestError(409,'Enregistrement refusé : actualisez le dossier et vérifiez les références. Aucune opération partielle n’a été conservée.');
  return Response.json({revision:saved.data,...allocationResult},{status:201});
}catch(error){return errorResponse(error instanceof PaymentAllocationError || error instanceof PaymentAdjustmentError?new RequestError(409,error.message):error);}}
function payerName(value:string){return value;}
