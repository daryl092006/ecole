import { timingSafeEqual } from 'node:crypto';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { processEmailBatch } from '@/server/emailWorker';
import { RequestError, errorResponse } from '@/server/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const secret = process.env.ESCEN_EMAIL_WORKER_SECRET;
    const authorization = request.headers.get('authorization') || '';
    const expected = Buffer.from(`Bearer ${secret || ''}`);
    const supplied = Buffer.from(authorization);
    if (!secret || secret.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new RequestError(401, 'Traitement non autorisé.');
    return Response.json(await processEmailBatch(getSupabaseServerClient()), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
