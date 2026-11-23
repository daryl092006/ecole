import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { scheduleDirectory } from '@/services/scheduleManagementService';
import { teacherPersonalEmailSchema } from '@/services/teacherIdentityService';
import type { RelationalSnapshot } from '@/types/persistence';
import { emailExistingTeacherAccess } from '@/server/existingTeacherAccessEmail';

export const dynamic = 'force-dynamic';
const schema = z.object({ teacherId: z.uuid(), personalEmail: teacherPersonalEmailSchema,
  assignmentId: z.uuid().optional(), sessionId: z.uuid().optional(),
  groupIds: z.array(z.uuid()).min(2).max(30).optional(),
  revision: z.number().int().nonnegative(), reason: z.string().trim().min(3).max(1000),
}).strict().refine(body => Boolean(body.assignmentId || body.sessionId || body.groupIds?.length), 'Sélectionnez un cours à programmer.');

export async function POST(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'schedule.view');
    const body = schema.parse(await request.json());
    requirePermission(context, body.sessionId ? 'schedule.update' : 'schedule.create');
    const loaded = await client.rpc('escen_backend_snapshot');
    if (loaded.error) throw new RequestError(503, 'Le planning est indisponible.');
    const snapshot = loaded.data as RelationalSnapshot;
    const year = await resolveAcademicYear(request, client, context, snapshot);
    const directory = scheduleDirectory(snapshot, context, year.selectedYearId);
    if (!year.selectedYearId || !(body.sessionId ? directory.canUpdate : directory.canCreate)) throw new RequestError(409, 'Choisissez une année scolaire ouverte à la programmation.');
    if (body.revision !== snapshot.revision) throw new RequestError(409, 'Le planning a changé. Actualisez avant de réessayer.');
    const teacher = directory.teachers.find(row => row.id === body.teacherId && row.active);
    const session = body.sessionId ? directory.sessions.find(row => row.id === body.sessionId && row.canUpdate) : undefined;
    const assignment = body.assignmentId ? directory.assignments.find(row => row.id === body.assignmentId && row.teacherId === body.teacherId) : undefined;
    const groupsValid = body.groupIds?.length ? body.groupIds.every(gid => directory.groups.some(g => g.id === gid)) : false;
    if (!teacher || !(body.sessionId ? session : body.assignmentId ? assignment : groupsValid)) throw new RequestError(404, 'Enseignant ou cours hors de votre périmètre.');
    const person = snapshot.tables.people?.find(row => row.id === teacher.personId && !row.archived_at);
    if (!person) throw new RequestError(404, 'Dossier enseignant introuvable.');
    if (teacherPersonalEmailSchema.safeParse(person.email).success) throw new RequestError(409, 'L’e-mail personnel est déjà renseigné. Actualisez le planning.');
    const saved = await client.rpc('escen_backend_transaction', { p_actor_id: context.accountId, p_expected_revision: body.revision,
      p_changes: [{ table: 'people', operation: 'update', record: { id: person.id, email: body.personalEmail } }],
    });
    if (saved.error) throw new RequestError(409, 'Le contact n’a pas été enregistré. Actualisez puis réessayez.');
    const digitalAccess = await emailExistingTeacherAccess(client, snapshot, person, teacher.id, body.personalEmail, context.accountId);
    return Response.json({ revision: saved.data, digitalAccess }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
