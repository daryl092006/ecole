import { teacherMicrosoftEmail } from '@/server/teacherMicrosoftIdentity';
import { teacherPersonalEmailSchema } from '@/services/teacherIdentityService';
import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import type { DatabaseRow, PersistentChange, RelationalSnapshot } from '@/types/persistence';
import { canBlockSite, examRescheduleIssue, overlaps, scheduleConflict, scheduleDatabaseError, scheduleDirectory } from '@/services/scheduleManagementService';
import { ensureSharedSessionParticipants } from '@/services/sharedSessionParticipants';
import { createTeamsOnlineMeeting, syncTeamsMeetingRecording, TeamsIntegrationError } from '@/services/microsoftGraphService';

export const dynamic = 'force-dynamic';
const common = { revision: z.number().int().nonnegative(), reason: z.string().trim().min(3).max(1000) };
const times = { startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }) };
const slotSchema = z.object(times).strict();
const session = {
  ...times,
  assignmentId: z.uuid(),
  roomId: z.uuid().nullable(),
  mode: z.enum(['COURS', 'PAPIER', 'EN_LIGNE']),
  meetingUrl: z.string().trim().min(5).max(2048).nullable().optional(),
  recordingUrl: z.string().trim().min(5).max(2048).nullable().optional(),
};
const schema = z.discriminatedUnion('action', [
  z.object({
    ...common,
    ...times,
    action: z.literal('create_shared_course'),
    assignmentIds: z.array(z.uuid()).min(2).max(30).optional(),
    groupIds: z.array(z.uuid()).min(2).max(30).optional(),
    componentId: z.uuid().optional(),
    teacherId: z.uuid().optional(),
    roomId: z.uuid().nullable(),
    mode: z.enum(['COURS', 'EN_LIGNE']).default('COURS'),
    meetingUrl: session.meetingUrl,
    slots: z.array(slotSchema).min(1).max(60).optional(),
  }).strict(),
  z.object({ ...common, ...session, action: z.literal('create_session'), slots: z.array(slotSchema).min(1).max(60).optional() }).strict(),
  z.object({ ...common, ...session, action: z.literal('update_session'), sessionId: z.uuid() }).strict(),
  z.object({ ...common, ...times, action: z.literal('move_session'), sessionId: z.uuid() }).strict(),
  z.object({ ...common, action: z.literal('cancel_session'), sessionId: z.uuid() }).strict(),
  z.object({ ...common, action: z.literal('replace_teacher'), sessionId: z.uuid(), teacherId: z.uuid().nullable() }).strict(),
  z.object({ ...common, action: z.literal('generate_online_link'), sessionId: z.uuid(), customMeetingUrl: z.string().trim().min(5).max(2048).nullable().optional() }).strict(),
  z.object({ ...common, action: z.literal('sync_recording'), sessionId: z.uuid(), recordingUrl: z.string().trim().min(5).max(2048).nullable().optional() }).strict(),
  z.object({ ...common, ...times, action: z.literal('block_period'), name: z.string().trim().min(1).max(160), siteId: z.uuid().nullable(), kind: z.enum(['JOUR_FERIE', 'VACANCES', 'FERMETURE', 'EXAMEN', 'AUTRE']) }).strict(),
]);
async function load(request: Request) {
  const auth = await requireAccount(request);
  requirePermission(auth.context, 'schedule.view');
  const result = await auth.client.rpc('escen_backend_snapshot');
  if (result.error) throw new RequestError(503, 'Le planning est indisponible.');
  const snapshot = result.data as RelationalSnapshot;
  ensureSharedSessionParticipants(snapshot);
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
    const creating = body.action === 'create_session' || body.action === 'create_shared_course';
    requirePermission(data.context, creating ? 'schedule.create' : 'schedule.update');
    if (!data.year.selectedYearId) throw new RequestError(409, 'Choisissez une année scolaire précise pour modifier le planning.');
    if (creating ? !data.directory.canCreate : !data.directory.canUpdate) throw new RequestError(409, 'L’état de cette année scolaire interdit cette opération.');
    if (body.revision !== data.snapshot.revision) throw new RequestError(409, 'Le planning a changé. Actualisez avant de réessayer.');
    if ('startsAt' in body && Date.parse(body.endsAt) <= Date.parse(body.startsAt)) throw new RequestError(400, 'La fin doit être postérieure au début.');
    const rows = (table: string) => data.snapshot.tables[table] || [];
    const requireTeacherContact = (teacherId: string) => {
      const teacher = rows('teachers').find(row => row.id === teacherId);
      const staff = rows('staff').find(row => row.id === teacher?.staff_id);
      const person = rows('people').find(row => row.id === staff?.person_id && !row.archived_at);
      if (!teacherPersonalEmailSchema.safeParse(person?.email).success) throw new RequestError(409, 'Renseignez l’e-mail personnel de l’enseignant avant de programmer cette séance.');
    };
    let id = '';
    const changes: PersistentChange[] = [];
    if (body.action === 'create_shared_course') {
      if ((body.mode === 'EN_LIGNE') !== (body.roomId === null)) throw new RequestError(400, 'Une séance en ligne ne réserve pas de salle ; une séance en présentiel exige une salle.');
      if (body.roomId && !data.directory.rooms.some(room => room.id === body.roomId && room.available)) throw new RequestError(409, 'Choisissez une salle disponible.');
      const slotList = body.slots?.length ? body.slots : [{ startsAt: body.startsAt, endsAt: body.endsAt }];
      for (let i = 0; i < slotList.length; i++) {
        const slot = slotList[i];
        if (Date.parse(slot.endsAt) <= Date.parse(slot.startsAt)) {
          throw new RequestError(400, 'La fin doit être postérieure au début.');
        }
        if (slotList.slice(0, i).some(prev => Date.parse(slot.startsAt) < Date.parse(prev.endsAt) && Date.parse(slot.endsAt) > Date.parse(prev.startsAt))) {
          throw new RequestError(400, 'Deux séances programmées dans la même série se chevauchent.');
        }
      }
      let resolvedAssignmentIds = body.assignmentIds || [];
      let currentRevision = body.revision;

      if (body.groupIds && body.groupIds.length >= 2) {
        if (new Set(body.groupIds).size !== body.groupIds.length) {
          throw new RequestError(400, 'Chaque groupe ne peut être choisi qu’une fois.');
        }
        if (!body.componentId || !body.teacherId) {
          throw new RequestError(400, 'Choisissez la matière et l’enseignant du cours commun.');
        }
        if (!body.groupIds.every(gid => data.directory.groups.some(group => group.id === gid))) {
          throw new RequestError(404, 'Un groupe sélectionné est absent de votre périmètre ou de l’année sélectionnée.');
        }
        const teacher = data.directory.teachers.find(row => row.id === body.teacherId);
        if (!teacher || !teacher.active) {
          throw new RequestError(409, 'L’enseignant sélectionné doit être actif.');
        }
        requireTeacherContact(teacher.id);

        const sourceComp = rows('curriculum_components').find(c => c.id === body.componentId && !c.archived_at);
        if (!sourceComp) {
          throw new RequestError(404, 'Matière introuvable dans cette année.');
        }
        const subjectId = String(sourceComp.subject_id);
        const sessionStartDate = slotList.map(s => new Date(s.startsAt).toISOString().slice(0, 10)).sort()[0];
        const sessionEndDate = slotList.map(s => new Date(s.endsAt).toISOString().slice(0, 10)).sort().at(-1)!;
        const yearRow = rows('academic_years').find(y => y.id === data.year.selectedYearId);
        if (!yearRow || sessionStartDate < String(yearRow.starts_on) || sessionEndDate > String(yearRow.ends_on)) {
          throw new RequestError(400, 'Le créneau doit appartenir à l’année scolaire sélectionnée.');
        }

        const prepChanges: PersistentChange[] = [];
        const createdSems: DatabaseRow[] = [];
        const createdUnits: DatabaseRow[] = [];
        const createdComps: DatabaseRow[] = [];
        const createdOs: DatabaseRow[] = [];
        resolvedAssignmentIds = [];
        let primarySiteId: string | null = null;

        for (const gid of body.groupIds) {
          const groupOfferings = rows('group_offerings')
            .filter(go => !go.archived_at && go.group_id === gid)
            .map(go => rows('academic_offerings').find(o => !o.archived_at && o.id === go.offering_id && o.academic_year_id === data.year.selectedYearId))
            .filter((o): o is DatabaseRow => Boolean(o));

          const compatibleOfferings: DatabaseRow[] = primarySiteId
            ? groupOfferings.filter(o => String(o.site_id) === primarySiteId)
            : groupOfferings;
          if (!compatibleOfferings.length) {
            throw new RequestError(409, 'Les groupes du cours commun doivent appartenir au même site et avoir une formation active.');
          }
          const allComps = [...rows('curriculum_components'), ...createdComps];
          const groupOffering: DatabaseRow =
            compatibleOfferings.find((o: DatabaseRow) =>
              allComps.some(c => !c.archived_at && c.curriculum_id === o.curriculum_id && String(c.subject_id) === subjectId)
            ) || compatibleOfferings[0];
          if (!primarySiteId) primarySiteId = String(groupOffering.site_id);

          const currId = String(groupOffering.curriculum_id);
          const allUnits = [...rows('teaching_units'), ...createdUnits];
          let targetComp = allComps.find(
            c => !c.archived_at && String(c.curriculum_id) === currId && String(c.subject_id) === subjectId && c.unit_id != null
          );
          let targetSemId = targetComp
            ? String(allUnits.find(u => u.id === targetComp!.unit_id)?.semester_id || '')
            : '';

          if (!targetComp) {
            const allSems = [...rows('curriculum_semesters'), ...createdSems];
            let sem = allSems
              .filter(s => !s.archived_at && String(s.curriculum_id) === currId)
              .sort((a, b) => Number(a.position || 1) - Number(b.position || 1))[0];
            if (!sem) {
              const semId = crypto.randomUUID();
              sem = { id: semId, curriculum_id: currId, position: 1, name: 'Semestre 1', target_credits: 30 };
              createdSems.push(sem);
              prepChanges.push({ table: 'curriculum_semesters', operation: 'insert', record: sem });
            }
            targetSemId = String(sem.id);

            let unit = allUnits.find(u => !u.archived_at && String(u.semester_id) === targetSemId);
            if (!unit) {
              const unitId = crypto.randomUUID();
              unit = {
                id: unitId,
                semester_id: targetSemId,
                curriculum_id: currId,
                code: `UE-COM-${String(sem.position || 1)}`,
                name: 'Unité d’enseignement commune',
                credits: Math.max(Number(sourceComp.credits) || 3, 1),
              };
              createdUnits.push(unit);
              prepChanges.push({ table: 'teaching_units', operation: 'insert', record: unit });
            }

            const existingCodes = new Set(
              allComps
                .filter(c => String(c.unit_id) === String(unit.id))
                .map(c => String(c.code))
            );
            let compCode = String(sourceComp.code || 'COM101');
            if (existingCodes.has(compCode)) {
              compCode = `${compCode}-${gid.slice(0, 4).toUpperCase()}`;
            }
            const compId = crypto.randomUUID();
            targetComp = {
              id: compId,
              subject_id: subjectId,
              unit_id: String(unit.id),
              curriculum_id: currId,
              code: compCode,
              coefficient: Math.max(Number(sourceComp.coefficient) || 1, 0.001),
              credits: Math.max(Number(sourceComp.credits) || 0, 0),
            };
            createdComps.push(targetComp);
            prepChanges.push({ table: 'curriculum_components', operation: 'insert', record: targetComp });
          }

          if (targetSemId) {
            const allOs = [...rows('offering_semesters'), ...createdOs];
            const existingOs = allOs.find(
              os => String(os.offering_id) === String(groupOffering.id) && String(os.curriculum_semester_id) === targetSemId
            );
            if (!existingOs) {
              const newOs = {
                id: crypto.randomUUID(),
                offering_id: String(groupOffering.id),
                curriculum_id: currId,
                curriculum_semester_id: targetSemId,
                starts_on: String(yearRow.starts_on),
                ends_on: String(yearRow.ends_on),
              };
              createdOs.push(newOs);
              prepChanges.push({ table: 'offering_semesters', operation: 'insert', record: newOs });
            } else if (String(existingOs.starts_on) > sessionStartDate || String(existingOs.ends_on) < sessionEndDate) {
              prepChanges.push({
                table: 'offering_semesters',
                operation: 'update',
                record: {
                  id: String(existingOs.id),
                  starts_on: String(existingOs.starts_on) > sessionStartDate ? String(yearRow.starts_on) : String(existingOs.starts_on),
                  ends_on: String(existingOs.ends_on) < sessionEndDate ? String(yearRow.ends_on) : String(existingOs.ends_on),
                },
              });
            }
          }

          const existingAssign = rows('teaching_assignments').find(
            a =>
              String(a.group_id) === gid &&
              String(a.offering_id) === String(groupOffering.id) &&
              String(a.component_id) === String(targetComp!.id) &&
              String(a.teacher_id) === teacher.id
          );
          if (existingAssign) {
            const needStart = String(existingAssign.valid_from) > sessionStartDate;
            const needEnd = Boolean(existingAssign.valid_until && String(existingAssign.valid_until) < sessionEndDate);
            if (needStart || needEnd) {
              prepChanges.push({
                table: 'teaching_assignments',
                operation: 'update',
                record: {
                  id: String(existingAssign.id),
                  ...(needStart ? { valid_from: sessionStartDate } : {}),
                  ...(needEnd ? { valid_until: sessionEndDate } : {}),
                  reason: body.reason,
                },
              });
            }
            resolvedAssignmentIds.push(String(existingAssign.id));
          } else {
            const newAssignId = crypto.randomUUID();
            prepChanges.push({
              table: 'teaching_assignments',
              operation: 'insert',
              record: {
                id: newAssignId,
                teacher_id: teacher.id,
                group_id: gid,
                offering_id: String(groupOffering.id),
                curriculum_id: currId,
                component_id: String(targetComp.id),
                valid_from: sessionStartDate < String(yearRow.starts_on) ? sessionStartDate : String(yearRow.starts_on),
                valid_until: null,
                reason: body.reason,
              },
            });
            resolvedAssignmentIds.push(newAssignId);
          }
        }

        if (prepChanges.length > 0) {
          const prepSaved = await data.client.rpc('escen_backend_transaction', {
            p_actor_id: data.context.accountId,
            p_expected_revision: currentRevision,
            p_changes: prepChanges,
          });
          if (prepSaved.error) throw new RequestError(409, scheduleDatabaseError(prepSaved.error));
          currentRevision = Number(prepSaved.data);
        }
      } else {
        if (resolvedAssignmentIds.length < 2) {
          throw new RequestError(400, 'Choisissez au moins 2 groupes pour programmer un cours commun.');
        }
        if (new Set(resolvedAssignmentIds).size !== resolvedAssignmentIds.length) throw new RequestError(400, 'Chaque affectation ne peut être choisie qu’une fois.');
        if (!resolvedAssignmentIds.every(assignmentId => data.directory.assignments.some(assignment => assignment.id === assignmentId))) {
          throw new RequestError(404, 'Une affectation est absente de votre périmètre ou de l’année sélectionnée.');
        }
        for (const assignmentId of resolvedAssignmentIds) requireTeacherContact(data.directory.assignments.find(row => row.id === assignmentId)!.teacherId);
      }

      const teacherId = data.directory.assignments.find(row => row.id === resolvedAssignmentIds[0])?.teacherId || body.teacherId;
      const teacherRow = rows('teachers').find(row => row.id === teacherId);
      const staffRow = rows('staff').find(row => row.id === teacherRow?.staff_id);
      const personRow = rows('people').find(row => row.id === staffRow?.person_id);
      const assignment = data.directory.assignments.find(row => row.id === resolvedAssignmentIds[0]);
      const component = data.directory.components.find(row => row.id === (body.componentId || assignment?.componentId));
      const groupIds = body.groupIds || resolvedAssignmentIds.map(assignmentId => data.directory.assignments.find(row => row.id === assignmentId)!.groupId);
      const groupNames = data.directory.groups.filter(row => groupIds.includes(row.id)).map(row => row.label).join(' + ');

      for (const slot of slotList) {
        const slotId = crypto.randomUUID();
        if (!id) id = slotId;
        let onlineParams: Record<string, string | null> = {};
        if (body.mode === 'EN_LIGNE') {
          if (body.meetingUrl) {
            onlineParams = { p_mode: body.mode, p_meeting_url: body.meetingUrl, p_meeting_id: null,
              p_meeting_provider: body.meetingUrl.includes('teams.microsoft.com') ? 'TEAMS' : 'LIEN' };
          } else {
            const online = await createTeamsOnlineMeeting({ sessionId: slotId,
              subject: `${component?.label || 'Cours commun'} · ${groupNames || 'ESCEN'}`,
              startDateTime: slot.startsAt, endDateTime: slot.endsAt,
              organizerEmail: await teacherMicrosoftEmail(data.client, data.snapshot, personRow),
            });
            onlineParams = { p_mode: body.mode, p_meeting_url: online.meetingUrl, p_meeting_id: online.meetingId, p_meeting_provider: online.provider };
          }
        }
        const saved = await data.client.rpc('escen_shared_course_create', { p_actor_id: data.context.accountId, p_role_code: data.context.roleCode,
          p_expected_revision: currentRevision, p_session_id: slotId, p_assignment_ids: resolvedAssignmentIds, p_room_id: body.roomId,
          p_starts_at: slot.startsAt, p_ends_at: slot.endsAt, p_reason: body.reason, ...onlineParams });
        if (saved.error) throw new RequestError(409, scheduleDatabaseError(saved.error));
        currentRevision = Number(saved.data);
      }
      return Response.json({ id, count: slotList.length, revision: currentRevision }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    } else if (body.action === 'block_period') {
      if (!canBlockSite(data.context, data.year.selectedYearId, body.siteId)
        || body.siteId && !data.directory.sites.some(site => site.id === body.siteId)) throw new RequestError(403, 'Bloquer une période exige une attribution couvrant tous les groupes du site concerné.');
      const year = data.year.years.find(year => year.id === data.year.selectedYearId)!;
      if (new Date(body.startsAt).toISOString().slice(0, 10) < year.starts_on || new Date(body.endsAt).toISOString().slice(0, 10) > year.ends_on) throw new RequestError(400, 'La période doit être comprise dans l’année sélectionnée.');
      if (rows('sessions').some(session => !['ANNULE', 'REPORTE'].includes(String(session.status)) && overlaps(body.startsAt, body.endsAt, session)
        && rows('academic_offerings').some(offering => offering.id === session.offering_id && offering.academic_year_id === data.year.selectedYearId && (!body.siteId || body.siteId === offering.site_id)))) throw new RequestError(409, 'Déplacez ou annulez les séances existantes avant de bloquer cette période.');
      id = crypto.randomUUID();
      changes.push({ table: 'blocked_periods', operation: 'insert', record: { id, academic_year_id: data.year.selectedYearId, site_id: body.siteId, name: body.name, kind: body.kind, starts_at: body.startsAt, ends_at: body.endsAt, reason: body.reason } });
    } else if (body.action === 'create_session') {
      const assignment = data.directory.assignments.find(assignment => assignment.id === body.assignmentId);
      if (!assignment) throw new RequestError(404, 'Affectation active introuvable dans votre périmètre et cette année.');
      if (!data.directory.teachers.some(teacher => teacher.id === assignment.teacherId && teacher.active)) throw new RequestError(409, 'L’enseignant affecté doit être actif.');
      requireTeacherContact(assignment.teacherId);
      if ((body.mode === 'EN_LIGNE') !== (body.roomId === null)) throw new RequestError(400, 'Une séance en ligne ne réserve pas de salle ; une séance en présentiel exige une salle.');
      const offering = rows('academic_offerings').find(offering => offering.id === assignment.offeringId)!;
      if (body.roomId) {
        const room = data.directory.rooms.find(room => room.id === body.roomId);
        if (!room || !room.available || room.siteId && room.siteId !== offering.site_id) throw new RequestError(409, 'Choisissez une salle disponible compatible avec le site de la formation.');
      }
      const rawAssignment = rows('teaching_assignments').find(row => row.id === assignment.id)!;
      const slotList = body.slots?.length ? body.slots : [{ startsAt: body.startsAt, endsAt: body.endsAt }];
      const createdProposals: DatabaseRow[] = [];
      for (const slot of slotList) {
        if (Date.parse(slot.endsAt) <= Date.parse(slot.startsAt)) throw new RequestError(400, 'La fin doit être postérieure au début.');
        if (createdProposals.some(prev => overlaps(slot.startsAt, slot.endsAt, prev))) {
          throw new RequestError(400, 'Deux séances programmées dans la même série se chevauchent.');
        }
        const slotId = crypto.randomUUID();
        if (!id) id = slotId;
        const patch: Record<string, unknown> = {
          id: slotId,
          reason: body.reason,
          assignment_id: assignment.id,
          offering_id: assignment.offeringId,
          group_id: assignment.groupId,
          teacher_id: assignment.teacherId,
          starts_at: slot.startsAt,
          ends_at: slot.endsAt,
          room_id: body.roomId,
          mode: body.mode,
          status: 'PLANIFIE',
        };
        if (body.mode === 'EN_LIGNE') {
          if (body.meetingUrl) {
            patch.meeting_url = body.meetingUrl;
            patch.meeting_provider = body.meetingUrl.includes('teams.microsoft.com') ? 'TEAMS' : 'LIEN';
          } else {
            const teacherRow = rows('teachers').find(t => t.id === assignment.teacherId);
            const staffRow = rows('staff').find(s => s.id === teacherRow?.staff_id);
            const personRow = rows('people').find(p => p.id === staffRow?.person_id);
            const component = data.directory.components.find(c => c.id === assignment.componentId);
            const group = data.directory.groups.find(g => g.id === assignment.groupId);
            const online = await createTeamsOnlineMeeting({
              sessionId: slotId,
              subject: `${component?.label || 'Cours'} · ${group?.label || 'ESCEN'}`,
              startDateTime: slot.startsAt,
              endDateTime: slot.endsAt,
              organizerEmail: await teacherMicrosoftEmail(data.client, data.snapshot, personRow),
            });
            patch.meeting_url = online.meetingUrl;
            patch.meeting_id = online.meetingId;
            patch.meeting_provider = online.provider;
          }
          if (body.recordingUrl) {
            patch.recording_url = body.recordingUrl;
            patch.recording_synced_at = new Date().toISOString();
          }
        }
        const proposed = patch as DatabaseRow;
        const from = new Date(String(proposed.starts_at)).toISOString().slice(0, 10);
        const until = new Date(String(proposed.ends_at)).toISOString().slice(0, 10);
        if (from < String(rawAssignment.valid_from) || rawAssignment.valid_until && until > String(rawAssignment.valid_until)) {
          throw new RequestError(400, 'Les horaires dépassent les dates de l’affectation.');
        }
        if (rows('blocked_periods').some(period => (!period.academic_year_id || period.academic_year_id === offering.academic_year_id) && (!period.site_id || period.site_id === offering.site_id) && overlaps(proposed.starts_at, proposed.ends_at, period))) {
          throw new RequestError(409, 'Ce créneau se trouve dans une période bloquée.');
        }
        const conflict = scheduleConflict(data.snapshot, proposed);
        if (conflict) throw new RequestError(409, conflict);
        createdProposals.push(proposed);
        changes.push({ table: 'sessions', operation: 'insert', record: patch });
      }
    } else {
      const current = 'sessionId' in body ? data.directory.sessions.find(session => session.id === body.sessionId) : undefined;
      if ('sessionId' in body && !current) throw new RequestError(404, 'Séance introuvable dans l’année et le périmètre sélectionnés.');
      if (current && !current.canUpdate) throw new RequestError(403, 'La modification exige une autorisation sur tous les groupes du cours commun.');
      if (current && ['move_session', 'replace_teacher'].includes(body.action)) requireTeacherContact(
        body.action === 'replace_teacher' ? body.teacherId || current.teacherId : current.replacementTeacherId || current.teacherId,
      );
      if (body.action === 'generate_online_link' || body.action === 'sync_recording') {
        const original = rows('sessions').find(session => session.id === current!.id)!;
        id = original.id;
        const patch: Record<string, unknown> = { id, reason: body.reason };
        const teacherRow = rows('teachers').find(t => t.id === (original.replacement_teacher_id || original.teacher_id));
        const staffRow = rows('staff').find(s => s.id === teacherRow?.staff_id);
        const personRow = rows('people').find(p => p.id === staffRow?.person_id);
        const rawAssignment = rows('teaching_assignments').find(a => a.id === original.assignment_id);
        const component = data.directory.components.find(c => c.id === rawAssignment?.component_id);
        const group = data.directory.groups.find(g => g.id === original.group_id);
        if (body.action === 'generate_online_link') {
          if (body.customMeetingUrl) {
            patch.meeting_url = body.customMeetingUrl;
            patch.meeting_provider = body.customMeetingUrl.includes('teams.microsoft.com') ? 'TEAMS' : 'LIEN';
          } else {
            const online = await createTeamsOnlineMeeting({
              sessionId: id,
              subject: `${component?.label || 'Cours en ligne'} · ${group?.label || 'ESCEN'}`,
              startDateTime: String(original.starts_at),
              endDateTime: String(original.ends_at),
              organizerEmail: await teacherMicrosoftEmail(data.client, data.snapshot, personRow),
            });
            patch.meeting_url = online.meetingUrl;
            patch.meeting_id = online.meetingId;
            patch.meeting_provider = online.provider;
          }
        } else {
          let recUrl = body.recordingUrl || null;
          let syncedAt = new Date().toISOString();
          if (!recUrl) {
            const synced = await syncTeamsMeetingRecording({
              sessionId: id,
              meetingId: original.meeting_id ? String(original.meeting_id) : null,
              meetingUrl: original.meeting_url ? String(original.meeting_url) : null,
              organizerEmail: await teacherMicrosoftEmail(data.client, data.snapshot, personRow),
            });
            if (!synced.recordingUrl) {
              throw new RequestError(404, synced.message || 'Aucun enregistrement automatique trouvé sur Microsoft Cloud ; renseignez le lien du replay.');
            }
            recUrl = synced.recordingUrl;
            syncedAt = synced.syncedAt;
          }
          patch.recording_url = recUrl;
          patch.recording_synced_at = syncedAt;
          const offering = rows('academic_offerings').find(o => o.id === original.offering_id);
          if (offering && rawAssignment?.component_id) {
            const existingResource = rows('course_resources').find(r => r.session_id === id && r.kind === 'ENREGISTREMENT' && !r.archived_at);
            changes.push({
              table: 'course_resources',
              operation: existingResource ? 'update' : 'insert',
              record: {
                id: existingResource ? existingResource.id : crypto.randomUUID(),
                academic_year_id: offering.academic_year_id,
                offering_id: original.offering_id,
                group_id: original.group_id,
                component_id: rawAssignment.component_id,
                assignment_id: original.assignment_id,
                session_id: id,
                title: `Enregistrement · ${component?.label || 'Cours'} (${new Date(String(original.starts_at)).toLocaleDateString('fr-FR')})`,
                description: 'Enregistrement vidéo de la séance en ligne',
                kind: 'ENREGISTREMENT',
                resource_url: recUrl,
                uploaded_by: data.context.accountId,
                reason: body.reason,
              },
            });
          }
        }
        changes.unshift({ table: 'sessions', operation: 'update', record: patch });
        const saved = await data.client.rpc('escen_backend_transaction', { p_actor_id: data.context.accountId, p_expected_revision: body.revision, p_changes: changes });
        if (saved.error) throw new RequestError(409, scheduleDatabaseError(saved.error));
        return Response.json({ id, count: changes.length, revision: saved.data }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
      }
      if (current?.shared) {
        if (body.action === 'update_session') throw new RequestError(409, 'Utilisez le déplacement, le remplacement ou l’annulation du cours commun pour conserver ses affectations.');
        const saved = await data.client.rpc('escen_shared_course_change', { p_actor_id: data.context.accountId, p_role_code: data.context.roleCode,
          p_expected_revision: body.revision, p_session_id: current.id, p_reason: body.reason,
          p_action: body.action === 'move_session' ? 'move' : body.action === 'cancel_session' ? 'cancel' : 'replace_teacher',
          p_starts_at: body.action === 'move_session' ? body.startsAt : null, p_ends_at: body.action === 'move_session' ? body.endsAt : null,
          p_teacher_id: body.action === 'replace_teacher' ? body.teacherId : null });
        if (saved.error) throw new RequestError(409, scheduleDatabaseError(saved.error));
        return Response.json({ id: current.id, count: 1, revision: saved.data }, { headers: { 'Cache-Control': 'no-store' } });
      }
      const original = current ? rows('sessions').find(session => session.id === current.id)! : undefined;
      id = original?.id || crypto.randomUUID();
      const patch: Record<string, unknown> = { id, reason: body.reason };
      if (body.action === 'update_session') {
        const assignment = data.directory.assignments.find(assignment => assignment.id === body.assignmentId);
        if (!assignment) throw new RequestError(404, 'Affectation active introuvable dans votre périmètre et cette année.');
        requireTeacherContact(current?.replacementTeacherId || assignment.teacherId);
        if ((!current || current.assignmentId !== assignment.id) && !data.directory.teachers.some(teacher => teacher.id === assignment.teacherId && teacher.active)) throw new RequestError(409, 'L’enseignant affecté doit être actif.');
        if ((body.mode === 'EN_LIGNE') !== (body.roomId === null)) throw new RequestError(400, 'Une séance en ligne ne réserve pas de salle ; une séance en présentiel exige une salle.');
        if (current && current.assignmentId !== assignment.id && original?.series_id) throw new RequestError(409, 'Cette séance appartient à une série : son affectation ne peut pas être changée individuellement.');
        Object.assign(patch, { assignment_id: assignment.id, offering_id: assignment.offeringId, group_id: assignment.groupId, teacher_id: assignment.teacherId,
          starts_at: body.startsAt, ends_at: body.endsAt, room_id: body.roomId, mode: body.mode,
          ...(body.meetingUrl !== undefined ? { meeting_url: body.meetingUrl, meeting_provider: body.meetingUrl ? (body.meetingUrl.includes('teams.microsoft.com') ? 'TEAMS' : 'LIEN') : null } : {}),
          ...(body.recordingUrl !== undefined ? { recording_url: body.recordingUrl, recording_synced_at: body.recordingUrl ? new Date().toISOString() : null } : {}) });
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
      changes.push({ table: 'sessions', operation: original ? 'update' : 'insert', record: patch });
    }
    const saved = await data.client.rpc('escen_backend_transaction', { p_actor_id: data.context.accountId, p_expected_revision: body.revision, p_changes: changes });
    if (saved.error) throw new RequestError(409, scheduleDatabaseError(saved.error));
    return Response.json({ id, count: changes.length, revision: saved.data }, { status: changes[0]?.operation === 'insert' ? 201 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error instanceof TeamsIntegrationError ? new RequestError(503, error.message) : error); }
}
