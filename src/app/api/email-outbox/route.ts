import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { emailConfiguration } from '@/server/emailTransport';
import { ROLES } from '@/types/permissions';
import type { RelationalSnapshot } from '@/types/persistence';

export const dynamic = 'force-dynamic';
async function emailContext(request: Request, retry = false) {
  const result = await requireAccount(request);
  requirePermission(result.context, retry ? 'email.retry' : 'email.view');
  if (!(retry ? result.context.role === ROLES.IT : [ROLES.DG, ROLES.IT].includes(result.context.role as typeof ROLES.DG))
    || !result.context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id)) {
    throw new RequestError(403, 'Le suivi des mails nécessite un accès global de direction ou d’administration.');
  }
  const snapshot = await result.client.rpc('escen_backend_snapshot');
  if (snapshot.error) throw new RequestError(503, 'Contexte annuel indisponible.');
  const year = await resolveAcademicYear(request, result.client, result.context, snapshot.data as RelationalSnapshot);
  if (!year.selectedYearId && (retry || year.selection !== 'all')) throw new RequestError(409, 'Choisissez une année scolaire précise pour reprendre un mail.');
  return { ...result, year };
}
export async function GET(request: Request) {
  try {
    const { client, context, year } = await emailContext(request);
    const query = z.object({ offset: z.coerce.number().int().min(0).max(1000000).default(0) }).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
    const result = await client.rpc('escen_email_page', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_year_id: year.selectedYearId, p_offset: query.offset });
    if (result.error) throw new RequestError(result.error.code === '42501' ? 403 : 503, 'Suivi des mails indisponible.');
    return Response.json({ ...result.data, configuration: emailConfiguration() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { client, context, year } = await emailContext(request, true);
    const body = z.object({ id: z.uuid(), version: z.number().int().positive(), reason: z.string().trim().min(3).max(1000) }).strict().parse(await request.json());
    const result = await client.rpc('escen_email_retry', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_year_id: year.selectedYearId, p_id: body.id, p_version: body.version, p_reason: body.reason });
    if (result.error) throw new RequestError(result.error.code === '42501' ? 403 : 409, 'Reprise refusée : actualisez et vérifiez l’année, l’état et le nombre de tentatives.');
    return Response.json({ version: result.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
