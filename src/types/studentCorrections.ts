export interface StudentCorrectionEnrollment {
  ticketId: string;
  id: string;
  offeringId: string;
  siteId: string;
  label: string;
  groupLabel: string;
  suggestedOfferingId?: string;
  suggestedGroupId?: string;
}
export interface StudentCorrectionOffering {
  id: string;
  siteId: string;
  label: string;
  groups: { id: string; label: string }[];
}
export interface StudentProgramCorrectionDirectory {
  enrollments: StudentCorrectionEnrollment[];
  offerings: StudentCorrectionOffering[];
}
