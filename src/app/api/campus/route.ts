import { requireAccount, errorResponse, RequestError } from '@/server/auth';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import type { RelationalSnapshot } from '@/types/persistence';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    const result = await client.rpc('escen_backend_snapshot');
    if (result.error) throw new RequestError(503, 'Chargement des dossiers indisponible.');
    return Response.json(filterRelationalSnapshot(result.data as RelationalSnapshot,context), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    await requireAccount(request);
    throw new RequestError(501, 'Les commandes métier persistantes ne sont pas encore activées.');
  } catch (error) { return errorResponse(error); }
}
