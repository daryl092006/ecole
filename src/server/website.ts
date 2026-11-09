import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RequestError } from '@/server/auth';
import { resolveAllowedWebsiteOrigins } from '@/services/websiteService';
import type { WebsiteGallery } from '@/types/website';

const GALLERIES_STORAGE_BUCKET = 'escen-website-brochures';
const GALLERIES_STORAGE_OBJECT = '_galleries/catalog.json';

async function readStorageGalleries(client: SupabaseClient): Promise<WebsiteGallery[]> {
  const downloaded = await client.storage.from(GALLERIES_STORAGE_BUCKET).download(GALLERIES_STORAGE_OBJECT);
  if (downloaded.error || !downloaded.data) return [];
  try {
    const parsed = JSON.parse(await downloaded.data.text());
    return Array.isArray(parsed) ? (parsed as WebsiteGallery[]) : [];
  } catch {
    return [];
  }
}

async function writeStorageGalleries(client: SupabaseClient, rows: WebsiteGallery[]): Promise<void> {
  const bytes = Buffer.from(JSON.stringify(rows), 'utf8');
  const uploaded = await client.storage.from(GALLERIES_STORAGE_BUCKET).upload(GALLERIES_STORAGE_OBJECT, bytes, {
    contentType: 'application/json',
    upsert: true,
  });
  if (uploaded.error) throw new RequestError(503, 'Enregistrement de la galerie indisponible. Réessayez.');
}

export async function manageWebsiteGalleries(
  client: SupabaseClient,
  args: { p_actor_id: string; p_role_code: string; p_action: 'list' | 'save'; p_data: Record<string, unknown> },
) {
  const result = await client.rpc('escen_galleries_manage', args);
  if (!result.error) return result.data;
  if (result.error.code !== 'PGRST202') {
    return websiteRpc(client, 'escen_galleries_manage', args);
  }
  const rows = await readStorageGalleries(client);
  if (args.p_action === 'list') {
    return [...rows].sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  }
  const data = args.p_data;
  const now = new Date().toISOString();
  const slug = String(data.slug || '').trim().toLowerCase();
  const id = typeof data.id === 'string' && data.id ? data.id : '';
  if (rows.some(item => item.slug === slug && item.id !== id)) {
    throw new RequestError(409, 'Enregistrement refusé : ce lien d’album est déjà utilisé.');
  }
  const photos = Array.isArray(data.photos) ? (data.photos as WebsiteGallery['photos']) : [];
  const cover = String(data.cover || photos[0]?.url || '');
  const status = (data.status as WebsiteGallery['status']) || 'BROUILLON';
  if (id) {
    const idx = rows.findIndex(item => item.id === id);
    if (idx === -1) throw new RequestError(404, 'Album introuvable.');
    if (Number(data.version) !== rows[idx].version) {
      throw new RequestError(409, 'Modification concurrente détectée. Actualisez la page.');
    }
    const updated: WebsiteGallery = {
      ...rows[idx],
      title: String(data.title || '').trim(),
      slug,
      subtitle: String(data.subtitle || '').trim(),
      category: String(data.category || 'Vie de campus').trim(),
      location: String(data.location || 'Lomé').trim(),
      cover,
      photos,
      status,
      version: rows[idx].version + 1,
      published_at: status === 'PUBLIE' ? (rows[idx].published_at || now) : rows[idx].published_at,
      updated_at: now,
    };
    rows[idx] = updated;
    await writeStorageGalleries(client, rows);
    return { id: updated.id, version: updated.version };
  }
  const created: WebsiteGallery = {
    id: randomUUID(),
    academic_year_id: typeof data.academic_year_id === 'string' ? data.academic_year_id : null,
    title: String(data.title || '').trim(),
    slug,
    subtitle: String(data.subtitle || '').trim(),
    category: String(data.category || 'Vie de campus').trim(),
    location: String(data.location || 'Lomé').trim(),
    cover,
    photos,
    status,
    version: 1,
    published_at: status === 'PUBLIE' ? now : null,
    updated_at: now,
  };
  rows.unshift(created);
  await writeStorageGalleries(client, rows);
  return { id: created.id, version: created.version };
}

export async function listPublicWebsiteGalleries(client: SupabaseClient, slug: string | null = null): Promise<WebsiteGallery[]> {
  const result = await client.rpc('escen_galleries_public', { p_slug: slug });
  if (!result.error) return (result.data || []) as WebsiteGallery[];
  if (result.error.code !== 'PGRST202') {
    return (await websiteRpc(client, 'escen_galleries_public', { p_slug: slug })) as WebsiteGallery[];
  }
  const rows = await readStorageGalleries(client);
  return rows
    .filter(item => item.status === 'PUBLIE' && (!slug || item.slug === slug))
    .sort((a, b) => String(b.published_at || b.updated_at || '').localeCompare(String(a.published_at || a.updated_at || '')));
}

export const hashWebsiteToken = (value: string) => createHash('sha256').update(value).digest('hex');

export function isAllowedWebsiteOrigin(request: Request, extraOrigins: Array<string | null | undefined> = []): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  return resolveAllowedWebsiteOrigins(process.env, [...extraOrigins, request.url]).has(origin);
}
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
