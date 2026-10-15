import { resolveAcademicYear } from '@/server/academicYearContext';
import type { RelationalSnapshot } from '@/types/persistence';
import { z } from 'zod';
import { HISTORY_TABLES } from '@/data/historyCatalog';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { ROLES } from '@/types/permissions';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'system.audit.view');
    if (![ROLES.IT, ROLES.DG].includes(context.role as typeof ROLES.IT) || !context.grants.some(g => !g.site_id && !g.group_id && !g.academic_year_id)) throw new RequestError(403, 'La consultation des archives complètes nécessite un accès de direction ou d’administration globale.');
    const params = new URL(request.url).searchParams;
    const table = params.get('table');
    if (table && !HISTORY_TABLES.some(spec => spec.table === table)) throw new RequestError(404, 'Collection introuvable.');
    const options = z.object({ offset: z.coerce.number().int().min(0).max(1000000), query: z.string().max(160), flagged: z.enum(['true', 'false']), studentId: z.string().max(160).nullable(), batchId: z.uuid().nullable() }).parse({ offset: params.get('offset') || 0, query: params.get('query') || '', flagged: params.get('flagged') || 'false', studentId: params.get('studentId'), batchId: params.get('batchId') });
    if (options.studentId && !options.batchId) throw new RequestError(400, 'Archive du dossier requise.');
    const snapshot = await client.rpc('escen_backend_snapshot');
    if (snapshot.error) throw new RequestError(503, 'Chargement du contexte annuel indisponible.');
    const year = await resolveAcademicYear(request, client, context, snapshot.data as RelationalSnapshot);
    const selectedYearId = year.selectedYearId || (year.selection === 'all' ? null : '00000000-0000-0000-0000-000000000000');
    const result = selectedYearId ? table ? await client.rpc('escen_history_page_year', {p_year_id: selectedYearId, p_table:table, p_offset:options.offset, p_limit:50, p_query:options.query, p_flagged:options.flagged==='true', p_student_id:options.studentId, p_batch_id:options.batchId}) : await client.rpc('escen_history_catalog_year',{p_year_id:selectedYearId}) : table && options.studentId ? await client.rpc('escen_history_page_scoped', { p_table: table, p_offset: options.offset, p_limit: 50, p_query: options.query, p_flagged: options.flagged === 'true', p_student_id: options.studentId, p_batch_id: options.batchId }) : table ? await client.rpc('escen_history_page', { p_table: table, p_offset: options.offset, p_limit: 50, p_query: options.query, p_flagged: options.flagged === 'true', p_student_id: options.studentId }) : await client.rpc('escen_history_catalog');
    if (result.error) throw new RequestError(503, 'Chargement des données historiques indisponible.');
    return Response.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
