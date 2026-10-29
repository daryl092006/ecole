import { z } from 'zod';
import { ROLES } from '@/types/permissions';
import type { PersistentContext } from '@/types/persistence';

export const DOCUMENT_LABELS: Record<string, string> = {
  photo_identite_file: 'Photo d’identité', nationalite_file: 'Pièce d’identité',
  naissance_file: 'Acte de naissance', diplome_file: 'Dernier diplôme',
  certificat_medical_file: 'Certificat médical', cv_file: 'Curriculum vitæ',
  releve_bac1: 'Relevés année 1', releve_bac2: 'Relevés année 2',
};

const DISPLAY_DOCUMENT_LABELS: Record<string, string> = {
  ...DOCUMENT_LABELS,
  photo: 'Photo d’identité',
  naissance: 'Acte de naissance',
  acte_de_naissance: 'Acte de naissance',
  carte_nationale_d_identite_ou_passeport: 'Carte d’identité ou passeport',
  cni: 'Carte d’identité ou passeport',
  nationalite: 'Certificat de nationalité ou pièce d’identité',
  attestation_du_bac: 'Attestation du BAC',
  releve_de_notes_du_bac: 'Relevé de notes du BAC',
  diplome: 'Dernier diplôme',
  attestation_diplome: 'Attestation de diplôme',
  cv: 'Curriculum vitæ',
  certificat_medical: 'Certificat médical',
  lettre_de_motivation: 'Lettre de motivation',
};

export function formatDocumentLabel(key: string): string {
  if (DISPLAY_DOCUMENT_LABELS[key]) return DISPLAY_DOCUMENT_LABELS[key];
  const cleaned = String(key || '').replace(/_file$/, '').replaceAll('_', ' ').trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Pièce jointe';
}

export function slugifyWebsiteText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180)
    .replace(/-+$/g, '');
}

export function cleanCandidatePhone(value: unknown): string {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 6 ? raw : '';
}

function formatCandidateDate(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return raw;
}

export function formatCandidateIdentity(identity: Record<string, unknown>): Array<{ label: string; value: string }> {
  const genreRaw = String(identity.genre ?? '').trim();
  const genre = genreRaw === 'M' ? 'Masculin' : genreRaw === 'F' ? 'Féminin' : genreRaw;
  const entries: Array<[string, string]> = [
    ['Prénom', String(identity.prenom ?? '').trim()],
    ['Nom', String(identity.nom ?? '').trim()],
    ['Nom de naissance', String(identity.nom_jeune_fille ?? '').trim()],
    ['Genre', genre],
    ['Date de naissance', formatCandidateDate(identity.date_naissance)],
    ['Lieu de naissance', String(identity.lieu_naissance ?? '').trim()],
    ['Nationalité', String(identity.nationalite ?? '').trim()],
    ['Email', String(identity.email ?? '').trim()],
    ['Téléphone', cleanCandidatePhone(identity.tel)],
    ['Téléphone secondaire', cleanCandidatePhone(identity.tel2)],
    ['Autre téléphone', cleanCandidatePhone(identity.tel3)],
    ['Adresse', String(identity.adresse ?? '').trim()],
    ['Numéro de bordereau', String(identity.numero_bordereau ?? '').trim()],
  ];
  return entries.filter(([, value]) => Boolean(value)).map(([label, value]) => ({ label, value }));
}

export function formatCandidateGuardians(guardians: Array<Record<string, unknown>>): Array<{ name: string; details: string }> {
  return (guardians || []).map(guardian => {
    const name = [String(guardian.prenom ?? '').trim(), String(guardian.nom ?? '').trim()].filter(Boolean).join(' ').trim();
    const details = [
      String(guardian.lien ?? '').trim(),
      String(guardian.profession ?? '').trim(),
      cleanCandidatePhone(guardian.tel),
      String(guardian.email ?? '').trim(),
      String(guardian.adresse ?? '').trim(),
    ].filter(Boolean).join(' · ');
    return { name, details };
  }).filter(item => Boolean(item.name || item.details));
}
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
  annee_diplome: z.union([z.literal(''), z.coerce.number().int().min(1900).max(new Date().getFullYear())]).optional(),
  intitule_diplome: optional, specialite_diplome: optional, mention_diplome: optional,
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
export const brochureSchema = z.object({
  id: z.uuid().optional(), version: z.number().int().positive().optional(),
  title: z.string().trim().min(3).max(180),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  description: z.string().trim().max(500),
  status: z.enum(['BROUILLON', 'PUBLIE', 'RETIRE']),
  reason: z.string().trim().min(3).max(1000),
  program_id: z.uuid().nullable().default(null),
  cycle: z.enum(['LICENCE', 'MASTER', 'EXECUTIVE']).nullable().default(null),
}).strict().refine(value => !value.id || !!value.version, 'Version requise.')
  .refine(value => (value.program_id === null) === (value.cycle === null), 'Choisissez la filière et le cycle ensemble.');
export const BROCHURE_CYCLES = { LICENCE: 'Licence professionnelle', MASTER: 'Master professionnel', EXECUTIVE: 'Executive Master' } as const;
