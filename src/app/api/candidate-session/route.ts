import { getSupabaseServerClient } from '@/lib/supabase/server';
import { errorResponse } from '@/server/auth';
import { boundedRequest, hashWebsiteToken, websiteRpc } from '@/server/website';
import { assertCandidateOrigin, candidateCookie, candidateTokenSchema, rateCandidateRequest } from '@/server/admissions';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    assertCandidateOrigin(request); const client = getSupabaseServerClient(); await rateCandidateRequest(client, request);
    const { token } = z.object({ token: candidateTokenSchema }).strict().parse(await (await boundedRequest(request, 2048)).json());
    await websiteRpc(client, 'escen_candidate_dossier', { p_token_hash: hashWebsiteToken(token), p_action: 'read', p_data: {} });
    return Response.json({ connected: true }, { headers: { 'Set-Cookie': candidateCookie(token), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request) {
  try { assertCandidateOrigin(request); return Response.json({ connected: false }, { headers: { 'Set-Cookie': candidateCookie('', true), 'Cache-Control': 'no-store' } }); }
  catch (error) { return errorResponse(error); }
}
