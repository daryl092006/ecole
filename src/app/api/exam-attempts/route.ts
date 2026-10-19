import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';

export const dynamic = 'force-dynamic';
const answers = z.array(z.object({
  questionId: z.uuid(),
  response: z.object({ text: z.string().max(20000), option_ids: z.array(z.uuid()).max(100).refine(ids => new Set(ids).size === ids.length) }).strict(),
}).strict()).max(500).refine(items => new Set(items.map(item => item.questionId)).size === items.length);
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), evaluationId: z.uuid() }).strict(),
  z.object({ action: z.enum(['save', 'submit']), attemptId: z.uuid(), revision: z.number().int().nonnegative(), saveId: z.uuid(), answers }).strict(),
]);
async function execute(request: Request, params: Record<string, unknown>) {
  const { client, context } = await requireAccount(request);
  requirePermission(context, 'exam.take');
  const result = await client.rpc('escen_online_exam', { ...params, p_actor_id: context.accountId, p_role_code: context.roleCode });
  if (result.error) {
    if (result.error.code === '42501') throw new RequestError(403, 'Cette copie ne vous est pas accessible.');
    if (result.error.code === '40001') throw new RequestError(409, 'Cette copie a été modifiée dans un autre onglet. Vos réponses locales sont conservées. Rechargez la copie pour reprendre la version enregistrée.');
    if (['23514', '23502', '23503', '22P02'].includes(result.error.code ?? '')) throw new RequestError(422, 'L’épreuve est fermée, indisponible ou les réponses sont invalides. Actualisez la copie pour vérifier son état.');
    throw new RequestError(503, 'Enregistrement indisponible. Vos réponses locales sont conservées ; réessayez avant la fin de l’épreuve.');
  }
  return Response.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
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
      : { p_action: body.action, p_attempt_id: body.attemptId, p_expected_revision: body.revision, p_save_id: body.saveId, p_answers: body.answers });
  } catch (error) { return errorResponse(error); }
}
