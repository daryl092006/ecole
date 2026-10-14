import { z } from 'zod';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { identityArchiveChanges, personFormSchema } from '@/services/identityCrudService';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import type { RelationalSnapshot } from '@/types/persistence';
export const dynamic = 'force-dynamic';
const formSchema = personFormSchema.safeExtend({revision:z.number().int().nonnegative()});
export async function PATCH(request: Request, { params }: { params: Promise<{ matricule: string }> }) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'student.update');
    const matricule = z.string().min(1).max(160).parse((await params).matricule);
    const form = formSchema.parse(await request.json());
    const snapshot = await client.rpc('escen_backend_snapshot');
    if (snapshot.error) throw new RequestError(503, 'Chargement du dossier indisponible.');
    if(form.revision!==snapshot.data.revision)throw new RequestError(409,'Le dossier a changé. Actualisez avant d’enregistrer vos modifications.');
    const filtered = filterRelationalSnapshot(snapshot.data as RelationalSnapshot, context);
    const student = filtered.tables.students?.find(row => row.matricule === matricule && !row.archived_at);
    if (!student) throw new RequestError(404, 'Dossier introuvable ou non autorisé.');
    const result = await client.rpc('escen_backend_transaction', { p_actor_id: context.accountId, p_expected_revision: snapshot.data.revision, p_changes: [{ table: 'people', operation: 'update', record: { id: student.person_id, firstname: form.firstname, lastname: form.lastname, email: form.email || null, phone: form.phone || null, gender: form.gender || null, birth_date: form.birthDate || null, nationality: form.nationality || null, address: form.address || null, city: form.city || null, country: form.country || null } }] });
    if (result.error) throw new RequestError(409, 'Le dossier a changé ou les données sont invalides. Actualisez et réessayez.');
    return Response.json({ revision: result.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ matricule: string }> }) {
  try {
    const { client, context } = await requireAccount(request); requirePermission(context,'student.lifecycle.manage');
    const matricule = z.string().min(1).max(160).parse((await params).matricule);
    const body = z.object({reason:z.string().trim().min(3).max(1000)}).strict().parse(await request.json());
    const response=await client.rpc('escen_backend_snapshot');if(response.error)throw new RequestError(503,'Dossier indisponible.');
    const snapshot=response.data as RelationalSnapshot;
    const row=filterRelationalSnapshot(snapshot,context).tables.students?.find(row=>row.matricule===matricule && !row.archived_at);
    if(!row)throw new RequestError(404,'Dossier introuvable.');
    let changes;try{changes=identityArchiveChanges(context,snapshot,'students',String(row.person_id),body.reason);}catch(error){throw new RequestError(409,error instanceof Error?error.message:'Archivage impossible.');}
    const result=await client.rpc('escen_backend_transaction',{p_actor_id:context.accountId,p_expected_revision:snapshot.revision,p_changes:changes});
    if(result.error)throw new RequestError(409,'Le dossier a changé. Actualisez et réessayez.');
    return Response.json({revision:result.data},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return errorResponse(error);}
}
