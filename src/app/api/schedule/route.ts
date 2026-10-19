import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import type { DatabaseRow, PersistentChange, RelationalSnapshot } from '@/types/persistence';
import { canBlockSite, examRescheduleIssue, overlaps, scheduleConflict, scheduleDatabaseError, scheduleDirectory } from '@/services/scheduleManagementService';

export const dynamic = 'force-dynamic';
const common = { revision: z.number().int().nonnegative(), reason: z.string().trim().min(3).max(1000) };
const times = { startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }) };
const session = { ...times, assignmentId: z.uuid(), roomId: z.uuid().nullable(), mode: z.enum(['COURS', 'PAPIER', 'EN_LIGNE']) };
const schema = z.discriminatedUnion('action', [
  z.object({ ...common, ...session, action: z.literal('create_session') }).strict(),
  z.object({ ...common, ...session, action: z.literal('update_session'), sessionId: z.uuid() }).strict(),
  z.object({ ...common, ...times, action: z.literal('move_session'), sessionId: z.uuid() }).strict(),
  z.object({ ...common, action: z.literal('cancel_session'), sessionId: z.uuid() }).strict(),
  z.object({ ...common, action: z.literal('replace_teacher'), sessionId: z.uuid(), teacherId: z.uuid().nullable() }).strict(),
  z.object({ ...common, ...times, action: z.literal('block_period'), name: z.string().trim().min(1).max(160), siteId: z.uuid().nullable(), kind: z.enum(['JOUR_FERIE', 'VACANCES', 'FERMETURE', 'EXAMEN', 'AUTRE']) }).strict(),
]);
async function load(request: Request) {
  const auth = await requireAccount(request);
  requirePermission(auth.context, 'schedule.view');
  const result = await auth.client.rpc('escen_backend_snapshot');
  if (result.error) throw new RequestError(503, 'Le planning est indisponible.');
  const snapshot = result.data as RelationalSnapshot;
  const year = await resolveAcademicYear(request, auth.client, auth.context, snapshot);
  return { ...auth, snapshot, year, directory: scheduleDirectory(snapshot, auth.context, year.selectedYearId) };
}
export async function GET(request: Request) {
  try {
    const data = await load(request);
    // This endpoint supplies management choices, including the available teacher directory.
    if (!data.context.permissions.includes('schedule.create')) requirePermission(data.context, 'schedule.update');
    return Response.json(data.directory, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const data = await load(request);
    const body = schema.parse(await request.json());
    requirePermission(data.context, body.action === 'create_session' ? 'schedule.create' : 'schedule.update');
    if (!data.year.selectedYearId) throw new RequestError(409, 'Choisissez une année scolaire précise pour modifier le planning.');
    if (body.action === 'create_session' ? !data.directory.canCreate : !data.directory.canUpdate) throw new RequestError(409, 'L’état de cette année scolaire interdit cette opération.');
    if (body.revision !== data.snapshot.revision) throw new RequestError(409, 'Le planning a changé. Actualisez avant de réessayer.');
    if ('startsAt' in body && Date.parse(body.endsAt) <= Date.parse(body.startsAt)) throw new RequestError(400, 'La fin doit être postérieure au début.');
    const rows = (table: string) => data.snapshot.tables[table] || [];
    let id: string; let change: PersistentChange;
    if (body.action === 'block_period') {
      if (!canBlockSite(data.context, data.year.selectedYearId, body.siteId)
        || body.siteId && !data.directory.sites.some(site => site.id === body.siteId)) throw new RequestError(403, 'Bloquer une période exige une attribution couvrant tous les groupes du site concerné.');
      const year = data.year.years.find(year => year.id === data.year.selectedYearId)!;
      if (new Date(body.startsAt).toISOString().slice(0, 10) < year.starts_on || new Date(body.endsAt).toISOString().slice(0, 10) > year.ends_on) throw new RequestError(400, 'La période doit être comprise dans l’année sélectionnée.');
      if (rows('sessions').some(session => !['ANNULE', 'REPORTE'].includes(String(session.status)) && overlaps(body.startsAt, body.endsAt, session)
        && rows('academic_offerings').some(offering => offering.id === session.offering_id && offering.academic_year_id === data.year.selectedYearId && (!body.siteId || body.siteId === offering.site_id)))) throw new RequestError(409, 'Déplacez ou annulez les séances existantes avant de bloquer cette période.');
      id = crypto.randomUUID();
      change = { table: 'blocked_periods', operation: 'insert', record: { id, academic_year_id: data.year.selectedYearId, site_id: body.siteId, name: body.name, kind: body.kind, starts_at: body.startsAt, ends_at: body.endsAt, reason: body.reason } };
    } else {
      const current = 'sessionId' in body ? data.directory.sessions.find(session => session.id === body.sessionId) : undefined;
      if ('sessionId' in body && !current) throw new RequestError(404, 'Séance introuvable dans l’année et le périmètre sélectionnés.');
      const original = current ? rows('sessions').find(session => session.id === current.id)! : undefined;
      id = original?.id || crypto.randomUUID();
      const patch: Record<string, unknown> = { id, reason: body.reason };
      if (body.action === 'create_session' || body.action === 'update_session') {
        const assignment = data.directory.assignments.find(assignment => assignment.id === body.assignmentId);
        if (!assignment) throw new RequestError(404, 'Affectation active introuvable dans votre périmètre et cette année.');
        if ((!current || current.assignmentId !== assignment.id) && !data.directory.teachers.some(teacher => teacher.id === assignment.teacherId && teacher.active)) throw new RequestError(409, 'L’enseignant affecté doit être actif.');
        if ((body.mode === 'EN_LIGNE') !== (body.roomId === null)) throw new RequestError(400, 'Une séance en ligne ne réserve pas de salle ; une séance en présentiel exige une salle.');
        if (current && current.assignmentId !== assignment.id && original?.series_id) throw new RequestError(409, 'Cette séance appartient à une série : son affectation ne peut pas être changée individuellement.');
        Object.assign(patch, { assignment_id: assignment.id, offering_id: assignment.offeringId, group_id: assignment.groupId, teacher_id: assignment.teacherId,
          starts_at: body.startsAt, ends_at: body.endsAt, room_id: body.roomId, mode: body.mode });
        if (body.action === 'create_session') patch.status = 'PLANIFIE';
      } else if (body.action === 'move_session') Object.assign(patch, { starts_at: body.startsAt, ends_at: body.endsAt });
      else if (body.action === 'cancel_session') patch.status = 'ANNULE';
      else {
        if (body.teacherId && !data.directory.teachers.some(teacher => teacher.id === body.teacherId && teacher.active)) throw new RequestError(409, 'Choisissez un enseignant remplaçant actif.');
        if (!body.teacherId && !data.directory.teachers.some(teacher => teacher.id === current!.teacherId && teacher.active)) throw new RequestError(409, 'L’enseignant d’origine est inactif. Choisissez un remplaçant actif avant de lui restituer la séance.');
        patch.replacement_teacher_id = body.teacherId === current!.teacherId ? null : body.teacherId;
      }
      const proposed = { ...original, ...patch } as DatabaseRow;
      const contextChanged = original && (original.assignment_id !== proposed.assignment_id
        || ['starts_at', 'ends_at'].some(key => Date.parse(String(original[key])) !== Date.parse(String(proposed[key]))));
      if (current?.hasAttendance && (contextChanged || body.action === 'cancel_session')) throw new RequestError(409, 'Cette séance a déjà été émargée : ses horaires, son affectation et son annulation sont protégés.');
      // The database trigger shifts exam access in the same transaction as the session.
      const deliveries = rows('exam_deliveries').filter(delivery => delivery.session_id === id);
      if (deliveries.length && (proposed.mode === 'COURS' || deliveries.some(delivery => rows('evaluations').some(evaluation => evaluation.id === delivery.evaluation_id && evaluation.assignment_id !== proposed.assignment_id)))) throw new RequestError(409, 'Cette séance est liée à une épreuve : son type et son affectation doivent rester compatibles avec cette épreuve.');
      const timeChanged = original && ['starts_at', 'ends_at'].some(key => Date.parse(String(original[key])) !== Date.parse(String(proposed[key])));
      if (timeChanged && current?.exam) {
        const issue = examRescheduleIssue(current.exam, current.startsAt, String(proposed.starts_at), String(proposed.ends_at));
        if (issue) throw new RequestError(409, issue);
      }
      if (!['ANNULE', 'REPORTE'].includes(String(proposed.status))) {
        const offering = rows('academic_offerings').find(offering => offering.id === proposed.offering_id)!;
        const effectiveRoomId = proposed.actual_room_id || proposed.room_id;
        if (effectiveRoomId) {
          const room = data.directory.rooms.find(room => room.id === effectiveRoomId);
          if (!room || !room.available || room.siteId && room.siteId !== offering.site_id) throw new RequestError(409, 'Choisissez une salle disponible compatible avec le site de la formation.');
        }
        const assignment = rows('teaching_assignments').find(assignment => assignment.id === proposed.assignment_id)!;
        const from = new Date(String(proposed.starts_at)).toISOString().slice(0, 10), until = new Date(String(proposed.ends_at)).toISOString().slice(0, 10);
        if (from < String(assignment.valid_from) || assignment.valid_until && until > String(assignment.valid_until)) throw new RequestError(400, 'Les horaires dépassent les dates de l’affectation.');
        if (rows('blocked_periods').some(period => (!period.academic_year_id || period.academic_year_id === offering.academic_year_id) && (!period.site_id || period.site_id === offering.site_id) && overlaps(proposed.starts_at, proposed.ends_at, period))) throw new RequestError(409, 'Ce créneau se trouve dans une période bloquée.');
        const conflict = scheduleConflict(data.snapshot, proposed);
        if (conflict) throw new RequestError(409, conflict);
      }
      change = { table: 'sessions', operation: original ? 'update' : 'insert', record: patch };
    }
    const saved = await data.client.rpc('escen_backend_transaction', { p_actor_id: data.context.accountId, p_expected_revision: body.revision, p_changes: [change] });
    if (saved.error) throw new RequestError(409, scheduleDatabaseError(saved.error));
    return Response.json({ id, revision: saved.data }, { status: change.operation === 'insert' ? 201 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
