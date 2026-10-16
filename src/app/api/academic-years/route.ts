import { assertYearPrepared } from '@/services/yearPreparationService';
import { academicYearClosureReview } from '@/services/academicYearClosureService';
import type { DatabaseRow } from '@/types/persistence';
import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'academic.year.open');
    if (!context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id)) throw new RequestError(403, 'Un accès global au pilotage des années est requis.');
    const yearId = z.uuid().parse(new URL(request.url).searchParams.get('yearId'));
    const result = await client.rpc('escen_backend_snapshot');
    if (result.error) throw new RequestError(503, 'Bilan de clôture indisponible.');
    if (!(result.data.tables.academic_years || []).some((row: DatabaseRow) => row.id === yearId && !row.archived_at)) throw new RequestError(404, 'Année introuvable.');
    return Response.json(academicYearClosureReview(result.data, yearId), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'academic.year.open');
    if (!context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id)) throw new RequestError(403, 'Un accès global au pilotage des années est requis.');
    const body = z.object({ action: z.enum(['current', 'transition']), yearId: z.uuid().nullable(), status: z.enum(['OUVERTE', 'EN_CLOTURE', 'CLOTUREE']).optional(), revision: z.number().int().nonnegative(), reason: z.string().trim().min(3).max(1000) }).strict().parse(await request.json());
    if (body.action === 'transition' && (!body.yearId || !body.status)) throw new RequestError(400, 'Année et nouvel état requis.');
    if (body.action==='transition' && body.status==='OUVERTE' && body.yearId) {
      const snapshot=await client.rpc('escen_backend_snapshot');
      if(snapshot.error)throw new RequestError(503,'Préparation de l’année indisponible.');
      if ((snapshot.data.tables.academic_years || []).some((year: DatabaseRow) => year.status === 'OUVERTE' && year.id !== body.yearId)) throw new RequestError(409, 'Une année est déjà ouverte. Terminez son exploitation avant d’en ouvrir une autre.');
      try{assertYearPrepared(snapshot.data,body.yearId);}catch(error){throw new RequestError(409,error instanceof Error?error.message:'Année non prête.');}
    }
    const result = await client.rpc('escen_academic_year_command', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_action: body.action, p_year_id: body.yearId, p_expected_revision: body.revision, p_reason: body.reason, p_status: body.status || null });
    if (result.error) {
      const known = /^(Une année|Année|L’année|Des évaluations|Des réclamations|Des tentatives|Choisissez|Modification concurrente|Transition|Motif)/.test(result.error.message);
      throw new RequestError(result.error.code === '42501' ? 403 : 409, known ? result.error.message : 'Changement refusé. Actualisez et vérifiez l’état de l’année.');
    }
    return Response.json({ revision: result.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
