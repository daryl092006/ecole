import { requireAccount, errorResponse, RequestError } from '@/server/auth';
import { z } from 'zod';
import { invalidateAuthCache } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

const passwordSchema = z.object({ password: z.string().min(12).max(128) }).strict();

export async function POST(request: Request) {
  try {
    const { client, context, user, mustChangePassword, firstLoginRequired } = await requireAccount(request);
    if (!mustChangePassword) throw new RequestError(409, 'Aucun changement obligatoire n’est en attente.');
    const body = await request.json().catch(() => { throw new RequestError(400, 'Nouveau mot de passe requis.'); });
    const { password } = passwordSchema.parse(body);
    const { data, error } = await client.auth.admin.updateUserById(context.authUserId, {
      password,
      app_metadata: { ...user.app_metadata, must_change_password: false,
        ...(firstLoginRequired ? { escen_first_login: { version: 1, password_changed_at: new Date().toISOString() } } : {}) },
    });
    if (error || !data.user) throw new RequestError(503, 'La mise à jour de votre accès a échoué. Réessayez.');
    invalidateAuthCache();
    return Response.json({ updated: true, ...(firstLoginRequired ? { next: 'PROFILE' } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
