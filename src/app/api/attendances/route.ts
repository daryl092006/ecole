import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { attendanceDirectory } from '@/services/attendanceManagementService';
import { ATTENDANCE_STATUSES } from '@/types/attendanceManagement';
import type { PersistentChange, RelationalSnapshot } from '@/types/persistence';

export const dynamic = 'force-dynamic';
const revision = z.number().int().nonnegative();
const instant = z.iso.datetime({ offset: true });
const reason = z.string().trim().min(3).max(1000);
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('record_students'), revision, sessionId: z.uuid(), reason: reason.optional(),
    entries: z.array(z.object({ enrollmentId: z.uuid(), status: z.enum(ATTENDANCE_STATUSES),
      arrivedAt: instant.nullable(), leftAt: instant.nullable(), lateMinutes: z.number().int().min(0).max(2147483647).nullable(),
      comment: z.string().trim().max(4000) }).strict()).min(1) }).strict(),
  z.object({ action: z.literal('record_teacher'), revision, sessionId: z.uuid(), arrivedAt: instant,
    leftAt: instant.nullable(), comment: z.string().trim().max(4000) }).strict(),
  z.object({ action: z.literal('review_justification'), revision, justificationId: z.uuid(), decision: z.enum(['VALIDE', 'REFUSE']), reason }).strict(),
]);
async function load(request: Request) {
  const auth = await requireAccount(request);
  requirePermission(auth.context, 'attendance.view');
  const response = await auth.client.rpc('escen_backend_snapshot');
  if (response.error) throw new RequestError(503, 'Les feuilles de présence sont indisponibles.');
  const snapshot = response.data as RelationalSnapshot;
  const year = await resolveAcademicYear(request, auth.client, auth.context, snapshot);
  const directory = !year.selectedYearId && year.selection !== 'all'
    ? { revision: snapshot.revision, selectedYearId: null, sessions: [] }
    : attendanceDirectory(snapshot, auth.context, year.selectedYearId);
  return { ...auth, snapshot, year, directory };
}
export async function GET(request: Request) {
  try {
    const data = await load(request);
    const fileRequest = new URL(request.url).searchParams.get('justificationId');
    if (fileRequest) {
      const id = z.uuid().parse(fileRequest);
      if (!data.directory.sessions.some(session => session.justifications.some(row => row.id === id))) throw new RequestError(404, 'Justificatif introuvable dans votre périmètre et cette année.');
      const justification = data.snapshot.tables.absence_justifications.find(row => row.id === id)!;
      const file = data.snapshot.tables.file_objects?.find(row => row.id === justification.file_id);
      if (!file) throw new RequestError(404, 'La pièce de ce justificatif est indisponible.');
      const signed = await data.client.storage.from(String(file.bucket)).createSignedUrl(String(file.object_path), 60, { download: String(file.original_name) });
      if (signed.error) throw new RequestError(503, 'Téléchargement temporairement indisponible.');
      return Response.json({ url: signed.data.signedUrl }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json(data.directory, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const data = await load(request);
    const body = schema.parse(await request.json());
    requirePermission(data.context, body.action === 'review_justification' ? 'attendance.review' : 'attendance.record');
    if (!data.year.selectedYearId) throw new RequestError(409, 'Choisissez une année scolaire précise pour enregistrer les présences.');
    if (body.revision !== data.snapshot.revision) throw new RequestError(409, 'Ces présences ont changé. Actualisez avant de réessayer.');
    const session = body.action === 'review_justification'
      ? data.directory.sessions.find(row => row.justifications.some(item => item.id === body.justificationId))
      : data.directory.sessions.find(row => row.id === body.sessionId);
    if (!session) throw new RequestError(404, 'Séance ou justificatif introuvable dans votre périmètre et cette année.');
    const changes: PersistentChange[] = [];
    if (body.action === 'record_students') {
      if (!session.canRecordStudents) throw new RequestError(403, 'La saisie est réservée aux enseignants de la séance, aux surveillants affectés et à IT, dans une année ouverte ou en clôture.');
      if (new Set(body.entries.map(row => row.enrollmentId)).size !== body.entries.length) throw new RequestError(400, 'Un étudiant ne peut être présent qu’une fois dans le lot.');
      for (const entry of body.entries) {
        if (!session.students.some(row => row.enrollmentId === entry.enrollmentId)) throw new RequestError(400, 'Cet étudiant ne fait pas partie du groupe à la date de la séance.');
        if (entry.leftAt && (!entry.arrivedAt || Date.parse(entry.leftAt) < Date.parse(entry.arrivedAt))) throw new RequestError(400, 'Le départ doit suivre ou être égal à l’arrivée.');
        const existing = session.attendances.find(row => row.enrollmentId === entry.enrollmentId);
        if (existing && !body.reason) throw new RequestError(400, 'Un motif de 3 à 1000 caractères est obligatoire pour corriger une présence.');
        if (['ABSENT_JUSTIFIE', 'RETARD_JUSTIFIE'].includes(entry.status) && existing?.status !== entry.status) throw new RequestError(409, 'Acceptez un justificatif pour enregistrer une absence ou un retard justifié.');
        changes.push({ table: 'attendances', operation: existing ? 'update' : 'insert', record: {
          id: existing?.id || crypto.randomUUID(), status: entry.status, arrived_at: entry.arrivedAt, left_at: entry.leftAt,
          late_minutes: entry.lateMinutes, comment: entry.comment || null, ...(body.reason ? { reason: body.reason } : {}),
          ...(!existing ? { session_id: session.id, enrollment_id: entry.enrollmentId,
            offering_id: data.snapshot.tables.sessions.find(row => row.id === session.id)!.offering_id, recorded_by: data.context.accountId } : {}),
        } });
      }
    } else if (body.action === 'record_teacher') {
      if (!session.canRecordTeacher) throw new RequestError(403, 'Seuls les surveillants affectés et IT peuvent enregistrer la présence enseignante, sans auto-émargement.');
      if (body.leftAt && Date.parse(body.leftAt) <= Date.parse(body.arrivedAt)) throw new RequestError(400, 'Le départ enseignant doit être postérieur à son arrivée.');
      const existing = session.teacherAttendances.find(row => row.teacherId === session.teacherId);
      changes.push({ table: 'teacher_attendances', operation: existing ? 'update' : 'insert', record: {
        id: existing?.id || crypto.randomUUID(), arrived_at: body.arrivedAt, left_at: body.leftAt, comment: body.comment || null,
        ...(!existing ? { session_id: session.id, teacher_id: session.teacherId, recorded_by: data.context.accountId } : {}),
      } });
    } else {
      if (!session.canReview) throw new RequestError(403, 'La décision est réservée à la direction académique et à IT, dans une année ouverte ou en clôture.');
      const justification = session.justifications.find(row => row.id === body.justificationId)!;
      if (justification.status !== 'EN_ATTENTE') throw new RequestError(409, 'Ce justificatif a déjà fait l’objet d’une décision. Sa révision n’est pas disponible dans ce parcours.');
      const attendance = session.attendances.find(row => row.id === justification.attendanceId)!;
      if (body.decision === 'VALIDE' && !['ABSENT', 'RETARD', 'ABSENT_JUSTIFIE', 'RETARD_JUSTIFIE'].includes(attendance.status)) throw new RequestError(409, 'Cette présence ne comporte aucune absence ou retard à justifier.');
      changes.push({ table: 'absence_justifications', operation: 'update', record: {
        id: justification.id, status: body.decision, review_reason: body.reason,
      } });
    }
    const saved = await data.client.rpc('escen_attendance_transaction', {
      p_actor_id: data.context.accountId, p_expected_revision: body.revision, p_changes: changes,
    });
    if (saved.error) throw new RequestError(409, 'Enregistrement refusé : vérifiez les données ou une modification concurrente. Aucune modification partielle n’est conservée.');
    return Response.json({ revision: saved.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
