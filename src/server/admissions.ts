import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { RequestError } from './auth';
import { hashWebsiteToken, websiteRpc } from './website';
import { applicationIntakeSchema } from '@/services/admissionsService';
import { DOCUMENT_LABELS, sniffDocument } from '@/services/websiteService';
import { processEmailBatch } from './emailWorker';

export const CANDIDATE_COOKIE = 'escen_candidate_access';
export const candidateTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const submissionSchema = z.object({ request_token: candidateTokenSchema, application: applicationIntakeSchema }).strict();
export function portalOrigin(request: Request) {
  const configured = process.env.ESCEN_PORTAL_URL;
  if (!configured && process.env.NODE_ENV === 'production') throw new RequestError(503, 'L’adresse publique de l’espace candidat doit être configurée.');
  const url = new URL(configured || request.url);
  if (!['https:', 'http:'].includes(url.protocol) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new RequestError(503, 'Adresse de l’espace candidat invalide.');
  return url.origin;
}
export function assertCandidateOrigin(request: Request) {
  const allowed = [portalOrigin(request), process.env.ESCEN_WEBSITE_URL ? new URL(process.env.ESCEN_WEBSITE_URL).origin : ''];
  if (!allowed.includes(request.headers.get('origin') || '')) throw new RequestError(403, 'Origine de la demande non autorisée.');
}
export async function rateCandidateRequest(client: SupabaseClient, request: Request) {
  const trusted = process.env.ESCEN_TRUSTED_IP_HEADER;
  const ip = trusted ? request.headers.get(trusted) || 'shared' : 'shared';
  if (!await websiteRpc(client, 'escen_website_rate', { p_key: hashWebsiteToken(`candidate:${ip}`), p_limit: 60 })) throw new RequestError(429, 'Trop de tentatives. Réessayez plus tard.');
}
export function readCandidateToken(request: Request) {
  const value = request.headers.get('cookie')?.split(';').map(item => item.trim()).find(item => item.startsWith(`${CANDIDATE_COOKIE}=`))?.slice(CANDIDATE_COOKIE.length + 1);
  if (!value || !candidateTokenSchema.safeParse(value).success) throw new RequestError(401, 'Ouvrez le lien personnel reçu par mail pour accéder à votre dossier.');
  return value;
}
export function candidateCookie(token: string, clear = false) {
  return `${CANDIDATE_COOKIE}=${clear ? '' : token}; Path=/api/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : 2592000}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
export async function attemptApplicationEmails(client: SupabaseClient) {
  try { return await processEmailBatch(client); } catch { return { configured: true, pending: true }; }
}
export async function uploadCandidateFiles(client: SupabaseClient, applicationId: string, files: FormData) {
  const selected: { key: string; file: File; bytes: Uint8Array; mime: string }[] = [];
  for (const [key, item] of files.entries()) {
    if (['payload', 'version'].includes(key)) continue;
    if (!(item instanceof File) || !DOCUMENT_LABELS[key]) throw new RequestError(400, 'Pièce non reconnue.');
    if (item.size < 1 || item.size > 5242880 || selected.length >= 12) throw new RequestError(413, 'Maximum 12 fichiers de 5 Mo par envoi.');
    const bytes = new Uint8Array(await item.arrayBuffer()); const mime = sniffDocument(bytes);
    if (!mime || mime !== item.type || (key === 'photo_identite_file' && mime === 'application/pdf')) throw new RequestError(400, 'Utilisez un PDF, JPEG ou PNG valide ; la photo doit être une image.');
    selected.push({ key, file: item, bytes, mime });
  }
  const documents: { id: string; document_key: string; filename: string; mime_type: string; byte_size: number; object_path: string; sha256: string }[] = [];
  try {
    for (const item of selected) {
      const id = randomUUID(); const path = `${applicationId}/${id}`;
      const upload = await client.storage.from('escen-online-applications').upload(path, item.bytes, { contentType: item.mime, upsert: false });
      if (upload.error) throw new RequestError(503, 'Transfert interrompu. Réessayez sans fermer le dossier.');
      documents.push({ id, document_key: item.key, filename: item.file.name.replace(/[\x00-\x1f/\\]/g, '_').slice(0, 200), mime_type: item.mime, byte_size: item.file.size, object_path: path, sha256: createHash('sha256').update(item.bytes).digest('hex') });
    }
    return documents;
  } catch (error) {
    if (documents.length) await client.storage.from('escen-online-applications').remove(documents.map(item => item.object_path));
    throw error;
  }
}
export async function persistCandidateFiles(client: SupabaseClient, name: string, args: Record<string, unknown>, paths: string[]) {
  const response = await client.rpc(name, args);
  if (response.error) {
    // A transport failure can conceal a commit: only clean up a definite SQL rejection.
    if (['23514','23505','23503','42501','40001','PT409','P0002'].includes(response.error.code)) await client.storage.from('escen-online-applications').remove(paths);
    throw new RequestError(['40001','PT409'].includes(response.error.code) ? 409 : 503, 'Les pièces n’ont pas pu être confirmées. Actualisez le dossier avant de réessayer.');
  }
  return response.data;
}
export async function submitApplication(client: SupabaseClient, request: Request, data: z.infer<typeof submissionSchema>, files: FormData, yearId: string, actorId: string | null = null, role: string | null = null) {
  const token = data.request_token; const hash = hashWebsiteToken(token);
  const accessUrl = `${portalOrigin(request)}/candidature/suivi#access=${token}`;
  const submitted = await client.rpc('escen_candidate_dossier', { p_token_hash: hash, p_action: 'read', p_data: {} });
  if (!submitted.error) {
    const existing = submitted.data.application;
    return { id: existing.id as string, reference: existing.reference as string, tracking_url: accessUrl, token };
  }
  if (submitted.error.code !== 'P0002') throw new RequestError(503, 'Le nouveau circuit de candidature est indisponible.');
  const draft = await client.rpc('escen_website_public', { p_action: 'draft', p_token_hash: hash, p_data: {} });
  let draftData: { id: string; candidat: { academic_year_id: string } };
  if (draft.error) {
    if (draft.error.code !== 'P0002') throw new RequestError(409, 'Ce dossier ne peut pas être repris. Actualisez avant de réessayer.');
    const created = await websiteRpc(client, 'escen_website_public', { p_action: 'create', p_token_hash: hash, p_data: { ...data.application.identity, academic_year_id: yearId } });
    draftData = { id: created.id, candidat: { academic_year_id: yearId } };
  } else draftData = draft.data;
  if (draftData.candidat.academic_year_id !== yearId) throw new RequestError(409, 'Le dossier conserve son année de dépôt.');
  const intakes = await websiteRpc(client, 'escen_website_public', { p_action: 'intakes', p_token_hash: null, p_data: {} }) as { id: string; academic_year_id: string; level_id: string; program_id: string }[];
  const intake = intakes.find(item => item.id === data.application.intake_id && item.academic_year_id === yearId);
  if (!intake) throw new RequestError(409, 'La formation choisie n’est plus ouverte.');
  const documents = await uploadCandidateFiles(client, draftData.id, files);
  if (documents.length) await persistCandidateFiles(client, 'escen_website_public', { p_action: 'documents', p_token_hash: hash, p_data: { niveau_id: intake.level_id, filiere_id: intake.program_id, academic_year_id: yearId, documents } }, documents.map(item => item.object_path));
  const result = await websiteRpc(client, 'escen_application_submit', { p_actor_id: actorId, p_role_code: role, p_year_id: yearId, p_token_hash: hash, p_data: data.application, p_access_url: accessUrl });
  await attemptApplicationEmails(client);
  return { ...result, tracking_url: accessUrl, token };
}
