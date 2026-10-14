import { requireAccount, errorResponse, RequestError } from '@/server/auth';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { client, context, user, mustChangePassword } = await requireAccount(request);
    if (!mustChangePassword) throw new RequestError(409, 'Aucun changement obligatoire n’est en attente.');
    const { data, error } = await client.auth.admin.updateUserById(context.authUserId, {
      app_metadata: { ...user.app_metadata, must_change_password: false },
    });
    if (error || !data.user) throw new RequestError(503, 'La mise à jour de votre accès a échoué. Réessayez.');
    return Response.json({ updated: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
