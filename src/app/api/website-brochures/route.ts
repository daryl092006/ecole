import { createHash, randomUUID } from 'node:crypto';
import { requireAccount, RequestError, errorResponse } from '@/server/auth';
import { boundedRequest, websiteRpc } from '@/server/website';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { brochureSchema, sniffDocument, websiteAccess } from '@/services/websiteService';
import type { RelationalSnapshot } from '@/types/persistence';
import type { WebsiteBrochure } from '@/types/website';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const bucket = 'escen-website-brochures';
async function authorize(request: Request, write: boolean) {
  const account = await requireAccount(request);
  const access = websiteAccess(account.context);
  if (write ? !access.manageArticles : !access.articles) throw new RequestError(403, 'Accès non autorisé.');
  const snapshot = await account.client.rpc('escen_backend_snapshot');
  if (snapshot.error) throw new RequestError(503, 'Contexte annuel indisponible.');
  const year = await resolveAcademicYear(request, account.client, account.context, snapshot.data as RelationalSnapshot);
  if (write && !year.selectedYearId) throw new RequestError(409, 'Choisissez une année scolaire précise.');
  return { ...account, year };
}
export async function GET(request: Request) {
  try {
    const { client, context, year } = await authorize(request, false);
    const rows = await websiteRpc(client, 'escen_brochures_manage', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_action: 'list' }) as WebsiteBrochure[];
    return Response.json(rows.filter(row => year.selection === 'all' || row.academic_year_id === year.selectedYearId), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { client, context, year } = await authorize(request, true);
    const form = await (await boundedRequest(request, 11 * 1024 * 1024)).formData();
    const input = brochureSchema.parse(JSON.parse(String(form.get('metadata') || '{}')));
    const file = form.get('file');
    if (!input.id && (!(file instanceof File) || !file.size)) throw new RequestError(400, 'Ajoutez la brochure PDF.');
    const args = { p_actor_id: context.accountId, p_role_code: context.roleCode };
    if (input.id) {
      const rows = await websiteRpc(client, 'escen_brochures_manage', { ...args, p_action: 'list' }) as WebsiteBrochure[];
      if (!rows.some(row => row.id === input.id && row.academic_year_id === year.selectedYearId)) throw new RequestError(403, 'Cette brochure appartient à une autre année.');
    }
    let uploaded: string | undefined;
    let document = {};
    try {
      if (file instanceof File && file.size) {
        if (file.size > 10 * 1024 * 1024) throw new RequestError(413, 'Le PDF doit faire au maximum 10 Mo.');
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (file.type !== 'application/pdf' || sniffDocument(bytes) !== 'application/pdf') throw new RequestError(400, 'Choisissez un fichier PDF valide.');
        const objectPath = `${year.selectedYearId}/${randomUUID()}.pdf`;
        const result = await client.storage.from(bucket).upload(objectPath, bytes, { contentType: 'application/pdf', upsert: false });
        if (result.error) throw new RequestError(503, 'Transfert impossible. Réessayez.');
        uploaded = objectPath;
        document = { object_path: objectPath, filename: file.name.replace(/[\x00-\x1f/\\]/g, '_').slice(0, 200), byte_size: file.size, sha256: createHash('sha256').update(bytes).digest('hex') };
      }
      const result = await websiteRpc(client, 'escen_brochures_manage', { ...args, p_action: 'save', p_data: { ...input, ...document, academic_year_id: year.selectedYearId } });
      return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      if (uploaded) await client.storage.from(bucket).remove([uploaded]);
      throw error;
    }
  } catch (error) { return errorResponse(error); }
}
