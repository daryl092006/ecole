import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { RequestError } from './auth';
import { hashWebsiteToken, isAllowedWebsiteOrigin, websiteRpc } from './website';
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
  if (!isAllowedWebsiteOrigin(request, [portalOrigin(request)])) throw new RequestError(403, 'Origine de la demande non autorisée.');
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
  try {
    let last = { configured: false, processed: 0, accepted: 0, failed: 0, unknown: 0 };
    for (let pass = 0; pass < 3; pass++) {
      const batch = await processEmailBatch(client);
      last = batch;
      if (!batch.configured || batch.processed < 3) break;
    }
    return last;
  } catch {
    return { configured: true, pending: true };
  }
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
  await enqueueCandidateCredentialsEmail(client, {
    yearId,
    applicationId: String(result.id),
    reference: String(result.reference),
    email: String(data.application.identity.email || ''),
    firstname: String(data.application.identity.prenom || ''),
    lastname: String(data.application.identity.nom || ''),
    trackingUrl: accessUrl,
    actorId,
  });
  await attemptApplicationEmails(client);
  return { ...result, tracking_url: accessUrl, token };
}

export async function enqueueCandidateCredentialsEmail(
  client: SupabaseClient,
  params: {
    yearId: string;
    applicationId: string;
    reference: string;
    email: string;
    firstname: string;
    lastname: string;
    trackingUrl: string;
    actorId?: string | null;
  }
) {
  const email = params.email.trim().toLowerCase();
  if (!email || !params.applicationId || !params.yearId) return;
  const fullName = `${params.firstname} ${params.lastname}`.trim() || 'Candidat ESCEN';
  const subject = `ESCEN — Réception de votre candidature (${params.reference}) & Accès Espace Candidat`.slice(0, 180);
  const textBody = `Bonjour ${fullName},

Votre candidature à l’ESCEN a bien été enregistrée.

Vos identifiants de connexion à votre Espace Candidat :
• Référence officielle du dossier : ${params.reference}
• Identifiant : ${email} (ou votre référence ${params.reference})
• Mot de passe initial temporaire : Escen2026!
• Lien d’accès direct : ${params.trackingUrl}

Lors de votre première connexion à votre Espace Candidat, il vous sera demandé de choisir votre mot de passe personnel. Vous pourrez y suivre chaque étape de votre dossier, consulter vos courriers officiels et déposer des pièces complémentaires si nécessaire.

Service des Admissions ESCEN`;

  const htmlBody = `<!doctype html><html><body style="font-family: sans-serif; color: #182333; line-height: 1.6;">
<h2 style="color: #0f4c81;">Votre candidature à l’ESCEN est bien reçue</h2>
<p>Bonjour <strong>${fullName}</strong>,</p>
<p>Nous vous confirmons la bonne réception de votre dossier de candidature à l’ESCEN.</p>
<div style="background: #f0f9ff; border-left: 4px solid #01b4d5; padding: 16px; margin: 20px 0; border-radius: 4px;">
  <p style="margin: 0 0 8px 0; color: #0f4c81;"><strong>Vos identifiants Espace Candidat :</strong></p>
  <ul style="margin: 0; padding-left: 20px;">
    <li><strong>Référence du dossier :</strong> <code>${params.reference}</code></li>
    <li><strong>Identifiant :</strong> <code>${email}</code> (ou <code>${params.reference}</code>)</li>
    <li><strong>Mot de passe initial temporaire :</strong> <code>Escen2026!</code></li>
  </ul>
</div>
<p><a href="${params.trackingUrl}" style="display: inline-block; background: #0f4c81; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: bold;">Accéder à mon Espace Candidat</a></p>
<p style="font-size: 13px; color: #64748b;">À votre première connexion, il vous sera demandé de créer votre mot de passe personnel. Cet espace vous permet de suivre l’avancement de votre dossier, de compléter vos pièces si demandé et de télécharger vos courriers officiels.</p>
<p>Service des Admissions ESCEN</p>
</body></html>`;

  try {
    await client.rpc('escen_email_enqueue', {
      p_year_id: params.yearId,
      p_event_type: 'application_received',
      p_source_table: 'online_applications',
      p_source_id: params.applicationId,
      p_source_version: 'credentials:v1',
      p_recipient_email: email,
      p_recipient_name: fullName.slice(0, 160),
      p_subject: subject,
      p_text_body: textBody,
      p_html_body: htmlBody,
      p_actor_id: params.actorId ?? null,
    });
  } catch {
    // Ne pas bloquer le dépôt si l'outbox rejette un doublon
  }
}

export async function enqueueRectificationEmail(
  client: SupabaseClient,
  params: {
    yearId: string;
    applicationId: string;
    reference: string;
    version: number;
    email: string;
    firstname: string;
    lastname: string;
    requestedChanges: string;
    trackingUrl: string;
    actorId?: string | null;
  }
) {
  const email = params.email.trim().toLowerCase();
  if (!email || !params.applicationId || !params.yearId) return;
  const fullName = `${params.firstname} ${params.lastname}`.trim() || 'Candidat ESCEN';
  const subject = `ESCEN — Action requise : Rectification de votre dossier (${params.reference})`.slice(0, 180);
  const textBody = `Bonjour ${fullName},

Le Service des Admissions de l’ESCEN a examiné votre dossier de candidature (Réf. ${params.reference}) et vous demande d’apporter les rectifications ou pièces complémentaires suivantes :

------------------------------------------------------------
${params.requestedChanges}
------------------------------------------------------------

Comment rectifier ou compléter votre dossier :
1. Accédez directement à votre Espace Candidat via ce lien sécurisé :
   ${params.trackingUrl}
2. Ou connectez-vous sur votre Espace Candidat avec :
   • Identifiant : ${email} (ou ${params.reference})
   • Mot de passe initial (si non modifié) : Escen2026!
3. Cliquez sur « Compléter mon dossier », ajoutez les pièces ou corrigez les informations demandées, puis validez.

Dès réception de vos éléments, votre dossier sera automatiquement transmis pour validation.

Service des Admissions ESCEN`;

  const escapedChanges = params.requestedChanges
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const htmlBody = `<!doctype html><html><body style="font-family: sans-serif; color: #182333; line-height: 1.6;">
<h2 style="color: #0f4c81;">Action requise sur votre dossier de candidature ESCEN</h2>
<p>Bonjour <strong>${fullName}</strong>,</p>
<p>Le Service des Admissions a examiné votre candidature (Référence : <strong>${params.reference}</strong>). Afin de poursuivre l’étude de votre dossier, merci de compléter ou rectifier les éléments suivants :</p>
<div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px; color: #92400e;">
  <p style="margin: 0 0 6px 0; font-weight: bold;">Éléments à rectifier ou compléter :</p>
  <p style="margin: 0;">${escapedChanges}</p>
</div>
<p><a href="${params.trackingUrl}" style="display: inline-block; background: #0f4c81; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: bold;">Compléter mon dossier maintenant</a></p>
<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #475569;">
  <strong>Rappel de vos identifiants Espace Candidat :</strong><br>
  • Identifiant : <code>${email}</code> ou <code>${params.reference}</code><br>
  • Mot de passe (si vous ne l’avez pas encore personnalisé) : <code>Escen2026!</code>
</div>
<p>Service des Admissions ESCEN</p>
</body></html>`;

  try {
    await client.rpc('escen_email_enqueue', {
      p_year_id: params.yearId,
      p_event_type: 'application_status_changed',
      p_source_table: 'online_applications',
      p_source_id: params.applicationId,
      p_source_version: `${params.version}:rectification-detail`,
      p_recipient_email: email,
      p_recipient_name: fullName.slice(0, 160),
      p_subject: subject,
      p_text_body: textBody,
      p_html_body: htmlBody,
      p_actor_id: params.actorId ?? null,
    });
  } catch {
    // Best-effort
  }
}
