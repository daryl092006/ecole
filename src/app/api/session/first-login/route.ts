import { createHash } from 'node:crypto';
import { z } from 'zod';
import { requireAccount, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { invalidateAuthCache } from '@/lib/supabase/server';
import { planSupportCommand } from '@/services/persistentSupportService';
import type { RelationalSnapshot } from '@/types/persistence';
import type { FirstLoginProfile } from '@/types/firstLogin';

export const dynamic = 'force-dynamic';
const reviewSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('CONFIRM'), snapshot: z.string().regex(/^[a-f\d]{64}$/) }).strict(),
  z.object({ decision: z.literal('REPORT'), snapshot: z.string().regex(/^[a-f\d]{64}$/), details: z.string().trim().min(3).max(1000), yearId: z.uuid() }).strict(),
]);
function ownProfile(auth: Awaited<ReturnType<typeof requireAccount>>) {
  const person = auth.profile.person;
  const profile: FirstLoginProfile = { firstname: person.firstname, lastname: person.lastname, email: person.email || auth.email, phone: person.phone || '' };
  const snapshot = createHash('sha256').update(JSON.stringify([auth.context.accountId, profile])).digest('hex');
  return { profile, snapshot };
}
export async function GET(request: Request) {
  try {
    const auth = await requireAccount(request);
    if (!auth.mustVerifyProfile) throw new RequestError(409, 'Aucune vérification de première connexion n’est en attente.');
    if (new URL(request.url).searchParams.get('support') === '1') {
      const result = await auth.client.rpc('escen_backend_snapshot');
      if (result.error || !result.data) throw new RequestError(503, 'Le contexte du signalement est indisponible.');
      const year = await resolveAcademicYear(new Request(request.url), auth.client, auth.context, result.data as RelationalSnapshot);
      return Response.json({ years: year.years.map(item => ({ id: item.id, name: item.name })), currentYearId: year.currentYearId }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json(ownProfile(auth), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const auth = await requireAccount(request);
    if (!auth.mustVerifyProfile) throw new RequestError(409, 'Aucune vérification de première connexion n’est en attente.');
    const body = reviewSchema.parse(await request.json().catch(() => { throw new RequestError(400, 'Demande de vérification invalide.'); }));
    if (body.snapshot !== ownProfile(auth).snapshot) throw new RequestError(409, 'Vos informations ont changé. Actualisez cette page pour les vérifier.');
    let ticketId: string | null = null;
    if (body.decision === 'REPORT') {
      const result = await auth.client.rpc('escen_backend_snapshot');
      if (result.error || !result.data) throw new RequestError(503, 'Le signalement est indisponible. Réessayez.');
      const snapshot = result.data as RelationalSnapshot;
      const digest = createHash('sha256').update(`first-login:v1:${auth.context.authUserId}`).digest('hex');
      ticketId = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
      const existing = (snapshot.tables.support_tickets || []).find(ticket => ticket.id === ticketId);
      if (existing && (existing.author_id !== auth.context.accountId || existing.academic_year_id !== body.yearId)) throw new RequestError(409, 'Le signalement ne peut pas être confirmé pour cette année.');
      // A deterministic ID preserves the first report if Auth fails after the audited transaction.
      if (!existing) {
        const year = await resolveAcademicYear(new Request(request.url, { headers: { 'x-escen-year': body.yearId } }), auth.client, auth.context, snapshot);
        if (!year.selectedYearId) throw new RequestError(409, 'L’année de travail doit être accessible pour transmettre ce signalement. Contactez l’administration.');
        const plan = planSupportCommand(snapshot, auth.context, year.selectedYearId, { action: 'create', revision: snapshot.revision,
          title: 'Première connexion · Informations personnelles à corriger', description: body.details,
          categoryId: null, priority: 'MEDIUM' }, () => ticketId!);
        const saved = await auth.client.rpc('escen_backend_transaction', { p_actor_id: auth.context.accountId, p_expected_revision: snapshot.revision, p_changes: plan.changes });
        if (saved.error) throw new RequestError(409, 'Le signalement n’a pas été enregistré. Réessayez.');
      }
    }
    const record = auth.user.app_metadata.escen_first_login || {};
    const { data, error } = await auth.client.auth.admin.updateUserById(auth.context.authUserId, {
      app_metadata: { ...auth.user.app_metadata, escen_first_login: { ...record, version: 1,
        profile_reviewed_at: new Date().toISOString(), profile_review: body.decision, profile_snapshot: body.snapshot, ticket_id: ticketId } },
    });
    if (error || !data.user) throw new RequestError(503, 'La vérification n’a pas été confirmée. Réessayez.');
    invalidateAuthCache();
    return Response.json({ updated: true, ticketId }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
