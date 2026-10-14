import { errorResponse } from '@/server/auth';
import { catalogRequest, writeCatalog } from '@/server/catalogCrud';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { ROLES } from '@/types/permissions';
import { CRUD_CATALOG } from '@/data/crudCatalog';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ collection: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const key = (await params).collection;
    const { snapshot, context, client } = await catalogRequest(request,key);
    const dependencies = CRUD_CATALOG.find(spec => spec.key === key)!.fields.flatMap(field => field.reference ? [field.reference] : []);
    const scoped=filterRelationalSnapshot(snapshot,context);
    const restricted=[ROLES.ENS,ROLES.SURV,ROLES.STUD,ROLES.DEL].includes(context.role as typeof ROLES.ENS);
    const tables = Object.fromEntries([...new Set([key,...dependencies])].map(name => [name, name===key || restricted ? scoped.tables[name] || [] : (snapshot.tables[name] || []).map(row=>({id:row.id,name:row.name,code:row.code,site_id:row.site_id,archived_at:row.archived_at,active:row.active}))]));
    let historyLinks:{sourceRowId:string;targetId:string}[]=[];
    if([ROLES.IT,ROLES.DG].includes(context.role as typeof ROLES.IT)){const links=await client.rpc('escen_catalog_history_links',{p_table:key});if(links.error)throw new Error('Provenance indisponible.');historyLinks=links.data || [];}
    return Response.json({revision:snapshot.revision,tables,historyLinks},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return errorResponse(error); }
}
export async function POST(request: Request, { params }: Context) { try { return await writeCatalog(request,(await params).collection); } catch(error) { return errorResponse(error); } }
