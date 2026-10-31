import { z } from 'zod';
import { diplomaSchema, guardianSchema, identitySchema } from './websiteService';
import { APPLICATION_STAGES, type AdmissionAction, type AdmissionApplication, type ApplicationStage } from '@/types/admissions';

export const applicationIntakeSchema = z.object({ identity: identitySchema.extend({ adresse: z.string().trim().min(1).max(1000) }), diploma: diplomaSchema,
  intake_id: z.uuid(), guardians: z.array(guardianSchema.extend({ lien: z.string().trim().min(1).max(100) })).min(1).max(5), consent: z.literal(true) }).strict();
const command = { id: z.uuid(), version: z.number().int().positive(), reason: z.string().trim().min(3).max(1000) };
export const admissionCommandSchema = z.discriminatedUnion('action', [
  z.object({ ...command, action: z.enum(['acknowledge','review','incomplete','request_changes','transmit','study','admissible','refuse','await_payment','contact']) }).strict(),
  z.object({ ...command, action: z.literal('complete'), checked_documents: z.array(z.uuid()).max(24), identity_checked: z.literal(true), guardians_checked: z.literal(true) }).strict(),
  z.object({ ...command, action: z.literal('confirm_payment'), amount: z.number().int().positive().max(999999999999), channel_id: z.uuid(), reference: z.string().trim().min(3).max(160) }).strict(),
  z.object({ ...command, action: z.literal('reverse_payment'), payment_id: z.uuid() }).strict(),
  z.object({ ...command, action: z.literal('create_student'), matricule: z.string().trim().min(1).max(160).optional(), existing_student_id: z.uuid().nullable() }).strict(),
]);
export function stageLabel(application: Pick<AdmissionApplication, 'workflow_stage' | 'legacy_state' | 'status' | 'student_id'>): string {
  if (application.student_id || application.legacy_state?.admitted || application.legacy_state?.validated || application.workflow_stage === 'ADMIS_OFFICIEL') return 'Inscrit';
  if (application.workflow_stage) return APPLICATION_STAGES[application.workflow_stage];
  if (application.status === 'BROUILLON') return 'Brouillon';
  return 'Non finalisé';
}

export type MacroStage = 'ALL' | 'NON_FINALISE' | 'VALIDE' | 'ETUDE' | 'ACADEMIE' | 'CORRIGER' | 'REJETE';

export const MACRO_STAGES: { id: MacroStage; label: string; dot: 'blue' | 'amber' | 'green' | 'purple' | 'sky' | 'orange' | 'red' }[] = [
  { id: 'ALL', label: 'TOTAL', dot: 'blue' },
  { id: 'NON_FINALISE', label: 'NON FINALISÉS', dot: 'amber' },
  { id: 'VALIDE', label: 'INSCRITS / VALIDÉS', dot: 'green' },
  { id: 'ETUDE', label: 'EN ÉTUDE ACADÉMIQUE', dot: 'purple' },
  { id: 'ACADEMIE', label: 'À L’ACADÉMIE', dot: 'sky' },
  { id: 'CORRIGER', label: 'À CORRIGER', dot: 'orange' },
  { id: 'REJETE', label: 'REJETÉS', dot: 'red' },
];

export function getApplicationMacroStage(item: AdmissionApplication): MacroStage {
  if (item.workflow_stage === 'REFUSE') return 'REJETE';
  if (item.workflow_stage === 'TRANSMIS_ACADEMIE') return 'ACADEMIE';
  if (['INCOMPLET', 'A_COMPLETER'].includes(item.workflow_stage || '')) return 'CORRIGER';
  if (['ADMISSIBLE', 'ATTENTE_PAIEMENT', 'ADMIS_OFFICIEL'].includes(item.workflow_stage || '') || Boolean(item.student_id) || Boolean(item.legacy_student_id) || Boolean(item.legacy_state?.admitted) || Boolean(item.legacy_state?.validated)) return 'VALIDE';
  if (item.workflow_stage === 'ETUDE_ACADEMIQUE' || item.workflow_stage === 'COMPLET') return 'ETUDE';
  return 'NON_FINALISE';
}

export function stageBadge(item: AdmissionApplication): { label: string; tone: string } {
  if (item.student_id || item.legacy_student_id || item.legacy_state?.admitted || item.legacy_state?.validated || item.workflow_stage === 'ADMIS_OFFICIEL') {
    return { label: 'INSCRIT', tone: 'success' };
  }
  const macro = getApplicationMacroStage(item);
  switch (macro) {
    case 'VALIDE':
      return {
        label: item.workflow_stage === 'ATTENTE_PAIEMENT' ? 'ATTENTE PAIEMENT' : 'INSCRIT',
        tone: 'success',
      };
    case 'NON_FINALISE':
      return { label: 'NON FINALISÉ', tone: 'warning' };
    case 'ETUDE':
      return { label: 'EN ÉTUDE', tone: 'purple' };
    case 'ACADEMIE':
      return { label: 'À L’ACADÉMIE', tone: 'sky' };
    case 'CORRIGER':
      return { label: 'À CORRIGER', tone: 'warning' };
    case 'REJETE':
      return { label: 'REJETÉ', tone: 'danger' };
    default:
      return { label: 'NON FINALISÉ', tone: 'warning' };
  }
}
export const ADMISSION_ACTIONS: Record<AdmissionAction, { label: string; from: (ApplicationStage | null)[]; capability: 'review' | 'decide' | 'payment' | 'followup' }> = {
  acknowledge: { label: 'Accuser réception', from: ['NOUVELLE'], capability: 'review' },
  review: { label: 'Vérifier le dossier', from: [null,'NOUVELLE','RECUE','INCOMPLET','A_COMPLETER'], capability: 'review' },
  incomplete: { label: 'Signaler un dossier incomplet', from: ['VERIFICATION_ADMISSION'], capability: 'review' },
  request_changes: { label: 'Demander un complément', from: ['VERIFICATION_ADMISSION','INCOMPLET','COMPLET'], capability: 'review' },
  complete: { label: 'Valider la complétude', from: ['VERIFICATION_ADMISSION'], capability: 'review' },
  transmit: { label: 'Passer à l’académie', from: ['COMPLET'], capability: 'review' },
  study: { label: 'Commencer l’étude académique', from: ['TRANSMIS_ACADEMIE'], capability: 'decide' },
  admissible: { label: 'Déclarer admissible', from: ['ETUDE_ACADEMIQUE'], capability: 'decide' },
  refuse: { label: 'Refuser la candidature', from: ['ETUDE_ACADEMIQUE'], capability: 'decide' },
  await_payment: { label: 'Passer en attente de paiement', from: ['ADMISSIBLE'], capability: 'review' },
  confirm_payment: { label: 'Confirmer les frais d’inscription', from: ['ADMISSIBLE','ATTENTE_PAIEMENT'], capability: 'payment' },
  reverse_payment: { label: 'Annuler une confirmation de paiement', from: ['ADMISSIBLE','ATTENTE_PAIEMENT','ADMIS_OFFICIEL'], capability: 'payment' },
  contact: { label: 'Tracer un appel d’accompagnement', from: ['INCOMPLET','A_COMPLETER'], capability: 'followup' },
  create_student: { label: 'Créer ou relier le dossier étudiant', from: ['ADMIS_OFFICIEL'], capability: 'review' },
};
export function applicationLetterHtml(reference: string, content: string) {
  const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]!);
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(reference)} · ESCEN</title><style>body{font:16px/1.7 serif;max-width:760px;margin:48px auto;padding:24px;color:#182333}header{border-bottom:2px solid #182333;padding-bottom:16px}pre{font:inherit;white-space:pre-wrap}footer{margin-top:40px;font-size:13px}@media print{body{margin:0;padding:15mm}}</style><header><h1>ESCEN</h1><p>École supérieure de commerce et d’économie numérique</p></header><main><pre>${escape(content)}</pre></main><footer>Référence : ${escape(reference)}</footer></html>`;
}
