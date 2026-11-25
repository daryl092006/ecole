import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { RequestError } from '@/server/auth';
import { DOCUMENT_LABELS } from '@/services/websiteService';

export const DOCUMENT_CHUNK_BYTES = 2 * 1024 * 1024;
const bucket = 'escen-online-applications';
const uploadId = z.uuid();
const manifestSchema = z.object({
  academic_year_id: z.uuid(), niveau_id: z.uuid(), filiere_id: z.uuid(),
  documents: z.array(z.object({
    upload_id: uploadId, key: z.string().max(100).refine(key => Boolean(DOCUMENT_LABELS[key.replace(/\[\d+\]$/, '')])),
    filename: z.string().min(1).max(200), mime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
    size: z.number().int().min(1).max(5 * 1024 * 1024),
  }).strict()).max(12),
}).strict().refine(value => value.documents.reduce((sum, document) => sum + document.size, 0) <= 26 * 1024 * 1024)
  .refine(value => new Set(value.documents.map(document => document.upload_id)).size === value.documents.length);
const chunkPath = (draftId: string, id: string, index: number) => `${draftId}/_chunks/${id}/${index}`;
export async function saveDocumentChunk(client: SupabaseClient, draftId: string, data: FormData) {
  const id = uploadId.parse(data.get('upload_id'));
  const index = z.coerce.number().int().min(0).max(2).parse(data.get('index'));
  const chunk = data.get('chunk');
  if (!(chunk instanceof File) || chunk.size < 1 || chunk.size > (index === 2 ? 1024 * 1024 : DOCUMENT_CHUNK_BYTES)
    || !['application/pdf', 'image/jpeg', 'image/png'].includes(chunk.type)) {
    throw new RequestError(400, 'Bloc de document invalide.');
  }
  const stored = await client.storage.from(bucket).upload(chunkPath(draftId, id, index), await chunk.arrayBuffer(), { contentType: chunk.type, upsert: true });
  if (stored.error) throw new RequestError(503, 'Le bloc n’a pas été transféré. Réessayez.');
}
export async function removeDocumentChunks(client: SupabaseClient, draftId: string, input: unknown) {
  const ids = z.array(uploadId).max(12).parse(input);
  if (!ids.length) return;
  const removed = await client.storage.from(bucket).remove(ids.flatMap(id => [0, 1, 2].map(index => chunkPath(draftId, id, index))));
  if (removed.error) throw new RequestError(503, 'Nettoyage des blocs indisponible.');
}
export async function assembleDocumentChunks(client: SupabaseClient, draftId: string, input: unknown): Promise<FormData> {
  const manifest = manifestSchema.parse(input);
  const data = new FormData();
  for (const key of ['academic_year_id', 'niveau_id', 'filiere_id'] as const) data.set(key, manifest[key]);
  try {
    for (const document of manifest.documents) {
      const parts: ArrayBuffer[] = [];
      for (let index = 0; index < Math.ceil(document.size / DOCUMENT_CHUNK_BYTES); index++) {
        const downloaded = await client.storage.from(bucket).download(chunkPath(draftId, document.upload_id, index));
        if (downloaded.error || !downloaded.data) throw new RequestError(409, 'Document incomplet. Réessayez l’envoi.');
        const expected = Math.min(DOCUMENT_CHUNK_BYTES, document.size - index * DOCUMENT_CHUNK_BYTES);
        if (downloaded.data.size !== expected) throw new RequestError(400, 'Taille du bloc invalide.');
        parts.push(await downloaded.data.arrayBuffer());
      }
      data.append(document.key, new File(parts, document.filename, { type: document.mime }));
    }
    return data;
  } finally {
    // Cleanup is also retried by the browser; it must not hide a validation error.
    await removeDocumentChunks(client, draftId, manifest.documents.map(document => document.upload_id)).catch(() => undefined);
  }
}
