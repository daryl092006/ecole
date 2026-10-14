import { requireAccount, errorResponse, RequestError } from '@/server/auth';
import { ROLES } from '@/types/permissions';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { context, client } = await requireAccount(request);
    if (context.role !== ROLES.DG && context.role !== ROLES.IT) throw new RequestError(403, 'La revue de la reprise est réservée à la direction générale et à l’Informaticien.');
    const result = await client.rpc('escen_import_overview');
    if (result.error) throw new RequestError(503, 'Le suivi de la reprise est indisponible.');
    return Response.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
