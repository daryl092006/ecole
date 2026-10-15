import { requireAccount, errorResponse } from '@/server/auth';
import { ROLE_ACCESS } from '@/permissions/rolePermissions';
import type { RoleName } from '@/types/permissions';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { profile, context, availableRoles, email, mustChangePassword } = await requireAccount(request);
    const capabilities = Object.fromEntries((availableRoles as RoleName[]).map(role => {
      const grants = profile.grants.filter(grant => grant.role_name === role);
      return [role, { permissions: ROLE_ACCESS[role].permissions.filter(permission => profile.permissions.some(item => grants.some(grant => grant.role_code === item.role_code) && item.permission_code === permission)), globalAccess: grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id) }];
    }));
    return Response.json({ accountId: context.accountId, name: `${profile.person.firstname} ${profile.person.lastname}`, email, capabilities,
      role: context.role, availableRoles, studentId: context.studentId, teacherId: context.teacherId,
      matricule: profile.student?.matricule ?? null, mustChangePassword }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
