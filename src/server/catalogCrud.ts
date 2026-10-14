import 'server-only';
import { z } from 'zod';
import { requireAccount, requirePermission, RequestError } from '@/server/auth';
import { ROLES } from '@/types/permissions';
import { CRUD_CATALOG } from '@/data/crudCatalog';
import { catalogSpec, parseCatalogRecord, canManageCatalog, validateCatalogReferences } from '@/services/catalogCrudService';
import type { RelationalSnapshot, PersistentChange } from '@/types/persistence';
export async function catalogRequest(request: Request, key: string) {
  if (!CRUD_CATALOG.some(spec => spec.key === key)) throw new RequestError(404,'Collection inconnue.');
  const account = await requireAccount(request); const spec = catalogSpec(key);
  requirePermission(account.context,spec.read);
  if (!account.context.grants.some(g => !g.site_id && !g.group_id && !g.academic_year_id)) throw new RequestError(403,'La gestion du référentiel nécessite un accès global.');
  const response = await account.client.rpc('escen_backend_snapshot');
  if (response.error) throw new RequestError(503,'Chargement du référentiel indisponible.');
  return { ...account, snapshot: response.data as RelationalSnapshot, spec };
}
export async function writeCatalog(request: Request, key: string, id?: string) {
  const { client, context, snapshot } = await catalogRequest(request,key);
  if (!canManageCatalog(context,key)) throw new RequestError(403,'Vous ne pouvez pas modifier ce référentiel.');
  const archive = request.method === 'DELETE';
  const body = z.object({ revision: z.number().int().nonnegative(), values: z.record(z.string(),z.unknown()).optional(), reason: z.string().trim().min(3).max(1000), sourceRowId:z.uuid().optional() }).strict().parse(await request.json());
  if (body.revision !== snapshot.revision) throw new RequestError(409,'Ces données ont changé. Actualisez avant de réessayer.');
  const target = id ? snapshot.tables[key]?.find(row => row.id === z.uuid().parse(id)) : undefined;
  if (id && !target) throw new RequestError(404,'Enregistrement introuvable.');
  if (target?.archived_at) throw new RequestError(409,'Cet enregistrement est archivé.');
  let record: Record<string,unknown>;
  if (archive) {
    if (!id) throw new RequestError(400,'Enregistrement requis.');
    record = { id, archived_at: new Date().toISOString(), reason: body.reason };
  } else {
    try { record = parseCatalogRecord(key,body.values); validateCatalogReferences(key,record,snapshot); }
    catch (error) { throw new RequestError(400,error instanceof z.ZodError ? 'Vérifiez les champs obligatoires et leur format.' : error instanceof Error ? error.message : 'Données invalides.'); }
    record = { ...record, id: id || crypto.randomUUID(), reason: body.reason };

  }
  const changes: PersistentChange[] = [{ table: key, operation: id ? 'update' : 'insert', record }];
  if(body.sourceRowId && (id || archive || ![ROLES.IT,ROLES.DG].includes(context.role as typeof ROLES.IT))) throw new RequestError(403,'Cette reprise nécessite un accès global de direction ou d’administration.');
  const response = body.sourceRowId ? await client.rpc('escen_catalog_resume',{p_actor_id:context.accountId,p_expected_revision:snapshot.revision,p_table:key,p_record:record,p_source_id:body.sourceRowId}) : await client.rpc('escen_backend_transaction',{p_actor_id:context.accountId,p_expected_revision:snapshot.revision,p_changes:changes});
  if (response.error?.message.includes('Source déjà reprise')) throw new RequestError(409,'Ce dossier a déjà été repris. Modifiez son enregistrement dans le référentiel actuel.');
  if (response.error) throw new RequestError(409,'Enregistrement refusé : doublon, relation incompatible ou modification concurrente.');
  return Response.json({ id: record.id, revision: response.data },{status: id ? 200 : 201,headers:{'Cache-Control':'no-store'}});
}
