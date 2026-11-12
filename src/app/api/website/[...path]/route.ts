import { articlePlainText } from '@/utils/articleDocument';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { errorResponse, RequestError } from '@/server/auth';
import { boundedRequest, hashWebsiteToken, isAllowedWebsiteOrigin, listPublicWebsiteGalleries, websiteRpc } from '@/server/website';
import { DOCUMENT_LABELS, diplomaSchema, escapeArticleContent, guardianSchema, identitySchema, sniffDocument } from '@/services/websiteService';
import type { WebsiteArticle, WebsiteGallery, WebsiteIntake } from '@/types/website';
import { attemptApplicationEmails, enqueueCandidateCredentialsEmail, portalOrigin } from '@/server/admissions';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ path: string[] }> };
function cors(request: Request, response: Response) {
  const origin = request.headers.get('origin');
  if (origin && isAllowedWebsiteOrigin(request)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
    response.headers.set('Vary', 'Origin');
  }
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
export async function OPTIONS(request: Request) { return cors(request, new Response(null, { status: 204 })); }
function safePortalOrigin(request: Request): string {
  try {
    return portalOrigin(request);
  } catch {
    const url = new URL(request.url);
    return url.origin;
  }
}
function resolveArticleImage(rawImage: string | null | undefined, origin: string): string {
  if (!rawImage) return '/valeurs/bg.jpg';
  if (rawImage.startsWith('http://') || rawImage.startsWith('https://') || rawImage.startsWith('data:')) {
    return rawImage;
  }
  if (rawImage.startsWith('/valeurs/')) {
    return rawImage;
  }
  return `${origin}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;
}
const publicArticle = (article: WebsiteArticle, origin: string) => ({
  id: article.id, title: article.title, slug: article.slug, excerpt: article.excerpt,
  content: escapeArticleContent(article.content), image: resolveArticleImage(article.image, origin), author: 'ESCEN',
  date: article.published_at?.slice(0, 10), readTime: `${Math.max(1, Math.ceil(articlePlainText(article.content).trim().split(/\s+/).filter(Boolean).length / 200))} min`,
  comments: [], tags: [], is_event: false, featured: false,
});
function serveGalleryImage(request: Request, rawUrl: string | undefined) {
  if (!rawUrl) throw new RequestError(404, 'Photo introuvable.');
  if (rawUrl.startsWith('https://')) return cors(request, Response.redirect(rawUrl, 302));
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(rawUrl);
  if (!match) throw new RequestError(404, 'Format de photo non disponible.');
  const bytes = Buffer.from(match[2], 'base64');
  return cors(request, new Response(bytes, { headers: { 'Content-Type': match[1], 'Content-Length': String(bytes.byteLength) } }));
}
function mapPublicGallery(row: WebsiteGallery, origin: string) {
  const photos = Array.isArray(row.photos) ? row.photos : [];
  const rawCover = row.cover || photos[0]?.url || '';
  const coverUrl = rawCover.startsWith('https://') ? rawCover : (rawCover ? `${origin}/api/website/public/galeries/${encodeURIComponent(row.slug)}/cover` : '');
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    location: row.location,
    cover: coverUrl,
    cover_url: coverUrl,
    photoCount: photos.length,
    published_at: row.published_at,
    photos: photos.map((photo, index) => ({
      url: photo.url?.startsWith('https://') ? photo.url : `${origin}/api/website/public/galeries/${encodeURIComponent(row.slug)}/photo/${index}`,
      caption: photo.caption || row.title,
    })),
  };
}
async function handle(request: Request, context: RouteContext) {
  try {
    const { path } = await context.params;
    const route = path.join('/');
    const rpc = (action: string, token: string | null = null, data: unknown = {}) => websiteRpc(getSupabaseServerClient(), 'escen_website_public', { p_action: action, p_token_hash: token ? hashWebsiteToken(token) : null, p_data: data });
    if (request.method === 'GET') {
      if (route === 'public/blogs' || route.startsWith('public/blogs/')) {
        const origin = safePortalOrigin(request);
        const articles = (await rpc('articles') as WebsiteArticle[]).map(item => publicArticle(item, origin));
        if (route === 'public/blogs') return cors(request, Response.json(articles));
        const article = articles.find(item => item.slug === path[2] || item.id === path[2]);
        if (!article) throw new RequestError(404, 'Article introuvable.');
        return cors(request, Response.json(article));
      }
      if (route === 'public/brochures' || /^public\/brochures\/[a-z0-9-]+\/download$/.test(route)) {
        const client = getSupabaseServerClient();
        const slug = path.length === 4 ? path[2] : null;
        const brochures = await websiteRpc(client, 'escen_brochures_public', { p_slug: slug });
        if (!slug) return cors(request, Response.json(brochures));
        const brochure = brochures[0];
        if (!brochure) throw new RequestError(404, 'Brochure indisponible.');
        const file = await client.storage.from('escen-website-brochures').download(brochure.object_path);
        if (file.error || !file.data) throw new RequestError(503, 'Téléchargement indisponible.');
        return cors(request, new Response(file.data, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${slug}.pdf"` } }));
      }
      if (route === 'public/galeries' || route.startsWith('public/galeries/')) {
        const client = getSupabaseServerClient();
        const origin = portalOrigin(request);
        const rows = await listPublicWebsiteGalleries(client, null);
        if (route === 'public/galeries') {
          return cors(request, Response.json({ success: true, data: rows.map(row => mapPublicGallery(row, origin)) }));
        }
        const slug = path[2];
        const rawAlbum = rows.find(item => item.slug === slug || item.id === slug);
        if (!rawAlbum) throw new RequestError(404, 'Album photo introuvable.');
        if (path.length === 4 && path[3] === 'cover') {
          return serveGalleryImage(request, rawAlbum.cover || rawAlbum.photos?.[0]?.url);
        }
        if (path.length === 5 && path[3] === 'photo') {
          const photoIndex = Number(path[4]);
          if (!Number.isInteger(photoIndex) || photoIndex < 0) throw new RequestError(404, 'Photo introuvable.');
          return serveGalleryImage(request, rawAlbum.photos?.[photoIndex]?.url);
        }
        if (path.length === 3) {
          const mapped = rows.map(row => mapPublicGallery(row, origin));
          const album = mapped.find(item => item.slug === rawAlbum.slug)!;
          const otherAlbums = mapped.filter(item => item.slug !== rawAlbum.slug).slice(0, 6);
          return cors(request, Response.json({ success: true, data: { album, other_albums: otherAlbums } }));
        }
        throw new RequestError(404, 'Ressource de galerie introuvable.');
      }
      if (route === 'public/configurations') return cors(request, Response.json([]));
      if (route === 'public/candidature-config') return cors(request, Response.json({ academic_year: await rpc('year'), types_diplome: [], champs: [{ champ_key: 'tuteur_tel', label: 'Téléphone du tuteur', obligatoire: true }, { champ_key: 'tuteur_email', label: 'Email du tuteur', obligatoire: false }], moyens_connaissance: [], sigle: 'ESCEN' }));
      if (route === 'public/niveau/liste' || route === 'public/filieres/liste' || /^public\/niveau\/[^/]+\/document-requirements$/.test(route)) {
        const intakes = await rpc('intakes') as WebsiteIntake[];
        const level = new URL(request.url).searchParams.get('niveau_id');
        if (route === 'public/niveau/liste') return cors(request, Response.json([...new Map(intakes.map(item => [item.level_id, { id: item.level_id, nom: item.level_name, libelle: item.level_name }])).values()]));
        if (route === 'public/filieres/liste') return cors(request, Response.json(intakes.filter(item => item.level_id === level).map(item => ({ id: item.program_id, nom: item.program_name }))));
        const program = new URL(request.url).searchParams.get('filiere_id');
        const relevant = intakes.filter(item => item.level_id === path[2] && (!program || item.program_id === program));
        const required = new Set(relevant.flatMap(item => item.required_documents));
        return cors(request, Response.json(Object.entries(DOCUMENT_LABELS).map(([key, label]) => ({ document_key: key, nom_affichage: label, is_obligatoire: required.has(key), is_multiple: key.startsWith('releve_'), accepted_formats: 'all' }))));
      }
      if (/^public\/candidature\/[^/]+\/brouillon$/.test(route)) {
        const token = z.string().regex(/^[a-f0-9]{64}$/).parse(path[2]);
        return cors(request, Response.json(await rpc('draft', token)));
      }
      throw new RequestError(404, 'Ressource indisponible.');
    }
    if (!isAllowedWebsiteOrigin(request)) throw new RequestError(403, 'Origine du formulaire non autorisée.');
    const client = getSupabaseServerClient();
    // Only trust a client-IP header when explicitly configured behind a trusted proxy.
    const trustedIpHeader = process.env.ESCEN_TRUSTED_IP_HEADER;
    const clientKey = trustedIpHeader ? request.headers.get(trustedIpHeader) || 'shared' : 'shared';
    const rate = await websiteRpc(client, 'escen_website_rate', { p_key: hashWebsiteToken(`site-write:${clientKey}`), p_limit: 120 });
    if (!rate) throw new RequestError(429, 'Trop de tentatives. Réessayez plus tard.');
    if (route === 'public/candidature/etape1' && request.method === 'POST') {
      const input = identitySchema.extend({academic_year_id:z.uuid()}).strict().parse(await (await boundedRequest(request, 16384)).json());
      const token = randomBytes(32).toString('hex');
      return cors(request, Response.json({ ...await rpc('create', token, input), draft_token: token }, { status: 201 }));
    }
    if (path[0] !== 'public' || path[1] !== 'candidature' || path.length !== 4) throw new RequestError(404, 'Commande indisponible.');
    const token = z.string().regex(/^[a-f0-9]{64}$/).parse(path[2]);
    const action = path[3];
    if (action === 'etape1' && request.method === 'PATCH') {
      const {academic_year_id, ...identity} = identitySchema.extend({academic_year_id:z.uuid()}).strict().parse(await (await boundedRequest(request, 16384)).json());
      const draft = await rpc('draft',token);
      if (draft.candidat.academic_year_id !== academic_year_id) throw new RequestError(409, 'Ce brouillon conserve son année de dépôt. Commencez un nouveau dossier pour une autre année.');
      return cors(request, Response.json(await rpc('identity', token, identity)));
    }
    if (action === 'etape2-bac' && request.method === 'PATCH') return cors(request, Response.json(await rpc('diploma', token, diplomaSchema.parse(await (await boundedRequest(request, 16384)).json()))));
    if (action === 'etape3-documents' && request.method === 'POST') {
      const draft = await rpc('draft', token);
      const data = await (await boundedRequest(request, 26 * 1024 * 1024)).formData();
      const selectedYear = z.uuid().parse(data.get('academic_year_id'));
      if (draft.candidat.academic_year_id !== selectedYear) throw new RequestError(409, 'L’année du dossier ne correspond pas à cette campagne.');
      const level = z.uuid().parse(data.get('niveau_id')); const program = z.uuid().parse(data.get('filiere_id'));
      const intakes = await rpc('intakes') as WebsiteIntake[];
      if (!intakes.some(item => item.level_id === level && item.program_id === program && item.academic_year_id === selectedYear)) throw new RequestError(400, 'Formation non ouverte aux inscriptions.');
      const uploaded: string[] = [];
      const documents: Record<string, unknown>[] = [];
      try {
        for (const [key, value] of data.entries()) {
          if (['academic_year_id', 'niveau_id', 'filiere_id'].includes(key)) continue;
          const documentKey = key.replace(/\[\d+\]$/, '');
          if (!DOCUMENT_LABELS[documentKey] || !(value instanceof File)) throw new RequestError(400, 'Pièce non reconnue.');
          if (value.size < 1 || value.size > 5 * 1024 * 1024 || documents.length >= 12) throw new RequestError(413, 'Maximum 12 fichiers de 5 Mo par envoi.');
          const bytes = new Uint8Array(await value.arrayBuffer()); const mime = sniffDocument(bytes);
          if (!mime || mime !== value.type || (documentKey === 'photo_identite_file' && mime === 'application/pdf')) throw new RequestError(400, 'Utilisez un PDF, JPEG ou PNG valide ; la photo doit être une image.');
          const id = randomUUID(); const objectPath = `${draft.id}/${id}`;
          const stored = await client.storage.from('escen-online-applications').upload(objectPath, bytes, { contentType: mime, upsert: false });
          if (stored.error) throw new RequestError(503, 'La pièce n’a pas été transférée. Réessayez sans fermer votre dossier.');
          uploaded.push(objectPath);
          documents.push({ id, document_key: documentKey, filename: value.name.replace(/[\x00-\x1f/\\]/g, '_').slice(0, 200), mime_type: mime, byte_size: value.size, object_path: objectPath, sha256: createHash('sha256').update(bytes).digest('hex') });
        }
        return cors(request, Response.json(await rpc('documents', token, { academic_year_id: selectedYear, niveau_id: level, filiere_id: program, documents })));
      } catch (error) {
        if (uploaded.length) await client.storage.from('escen-online-applications').remove(uploaded);
        throw error;
      }
    }
    if (action === 'etape4-finaliser' && request.method === 'POST') {
      const data = await (await boundedRequest(request, 32768)).formData();
      if (data.get('accept_cgu') !== '1') throw new RequestError(400, 'Votre consentement est requis.');
      const guardians = new Map<number, Record<string, string>>();
      for (const [key, value] of data.entries()) {
        if (key === 'accept_cgu') continue;
        const match = /^tuteurs\[(\d)\]\[([a-z_]+)\]$/.exec(key);
        if (!match || typeof value !== 'string') throw new RequestError(400, 'Coordonnées du tuteur invalides.');
        const index = Number(match[1]); const item = guardians.get(index) || {}; item[match[2]] = value; guardians.set(index, item);
      }
      const tuteurs = z.array(guardianSchema).min(1).max(5).parse([...guardians.values()]);
      const existing = await client.rpc('escen_candidate_dossier', { p_token_hash: hashWebsiteToken(token), p_action: 'read', p_data: {} });
      if (!existing.error) return cors(request, Response.json({ id: existing.data.application.id, reference: existing.data.application.reference, workflow_stage: existing.data.application.workflow_stage }));
      if (existing.error.code !== 'P0002') throw new RequestError(503, 'Le nouveau circuit de candidature est indisponible.');
      const draft = await rpc('draft', token);
      const intakes = await rpc('intakes') as WebsiteIntake[];
      const intake = intakes.find(item => item.academic_year_id === draft.candidat.academic_year_id && item.level_id === draft.candidat.niveau_id && item.program_id === draft.candidat.filiere_id);
      if (!intake) throw new RequestError(409, 'Formation fermée ou non renseignée.');
      const fields = (keys: string[]) => Object.fromEntries(keys.filter(key => draft.candidat[key] !== undefined).map(key => [key,draft.candidat[key]]));
      const accessUrl = `${portalOrigin(request)}/candidature/suivi#access=${token}`;
      const receipt = await websiteRpc(client, 'escen_application_submit', {
        p_actor_id: null, p_role_code: null, p_year_id: draft.candidat.academic_year_id, p_token_hash: hashWebsiteToken(token),
        p_data: { consent: true, intake_id: intake.id, guardians: tuteurs,
          identity: fields(['nom','prenom','genre','date_naissance','lieu_naissance','nationalite','email','tel','tel2','tel3','adresse','nom_jeune_fille']),
          diploma: fields(['type_diplome_id','numero_table','annee_bac','serie','mention_bac','etablissement_diplome','annee_diplome','intitule_diplome','specialite_diplome','mention_diplome']) },
        p_access_url: accessUrl,
      });
      await enqueueCandidateCredentialsEmail(client, {
        yearId: String(draft.candidat.academic_year_id),
        applicationId: String(receipt.id),
        reference: String(receipt.reference),
        email: String(draft.candidat.email || ''),
        firstname: String(draft.candidat.prenom || ''),
        lastname: String(draft.candidat.nom || ''),
        trackingUrl: accessUrl,
        actorId: null,
      });
      await attemptApplicationEmails(client);
      return cors(request, Response.json(receipt));
    }
    throw new RequestError(405, 'Méthode indisponible.');
  } catch (error) {
    const response = errorResponse(error);
    const body = await response.json();
    return cors(request, Response.json({ ...body, message: body.error }, { status: response.status }));
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
