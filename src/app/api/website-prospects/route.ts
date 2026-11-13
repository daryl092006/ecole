import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { websiteRpc } from '@/server/website';
import { websiteProspectPageSchema } from '@/services/websiteProspectService';
import type { RelationalSnapshot } from '@/types/persistence';
import type { WebsiteProspect } from '@/types/website';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'website.prospect.view');
    if (!context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id)) {
      throw new RequestError(403, 'Une attribution globale est requise.');
    }
    const input = websiteProspectPageSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const snapshot = await client.rpc('escen_backend_snapshot');
    if (snapshot.error) throw new RequestError(503, 'Contexte annuel indisponible.');
    const year = await resolveAcademicYear(request, client, context, snapshot.data as RelationalSnapshot);
    if (year.selection !== 'all' && !year.selectedYearId) throw new RequestError(409, 'Choisissez une année scolaire.');
    const rows = await websiteRpc(client, 'escen_website_prospects_page', {
      p_actor_id: context.accountId, p_role_code: context.roleCode, p_year_id: year.selectedYearId,
      p_before_created_at: input.beforeCreatedAt || null, p_before_id: input.beforeId || null, p_limit: 51,
    }) as WebsiteProspect[];
    const prospects = rows.slice(0, 50);
    const last = prospects.at(-1);
    return Response.json({ prospects, nextCursor: rows.length > 50 && last ? { createdAt: last.created_at, id: last.id } : null }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) { return errorResponse(error); }
}
