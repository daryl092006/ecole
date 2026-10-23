import { z } from 'zod';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { identityArchiveChanges } from '@/services/identityCrudService';
import type { RelationalSnapshot, PersistentChange } from '@/types/persistence';
import { internalStaffReference, isInternalStaffReference } from '@/utils/staffReference';
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
    const body=z.object({revision:z.number().int().nonnegative(),firstname:z.string().trim().min(1).max(160),lastname:z.string().trim().min(1).max(160),email:z.union([z.email(),z.literal('')]),phone:z.string().trim().max(80),employeeNumber:z.string().trim().max(160),position:z.string().trim().max(160).optional().default(''),contractType:z.enum(['PERMANENT','VACATAIRE','STAGIAIRE']).optional().default('PERMANENT'),reason:z.string().trim().min(3).max(1000)}).strict().parse(await request.json());
    if(body.revision!==snapshot.revision)throw new RequestError(409,'Ces données ont changé. Actualisez avant de réessayer.');
    const changes:PersistentChange[]=[{table:'people',operation:'update',record:{id:person.id,firstname:body.firstname,lastname:body.lastname,email:body.email || null,phone:body.phone || null}}];
    // Sans matricule saisi, on conserve la référence interne existante (ou on en crée une) : le personnel administratif n'a pas de matricule.
    const employeeNumber=body.employeeNumber || (member && isInternalStaffReference(member.employee_number)?String(member.employee_number):internalStaffReference());
    const staffId=String(member?.id || crypto.randomUUID());
    changes.push({table:'staff',operation:member?'update':'insert',record:{id:staffId,person_id:person.id,employee_number:employeeNumber,reason:body.reason}});
    const contracts=(filterRelationalSnapshot(snapshot,context).tables.staff_contracts || []).filter(row=>row.staff_id===staffId && !row.ends_on);
    const isTeacher=!!member && (snapshot.tables.teachers || []).some(row=>row.staff_id===member.id);
    if(!body.position && (!isTeacher || contracts.length))throw new RequestError(400,'Indiquez la fonction du membre du personnel. Une fonction existante ne peut pas être effacée depuis ce formulaire.');
    const today=new Date().toISOString().slice(0,10);
    if(body.position && !contracts.some(row=>row.position===body.position && row.contract_type===body.contractType)){
      // Changement de fonction : la fonction en cours est clôturée et une nouvelle est ouverte, l'historique reste conservé.
      for(const row of contracts)changes.push({table:'staff_contracts',operation:'update',record:{id:row.id,ends_on:today < String(row.starts_on)?String(row.starts_on):today}});
      changes.push({table:'staff_contracts',operation:'insert',record:{id:crypto.randomUUID(),staff_id:staffId,site_id:null,contract_type:body.contractType,position:body.position,starts_on:today}});
    }
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
