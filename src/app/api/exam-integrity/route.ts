import { z } from 'zod';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';

export const dynamic = 'force-dynamic';
const bodySchema = z.object({
  attemptId: z.uuid(),
  events: z.array(z.object({
    id: z.uuid(),
    kind: z.enum(['FULLSCREEN_EXIT', 'WINDOW_HIDDEN', 'WINDOW_RETURNED', 'FOCUS_LOST', 'FOCUS_RETURNED', 'COPY_BLOCKED', 'CUT_BLOCKED', 'PASTE_BLOCKED', 'PRINT_BLOCKED', 'CONTEXT_MENU_BLOCKED', 'CAPTURE_SHORTCUT']),
    observedAt: z.iso.datetime(),
  }).strict()).min(1).max(20),
}).strict();

export async function POST(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'exam.take');
    if (!['STUD', 'DEL'].includes(context.roleCode)) throw new RequestError(403, 'Un rôle étudiant personnel est requis.');
    const body = bodySchema.parse(await request.json());
    const result = await client.rpc('escen_record_exam_integrity_events', {
      p_actor_id: context.accountId, p_role_code: context.roleCode, p_attempt_id: body.attemptId, p_events: body.events,
    });
    if (result.error) {
      if (result.error.code === '42501') throw new RequestError(403, 'Le journal de cette copie ne vous est pas accessible.');
      if (['23514', '22P02'].includes(result.error.code)) throw new RequestError(400, 'Événements invalides.');
      throw new RequestError(503, 'Le journal sera synchronisé à la prochaine connexion.');
    }
    return Response.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
