import type {DatabaseRow,RelationalSnapshot} from '@/types/persistence';

export type ScholarshipFinancialStatus='APPROVED'|'DRAFT'|'NOT_APPLIED'|'NO_CONTRACT';

/** Show the saved attribution terms, independently of later catalogue edits. */
export function scholarshipSavedTerms(award:DatabaseRow,catalog?:DatabaseRow){
  const saved=award.terms_snapshot;
  return saved && typeof saved==='object' && !Array.isArray(saved)?saved as Record<string,unknown>:catalog || {};
}

export function scholarshipFinancialEffect(snapshot:RelationalSnapshot,award:DatabaseRow):{financialStatus:ScholarshipFinancialStatus;appliedAmount:number}{
  const contract=snapshot.tables.financial_contracts?.find(row=>row.enrollment_id===award.enrollment_id);
  if(!contract)return {financialStatus:'NO_CONTRACT',appliedAmount:0};
  const versions=(snapshot.tables.contract_versions || []).filter(row=>row.contract_id===contract.id);
  const active=versions.find(row=>row.status==='APPROVED' || row.status==='EN_COURS') || versions.find(row=>row.status==='DRAFT');
  const discounts=(snapshot.tables.contract_discounts || []).filter(row=>row.version_id===active?.id && row.scholarship_award_id===award.id);
  const appliedAmount=discounts.reduce((sum,row)=>sum+Number(row.amount || 0),0);
  if(!active || appliedAmount<=0)return {financialStatus:'NOT_APPLIED',appliedAmount:0};
  return {financialStatus:active.status==='DRAFT'?'DRAFT':'APPROVED',appliedAmount};
}
