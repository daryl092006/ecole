import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterSnapshotForAcademicYear } from '@/services/academicYearScopeService';
import referenceMap from '@/data/relationalReferences.json';
import { ROLES } from '@/types/permissions';
import type { RelationalSnapshot } from '@/types/persistence';

export const dynamic = 'force-dynamic';
const filtersSchema = z.object({
  mode: z.enum(['view', 'export']).default('view'),
  source: z.enum(['current', 'history']).default('current'),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
  query: z.string().trim().max(160).default(''),
  author: z.string().trim().max(160).default(''),
  table: z.string().trim().max(160).default(''),
  action: z.string().trim().max(80).default(''),
  start: z.union([z.iso.date(), z.literal('')]).default(''),
  end: z.union([z.iso.date(), z.literal('')]).default(''),
}).strict().refine(value => !value.start || !value.end || value.start <= value.end);

function annualAuditScope(snapshot: RelationalSnapshot, yearId: string) {
  const references: Record<string, Record<string, string>> = referenceMap;
  const shared = new Set(['role_grants', 'academic_working_year', 'accounts', 'people', 'students']);
  const annual = new Set(Object.entries(references).filter(([table, fields]) => !shared.has(table) && fields.academic_year_id === 'academic_years').map(([table]) => table));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [table, fields] of Object.entries(references)) {
      if (!annual.has(table) && !shared.has(table) && Object.values(fields).some(parent => annual.has(parent))) {
        annual.add(table); changed = true;
      }
    }
  }
  annual.add('academic_years');
  const scoped = filterSnapshotForAcademicYear(snapshot, yearId);
  return {
    ids: Object.fromEntries([...annual].map(table => [table, (scoped.tables[table] || []).filter(row => table !== 'academic_years' || row.id === yearId).map(row => row.id)])),
    references: Object.fromEntries([...annual].map(table => [table, Object.fromEntries(Object.entries(references[table] || {}).filter(([, parent]) => annual.has(parent)))])),
  };
}

export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'system.audit.view');
    if (![ROLES.DG, ROLES.IT].includes(context.role as typeof ROLES.DG)
      || !context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id)) {
      throw new RequestError(403, 'La consultation du journal nécessite un accès de direction ou d’administration globale.');
    }
    const filters = filtersSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    if (filters.mode === 'export') requirePermission(context, 'system.backup.manage');
    const snapshotResult = await client.rpc('escen_backend_snapshot');
    if (snapshotResult.error) throw new RequestError(503, 'Contexte du journal indisponible.');
    const snapshot = snapshotResult.data as RelationalSnapshot;
    const year = await resolveAcademicYear(request, client, context, snapshot);
    if (!year.selectedYearId && year.selection !== 'all') throw new RequestError(409, 'Choisissez une année scolaire ou Toutes les années pour consulter le journal.');
    const result = await client.rpc('escen_audit_journal_page', {
      p_actor_id: context.accountId, p_role_code: context.roleCode,
      p_source: filters.source, p_offset: filters.offset, p_query: filters.query,
      p_author: filters.author, p_table: filters.table, p_action: filters.action,
      p_start: filters.start || null, p_end: filters.end || null, p_year_id: year.selectedYearId,
      p_scope: year.selectedYearId ? annualAuditScope(snapshot, year.selectedYearId) : {},
    });
    if (result.error) throw new RequestError(503, 'La lecture du journal est temporairement indisponible. Réessayez ou contactez l’administration.');
    return Response.json({ ...result.data, revision: snapshot.revision }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
