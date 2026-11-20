import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import type { RelationalSnapshot } from '@/types/persistence';

export const dynamic = 'force-dynamic';
const answers = z.array(z.object({
  questionId: z.uuid(),
  response: z.object({ text: z.string().max(20000), option_ids: z.array(z.uuid()).max(100).refine(ids => new Set(ids).size === ids.length) }).strict(),
}).strict()).max(500).refine(items => new Set(items.map(item => item.questionId)).size === items.length);
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), evaluationId: z.uuid(), integrityAccepted: z.boolean().optional() }).strict(),
  z.object({ action: z.enum(['save', 'submit']), attemptId: z.uuid(), revision: z.number().int().nonnegative(), saveId: z.uuid(), answers }).strict(),
]);
async function execute(request: Request, params: Record<string, unknown>, integrityAccepted = false) {
  const { client, context } = await requireAccount(request);
  requirePermission(context, 'exam.take');
  if (!['STUD', 'DEL'].includes(context.roleCode)) throw new RequestError(403, 'Sélectionnez votre rôle étudiant pour passer une épreuve personnelle.');
  const result = params.p_action === 'start'
    ? await client.rpc('escen_start_online_exam_checked', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_evaluation_id: params.p_evaluation_id, p_integrity_accepted: integrityAccepted })
    : await client.rpc('escen_online_exam', { ...params, p_actor_id: context.accountId, p_role_code: context.roleCode });
  if (result.error) {
    if (result.error.code === '23514' && result.error.message?.includes('mode strict')) throw new RequestError(422, 'Acceptez les règles du mode strict avant de commencer. Actualisez la page si les règles ne sont pas affichées.');
    if (result.error.code === '42501') throw new RequestError(403, 'Cette copie ne vous est pas accessible.');
    if (['40001', 'PT409'].includes(result.error.code)) throw new RequestError(409, 'Cette copie a été modifiée dans un autre onglet. Vos réponses locales sont conservées. Rechargez la copie pour reprendre la version enregistrée.');
    if (['23514', '23502', '23503', '22P02'].includes(result.error.code ?? '')) throw new RequestError(422, 'L’épreuve est fermée, indisponible ou les réponses sont invalides. Actualisez la copie pour vérifier son état.');
    throw new RequestError(503, 'Enregistrement indisponible. Vos réponses locales sont conservées ; réessayez avant la fin de l’épreuve.');
  }
  let data = result.data;
  if (['read', 'start'].includes(String(params.p_action)) && data?.paper?.id) {
    const snapshot = await client.rpc('escen_backend_snapshot');
    if (snapshot.error) throw new RequestError(503, 'Le contexte du sujet est indisponible. Rechargez la copie.');
    const paper = (snapshot.data as RelationalSnapshot | null)?.tables?.exam_papers?.find(row => row.id === data.paper.id);
    if (!paper) throw new RequestError(503, 'Le contexte du sujet est indisponible. Rechargez la copie.');
    data = { ...data, paper: { ...data.paper, instructions: typeof paper.instructions === 'string' ? paper.instructions : null } };
  }
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('attemptId');
    const year = request.headers.get('x-escen-year');
    return await execute(request, id ? { p_action: 'read', p_attempt_id: z.uuid().parse(id) }
      : { p_action: 'list', p_year_id: year && !['all', 'current'].includes(year) ? z.uuid().parse(year) : null });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    return await execute(request, body.action === 'start'
      ? { p_action: 'start', p_evaluation_id: body.evaluationId }
      : { p_action: body.action, p_attempt_id: body.attemptId, p_expected_revision: body.revision, p_save_id: body.saveId, p_answers: body.answers }, body.action === 'start' && body.integrityAccepted === true);
  } catch (error) { return errorResponse(error); }
}
