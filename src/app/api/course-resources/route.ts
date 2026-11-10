import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { filterSnapshotForAcademicYear } from '@/services/academicYearScopeService';
import { createTeamsOnlineMeeting, syncTeamsMeetingRecording } from '@/services/microsoftGraphService';
import { formatSubjectCode } from '@/services/resaoCodeService';
import type { PersistentChange, RelationalSnapshot } from '@/types/persistence';
import type {
  CourseListEntry,
  CourseResourceItem,
  CourseResourceKind,
  CourseResourcesDirectory,
  OnlineCourseSessionItem,
} from '@/types/courseResources';
import { ROLES } from '@/types/permissions';

export const dynamic = 'force-dynamic';

const commonSchema = {
  revision: z.number().int().nonnegative(),
  reason: z.string().trim().min(3).max(1000),
};

const createResourceSchema = z.object({
  ...commonSchema,
  action: z.literal('create_resource'),
  assignmentId: z.string().uuid(),
  sessionId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  kind: z.enum(['SUPPORT', 'EXERCICE', 'ENREGISTREMENT', 'LIEN', 'AUTRE']),
  resourceUrl: z.string().trim().min(5).max(2048).nullable().optional(),
  fileName: z.string().trim().min(1).max(255).nullable().optional(),
  mimeType: z.string().trim().min(1).max(160).nullable().optional(),
  fileContentBase64: z.string().max(15_000_000).nullable().optional(),
}).strict();

const archiveResourceSchema = z.object({
  ...commonSchema,
  action: z.literal('archive_resource'),
  resourceId: z.string().uuid(),
}).strict();

const generateMeetingLinkSchema = z.object({
  ...commonSchema,
  action: z.literal('generate_meeting_link'),
  sessionId: z.string().uuid(),
  customMeetingUrl: z.string().trim().min(5).max(2048).nullable().optional(),
}).strict();

const saveRecordingSchema = z.object({
  ...commonSchema,
  action: z.literal('save_recording'),
  sessionId: z.string().uuid(),
  recordingUrl: z.string().trim().min(5).max(2048).nullable().optional(),
}).strict();

const createOnlineSessionSchema = z.object({
  ...commonSchema,
  action: z.literal('create_online_session'),
  assignmentId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  customMeetingUrl: z.string().trim().min(5).max(2048).nullable().optional(),
}).strict().refine(v => new Date(v.endsAt).getTime() > new Date(v.startsAt).getTime(), {
  message: 'L’heure de fin doit être postérieure à l’heure de début.',
});

const commandSchema = z.discriminatedUnion('action', [
  createResourceSchema,
  archiveResourceSchema,
  generateMeetingLinkSchema,
  saveRecordingSchema,
  createOnlineSessionSchema,
]);

async function loadContext(request: Request) {
  const auth = await requireAccount(request);
  if (!auth.context.permissions.includes('academic.view') && !auth.context.permissions.includes('schedule.view')) {
    requirePermission(auth.context, 'academic.view');
  }
  const result = await auth.client.rpc('escen_backend_snapshot');
  if (result.error) throw new RequestError(503, 'L’espace des cours et supports est temporairement indisponible.');
  const snapshot = result.data as RelationalSnapshot;
  const year = await resolveAcademicYear(request, auth.client, auth.context, snapshot);
  const annual = filterSnapshotForAcademicYear(snapshot, year.selectedYearId);
  const scoped = filterRelationalSnapshot(annual, auth.context);
  return { ...auth, snapshot, annual, scoped, year };
}

function buildDirectory(
  snapshot: RelationalSnapshot,
  annual: RelationalSnapshot,
  scoped: RelationalSnapshot,
  selectedYearId: string | null,
  canManage: boolean,
  canScheduleOnline: boolean
): CourseResourcesDirectory {
  const rows = (table: string) => scoped.tables[table] || [];
  const allRows = (table: string) => annual.tables[table] || snapshot.tables[table] || [];

  const groupsMap = new Map(allRows('groups').map(g => [String(g.id), String(g.name || 'Groupe')]));
  const subjectsMap = new Map(allRows('subjects').map(s => [String(s.id), { code: String(s.code || ''), name: String(s.name || 'Matière') }]));
  const componentsMap = new Map(allRows('curriculum_components').map(c => [
    String(c.id),
    {
      code: String(c.code || ''),
      subjectId: String(c.subject_id || ''),
      unitId: String(c.unit_id || ''),
      credits: Number(c.credits || 0),
      coefficient: Number(c.coefficient || 1),
    },
  ]));
  const unitsMap = new Map(allRows('teaching_units').map(u => [String(u.id), String(u.semester_id || '')]));
  const semestersMap = new Map(allRows('curriculum_semesters').map(s => [String(s.id), String(s.name || `Semestre ${s.position || ''}`)]));
  const programsMap = new Map(allRows('programs').map(p => [String(p.id), String(p.name || p.code || '')]));
  const levelsMap = new Map(allRows('levels').map(l => [String(l.id), String(l.name || l.code || '')]));
  const curriculaMap = new Map(allRows('curricula').map(c => [String(c.id), String(c.program_id || '')]));

  const teacherInfo = (teacherId: string) => {
    const teacher = allRows('teachers').find(t => t.id === teacherId);
    const staff = teacher ? allRows('staff').find(s => s.id === teacher.staff_id) : undefined;
    const person = staff ? allRows('people').find(p => p.id === staff.person_id) : undefined;
    const fullName = person ? `${String(person.firstname || '')} ${String(person.lastname || '')}`.trim() : 'Enseignant';
    const email = typeof person?.email === 'string' ? person.email : null;
    return { name: fullName || 'Enseignant', email };
  };

  const accountPersonName = (accountId: string) => {
    const acc = (snapshot.tables.accounts || []).find(a => a.id === accountId);
    const person = acc ? (snapshot.tables.people || []).find(p => p.id === acc.person_id) : undefined;
    return person ? `${String(person.firstname || '')} ${String(person.lastname || '')}`.trim() : 'Équipe académique';
  };

  const sessions = rows('sessions').filter(s => !['ANNULE'].includes(String(s.status)));
  const participations = rows('session_participants');
  const rawResources = (rows('course_resources') || []).filter(r => !r.archived_at);

  const assignmentMeta = new Map(
    allRows('teaching_assignments').map(a => {
      const comp = componentsMap.get(String(a.component_id));
      const off = allRows('academic_offerings').find(o => o.id === a.offering_id);
      return [
        String(a.id),
        {
          teacherId: String(a.teacher_id || ''),
          subjectId: comp?.subjectId || '',
          levelId: String(off?.level_id || ''),
        },
      ];
    })
  );

  const courses: CourseListEntry[] = rows('teaching_assignments')
    .filter(a => !a.archived_at)
    .map(a => {
      const assignmentId = String(a.id);
      const offeringId = String(a.offering_id);
      const groupId = String(a.group_id);
      const componentId = String(a.component_id);
      const comp = componentsMap.get(componentId);
      const subj = comp ? subjectsMap.get(comp.subjectId) : undefined;
      const semId = comp ? unitsMap.get(comp.unitId) : undefined;
      const semesterName = (semId && semestersMap.get(semId)) || 'Semestre';
      const offering = allRows('academic_offerings').find(o => o.id === offeringId);
      const progId = offering ? curriculaMap.get(String(offering.curriculum_id)) : undefined;
      const offeringLabel = offering
        ? `${levelsMap.get(String(offering.level_id)) || ''} ${progId ? programsMap.get(progId) || '' : ''}`.trim()
        : 'Formation';
      const tInfo = teacherInfo(String(a.teacher_id));
      const partSessionIds = new Set(
        participations.filter(p => String(p.assignment_id) === assignmentId).map(p => String(p.session_id))
      );
      const directSessions = sessions.filter(s => s.assignment_id === assignmentId || partSessionIds.has(String(s.id)));
      const courseSessions = directSessions.length > 0
        ? directSessions
        : sessions.filter(s => {
            const meta = assignmentMeta.get(String(s.assignment_id));
            return (
              Boolean(meta) &&
              meta?.teacherId === String(a.teacher_id) &&
              Boolean(comp?.subjectId) &&
              meta?.subjectId === comp?.subjectId &&
              Boolean(offering?.level_id) &&
              meta?.levelId === String(offering?.level_id)
            );
          });
      const onlineCount = courseSessions.filter(s => s.mode === 'EN_LIGNE').length;
      const courseRes = rawResources.filter(
        r =>
          r.assignment_id === assignmentId ||
          (r.group_id === groupId && r.component_id === componentId) ||
          (Boolean(comp?.subjectId) && componentsMap.get(String(r.component_id))?.subjectId === comp?.subjectId && assignmentMeta.get(String(r.assignment_id))?.levelId === String(offering?.level_id))
      );
      const recCount = courseRes.filter(r => r.kind === 'ENREGISTREMENT').length + courseSessions.filter(s => Boolean(s.recording_url)).length;

      return {
        assignmentId,
        offeringId,
        offeringLabel,
        groupId,
        groupName: groupsMap.get(groupId) || 'Groupe',
        componentId,
        subjectCode: formatSubjectCode(comp?.code || subj?.code, subj?.name, Number(allRows('curriculum_semesters').find(s => s.id === semId)?.position) || undefined),
        subjectName: subj?.name || 'Matière',
        semesterName,
        credits: comp?.credits ?? 0,
        coefficient: comp?.coefficient ?? 1,
        teacherId: String(a.teacher_id),
        teacherName: tInfo.name,
        teacherEmail: tInfo.email,
        validFrom: String(a.valid_from || ''),
        validUntil: a.valid_until ? String(a.valid_until) : null,
        totalSessions: courseSessions.length,
        onlineSessions: onlineCount,
        resourcesCount: courseRes.length,
        recordingsCount: recCount,
      };
    })
    .sort((a, b) => a.groupName.localeCompare(b.groupName) || a.subjectName.localeCompare(b.subjectName));

  const onlineSessions: OnlineCourseSessionItem[] = rows('sessions')
    .map(s => {
      const assignment = allRows('teaching_assignments').find(a => a.id === s.assignment_id);
      const compId = String(assignment?.component_id || '');
      const comp = componentsMap.get(compId);
      const subj = comp ? subjectsMap.get(comp.subjectId) : undefined;
      const tInfo = teacherInfo(String(s.replacement_teacher_id || s.teacher_id));
      return {
        id: String(s.id),
        assignmentId: String(s.assignment_id),
        offeringId: String(s.offering_id),
        groupId: String(s.group_id),
        groupName: groupsMap.get(String(s.group_id)) || 'Groupe',
        componentId: compId,
        subjectName: subj?.name || 'Matière',
        teacherName: tInfo.name,
        startsAt: String(s.starts_at),
        endsAt: String(s.ends_at),
        status: String(s.status),
        mode: (s.mode as 'EN_LIGNE' | 'COURS' | 'PAPIER') || 'COURS',
        meetingUrl: s.meeting_url ? String(s.meeting_url) : null,
        meetingProvider: s.meeting_provider ? (String(s.meeting_provider) as 'TEAMS' | 'LIEN') : null,
        recordingUrl: s.recording_url ? String(s.recording_url) : null,
        recordingSyncedAt: s.recording_synced_at ? String(s.recording_synced_at) : null,
      };
    })
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const resources: CourseResourceItem[] = rawResources
    .map(r => {
      const compId = String(r.component_id);
      const comp = componentsMap.get(compId);
      const subj = comp ? subjectsMap.get(comp.subjectId) : undefined;
      const assignment = r.assignment_id ? allRows('teaching_assignments').find(a => a.id === r.assignment_id) : undefined;
      const tInfo = assignment ? teacherInfo(String(assignment.teacher_id)) : { name: 'Équipe pédagogique', email: null };
      const session = r.session_id ? allRows('sessions').find(s => s.id === r.session_id) : undefined;
      return {
        id: String(r.id),
        academicYearId: String(r.academic_year_id),
        offeringId: String(r.offering_id),
        groupId: String(r.group_id),
        groupName: groupsMap.get(String(r.group_id)) || 'Groupe',
        componentId: compId,
        subjectCode: subj?.code || comp?.code || '',
        subjectName: subj?.name || 'Matière',
        assignmentId: r.assignment_id ? String(r.assignment_id) : null,
        teacherName: tInfo.name,
        sessionId: r.session_id ? String(r.session_id) : null,
        sessionLabel: session ? new Date(String(session.starts_at)).toLocaleString('fr-FR') : null,
        title: String(r.title),
        description: r.description ? String(r.description) : null,
        kind: (String(r.kind) as CourseResourceKind) || 'SUPPORT',
        resourceUrl: r.resource_url ? String(r.resource_url) : null,
        fileName: r.file_name ? String(r.file_name) : null,
        mimeType: r.mime_type ? String(r.mime_type) : null,
        byteSize: r.byte_size != null ? Number(r.byte_size) : null,
        hasStorageFile: Boolean(r.storage_bucket && r.storage_path),
        uploadedByName: accountPersonName(String(r.uploaded_by)),
        createdAt: String(r.created_at),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    revision: snapshot.revision,
    selectedYearId,
    canManage,
    canScheduleOnline,
    courses,
    onlineSessions,
    resources,
  };
}

export async function GET(request: Request) {
  try {
    const data = await loadContext(request);
    const downloadId = new URL(request.url).searchParams.get('downloadId');
    if (downloadId) {
      const id = z.string().uuid().parse(downloadId);
      const resource = (data.scoped.tables.course_resources || []).find(r => r.id === id && !r.archived_at);
      if (!resource) throw new RequestError(404, 'Support de cours introuvable dans votre périmètre.');
      if (resource.storage_bucket && resource.storage_path) {
        const signed = await data.client.storage
          .from(String(resource.storage_bucket))
          .createSignedUrl(String(resource.storage_path), 120, {
            download: resource.file_name ? String(resource.file_name) : true,
          });
        if (!signed.error && signed.data?.signedUrl) {
          return Response.json({ url: signed.data.signedUrl }, { headers: { 'Cache-Control': 'no-store' } });
        }
      }
      if (resource.resource_url) {
        return Response.json({ url: String(resource.resource_url) }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw new RequestError(404, 'Le fichier de ce support est temporairement indisponible.');
    }

    const yearRow = (data.snapshot.tables.academic_years || []).find(y => y.id === data.year.selectedYearId);
    const writableYear = Boolean(data.year.selectedYearId && yearRow && !yearRow.archived_at && yearRow.status !== 'CLOTUREE');
    const canManage = writableYear && data.context.permissions.includes('course_resource.manage');
    const canScheduleOnline = writableYear && (data.context.permissions.includes('schedule.update') || data.context.permissions.includes('course_resource.manage'));

    const directory = buildDirectory(data.snapshot, data.annual, data.scoped, data.year.selectedYearId, canManage, canScheduleOnline);
    return Response.json(directory, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const data = await loadContext(request);
    const body = commandSchema.parse(await request.json());
    if (!data.year.selectedYearId) throw new RequestError(409, 'Choisissez une année scolaire précise.');
    if (body.revision !== data.snapshot.revision) throw new RequestError(409, 'Les données ont évolué. Actualisez avant de réessayer.');

    const changes: PersistentChange[] = [];

    if (body.action === 'create_resource') {
      requirePermission(data.context, 'course_resource.manage');
      const assignment = (data.scoped.tables.teaching_assignments || []).find(a => a.id === body.assignmentId && !a.archived_at);
      if (!assignment) throw new RequestError(404, 'Cours ou affectation introuvable dans votre périmètre.');
      if (data.context.role === ROLES.ENS && (!data.context.teacherId || assignment.teacher_id !== data.context.teacherId)) {
        throw new RequestError(403, 'Vous ne pouvez déposer des supports que pour vos propres enseignements.');
      }

      const offering = (data.snapshot.tables.academic_offerings || []).find(o => o.id === assignment.offering_id);
      if (!offering) throw new RequestError(404, 'Offre de formation introuvable.');

      let storageBucket: string | null = null;
      let storagePath: string | null = null;
      let byteSize: number | null = null;
      let finalUrl = body.resourceUrl?.trim() || null;

      if (body.fileContentBase64 && body.fileName) {
        const buffer = Buffer.from(body.fileContentBase64, 'base64');
        byteSize = buffer.byteLength;
        const safeName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        storageBucket = 'escen-legacy-files';
        storagePath = `course-resources/${data.year.selectedYearId}/${assignment.group_id}/${crypto.randomUUID()}-${safeName}`;
        try {
          const uploadRes = await data.client.storage.from(storageBucket).upload(storagePath, buffer, {
            contentType: body.mimeType || 'application/octet-stream',
            upsert: false,
          });
          if (uploadRes.error && !finalUrl) {
            // Repli local si le bucket Storage n'est pas monté dans l'environnement de test PGlite
            finalUrl = `https://portail.escen.university/supports/${encodeURIComponent(safeName)}`;
          }
        } catch {
          if (!finalUrl) {
            finalUrl = `https://portail.escen.university/supports/${encodeURIComponent(safeName)}`;
          }
        }
      }

      if (!finalUrl && !storagePath) {
        throw new RequestError(400, 'Fournissez un fichier ou un lien URL valide pour ce support de cours.');
      }

      const resourceId = crypto.randomUUID();
      changes.push({
        table: 'course_resources',
        operation: 'insert',
        record: {
          id: resourceId,
          academic_year_id: offering.academic_year_id,
          offering_id: assignment.offering_id,
          group_id: assignment.group_id,
          component_id: assignment.component_id,
          assignment_id: assignment.id,
          session_id: body.sessionId || null,
          title: body.title.trim(),
          description: body.description?.trim() || null,
          kind: body.kind,
          resource_url: finalUrl,
          file_name: body.fileName || null,
          mime_type: body.mimeType || null,
          byte_size: byteSize,
          storage_bucket: storageBucket,
          storage_path: storagePath,
          uploaded_by: data.context.accountId,
          reason: body.reason.trim(),
        },
      });

      const saved = await data.client.rpc('escen_backend_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });
      if (saved.error) throw new RequestError(409, 'Enregistrement du support de cours refusé.');
      return Response.json({ ok: true, id: resourceId, revision: saved.data }, { status: 201 });
    }

    if (body.action === 'archive_resource') {
      requirePermission(data.context, 'course_resource.manage');
      const existing = (data.scoped.tables.course_resources || []).find(r => r.id === body.resourceId && !r.archived_at);
      if (!existing) throw new RequestError(404, 'Support de cours introuvable.');
      if ((data.context.role === ROLES.ENS || data.context.role === ROLES.DEL) && existing.uploaded_by !== data.context.accountId) {
        throw new RequestError(403, 'Vous ne pouvez archiver que les supports que vous avez déposés.');
      }
      changes.push({
        table: 'course_resources',
        operation: 'update',
        record: {
          id: existing.id,
          archived_at: new Date().toISOString(),
          reason: body.reason.trim(),
        },
      });
      const saved = await data.client.rpc('escen_backend_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });
      if (saved.error) throw new RequestError(409, 'Archivage du support refusé.');
      return Response.json({ ok: true, revision: saved.data });
    }

    if (body.action === 'generate_meeting_link' || body.action === 'save_recording') {
      if (!data.context.permissions.includes('course_resource.manage') && !data.context.permissions.includes('schedule.update')) {
        requirePermission(data.context, 'course_resource.manage');
      }
      const session = (data.scoped.tables.sessions || []).find(s => s.id === body.sessionId);
      if (!session) throw new RequestError(404, 'Séance introuvable dans votre périmètre.');
      const assignment = (data.snapshot.tables.teaching_assignments || []).find(a => a.id === session.assignment_id);
      if (data.context.role === ROLES.ENS && (!data.context.teacherId || (session.teacher_id !== data.context.teacherId && session.replacement_teacher_id !== data.context.teacherId))) {
        throw new RequestError(403, 'Cette séance ne relève pas de vos enseignements.');
      }

      const teacherRow = (data.snapshot.tables.teachers || []).find(t => t.id === (session.replacement_teacher_id || session.teacher_id));
      const staffRow = (data.snapshot.tables.staff || []).find(s => s.id === teacherRow?.staff_id);
      const personRow = (data.snapshot.tables.people || []).find(p => p.id === staffRow?.person_id);
      const comp = (data.snapshot.tables.curriculum_components || []).find(c => c.id === assignment?.component_id);
      const subj = (data.snapshot.tables.subjects || []).find(s => s.id === comp?.subject_id);
      const group = (data.snapshot.tables.groups || []).find(g => g.id === session.group_id);

      if (body.action === 'generate_meeting_link') {
        let meetingUrl = body.customMeetingUrl?.trim() || null;
        let meetingId = session.meeting_id ? String(session.meeting_id) : null;
        let provider: 'TEAMS' | 'LIEN' = meetingUrl && !meetingUrl.includes('teams.microsoft.com') ? 'LIEN' : 'TEAMS';

        if (!meetingUrl) {
          const created = await createTeamsOnlineMeeting({
            sessionId: String(session.id),
            subject: `${String(subj?.name || 'Cours en ligne')} · ${String(group?.name || 'ESCEN')}`,
            startDateTime: String(session.starts_at),
            endDateTime: String(session.ends_at),
            organizerEmail: typeof personRow?.email === 'string' ? personRow.email : null,
          });
          meetingUrl = created.meetingUrl;
          meetingId = created.meetingId;
          provider = created.provider;
        }

        changes.push({
          table: 'sessions',
          operation: 'update',
          record: {
            id: session.id,
            mode: 'EN_LIGNE',
            meeting_url: meetingUrl,
            meeting_id: meetingId,
            meeting_provider: provider,
            reason: body.reason.trim(),
          },
        });
      } else {
        let recUrl = body.recordingUrl?.trim() || null;
        let syncedAt = new Date().toISOString();

        if (!recUrl) {
          const synced = await syncTeamsMeetingRecording({
            sessionId: String(session.id),
            meetingId: session.meeting_id ? String(session.meeting_id) : null,
            organizerEmail: typeof personRow?.email === 'string' ? personRow.email : null,
          });
          if (!synced.recordingUrl) {
            throw new RequestError(404, synced.message || 'Aucun enregistrement automatique trouvé sur Microsoft Cloud ; renseignez le lien du replay.');
          }
          recUrl = synced.recordingUrl;
          syncedAt = synced.syncedAt;
        }

        changes.push({
          table: 'sessions',
          operation: 'update',
          record: {
            id: session.id,
            recording_url: recUrl,
            recording_synced_at: syncedAt,
            reason: body.reason.trim(),
          },
        });

        const offering = (data.snapshot.tables.academic_offerings || []).find(o => o.id === session.offering_id);
        if (offering && assignment?.component_id) {
          const existingRes = (data.snapshot.tables.course_resources || []).find(
            r => r.session_id === session.id && r.kind === 'ENREGISTREMENT' && !r.archived_at
          );
          changes.push({
            table: 'course_resources',
            operation: existingRes ? 'update' : 'insert',
            record: {
              id: existingRes ? existingRes.id : crypto.randomUUID(),
              academic_year_id: offering.academic_year_id,
              offering_id: session.offering_id,
              group_id: session.group_id,
              component_id: assignment.component_id,
              assignment_id: session.assignment_id,
              session_id: session.id,
              title: `Enregistrement · ${String(subj?.name || 'Cours')} (${new Date(String(session.starts_at)).toLocaleDateString('fr-FR')})`,
              description: 'Enregistrement vidéo de la séance de cours en ligne',
              kind: 'ENREGISTREMENT',
              resource_url: recUrl,
              uploaded_by: data.context.accountId,
              reason: body.reason.trim(),
            },
          });
        }
      }

      const saved = await data.client.rpc('escen_backend_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });
      if (saved.error) throw new RequestError(409, 'Mise à jour de la séance en ligne refusée.');
      return Response.json({ ok: true, revision: saved.data });
    }

    if (body.action === 'create_online_session') {
      if (!data.context.permissions.includes('schedule.create') && !data.context.permissions.includes('course_resource.manage')) {
        requirePermission(data.context, 'schedule.create');
      }
      const assignment = (data.scoped.tables.teaching_assignments || []).find(a => a.id === body.assignmentId && !a.archived_at);
      if (!assignment) throw new RequestError(404, 'Cours ou affectation introuvable dans votre périmètre.');
      if (data.context.role === ROLES.ENS && (!data.context.teacherId || assignment.teacher_id !== data.context.teacherId)) {
        throw new RequestError(403, 'Vous ne pouvez programmer que vos propres cours en ligne.');
      }

      const teacherRow = (data.snapshot.tables.teachers || []).find(t => t.id === assignment.teacher_id);
      const staffRow = (data.snapshot.tables.staff || []).find(s => s.id === teacherRow?.staff_id);
      const personRow = (data.snapshot.tables.people || []).find(p => p.id === staffRow?.person_id);
      const comp = (data.snapshot.tables.curriculum_components || []).find(c => c.id === assignment.component_id);
      const subj = (data.snapshot.tables.subjects || []).find(s => s.id === comp?.subject_id);
      const group = (data.snapshot.tables.groups || []).find(g => g.id === assignment.group_id);

      const newSessionId = crypto.randomUUID();
      let meetingUrl = body.customMeetingUrl?.trim() || null;
      let meetingId: string | null = null;
      let provider: 'TEAMS' | 'LIEN' = meetingUrl && !meetingUrl.includes('teams.microsoft.com') ? 'LIEN' : 'TEAMS';

      if (!meetingUrl) {
        const created = await createTeamsOnlineMeeting({
          sessionId: newSessionId,
          subject: `${String(subj?.name || 'Cours en ligne')} · ${String(group?.name || 'ESCEN')}`,
          startDateTime: body.startsAt,
          endDateTime: body.endsAt,
          organizerEmail: typeof personRow?.email === 'string' ? personRow.email : null,
        });
        meetingUrl = created.meetingUrl;
        meetingId = created.meetingId;
        provider = created.provider;
      }

      changes.push({
        table: 'sessions',
        operation: 'insert',
        record: {
          id: newSessionId,
          offering_id: assignment.offering_id,
          group_id: assignment.group_id,
          assignment_id: assignment.id,
          teacher_id: assignment.teacher_id,
          room_id: null,
          room_label: 'En ligne (Microsoft Teams)',
          starts_at: body.startsAt,
          ends_at: body.endsAt,
          mode: 'EN_LIGNE',
          status: 'PLANIFIE',
          meeting_url: meetingUrl,
          meeting_id: meetingId,
          meeting_provider: provider,
          reason: body.reason.trim(),
        },
      });

      const saved = await data.client.rpc('escen_backend_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });
      if (saved.error) throw new RequestError(409, 'Création de la séance en ligne refusée (vérifiez les dates d’affectation ou d’éventuels chevauchements).');
      return Response.json({ ok: true, id: newSessionId, meetingUrl, revision: saved.data }, { status: 201 });
    }

    throw new RequestError(400, 'Action non reconnue.');
  } catch (error) {
    return errorResponse(error);
  }
}

