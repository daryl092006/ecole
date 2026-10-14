import { requireAccount, errorResponse } from '@/server/auth';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { profile, context, availableRoles, email, mustChangePassword } = await requireAccount(request);
    return Response.json({ accountId: context.accountId, name: `${profile.person.firstname} ${profile.person.lastname}`, email,
      role: context.role, availableRoles, studentId: context.studentId, teacherId: context.teacherId,
      matricule: profile.student?.matricule ?? null, mustChangePassword }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
