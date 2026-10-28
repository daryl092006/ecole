import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RequestError } from '@/server/auth';

export const hashWebsiteToken = (value: string) => createHash('sha256').update(value).digest('hex');
export async function websiteRpc(client: SupabaseClient, name: string, args: Record<string, unknown>) {
  const result = await client.rpc(name, args);
  if (result.error) {
    const code = result.error.code;
    const status = code === '42501' ? 403 : code === 'P0002' ? 404 : ['23514', '23505', '40001', 'PT409', '23503'].includes(code) ? 409 : 503;
    throw new RequestError(status, status === 503 ? 'Le service du site est indisponible. Réessayez.' : status === 404 ? 'Dossier ou publication introuvable.' : status === 403 ? 'Accès non autorisé.' : 'Enregistrement refusé : dossier incomplet, référence fermée, doublon ou modification concurrente. Actualisez et vérifiez les informations.');
  }
  return result.data;
}
export async function boundedRequest(request: Request, maxBytes: number) {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new RequestError(413, 'Envoi trop volumineux.');
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, 'Données absentes.');
  const chunks: Uint8Array[] = []; let length = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maxBytes) { await reader.cancel(); throw new RequestError(413, 'Envoi trop volumineux.'); }
    chunks.push(value);
  }
  return new Request(request.url, { method: request.method, headers: request.headers, body: Buffer.concat(chunks) });
}
