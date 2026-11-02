import { getSupabaseServerClient } from '@/lib/supabase/server';
import { errorResponse } from '@/server/auth';
import { boundedRequest, hashWebsiteToken, websiteRpc } from '@/server/website';
import { assertCandidateOrigin, candidateCookie, candidateTokenSchema, rateCandidateRequest, readCandidateToken } from '@/server/admissions';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

const changePasswordSchema = z.object({
  action: z.literal('change_password'),
  current_password: z.string().optional(),
  new_password: z.string().min(8, 'Le mot de passe doit comporter au moins 8 caractères.'),
}).strict();

const tokenLoginSchema = z.object({
  token: candidateTokenSchema,
}).strict();

const credentialsLoginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
}).strict();

export async function POST(request: Request) {
  try {
    assertCandidateOrigin(request);
    const client = getSupabaseServerClient();
    await rateCandidateRequest(client, request);

    const raw = await (await boundedRequest(request, 2048)).json();

    const changePwd = changePasswordSchema.safeParse(raw);
    if (changePwd.success) {
      const token = readCandidateToken(request);
      const data = await websiteRpc(client, 'escen_candidate_change_password', {
        p_session_token_hash: hashWebsiteToken(token),
        p_current_password: changePwd.data.current_password || '',
        p_new_password: changePwd.data.new_password,
      });
      return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
    }

    const tokenLogin = tokenLoginSchema.safeParse(raw);
    if (tokenLogin.success) {
      await websiteRpc(client, 'escen_candidate_dossier', {
        p_token_hash: hashWebsiteToken(tokenLogin.data.token),
        p_action: 'read',
        p_data: {},
      });
      return Response.json(
        { connected: true, must_change_password: false },
        { headers: { 'Set-Cookie': candidateCookie(tokenLogin.data.token), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } }
      );
    }

    const creds = credentialsLoginSchema.parse(raw);
    const sessionToken = randomBytes(32).toString('hex');
    const data = await websiteRpc(client, 'escen_candidate_login', {
      p_identifier: creds.identifier,
      p_password: creds.password,
      p_session_token_hash: hashWebsiteToken(sessionToken),
    }) as { connected: boolean; must_change_password: boolean; [key: string]: unknown };

    return Response.json(
      data,
      { headers: { 'Set-Cookie': candidateCookie(sessionToken), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertCandidateOrigin(request);
    return Response.json(
      { connected: false },
      { headers: { 'Set-Cookie': candidateCookie('', true), 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
