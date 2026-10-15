import { resolveAcademicYear, assertArchiveAcademicYear } from '@/server/academicYearContext';
import { filterSnapshotForAcademicYear } from '@/services/academicYearScopeService';
import {z} from 'zod';
import {requireAccount,requirePermission,errorResponse,RequestError} from '@/server/auth';
import {assessmentCategory} from '@/services/assessmentDisplayService';
import {ROLES} from '@/types/permissions';
import {subjectSchema,buildSubjectChanges,projectSubjects} from '@/services/subjectCompositionService';
import type {RelationalSnapshot,PersistentContext,DatabaseRow} from '@/types/persistence';
export const dynamic='force-dynamic';
const privileged=(context:PersistentContext)=>[ROLES.IT,ROLES.DG,ROLES.DA].includes(context.role as typeof ROLES.IT) && context.grants.some(g=>!g.site_id && !g.group_id && !g.academic_year_id);
const visible=(snapshot:RelationalSnapshot,context:PersistentContext)=>(snapshot.tables.exam_papers || []).filter(row=>row.evaluation_id==null && (privileged(context) || row.author_id===context.accountId));
export async function GET(request:Request){try{
  const {client,context}=await requireAccount(request);requirePermission(context,'evaluation.create');
  const response=await client.rpc('escen_backend_snapshot');if(response.error)throw new RequestError(503,'Chargement des sujets indisponible.');const snapshot=response.data as RelationalSnapshot;
  const year=await resolveAcademicYear(request,client,context,snapshot);
  const scoped=filterSnapshotForAcademicYear(snapshot,year.selectedYearId || (year.selection==='all'?null:'00000000-0000-0000-0000-000000000000'));
  return Response.json({revision:snapshot.revision,subjects:projectSubjects(scoped,visible(scoped,context))},{headers:{'Cache-Control':'no-store'}});
}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{
  const {client,context}=await requireAccount(request);requirePermission(context,'evaluation.create');
  const body=z.object({revision:z.number().int().nonnegative(),previousId:z.uuid().optional(),subject:subjectSchema,reason:z.string().trim().min(3).max(1000)}).strict().parse(await request.json());
  const response=await client.rpc('escen_backend_snapshot');if(response.error)throw new RequestError(503,'Chargement des sujets indisponible.');const snapshot=response.data as RelationalSnapshot;
  const year=await resolveAcademicYear(request,client,context,snapshot);
  if(!year.selectedYearId)throw new RequestError(409,'Choisissez une année scolaire précise avant de composer un sujet.');
  if(snapshot.revision!==body.revision)throw new RequestError(409,'Les sujets ont changé. Actualisez avant d’enregistrer.');
  const previous=body.previousId?visible(snapshot,context).find(row=>row.id===body.previousId && !row.archived_at):undefined;
  if(previous && previous.academic_year_id!==year.selectedYearId)throw new RequestError(409,'Ce sujet appartient à une autre année ou son année doit être confirmée.');
  if(body.previousId && !previous)throw new RequestError(404,'Sujet introuvable ou non modifiable.');
  if(previous && body.subject.sourceEvaluationRowId===previous.source_evaluation_row_id && body.subject.sourceEvaluationRowId && body.subject.purpose!==previous.purpose)throw new RequestError(400,'Dissociez l’épreuve historique avant de changer la nature du sujet.');
  if(body.subject.sourceEvaluationRowId && body.subject.sourceEvaluationRowId!==previous?.source_evaluation_row_id){
    if(![ROLES.IT,ROLES.DG].includes(context.role as typeof ROLES.IT) || !privileged(context))throw new RequestError(403,'Ce rattachement historique nécessite un accès global aux archives.');
    await assertArchiveAcademicYear(request,client,context,body.subject.sourceEvaluationRowId);
    const source=await client.rpc('escen_history_exam',{p_id:body.subject.sourceEvaluationRowId});if(source.error || !source.data)throw new RequestError(404,'Évaluation historique introuvable.');
    const category={CONTROLE_CONTINU:'control',EXAMEN:'exam',RATTRAPAGE:'resit'}[body.subject.purpose];
    if(assessmentCategory(source.data.exam)!==category)throw new RequestError(400,'La nature du sujet ne correspond pas à l’épreuve associée.');
  }
  const prepared=buildSubjectChanges(body.subject,context.accountId,body.reason,previous as DatabaseRow|undefined);
  prepared.changes[0].record.academic_year_id=year.selectedYearId;
  const saved=await client.rpc('escen_subject_transaction',{p_actor_id:context.accountId,p_expected_revision:snapshot.revision,p_changes:prepared.changes});
  if(saved.error)throw new RequestError(409,'Le sujet n’a pas été enregistré. Vérifiez ses questions et actualisez en cas de modification concurrente.');
  return Response.json({id:prepared.id,revision:saved.data},{status:201,headers:{'Cache-Control':'no-store'}});
}catch(error){return errorResponse(error);}}
