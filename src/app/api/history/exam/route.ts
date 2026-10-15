import { assertArchiveAcademicYear } from '@/server/academicYearContext';
import { z } from 'zod';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { ROLES } from '@/types/permissions';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'system.audit.view');
    if (![ROLES.IT, ROLES.DG].includes(context.role as typeof ROLES.IT) || !context.grants.some(g => !g.site_id && !g.group_id && !g.academic_year_id)) throw new RequestError(403, 'Accès global aux archives requis.');
    const id = z.uuid().parse(new URL(request.url).searchParams.get('id'));
    await assertArchiveAcademicYear(request,client,context,id);
    const result = await client.rpc('escen_history_exam', { p_id: id });
    if (result.error) throw new RequestError(503, 'Les copies ne peuvent pas être chargées.');
    if (!result.data) throw new RequestError(404, 'Examen introuvable.');
    return Response.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
