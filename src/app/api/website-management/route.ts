import { resolveAcademicYear } from '@/server/academicYearContext';
import type { RelationalSnapshot } from '@/types/persistence';
import { z } from 'zod';
import { requireAccount, RequestError, errorResponse } from '@/server/auth';
import { boundedRequest, websiteRpc } from '@/server/website';
import { articleSchema, intakeSchema, websiteAccess } from '@/services/websiteService';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request); const access = websiteAccess(context);
    const params = new URL(request.url).searchParams; const kind = params.get('kind');
    if (!['articles', 'admissions', 'document'].includes(kind || '') || (kind === 'articles' ? !access.articles : !access.admissions)) throw new RequestError(403, 'Accès non autorisé.');
    const data = await websiteRpc(client, 'escen_website_manage', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_action: kind, p_data: kind === 'document' ? { id: z.uuid().parse(params.get('id')) } : {} });
    {
      const snapshot = await client.rpc('escen_backend_snapshot');
      if (snapshot.error) throw new RequestError(503,'Contexte annuel indisponible.');
      const year = await resolveAcademicYear(request,client,context,snapshot.data as RelationalSnapshot);
      const selectedYearId=year.selectedYearId || (year.selection==='all'?null:'00000000-0000-0000-0000-000000000000');
      if (selectedYearId) {
        if (kind === 'articles') {
          return Response.json(data.filter((row:{academic_year_id:string})=>row.academic_year_id===selectedYearId),{headers:{'Cache-Control':'no-store'}});
        }
        if (kind === 'document' && data?.academic_year_id !== selectedYearId) throw new RequestError(403,'Cette pièce appartient à une autre année.');
        if (kind === 'admissions') { data.applications = data.applications.filter((row:{academic_year_id:string})=>row.academic_year_id===selectedYearId); data.intakes = data.intakes.filter((row:{academic_year_id:string})=>row.academic_year_id===selectedYearId); }
      }
    }
    if (kind === 'document') {
      if (!data) throw new RequestError(404, 'Pièce introuvable.');
      const signed = await client.storage.from(data.bucket).createSignedUrl(data.object_path, 60, { download: data.filename });
      if (signed.error) throw new RequestError(503, 'Téléchargement indisponible.');
      return Response.json({ url: signed.data.signedUrl }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
const common = { id: z.uuid().optional(), version: z.number().int().positive().optional(), reason: z.string().trim().min(3).max(1000) };
const commandSchema = z.discriminatedUnion('action', [
  articleSchema.extend({ ...common, action: z.literal('article-save') }).strict(),
  intakeSchema.extend({ ...common, action: z.literal('intake-save') }).strict(),
  z.object({ action: z.literal('application-status'), ...common, id: z.uuid(), version: z.number().int().positive(), status: z.enum(['RECU', 'EN_ANALYSE', 'CLASSE']) }).strict(),
]);
export async function POST(request: Request) {
  try {
    const { client, context } = await requireAccount(request); const access = websiteAccess(context);
    const body = commandSchema.parse(await (await boundedRequest(request, 100000)).json());
    if (body.id && !body.version) throw new RequestError(400, 'Version requise.');
    if (body.action === 'article-save' ? !access.manageArticles : !access.manageAdmissions) throw new RequestError(403, 'Modification non autorisée pour ce rôle.');
    const { action, ...data } = body;
    let selectedYearId: string;
    {
      const snapshot = await client.rpc('escen_backend_snapshot');
      if (snapshot.error) throw new RequestError(503,'Contexte annuel indisponible.');
      const year = await resolveAcademicYear(request,client,context,snapshot.data as RelationalSnapshot);
      if (!year.selectedYearId) throw new RequestError(409,'Choisissez une année scolaire précise avant toute modification.');
      selectedYearId=year.selectedYearId;
      if (action === 'article-save' && body.id) {
        const articles=await websiteRpc(client,'escen_website_manage',{p_actor_id:context.accountId,p_role_code:context.roleCode,p_action:'articles',p_data:{}});
        if (!articles.some((row:{id:string;academic_year_id:string})=>row.id===body.id && row.academic_year_id===selectedYearId)) throw new RequestError(403,'Cet article appartient à une autre année ou son année doit être confirmée.');
      }
      if (action === 'intake-save' && body.academic_year_id !== year.selectedYearId) throw new RequestError(409,'Choisissez la même année que la consultation pour cette campagne.');
      if (year.selectedYearId && action === 'application-status') {
        const dossiers = await websiteRpc(client,'escen_website_manage',{p_actor_id:context.accountId,p_role_code:context.roleCode,p_action:'admissions',p_data:{}});
        if (!dossiers.applications.some((row:{id:string;academic_year_id:string})=>row.id===body.id && row.academic_year_id===year.selectedYearId)) throw new RequestError(403,'Ce dossier appartient à une autre année.');
      }
    }
    const result = await websiteRpc(client, 'escen_website_manage', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_action: action, p_data: {...data,academic_year_id:selectedYearId} });
    return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
