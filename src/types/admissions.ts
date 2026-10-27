import type { OnlineApplication, WebsiteIntake } from './website';

export const APPLICATION_STAGES = {
  NOUVELLE: 'Nouvelle candidature', RECUE: 'Candidature reçue', VERIFICATION_ADMISSION: 'En vérification admission',
  INCOMPLET: 'Dossier incomplet', A_COMPLETER: 'Dossier à compléter', COMPLET: 'Dossier complet',
  TRANSMIS_ACADEMIE: 'Transmis à l’académie', ETUDE_ACADEMIQUE: 'En étude académique',
  ADMISSIBLE: 'Admissible', ATTENTE_PAIEMENT: 'En attente de paiement', ADMIS_OFFICIEL: 'Admis officiellement', REFUSE: 'Refusé',
} as const;
export type ApplicationStage = keyof typeof APPLICATION_STAGES;
export type AdmissionAction = 'acknowledge' | 'review' | 'incomplete' | 'request_changes' | 'complete' | 'transmit' | 'study' | 'admissible' | 'refuse' | 'await_payment' | 'confirm_payment' | 'reverse_payment' | 'contact' | 'create_student';
export interface ApplicationEvent { id: string; action: string; from_stage: ApplicationStage | null; to_stage: ApplicationStage | null; reason: string; created_at: string; }
export interface ApplicationLetter { id: string; kind: 'ADMISSIBILITE' | 'REFUS' | 'ADMISSION'; reference: string; content: string; created_at: string; }
export interface ApplicationPayment { id: string; kind: 'PAYMENT' | 'REVERSAL'; amount: number; reference: string; created_at: string; reversal_of: string | null; }
export interface AdmissionApplication extends OnlineApplication {
  academic_year_name?: string; intake_level_id?: string; intake_program_id?: string;
  workflow_stage: ApplicationStage | null; entry_channel: 'WEB' | 'ACCUEIL'; requested_changes: string | null;
  registration_fee_due: number | null; registration_fee_paid: number; student_id: string | null;
  required_documents: string[]; events: ApplicationEvent[]; letters: ApplicationLetter[]; registration_payments: ApplicationPayment[];
}
export interface ApplicationNotice { id: string; application_id: string; message: string; created_at: string; }
export interface AdmissionsContext {
  enabled: boolean; applications: AdmissionApplication[]; intakes: WebsiteIntake[];
  capabilities: { review: boolean; decide: boolean; payment: boolean; followup: boolean };
  payment_channels: { id: string; name: string; method: string }[]; notices: ApplicationNotice[];
  mail_configured: boolean;
}
export interface CandidateDossier {
  application: AdmissionApplication; consent_recorded: boolean;
}
