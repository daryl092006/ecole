import { z } from 'zod';
import { ROLES } from '@/types/permissions';
import type { PersistentContext } from '@/types/persistence';

export const DOCUMENT_LABELS: Record<string, string> = {
  photo_identite_file: 'Photo d’identité', nationalite_file: 'Pièce d’identité',
  naissance_file: 'Acte de naissance', diplome_file: 'Dernier diplôme',
  certificat_medical_file: 'Certificat médical', cv_file: 'Curriculum vitæ',
  releve_bac1: 'Relevés année 1', releve_bac2: 'Relevés année 2',
};
const short = z.string().trim().max(200);
const optional = short.optional().default('');
export const identitySchema = z.object({
  nom: short.min(1), prenom: short.min(1), genre: z.enum(['M', 'F', 'Masculin', 'Féminin', 'Homme', 'Femme']),
  date_naissance: z.iso.date().refine(value => value < new Date().toISOString().slice(0, 10)),
  lieu_naissance: short.min(1), nationalite: short.min(1), email: z.email().max(254),
  tel: z.string().trim().min(6).max(40), tel2: optional, tel3: optional,
  nom_jeune_fille: optional, numero_bordereau: optional,
  moyen_connaissance_id: z.union([short, z.number()]).optional(), moyen_connaissance_precision: optional,
}).strict();
export const diplomaSchema = z.object({
  type_diplome_id: short.min(1), numero_table: optional, annee_bac: z.union([short, z.number()]).optional(),
  serie: optional, mention_bac: optional, etablissement_diplome: optional,
}).strict();
export const guardianSchema = z.object({
  nom: short.min(1), prenom: short.min(1), profession: optional, employeur: optional,
  email: z.union([z.email().max(254), z.literal('')]).optional(), tel: z.string().trim().min(6).max(40),
  adresse: z.string().trim().max(1000).optional(), responsable_des_frais: z.enum(['1', '0']).optional(),
}).strict();
export const articleSchema = z.object({
  title: z.string().trim().min(3).max(180), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  excerpt: z.string().trim().min(3).max(500), content: z.string().trim().min(3).max(50000),
  image: z.union([z.literal(''), z.url().refine(value => new URL(value).protocol === 'https:')]),
  status: z.enum(['BROUILLON', 'PUBLIE', 'RETIRE']),
}).strict();
export const intakeSchema = z.object({
  academic_year_id: z.uuid(), level_id: z.uuid(), program_id: z.uuid(), label: short.min(3), active: z.boolean(),
  required_documents: z.array(z.enum(Object.keys(DOCUMENT_LABELS) as [string, ...string[]])).max(8),
}).strict();
export function websiteAccess(context: PersistentContext) {
  const global = context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id);
  const admissions = global && [ROLES.DG, ROLES.DGA, ROLES.DA, ROLES.LOG, ROLES.RAF, ROLES.IT].includes(context.role as typeof ROLES.DG) && context.permissions.includes('student.view');
  return {
    admissions,
    manageAdmissions: admissions && context.permissions.includes('student.lifecycle.manage'),
    articles: global && context.permissions.includes('communication.view'),
    manageArticles: global && context.permissions.includes('communication.manage'),
  };
}
export function escapeArticleContent(content: string) {
  return content.split(/\n\s*\n/).map(paragraph => `<p>${paragraph.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character).replaceAll('\n', '<br>')}</p>`).join('');
}
export function sniffDocument(bytes: Uint8Array): string | undefined {
  if (Buffer.from(bytes.subarray(0, 5)).toString() === '%PDF-') return 'application/pdf';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
}
