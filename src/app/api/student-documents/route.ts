import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { boundedRequest } from '@/server/website';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { filterSnapshotForAcademicYear } from '@/services/academicYearScopeService';
import { sniffDocument } from '@/services/websiteService';
import { canUploadStudentDocument, canReviewStudentDocument, documentUploadPlan, studentDocumentUploadSchema, studentDocumentReviewSchema } from '@/services/studentDocumentPolicy';
import { ROLES } from '@/types/permissions';
import { connectedRecordName } from '@/services/connectedRecordDisplayService';
import type { RelationalSnapshot } from '@/types/persistence';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const bucket = 'escen-student-documents';
async function load(request: Request) {
  const auth = await requireAccount(request);
  if (![ROLES.STUD, ROLES.DEL].includes(auth.context.role as typeof ROLES.STUD)) requirePermission(auth.context, 'student.view');
  const result = await auth.client.rpc('escen_backend_snapshot');
  if (result.error) throw new RequestError(503, 'Chargement des pièces indisponible.');
  const raw = result.data as RelationalSnapshot;
  const year = await resolveAcademicYear(request, auth.client, auth.context, raw);
  const scoped = filterSnapshotForAcademicYear(filterRelationalSnapshot(raw, auth.context), year.selectedYearId || (year.selection === 'all' ? null : '00000000-0000-0000-0000-000000000000'));
  return { ...auth, raw, scoped, year };
}
export async function GET(request: Request) {
  try {
    const { client, context, raw, scoped, year } = await load(request);
    const documents = scoped.tables.student_documents || []; const ids = new Set(documents.map(row => row.id));
    const fileId = new URL(request.url).searchParams.get('file');
    if (fileId) {
      const document = documents.find(row => row.id === z.uuid().parse(fileId));
      const file = document && raw.tables.file_objects?.find(row => row.id === document.file_id);
      if (!file) throw new RequestError(404, 'Pièce introuvable.');
      const result = await client.storage.from(String(file.bucket)).createSignedUrl(String(file.object_path), 60, { download: String(file.original_name) });
      if (result.error) throw new RequestError(503, 'Téléchargement indisponible.');
      return Response.json({ url: result.data.signedUrl }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json({ revision: raw.revision, yearId: year.selectedYearId, canUpload: canUploadStudentDocument(context), canReview: canReviewStudentDocument(context),
      students: (scoped.tables.students || []).map(row => { const person = scoped.tables.people?.find(person => person.id === row.person_id); return { id: row.id, matricule: row.matricule, name: person ? `${person.firstname} ${person.lastname}` : row.matricule }; }),
      enrollments: (scoped.tables.enrollments || []).map(row => ({ id: row.id, student_id: row.student_id, status: row.status, label: connectedRecordName('academic_offerings', scoped.tables.academic_offerings?.find(offering => offering.id === row.offering_id) || { id: String(row.offering_id) }, scoped) })), types: raw.tables.document_types || [],
      documents: documents.map(row => { const file = raw.tables.file_objects?.find(file => file.id === row.file_id); return { ...row, filename: file?.original_name || 'Référence de fichier', byte_size: file?.byte_size || null }; }),
      reviews: (raw.tables.document_reviews || []).filter(row => ids.has(String(row.document_id))),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const data = await load(request);
    if (!canUploadStudentDocument(data.context)) throw new RequestError(403, 'Dépôt non autorisé.');
    const form = await (await boundedRequest(request, 6 * 1024 * 1024)).formData();
    let metadata: unknown;
    try { metadata = JSON.parse(String(form.get('metadata'))); } catch { throw new RequestError(400, 'Métadonnées de dépôt invalides.'); }
    const input = studentDocumentUploadSchema.parse(metadata);
    const file = form.get('file');
    if (!(file instanceof File) || !file.size || file.size > 5242880) throw new RequestError(400, 'Choisissez un fichier PDF, JPEG ou PNG de 5 Mo maximum.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = sniffDocument(bytes);
    const type = data.raw.tables.document_types?.find(row => row.id === input.documentTypeId);
    if (!mime || !['application/pdf', 'image/jpeg', 'image/png'].includes(mime) || mime !== file.type || !Array.isArray(type?.accepted_mime_types) || !type.accepted_mime_types.includes(mime) || file.size > Number(type.max_byte_size)) throw new RequestError(400, 'Le format ou la taille ne respecte pas le type de pièce.');
    const id = randomUUID(); const path = `${data.year.selectedYearId}/${input.studentId}/${id}`;
    let changes;
    try { changes = documentUploadPlan(data.scoped, data.raw, data.context, data.year.selectedYearId, input, { id: randomUUID(), bucket, object_path: path, original_name: file.name.replace(/[\x00-\x1f/\\]/g, '_').slice(0, 200) || 'document', mime_type: mime, byte_size: file.size, sha256: createHash('sha256').update(bytes).digest('hex'), uploaded_by: data.context.accountId }, id); }
    catch (error) { throw new RequestError(409, error instanceof Error ? error.message : 'Dépôt refusé.'); }
    const uploaded = await data.client.storage.from(bucket).upload(path, bytes, { contentType: mime, upsert: false });
    if (uploaded.error) throw new RequestError(503, 'Stockage privé indisponible. Aucun dépôt n’a été enregistré.');
    let saved: { data: unknown; error: { code?: string } | null };
    try {
      saved = await data.client.rpc('escen_backend_transaction', { p_actor_id: data.context.accountId, p_expected_revision: input.revision, p_changes: changes });
    } catch {
      throw new RequestError(503, 'Le résultat du dépôt n’a pas pu être confirmé. Actualisez les pièces avant toute nouvelle tentative.');
    }
    if (saved.error) {
      // A transport failure can follow a committed transaction. Preserve the private
      // object unless PostgreSQL explicitly confirms that the transaction failed.
      if (!/^(22|23|40|42)/.test(saved.error.code || '') && saved.error.code !== 'P0001') throw new RequestError(503, 'Le résultat du dépôt n’a pas pu être confirmé. Actualisez les pièces avant toute nouvelle tentative.');
      await data.client.storage.from(bucket).remove([path]);
      throw new RequestError(409, 'Les pièces ont changé ou l’enregistrement a été refusé. Actualisez et réessayez.');
    }
    return Response.json({ id, revision: saved.data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    const data = await load(request); requirePermission(data.context, 'student.update');
    if (!canReviewStudentDocument(data.context)) throw new RequestError(403, 'Vérification réservée aux rôles habilités.');
    const input = studentDocumentReviewSchema.parse(await request.json());
    if (!data.year.selectedYearId) throw new RequestError(409, 'Choisissez une année précise.');
    const document = data.scoped.tables.student_documents?.find(row => row.id === input.id);
    if (!document) throw new RequestError(404, 'Pièce introuvable.');
    if (data.raw.tables.student_documents?.some(row => row.supersedes_id === document.id)) throw new RequestError(409, 'Cette ancienne version a été remplacée. Vérifiez la version actuelle.');
    if (document.status === input.status) throw new RequestError(409, 'Ce statut est déjà enregistré.');
    const saved = await data.client.rpc('escen_backend_transaction', { p_actor_id: data.context.accountId, p_expected_revision: input.revision, p_changes: [
      { table: 'document_reviews', operation: 'insert', record: { id: randomUUID(), document_id: document.id, status: input.status, actor_id: data.context.accountId, reason: input.reason } },
      { table: 'student_documents', operation: 'update', record: { id: document.id, status: input.status } },
    ] });
    if (saved.error) throw new RequestError(409, 'Vérification refusée ou pièce modifiée. Actualisez avant de réessayer.');
    return Response.json({ revision: saved.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
