import 'server-only';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ROLES, type Permission, type RoleName } from '@/types/permissions';
import { ROLE_ACCESS } from '@/permissions/rolePermissions';
import type { PersistentContext, AccountGrant } from '@/types/persistence';
import { firstLoginState } from '@/services/firstLoginService';

export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const grant = z.object({ role_code: z.string(), role_name: z.string(), site_id: z.string().nullable(), academic_year_id: z.string().nullable(), group_id: z.string().nullable() });
const profileSchema = z.object({
  account: z.object({ id: z.uuid(), person_id: z.uuid(), auth_user_id: z.uuid(), active: z.literal(true) }),
  person: z.object({
    firstname: z.string(),
    lastname: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable().optional(),
    birth_date: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
  }),
  student: z.object({ id: z.uuid(), matricule: z.string() }).nullable(),
  teacher: z.object({ id: z.uuid() }).nullable(),
  grants: z.array(grant),
  permissions: z.array(z.object({ role_code: z.string(), permission_code: z.string() })),
});
const knownRoles = ROLES as Record<string, RoleName>;

function normalizeRoleHeader(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function matchesRequestedRole(grant: { role_code: string; role_name: string }, rawRequested: string): boolean {
  if (grant.role_name === rawRequested || grant.role_code === rawRequested) return true;
  const candidates = [rawRequested];
  try { candidates.push(decodeURIComponent(rawRequested)); } catch { /* Ignore malformed URI sequences */ }
  try { candidates.push(Buffer.from(rawRequested, 'latin1').toString('utf8')); } catch { /* Ignore buffer conversion errors */ }
  const targetNorm = normalizeRoleHeader(grant.role_name);
  const codeNorm = normalizeRoleHeader(grant.role_code);
  for (const candidate of candidates) {
    const norm = normalizeRoleHeader(candidate);
    if (norm === targetNorm || norm === codeNorm) return true;
    if (candidate.includes('\uFFFD')) {
      const pattern = new RegExp('^' + normalizeRoleHeader(candidate).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\ufffd+/g, '.+') + '$');
      if (pattern.test(targetNorm)) return true;
    }
  }
  return false;
}

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
  const { mustChangePassword, mustVerifyProfile, firstLoginRequired } = firstLoginState(authenticated.data.user.app_metadata, process.env.ESCEN_FIRST_LOGIN_ENABLED === 'true');
  const requestPath = new URL(request.url).pathname;
  if (mustChangePassword && !['/api/session', '/api/session/password'].includes(requestPath)) {
    throw new RequestError(403, 'Changez votre mot de passe avant d’utiliser la plateforme.');
  }
  if (mustVerifyProfile && !['/api/session', '/api/session/first-login'].includes(requestPath)) {
    throw new RequestError(403, 'Vérifiez vos informations personnelles avant d’utiliser la plateforme.');
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
  const selected = requested ? available.find(item => matchesRequestedRole(item, requested)) : available[0];
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
  return { client, context, profile, user: authenticated.data.user, mustChangePassword, mustVerifyProfile, firstLoginRequired, availableRoles: [...new Set(available.map(item => item.role_name))], email: authenticated.data.user.email ?? profile.person.email ?? '' };
}
export function requirePermission(context: PersistentContext, permission: Permission) {
  if (!context.permissions.includes(permission)) throw new RequestError(403, 'Opération non autorisée pour votre rôle.');
}
export function errorResponse(error: unknown) {
  const status = error instanceof RequestError ? error.status : error instanceof z.ZodError ? 400 : 500;
  const message = error instanceof RequestError ? error.message : status === 400 ? 'Données de la demande invalides.' : 'Le service est temporairement indisponible.';
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
