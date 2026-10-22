import 'server-only';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ROLES, type Permission, type RoleName } from '@/types/permissions';
import { ROLE_ACCESS } from '@/permissions/rolePermissions';
import type { PersistentContext, AccountGrant } from '@/types/persistence';

export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const grant = z.object({ role_code: z.string(), role_name: z.string(), site_id: z.string().nullable(), academic_year_id: z.string().nullable(), group_id: z.string().nullable() });
const profileSchema = z.object({
  account: z.object({ id: z.uuid(), person_id: z.uuid(), auth_user_id: z.uuid(), active: z.literal(true) }),
  person: z.object({ firstname: z.string(), lastname: z.string(), email: z.string().nullable() }),
  student: z.object({ id: z.uuid(), matricule: z.string() }).nullable(),
  teacher: z.object({ id: z.uuid() }).nullable(),
  grants: z.array(grant),
  permissions: z.array(z.object({ role_code: z.string(), permission_code: z.string() })),
});
const knownRoles = ROLES as Record<string, RoleName>;

export async function requireAccount(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ') || authorization.length > 12000) throw new RequestError(401, 'Connexion requise.');
  const client = getSupabaseServerClient();
  let authenticated: Awaited<ReturnType<typeof client.auth.getUser>>;
  try { authenticated = await client.auth.getUser(authorization.slice(7)); }
  catch { throw new RequestError(503, 'Le service de connexion est temporairement indisponible. Réessayez.'); }
  if (authenticated.error) {
    const status = authenticated.error.status;
    if (!status || status === 429 || status >= 500) throw new RequestError(503, 'Le service de connexion est temporairement indisponible. Réessayez.');
    throw new RequestError(401, 'Votre session a expiré. Reconnectez-vous.');
  }
  if (!authenticated.data.user) throw new RequestError(401, 'Votre session a expiré. Reconnectez-vous.');
  const mustChangePassword = authenticated.data.user.app_metadata?.must_change_password === true;
  const requestPath = new URL(request.url).pathname;
  if (mustChangePassword && !['/api/session', '/api/session/password'].includes(requestPath)) {
    throw new RequestError(403, 'Changez votre mot de passe avant d’utiliser la plateforme.');
  }
  const response = await client.rpc('escen_account_session', { p_auth_user_id: authenticated.data.user.id });
  if (response.error) throw new RequestError(503, 'Le service des accès est indisponible.');
  const parsed = profileSchema.safeParse(response.data);
  if (!parsed.success) throw new RequestError(403, 'Votre compte doit être activé par ESCEN.');
  const profile = parsed.data;
  if (profile.account.auth_user_id !== authenticated.data.user.id) throw new RequestError(403, 'Identité de compte incompatible.');
  const available = profile.grants.filter(item => knownRoles[item.role_code] === item.role_name);
  if (!available.length) throw new RequestError(403, 'Aucun rôle actif ne vous est attribué.');
  const requested = request.headers.get('x-escen-role');
  const selected = requested ? available.find(item => item.role_name === requested) : available[0];
  if (!selected) throw new RequestError(403, 'Ce rôle ne vous est pas attribué.');
  const role = knownRoles[selected.role_code];
  if ((role === ROLES.STUD || role === ROLES.DEL) && !profile.student || role === ROLES.ENS && !profile.teacher) throw new RequestError(403, 'Votre profil métier doit être complété par ESCEN.');
  const permissions = ROLE_ACCESS[role].permissions.filter(permission => profile.permissions.some(item => item.role_code === selected.role_code && item.permission_code === permission));
  const context: PersistentContext = {
    accountId: profile.account.id, personId: profile.account.person_id, authUserId: profile.account.auth_user_id,
    roleCode: selected.role_code, role, permissions: permissions as Permission[],
    studentId: profile.student?.id ?? null, teacherId: profile.teacher?.id ?? null,
    grants: available.filter(item => item.role_code === selected.role_code) as AccountGrant[],
  };
  return { client, context, profile, user: authenticated.data.user, mustChangePassword, availableRoles: [...new Set(available.map(item => item.role_name))], email: authenticated.data.user.email ?? profile.person.email ?? '' };
}
export function requirePermission(context: PersistentContext, permission: Permission) {
  if (!context.permissions.includes(permission)) throw new RequestError(403, 'Opération non autorisée pour votre rôle.');
}
export function errorResponse(error: unknown) {
  const status = error instanceof RequestError ? error.status : error instanceof z.ZodError ? 400 : 500;
  const message = error instanceof RequestError ? error.message : status === 400 ? 'Données de la demande invalides.' : 'Le service est temporairement indisponible.';
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
