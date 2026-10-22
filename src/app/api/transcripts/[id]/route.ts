import { z } from 'zod';
import { errorResponse, requireAccount, requirePermission, RequestError } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { authorizedTranscriptDocument } from '@/services/transcriptAccessService';
import type { RelationalSnapshot } from '@/types/persistence';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'grade.view');
    const id = z.uuid().parse((await params).id);
    const result = await client.rpc('escen_backend_snapshot');
    if (result.error) throw new RequestError(503, 'Chargement du relevé indisponible. Réessayez.');
    const snapshot = result.data as RelationalSnapshot;
    const year = await resolveAcademicYear(request, client, context, snapshot);
    let document;
    try { document = authorizedTranscriptDocument(snapshot, context, year.selectedYearId || (year.selection === 'all' ? null : '00000000-0000-0000-0000-000000000000'), id); }
    catch (error) { throw new RequestError(409, error instanceof Error ? error.message : 'Le document enregistré est incomplet.'); }
    if (!document) throw new RequestError(404, 'Relevé introuvable dans votre périmètre et l’année consultée.');
    return Response.json(document, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
