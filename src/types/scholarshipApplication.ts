/** All calculation choices must be explicit; no scholarship policy is inferred. */
export interface ScholarshipApplicationInput {
  enrollmentId:string;
  scholarshipId:string;
  lineIds:string[];
  calculationBasis:'GROSS'|'REMAINING';
  confirmStacking:boolean;
  validFrom:string;
  reason:string;
}
export interface ScholarshipInstallmentInput {id?:string;dueOn:string;amount:number;}
