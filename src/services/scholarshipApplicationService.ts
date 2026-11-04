import type {DatabaseRow,PersistentChange,RelationalSnapshot} from '@/types/persistence';
import type {ScholarshipApplicationInput,ScholarshipInstallmentInput} from '@/types/scholarshipApplication';
import {activePaymentAllocations,effectivePayments,planPaymentAllocations} from './paymentAllocationService';
import {netContractAmount,netPaymentTotal} from './financialProjectionService';
import type {ScholarshipContractContext} from '@/types/financeSettings';

export class ScholarshipApplicationError extends Error {}
const fail=(message:string):never=>{throw new ScholarshipApplicationError(message);};
const rows=(snapshot:RelationalSnapshot,table:string)=>snapshot.tables[table] || [];
const amount=(row:DatabaseRow)=>Number(row.amount || 0);

export function scholarshipTuitionLines(snapshot:RelationalSnapshot,enrollmentId:string){
  const contract=rows(snapshot,'financial_contracts').find(row=>row.enrollment_id===enrollmentId);
  const versions=rows(snapshot,'contract_versions').filter(row=>row.contract_id===contract?.id && ['APPROVED','DRAFT','EN_COURS'].includes(String(row.status)));
  if(!contract || versions.length!==1 || !['APPROVED','DRAFT'].includes(String(versions[0].status)))return fail('Le contrat est absent, historique ou comporte plusieurs versions à traiter.');
  const lines=rows(snapshot,'contract_lines').filter(row=>row.version_id===versions[0].id);
  const tuition=lines.filter(row=>rows(snapshot,'fee_types').some(type=>type.id===row.fee_type_id && type.category==='SCOLARITE'));
  if(!tuition.length)return fail('Le contrat ne comporte aucune ligne de scolarité.');
  return {contract,version:versions[0],lines,tuition};
}

export function scholarshipContractContext(snapshot:RelationalSnapshot,enrollmentId:string):ScholarshipContractContext{
  try{
    const enrollment=rows(snapshot,'enrollments').find(row=>row.id===enrollmentId && !row.archived_at);
    const offering=rows(snapshot,'academic_offerings').find(row=>row.id===enrollment?.offering_id && !row.archived_at);
    if(!rows(snapshot,'academic_years').some(row=>row.id===offering?.academic_year_id && row.status==='OUVERTE'))return {eligible:false,blockingReason:'Une inscription dans une année ouverte est requise.'};
    const {version,lines,tuition}=scholarshipTuitionLines(snapshot,enrollmentId);
    if(rows(snapshot,'credit_notes').some(note=>lines.some(line=>line.id===note.line_id)))return {eligible:false,blockingReason:'Le contrat comporte un avoir : une révision spécifique est nécessaire.'};
    const allDiscounts=rows(snapshot,'contract_discounts').filter(row=>row.version_id===version.id);
    const tuitionDiscounts=allDiscounts.filter(row=>tuition.some(line=>line.id===row.line_id)).reduce((sum,row)=>sum+amount(row),0);
    const existingReductions=allDiscounts.reduce((sum,row)=>sum+amount(row),0);
    const tuitionGross=tuition.reduce((sum,row)=>sum+amount(row),0);
    return {eligible:true,versionId:version.id,status:String(version.status),tuitionGross,tuitionRemaining:tuitionGross-tuitionDiscounts,existingReductions,hasExistingBenefits:allDiscounts.length>0 || rows(snapshot,'scholarship_awards').some(row=>row.enrollment_id===enrollmentId && !row.revoked_at),currentTotal:netContractAmount(snapshot,version.id),registration:lines.filter(line=>rows(snapshot,'fee_types').some(type=>type.id===line.fee_type_id && type.category==='INSCRIPTION')).reduce((sum,row)=>sum+amount(row),0)};
  }catch(error){return {eligible:false,blockingReason:error instanceof Error?error.message:'Contrat indisponible.'};}
}

/** Exact distribution of an integer amount; no fractional FCFA is persisted. */
function distribute(total:number,weights:number[]){
  const sum=weights.reduce((a,b)=>a+b,0);
  if(!Number.isSafeInteger(total) || total<0 || (total>0 && sum<=0))return fail('Répartition des montants invalide.');
  if(sum===0)return weights.map(()=>0);
  const shares=weights.map((weight,index)=>({index,value:Number(BigInt(total)*BigInt(weight)/BigInt(sum)),residue:BigInt(total)*BigInt(weight)%BigInt(sum)}));
  let remaining=total-shares.reduce((n,row)=>n+row.value,0);
  const ordered=[...shares].sort((a,b)=>a.residue===b.residue?a.index-b.index:a.residue>b.residue?-1:1);
  for(const share of ordered)if(remaining>0){share.value++;remaining--;}
  return shares.map(row=>row.value);
}

export function previewScholarshipApplication(snapshot:RelationalSnapshot,input:ScholarshipApplicationInput){
  const enrollment=rows(snapshot,'enrollments').find(row=>row.id===input.enrollmentId && !row.archived_at);
  const offering=rows(snapshot,'academic_offerings').find(row=>row.id===enrollment?.offering_id && !row.archived_at);
  const year=rows(snapshot,'academic_years').find(row=>row.id===offering?.academic_year_id);
  if(!enrollment || !year || year.status!=='OUVERTE')return fail('Une inscription dans une année ouverte est requise.');
  if(input.validFrom<String(year.starts_on) || input.validFrom>String(year.ends_on))return fail('La date d’effet doit appartenir à l’année de l’inscription.');
  const scholarship=rows(snapshot,'scholarships').find(row=>row.id===input.scholarshipId && row.active===true);
  if(!scholarship)return fail('Cette bourse est absente ou inactive.');
  if(rows(snapshot,'scholarship_awards').some(row=>row.enrollment_id===enrollment.id && row.scholarship_id===scholarship.id && !row.revoked_at))return fail('Cette bourse est déjà attribuée : aucune attribution supplémentaire.');
  const contract=rows(snapshot,'financial_contracts').find(row=>row.enrollment_id===enrollment.id);
  const versions=rows(snapshot,'contract_versions').filter(row=>row.contract_id===contract?.id);
  const current=versions.filter(row=>['APPROVED','DRAFT','EN_COURS'].includes(String(row.status)));
  if(!contract || current.length!==1 || !['APPROVED','DRAFT'].includes(String(current[0].status)))return fail('Le contrat est absent, historique ou comporte plusieurs versions à traiter.');
  const version=current[0];
  const lines=rows(snapshot,'contract_lines').filter(row=>row.version_id===version.id);
  const discounts=rows(snapshot,'contract_discounts').filter(row=>row.version_id===version.id);
  if(rows(snapshot,'credit_notes').some(note=>lines.some(line=>line.id===note.line_id)))return fail('Le contrat comporte un avoir : un traitement de révision spécifique est requis.');
  if(!input.lineIds.length || new Set(input.lineIds).size!==input.lineIds.length || input.lineIds.some(id=>!lines.some(line=>line.id===id)))return fail('Choisissez des lignes de frais distinctes du contrat concerné.');
  const targets=input.lineIds.map(id=>lines.find(line=>line.id===id)!);
  if(targets.some(line=>!rows(snapshot,'fee_types').some(type=>type.id===line.fee_type_id && type.category==='SCOLARITE')))return fail('Une bourse réduit uniquement la scolarité. Les frais d’inscription restent inchangés.');
  const alreadyDiscounted=(line:DatabaseRow)=>discounts.filter(row=>row.line_id===line.id).reduce((n,row)=>n+amount(row),0);
  if(!input.confirmStacking && (discounts.length>0 || rows(snapshot,'scholarship_awards').some(row=>row.enrollment_id===enrollment.id && !row.revoked_at)))return fail('Une réduction ou une bourse existe déjà. Une décision explicite de cumul est requise.');
  const weights=targets.map(line=>input.calculationBasis==='GROSS'?amount(line):amount(line)-alreadyDiscounted(line));
  if(weights.some(value=>!Number.isSafeInteger(value) || value<0))return fail('Base de calcul invalide.');
  const base=weights.reduce((n,value)=>n+value,0);
  const reduction=scholarship.kind==='POURCENTAGE'?Math.round(base*Number(scholarship.percent)/100):Number(scholarship.amount);
  if(!Number.isSafeInteger(reduction) || reduction<=0)return fail('La bourse ne produit aucune réduction positive sur ces frais.');
  const shares=distribute(reduction,weights);
  if(targets.some((line,index)=>shares[index]>amount(line)-alreadyDiscounted(line)))return fail('La réduction dépasserait les frais restants : ajustez le périmètre ou la base de calcul.');
  const oldTotal=netContractAmount(snapshot,version.id),newTotal=oldTotal-reduction;
  if(newTotal<0)return fail('Le montant contractuel ne peut pas devenir négatif.');
  const paid=netPaymentTotal(snapshot,new Set([enrollment.id]));
  const installments=rows(snapshot,'installments').filter(row=>row.version_id===version.id).sort((a,b)=>Number(a.position)-Number(b.position));
  const proposed=installments.length?distribute(newTotal,installments.map(amount)):[];
  return {enrollment,year,scholarship,contract,version,lines,discounts,installments,targets,shares,base,reduction,oldTotal,newTotal,paid,
    remaining:Math.max(0,newTotal-paid),unallocatedCredit:Math.max(0,paid-newTotal),
    suggestedInstallments:installments.map((row,index)=>({id:row.id,dueOn:String(row.due_on),amount:proposed[index]}))};
}

/** The caller must validate the chosen schedule in ReviewedForm before applying. */
export function planScholarshipApplication(snapshot:RelationalSnapshot,input:ScholarshipApplicationInput,schedule:ScholarshipInstallmentInput[],actorId:string):PersistentChange[]{
  const preview=previewScholarshipApplication(snapshot,input);
  const {version,contract,enrollment,year}=preview;
  if(input.reason.trim().length<3 || input.reason.trim().length>1000)return fail('Un motif de 3 à 1000 caractères est requis.');
  const scheduleIds=schedule.flatMap(row=>row.id?[row.id]:[]);
  if(new Set(scheduleIds).size!==scheduleIds.length)return fail('Une échéance ne peut pas être sélectionnée plusieurs fois.');
  if(scheduleIds.some(id=>!preview.installments.some(row=>row.id===id)))return fail('Une échéance ne fait pas partie du contrat concerné.');
  if(schedule.some(row=>!Number.isSafeInteger(row.amount) || row.amount<0 || ((row.dueOn<String(year.starts_on) || row.dueOn>String(year.ends_on)) && !preview.installments.some(original=>original.id===row.id && original.due_on===row.dueOn))) || schedule.reduce((n,row)=>n+row.amount,0)!==preview.newTotal)return fail('L’échéancier proposé doit correspondre au montant net et conserver des dates valides.');
  if(version.status==='DRAFT' && preview.installments.some(row=>!schedule.some(item=>item.id===row.id && item.amount>0)))return fail('Le brouillon comporte des échéances à retirer : révisez son échéancier avant attribution.');
  const awardId=crypto.randomUUID(),nextVersion=version.status==='APPROVED'?crypto.randomUUID():version.id;
  const reason=input.reason.trim();
  const changes:PersistentChange[]=[{table:'scholarship_awards',operation:'insert',record:{id:awardId,scholarship_id:input.scholarshipId,enrollment_id:enrollment.id,valid_from:input.validFrom,granted_by:actorId,reason,
    terms_snapshot:{code:preview.scholarship.code,name:preview.scholarship.name,kind:preview.scholarship.kind,percent:preview.scholarship.percent,amount:preview.scholarship.amount,line_ids:input.lineIds,calculation_basis:input.calculationBasis,stacking_confirmed:input.confirmStacking,applied_amount:preview.reduction}}}];
  const mapping=new Map<string,string>();
  if(version.status==='APPROVED')changes.push({table:'contract_versions',operation:'insert',record:{id:nextVersion,contract_id:contract.id,version:Math.max(...rows(snapshot,'contract_versions').filter(row=>row.contract_id===contract.id).map(row=>Number(row.version)))+1,status:'DRAFT',supersedes_id:version.id,reason}});
  for(const line of preview.lines){
    const id=version.status==='APPROVED'?crypto.randomUUID():line.id;mapping.set(line.id,id);
    if(version.status==='APPROVED')changes.push({table:'contract_lines',operation:'insert',record:{id,version_id:nextVersion,contract_id:contract.id,fee_type_id:line.fee_type_id,rate_id:line.rate_id || null,description:line.description,amount:line.amount}});
  }
  if(version.status==='APPROVED')for(const discount of preview.discounts)changes.push({table:'contract_discounts',operation:'insert',record:{id:crypto.randomUUID(),line_id:mapping.get(String(discount.line_id)),version_id:nextVersion,scholarship_award_id:discount.scholarship_award_id || null,amount:discount.amount,reason:discount.reason}});
  preview.targets.forEach((line,index)=>{if(preview.shares[index]>0)changes.push({table:'contract_discounts',operation:'insert',record:{id:crypto.randomUUID(),line_id:mapping.get(line.id),version_id:nextVersion,scholarship_award_id:awardId,amount:preview.shares[index],reason}});});
  let position=version.status==='DRAFT'?Math.max(0,...preview.installments.map(row=>Number(row.position))):0;
  for(const item of schedule.filter(row=>row.amount>0)){
    const existing=version.status==='DRAFT' && item.id?preview.installments.find(row=>row.id===item.id):undefined;
    if(version.status==='DRAFT' && item.id && !existing)return fail('Une échéance ne fait pas partie du contrat concerné.');
    changes.push({table:'installments',operation:existing?'update':'insert',record:{id:existing?.id || crypto.randomUUID(),version_id:nextVersion,position:existing?.position || ++position,due_on:item.dueOn,amount:item.amount,description:`Échéance après attribution de bourse · ${reason}`}});
  }
  if(version.status==='APPROVED'){
    for(const allocation of activePaymentAllocations(snapshot).filter(row=>row.enrollment_id===enrollment.id))changes.push({table:'allocation_reversals',operation:'insert',record:{id:crypto.randomUUID(),allocation_id:allocation.id,actor_id:actorId,reason}});
    changes.push({table:'contract_versions',operation:'update',record:{id:version.id,status:'SUPERSEDED'}},{table:'contract_versions',operation:'update',record:{id:nextVersion,status:'APPROVED',approved_by:actorId,approved_at:new Date().toISOString()}});
    const projected:RelationalSnapshot={revision:snapshot.revision,tables:Object.fromEntries(Object.entries(snapshot.tables).map(([key,value])=>[key,value.map(row=>({...row}))]))};
    const project=(batch:PersistentChange[])=>{for(const change of batch){const collection=projected.tables[change.table] ||= [];if(change.operation==='insert')collection.push({...change.record,id:String(change.record.id)});else Object.assign(collection.find(row=>row.id===change.record.id)!,change.record);}};
    project(changes);
    for(const payment of effectivePayments(snapshot).filter(row=>row.enrollment_id===enrollment.id).sort((a,b)=>String(a.paid_on || '').localeCompare(String(b.paid_on || '')) || a.id.localeCompare(b.id))){
      const available=amount(payment)-rows(snapshot,'refunds').filter(row=>row.payment_id===payment.id).reduce((n,row)=>n+amount(row),0);
      if(available<=0)continue;
      const plan=planPaymentAllocations(projected,{paymentId:payment.id,enrollmentId:enrollment.id,amount:available,actorId});changes.push(...plan.changes);project(plan.changes);
    }
  }
  if(changes.length>100)return fail('L’attribution dépasse la limite transactionnelle : aucun changement enregistré.');
  return changes;
}
