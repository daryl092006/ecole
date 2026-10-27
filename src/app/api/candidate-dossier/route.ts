import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { errorResponse, RequestError } from '@/server/auth';
import { boundedRequest, hashWebsiteToken, websiteRpc } from '@/server/website';
import { applicationIntakeSchema, applicationLetterHtml } from '@/services/admissionsService';
import { assertCandidateOrigin, attemptApplicationEmails, persistCandidateFiles, rateCandidateRequest, readCandidateToken, uploadCandidateFiles } from '@/server/admissions';
import type { CandidateDossier } from '@/types/admissions';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const client = getSupabaseServerClient(); const token = readCandidateToken(request);
    const data = await websiteRpc(client, 'escen_candidate_dossier', { p_token_hash: hashWebsiteToken(token), p_action: 'read', p_data: {} }) as CandidateDossier;
    const params = new URL(request.url).searchParams;
    if (params.has('letter')) {
      const letter = data.application.letters.find(item => item.id === z.uuid().parse(params.get('letter')));
      if (!letter) throw new RequestError(404, 'Courrier introuvable.');
      return new Response(applicationLetterHtml(letter.reference, letter.content), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" } });
    }
    return Response.json(data, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    assertCandidateOrigin(request); const client = getSupabaseServerClient(); const hash = hashWebsiteToken(readCandidateToken(request)); await rateCandidateRequest(client, request);
    let result;
    if (request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      const form = await (await boundedRequest(request, 26 * 1024 * 1024)).formData();
      const version = z.coerce.number().int().positive().parse(form.get('version'));
      const current = await websiteRpc(client, 'escen_candidate_dossier', { p_token_hash: hash, p_action: 'read', p_data: {} }) as CandidateDossier;
      if (current.application.version !== version || !['NOUVELLE','RECUE','INCOMPLET','A_COMPLETER'].includes(current.application.workflow_stage || '')) throw new RequestError(409, 'Le dossier a changé ou est en étude. Actualisez avant d’ajouter des pièces.');
      const documents = await uploadCandidateFiles(client, current.application.id, form);
      if (!documents.length) throw new RequestError(400, 'Sélectionnez une pièce.');
      result = await persistCandidateFiles(client, 'escen_candidate_dossier', { p_token_hash: hash, p_action: 'documents', p_data: { version, documents } }, documents.map(item => item.object_path));
    } else {
      const { version, application } = z.object({ version: z.number().int().positive(), application: applicationIntakeSchema }).strict().parse(await (await boundedRequest(request, 32768)).json());
      result = await websiteRpc(client, 'escen_candidate_dossier', { p_token_hash: hash, p_action: 'update', p_data: { ...application, version } });
    }
    await attemptApplicationEmails(client);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
