import type {PersistentChange, RelationalSnapshot} from '@/types/persistence';
import type {ContractAmendmentInput, ContractAmendmentOption} from '@/types/contractAmendment';
import {activePaymentAllocations, effectivePayments, planPaymentAllocations} from './paymentAllocationService';
import {netContractAmount} from './financialProjectionService';
export class ContractAmendmentError extends Error {}

export function contractAmendmentOptions(snapshot: RelationalSnapshot, enrollmentIds: Set<string>): ContractAmendmentOption[] {
  const tables=snapshot.tables;
  return (tables.enrollments || []).filter(e=>enrollmentIds.has(e.id) && ['INSCRIT','REINSCRIT'].includes(String(e.status))).flatMap(enrollment=>{
    const offering=tables.academic_offerings?.find(row=>row.id===enrollment.offering_id && !row.archived_at);
    const program=tables.curricula?.find(row=>row.id===offering?.curriculum_id)?.program_id;
    if(!offering || !tables.academic_years?.some(row=>row.id===offering.academic_year_id && row.status==='OUVERTE') || !tables.programs?.some(row=>row.id===program && row.double_degree_eligible===true && !row.archived_at && row.active!==false))return [];
    const contract=tables.financial_contracts?.find(row=>row.enrollment_id===enrollment.id);
    const versions=(tables.contract_versions || []).filter(row=>row.contract_id===contract?.id);
    const version=versions.find(row=>row.status==='APPROVED');
    if(!contract || !version || versions.some(row=>row.status==='DRAFT') || enrollment.double_degree===true)return [];
    const lines=(tables.contract_lines || []).filter(row=>row.version_id===version.id);
    const category=(id:unknown)=>tables.fee_types?.find(row=>row.id===id)?.category;
    const registration=lines.filter(row=>category(row.fee_type_id)==='INSCRIPTION');
    const tuition=lines.filter(row=>category(row.fee_type_id)==='SCOLARITE');
    if(lines.length!==2 || registration.length!==1 || tuition.length!==1)return [];
    if(tables.contract_discounts?.some(row=>row.version_id===version.id) || tables.credit_notes?.some(row=>lines.some(line=>line.id===row.line_id)))return [];
    if(activePaymentAllocations(snapshot).some(row=>row.enrollment_id===enrollment.id) || tables.refunds?.some(row=>tables.payments?.some(p=>p.id===row.payment_id && p.enrollment_id===enrollment.id)))return [];
    return (tables.annual_fee_schedules || []).filter(row=>row.category==='SCOLARITE' && row.double_degree===true && !row.archived_at && row.academic_year_id===offering.academic_year_id && row.program_id===program && (!row.level_id || row.level_id===offering.level_id) && (!row.delivery_mode || row.delivery_mode===offering.delivery_mode)).map(fee=>({enrollmentId:enrollment.id,versionId:version.id,feeId:fee.id,tuition:Number(fee.amount),registration:Number(registration[0].amount),currentTotal:netContractAmount(snapshot,version.id)}));
  });
}

export function planContractAmendment(snapshot:RelationalSnapshot,input:ContractAmendmentInput,actorId:string): PersistentChange[] {
  const option=contractAmendmentOptions(snapshot,new Set([input.enrollmentId])).find(row=>row.versionId===input.versionId && row.feeId===input.feeId);
  if(!option)throw new ContractAmendmentError('Avenant indisponible : vérifiez le contrat, la filière, les remises et les affectations existantes.');
  if(!Number.isFinite(input.discountPercent) || input.discountPercent<0 || input.discountPercent>=100 || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueOn) || input.reason.trim().length<3 || input.reason.trim().length>1000)throw new ContractAmendmentError('Remise, échéance ou motif invalide.');
  const enrollment=snapshot.tables.enrollments.find(row=>row.id===input.enrollmentId)!;
  const offering=snapshot.tables.academic_offerings.find(row=>row.id===enrollment.offering_id)!;
  const year=snapshot.tables.academic_years.find(row=>row.id===offering.academic_year_id)!;
  if(input.dueOn<String(year.starts_on) || input.dueOn>String(year.ends_on))throw new ContractAmendmentError('L’échéance doit appartenir à l’année sélectionnée.');
  const oldVersion=snapshot.tables.contract_versions.find(row=>row.id===input.versionId)!;
  const oldLines=snapshot.tables.contract_lines.filter(row=>row.version_id===oldVersion.id);
  const versionId=crypto.randomUUID();
  const reason=input.reason.trim();
  const discount=Math.round(option.tuition*input.discountPercent/100);
  const changes:PersistentChange[]=[{table:'contract_versions',operation:'insert',record:{id:versionId,contract_id:oldVersion.contract_id,version:Math.max(...snapshot.tables.contract_versions.filter(row=>row.contract_id===oldVersion.contract_id).map(row=>Number(row.version)))+1,status:'DRAFT',supersedes_id:oldVersion.id,reason}}];
  let position=0;
  for(const old of oldLines){
    const tuition=snapshot.tables.fee_types.find(row=>row.id===old.fee_type_id)?.category==='SCOLARITE';
    const lineId=crypto.randomUUID(),amount=tuition?option.tuition:Number(old.amount),net=amount-(tuition?discount:0);
    changes.push({table:'contract_lines',operation:'insert',record:{id:lineId,contract_id:oldVersion.contract_id,version_id:versionId,fee_type_id:old.fee_type_id,description:tuition?'Scolarité double diplomation':String(old.description),amount}});
    if(tuition && discount>0)changes.push({table:'contract_discounts',operation:'insert',record:{id:crypto.randomUUID(),line_id:lineId,version_id:versionId,amount:discount,reason:`${reason} · Remise individuelle ${input.discountPercent} %`}});
    if(net>0)changes.push({table:'installments',operation:'insert',record:{id:crypto.randomUUID(),version_id:versionId,position:++position,due_on:input.dueOn,amount:net,description:tuition?'Scolarité double diplomation après remise':'Inscription'}});
  }
  changes.push({table:'contract_versions',operation:'update',record:{id:oldVersion.id,status:'SUPERSEDED'}},
    {table:'contract_versions',operation:'update',record:{id:versionId,status:'APPROVED',approved_by:actorId,approved_at:new Date().toISOString()}},
    {table:'enrollments',operation:'update',record:{id:enrollment.id,double_degree:true}},
    {table:'enrollment_events',operation:'insert',record:{id:crypto.randomUUID(),enrollment_id:enrollment.id,old_status:enrollment.status,new_status:enrollment.status,actor_id:actorId,reason:`${reason} · Choix de la double diplomation et avenant financier`}});
  const projected:RelationalSnapshot={revision:snapshot.revision,tables:Object.fromEntries(Object.entries(snapshot.tables).map(([key,rows])=>[key,rows.map(row=>({...row}))]))};
  const project=(batch:PersistentChange[])=>{for(const change of batch){const rows=projected.tables[change.table] ||= [];if(change.operation==='insert')rows.push({...change.record,id:String(change.record.id)});else{const row=rows.find(row=>row.id===change.record.id);if(row)Object.assign(row,change.record);}}};
  project(changes);
  const payments=effectivePayments(snapshot).filter(row=>row.enrollment_id===enrollment.id).sort((a,b)=>String(a.paid_on || '').localeCompare(String(b.paid_on || '')) || a.id.localeCompare(b.id));
  for(const payment of payments){
    const plan=planPaymentAllocations(projected,{paymentId:payment.id,enrollmentId:enrollment.id,amount:Number(payment.amount),actorId});
    changes.push(...plan.changes);project(plan.changes);
  }
  if(changes.length>100)throw new ContractAmendmentError('Cet avenant dépasse la taille maximale d’une transaction. Aucun changement enregistré.');
  return changes;
}
