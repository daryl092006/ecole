import { getSupabaseServerClient } from '@/lib/supabase/server';
import { errorResponse } from '@/server/auth';
import { boundedRequest, websiteRpc } from '@/server/website';
import { assertCandidateOrigin, candidateCookie, rateCandidateRequest, submissionSchema, submitApplication } from '@/server/admissions';
import { DOCUMENT_LABELS } from '@/services/websiteService';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const client = getSupabaseServerClient();
    const [year, intakes] = await Promise.all([
      websiteRpc(client, 'escen_website_public', { p_action: 'year', p_token_hash: null, p_data: {} }),
      websiteRpc(client, 'escen_website_public', { p_action: 'intakes', p_token_hash: null, p_data: {} }),
    ]);
    return Response.json({ year, intakes, document_labels: DOCUMENT_LABELS }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    assertCandidateOrigin(request); const client = getSupabaseServerClient(); await rateCandidateRequest(client, request);
    const form = await (await boundedRequest(request, 26 * 1024 * 1024)).formData();
    const input = submissionSchema.parse(JSON.parse(String(form.get('payload') || '{}')));
    const year = await websiteRpc(client, 'escen_website_public', { p_action: 'year', p_token_hash: null, p_data: {} });
    const result = await submitApplication(client, request, input, form, year?.id || '00000000-0000-0000-0000-000000000000');
    const { token, ...receipt } = result;
    return Response.json(receipt, { status: 201, headers: { 'Set-Cookie': candidateCookie(token), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) { return errorResponse(error); }
}
