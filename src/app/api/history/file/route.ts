import { z } from 'zod';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { ROLES } from '@/types/permissions';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'system.audit.view');
    if (![ROLES.IT, ROLES.DG].includes(context.role as typeof ROLES.IT) || !context.grants.some(g => !g.site_id && !g.group_id && !g.academic_year_id)) throw new RequestError(403, 'Accès global aux archives requis.');
    const params = new URL(request.url).searchParams;
    const id = z.uuid().parse(params.get('id')); const field = z.string().min(1).max(80).parse(params.get('field'));
    const source = await client.rpc('escen_history_document', { p_row_id: id, p_field: field });
    if (source.error) throw new RequestError(503, 'Chargement de la pièce indisponible.');
    if (!source.data) throw new RequestError(404, 'Ce fichier n’est pas présent dans les sauvegardes transférées.');
    const signed = await client.storage.from(source.data.bucket).createSignedUrl(source.data.path, 60, { download: source.data.name.split('/').at(-1) });
    if (signed.error) throw new RequestError(503, 'Téléchargement temporairement indisponible.');
    return Response.json({ url: signed.data.signedUrl }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
