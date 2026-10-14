import { z } from 'zod';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { personFormSchema, personValues } from '@/services/identityCrudService';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
  try {
    const {client,context}=await requireAccount(request);requirePermission(context,'student.update');requirePermission(context,'student.lifecycle.manage');
    if(!context.grants.some(g=>!g.site_id && !g.group_id && !g.academic_year_id)) throw new RequestError(403,'La création d’un dossier nécessite un accès global.');
    const body=z.object({matricule:z.string().trim().min(1).max(160),person:personFormSchema}).strict().parse(await request.json());
    const response=await client.rpc('escen_backend_snapshot');if(response.error)throw new RequestError(503,'Dossiers indisponibles.');
    if(response.data.tables.students.some((row:{matricule:string})=>row.matricule.toLowerCase()===body.matricule.toLowerCase()))throw new RequestError(409,'Ce matricule existe déjà.');
    if(body.person.email && response.data.tables.people.some((row:{email:string|null})=>row.email?.toLowerCase()===body.person.email.toLowerCase()))throw new RequestError(409,'Cette adresse correspond déjà à une personne. Utilisez son dossier existant.');
    const personId=crypto.randomUUID();const studentId=crypto.randomUUID();
    const saved=await client.rpc('escen_backend_transaction',{p_actor_id:context.accountId,p_expected_revision:response.data.revision,p_changes:[{table:'people',operation:'insert',record:{id:personId,...personValues(body.person)}},{table:'students',operation:'insert',record:{id:studentId,person_id:personId,matricule:body.matricule,reason:'Création du dossier étudiant'}}]});
    if(saved.error)throw new RequestError(409,'Création refusée : doublon ou modification concurrente.');
    return Response.json({matricule:body.matricule,revision:saved.data},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){return errorResponse(error);}
}
