import { z } from 'zod';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { ROLES } from '@/types/permissions';
export const dynamic = 'force-dynamic';
const inputSchema = z.object({ action: z.enum(['activate', 'deactivate', 'archive', 'role']), reason: z.string().trim().min(3).max(1000), role: z.enum(Object.values(ROLES) as [string, ...string[]]).optional(), previousRole: z.string().nullable().optional() }).strict();
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'user.manage');
    const id = z.uuid().parse((await params).id);
    const input = inputSchema.parse(await request.json());
    const code = (name?: string | null) => Object.entries(ROLES).find(([, value]) => value === name)?.[0] ?? null;
    const result = await client.rpc('escen_manage_account', { p_actor_id: context.accountId, p_target_id: id, p_action: input.action, p_reason: input.reason, p_role_code: code(input.role), p_previous_role_code: code(input.previousRole) });
    if (result.error) throw new RequestError(result.error.code === '42501' ? 403 : 409, result.error.code === '42501' ? 'Administration globale requise.' : result.error.message);
    return Response.json({ revision: result.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
