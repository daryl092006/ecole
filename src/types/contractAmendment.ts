export interface ContractAmendmentOption {
  enrollmentId: string;
  versionId: string;
  feeId: string;
  tuition: number;
  currentTotal: number;
  registration: number;
}

export interface ContractAmendmentInput {
  enrollmentId: string;
  versionId: string;
  feeId: string;
  discountPercent: number;
  dueOn: string;
  reason: string;
}
