// Each request stays below the hosting platform's body limit, including multipart overhead.
const chunkBytes = 2 * 1024 * 1024;
type UploadClient = { post: (url: string, data: unknown, options?: { timeout: number }) => Promise<{ data: unknown }> };
export async function uploadWebsiteDocuments(client: UploadClient, token: string, form: FormData) {
  const base = `/public/candidature/${token}`;
  const documents: { upload_id: string; key: string; filename: string; mime: string; size: number; file: File }[] = [];
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') continue;
    if (value.size < 1 || value.size > 5 * 1024 * 1024) throw new Error('Chaque pièce doit contenir entre 1 octet et 5 Mo.');
    documents.push({ upload_id: crypto.randomUUID(), key, filename: value.name, mime: value.type, size: value.size, file: value });
  }
  if (documents.length > 12 || documents.reduce((sum, document) => sum + document.size, 0) > 26 * 1024 * 1024) {
    throw new Error('Maximum 12 fichiers et 26 Mo par envoi.');
  }
  // Preserve the existing endpoint for metadata-only submissions.
  if (!documents.length) return (await client.post(`${base}/etape3-documents`, form, { timeout: 60000 })).data;
  try {
    for (const document of documents) {
      for (let offset = 0; offset < document.size; offset += chunkBytes) {
        const data = new FormData();
        data.set('upload_id', document.upload_id);
        data.set('index', String(offset / chunkBytes));
        data.set('chunk', document.file.slice(offset, offset + chunkBytes, document.mime), 'chunk');
        await client.post(`${base}/etape3-document-bloc`, data, { timeout: 60000 });
      }
    }
    return (await client.post(`${base}/etape3-documents`, {
      academic_year_id: form.get('academic_year_id'), niveau_id: form.get('niveau_id'), filiere_id: form.get('filiere_id'),
      documents: documents.map(({ upload_id, key, filename, mime, size }) => ({ upload_id, key, filename, mime, size })),
    }, { timeout: 60000 })).data;
  } finally {
    // Also covers cancellation or failure before the manifest reaches the server.
    await client.post(`${base}/etape3-blocs-nettoyage`, { upload_ids: documents.map(document => document.upload_id) }, { timeout: 60000 }).catch(() => undefined);
  }
}
