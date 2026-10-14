import { z } from 'zod';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { identityArchiveChanges } from '@/services/identityCrudService';
import type { RelationalSnapshot, PersistentChange } from '@/types/persistence';
export const dynamic='force-dynamic';
type Context={params:Promise<{personId:string}>};
async function getStaff(request:Request,params:Context['params']) {
  const account=await requireAccount(request);requirePermission(account.context,'staff.manage');
  if(!account.context.grants.some(g=>!g.site_id && !g.group_id && !g.academic_year_id))throw new RequestError(403,'La gestion des dossiers nécessite un accès global.');
  const personId=z.uuid().parse((await params).personId);
  const response=await account.client.rpc('escen_backend_snapshot');if(response.error)throw new RequestError(503,'Dossiers indisponibles.');
  const snapshot=response.data as RelationalSnapshot;const tables=filterRelationalSnapshot(snapshot,account.context).tables;
  const member=tables.staff?.find(row=>row.person_id===personId && !row.archived_at);
  const person=tables.people?.find(row=>row.id===personId && !row.archived_at && (member || tables.accounts?.some(account=>account.person_id===row.id && account.account_type==='staff' && !account.archived_at)));
  if(!person)throw new RequestError(404,'Dossier introuvable.');
  return {...account,snapshot,person,member};
}
export async function PATCH(request:Request,{params}:Context) {
  try {
    const {client,context,snapshot,person,member}=await getStaff(request,params);
    const body=z.object({revision:z.number().int().nonnegative(),firstname:z.string().trim().min(1).max(160),lastname:z.string().trim().min(1).max(160),email:z.union([z.email(),z.literal('')]),phone:z.string().trim().max(80),employeeNumber:z.string().trim().max(160),reason:z.string().trim().min(3).max(1000)}).strict().parse(await request.json());
    if(body.revision!==snapshot.revision)throw new RequestError(409,'Ces données ont changé. Actualisez avant de réessayer.');
    if(member && !body.employeeNumber)throw new RequestError(400,'Le matricule officiel est obligatoire.');
    const changes:PersistentChange[]=[{table:'people',operation:'update',record:{id:person.id,firstname:body.firstname,lastname:body.lastname,email:body.email || null,phone:body.phone || null}}];
    if(body.employeeNumber)changes.push({table:'staff',operation:member?'update':'insert',record:{id:member?.id || crypto.randomUUID(),person_id:person.id,employee_number:body.employeeNumber,reason:body.reason}});
    const result=await client.rpc('escen_backend_transaction',{p_actor_id:context.accountId,p_expected_revision:snapshot.revision,p_changes:changes});
    if(result.error)throw new RequestError(409,'Enregistrement refusé : doublon ou modification concurrente.');
    return Response.json({revision:result.data},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return errorResponse(error);}
}
export async function DELETE(request:Request,{params}:Context) {
  try {
    const {client,context,snapshot,person}=await getStaff(request,params);
    const body=z.object({revision:z.number().int().nonnegative(),reason:z.string().trim().min(3).max(1000)}).strict().parse(await request.json());
    if(body.revision!==snapshot.revision)throw new RequestError(409,'Ces données ont changé. Actualisez avant de réessayer.');
    let changes;try{changes=identityArchiveChanges(context,snapshot,'staff',person.id,body.reason);}catch(error){throw new RequestError(409,error instanceof Error?error.message:'Archivage impossible.');}
    const result=await client.rpc('escen_backend_transaction',{p_actor_id:context.accountId,p_expected_revision:snapshot.revision,p_changes:changes});
    if(result.error)throw new RequestError(409,'Archivage refusé. Actualisez et réessayez.');
    return Response.json({revision:result.data},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return errorResponse(error);}
}
