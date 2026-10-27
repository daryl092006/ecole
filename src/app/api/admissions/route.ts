import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { boundedRequest, hashWebsiteToken, websiteRpc } from '@/server/website';
import { admissionCommandSchema, applicationLetterHtml, ADMISSION_ACTIONS } from '@/services/admissionsService';
import { attemptApplicationEmails, portalOrigin, submissionSchema, submitApplication } from '@/server/admissions';
import { emailConfiguration } from '@/server/emailTransport';
import type { AdmissionsContext } from '@/types/admissions';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
async function authorized(request: Request) {
  const auth = await requireAccount(request); requirePermission(auth.context, 'application.view');
  if (!auth.context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id)) throw new RequestError(403, 'Accès global aux candidatures requis.');
  const selection = request.headers.get('x-escen-year') || 'current';
  if (selection === 'all') return { ...auth, yearId: null, selection };
  if (selection !== 'current') return { ...auth, yearId: z.uuid().parse(selection), selection };
  const response = await auth.client.rpc('escen_academic_year_context');
  if (response.error) throw new RequestError(503, 'Contexte annuel indisponible.');
  return { ...auth, yearId: response.data?.currentYearId as string | null, selection };
}
export async function GET(request: Request) {
  try {
    const { client, context, yearId, selection } = await authorized(request);
    if (!yearId && selection !== 'all') throw new RequestError(409, 'Choisissez une année.');
    const params = new URL(request.url).searchParams;
    if (params.get('view') === 'notifications') {
      const notices = await websiteRpc(client, 'escen_application_notices', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_year_id: yearId });
      return Response.json({ notices }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (params.has('document')) {
      const document = await websiteRpc(client, 'escen_admission_document', {
        p_actor_id: context.accountId, p_role_code: context.roleCode, p_year_id: yearId, p_id: z.uuid().parse(params.get('document')),
      });
      if (!document?.bucket || !document.object_path) throw new RequestError(404, 'Pièce introuvable.');
      const signed = await client.storage.from(document.bucket).createSignedUrl(document.object_path, 60, { download: document.filename });
      if (signed.error || !signed.data) throw new RequestError(503, 'Téléchargement indisponible.');
      return Response.json({ url: signed.data.signedUrl }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const data = await websiteRpc(client, 'escen_admissions_context', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_year_id: yearId }) as AdmissionsContext;
    data.mail_configured = emailConfiguration().ready;
    if (params.has('letter')) {
      const letter = data.applications.flatMap(item => item.letters).find(item => item.id === z.uuid().parse(params.get('letter')));
      if (!letter) throw new RequestError(404, 'Courrier hors de votre périmètre.');
      return new Response(applicationLetterHtml(letter.reference, letter.content), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" } });
    }
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { client, context, yearId } = await authorized(request);
    if (request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      if (!yearId) throw new RequestError(409, 'Sélectionnez une année avant d’enregistrer.');
      requirePermission(context, 'application.review');
      const form = await (await boundedRequest(request, 26 * 1024 * 1024)).formData();
      const input = submissionSchema.parse(JSON.parse(String(form.get('payload') || '{}')));
      const { token: _token, ...result } = await submitApplication(client, request, input, form, yearId, context.accountId, context.roleCode);
      void _token;
      return Response.json(result, { status: 201 });
    }
    const raw: unknown = await (await boundedRequest(request, 32768)).json();
    const notices = z.object({ action: z.literal('read_notices'), ids: z.array(z.uuid()).max(200) }).strict().safeParse(raw);
    if (notices.success) {
      await websiteRpc(client, 'escen_application_notice_read', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_ids: notices.data.ids });
      return Response.json({ saved: true });
    }
    if (!yearId) throw new RequestError(409, 'Sélectionnez une année avant d’enregistrer.');
    const input = admissionCommandSchema.parse(raw); const capability = ADMISSION_ACTIONS[input.action].capability;
    requirePermission(context, capability === 'decide' ? 'application.decide' : capability === 'payment' ? 'application.payment.confirm' : capability === 'followup' ? 'application.followup' : 'application.review');
    const payload: Record<string, unknown> = { ...input };
    if (['incomplete','request_changes'].includes(input.action)) {
      const token = randomBytes(32).toString('hex');
      payload.access_token_hash = hashWebsiteToken(token); payload.access_url = `${portalOrigin(request)}/candidature/suivi#access=${token}`;
    }
    const data = await websiteRpc(client, 'escen_application_command', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_year_id: yearId, p_action: input.action, p_data: payload });
    await attemptApplicationEmails(client);
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
