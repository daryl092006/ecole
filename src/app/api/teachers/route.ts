import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import type { RelationalSnapshot, PersistentChange } from '@/types/persistence';
import { hasGlobalStaffManagement, teacherDirectory, teacherAcademicScope, assignmentIsGranted, teacherHasUpcomingSessions, assignmentHasSessionsAfter } from '@/services/teacherManagementService';

export const dynamic = 'force-dynamic';
const common = { revision: z.number().int().nonnegative(), reason: z.string().trim().min(3).max(1000) };
const specialty = z.string().trim().max(160);
const commandSchema = z.discriminatedUnion('action', [
  z.object({ ...common, action: z.literal('create_profile'), staffId: z.uuid(), specialty }).strict(),
  z.object({ ...common, action: z.literal('update_profile'), teacherId: z.uuid(), specialty }).strict(),
  z.object({ ...common, action: z.literal('set_active'), teacherId: z.uuid(), active: z.boolean() }).strict(),
  z.object({ ...common, action: z.literal('create_assignment'), teacherId: z.uuid(), groupId: z.uuid(), offeringId: z.uuid(), componentId: z.uuid(), validFrom: z.iso.date(), validUntil: z.iso.date().nullable() }).strict(),
  z.object({ ...common, action: z.literal('end_assignment'), assignmentId: z.uuid(), endOn: z.iso.date() }).strict(),
]);

async function loadContext(request: Request) {
  const auth = await requireAccount(request);
  if (!auth.context.permissions.includes('academic.assignment.manage')) requirePermission(auth.context, 'staff.manage');
  if (!auth.context.permissions.includes('academic.assignment.manage') && !hasGlobalStaffManagement(auth.context)) throw new RequestError(403, 'La gestion des profils enseignants nécessite un accès global au personnel.');
  const result = await auth.client.rpc('escen_backend_snapshot');
  if (result.error) throw new RequestError(503, 'Les dossiers enseignants sont indisponibles.');
  const snapshot = result.data as RelationalSnapshot;
  const year = await resolveAcademicYear(request, auth.client, auth.context, snapshot);
  return { ...auth, snapshot, year, directory: teacherDirectory(snapshot, auth.context, year.selectedYearId) };
}

export async function GET(request: Request) {
  try {
    const { directory } = await loadContext(request);
    return Response.json(directory, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const data = await loadContext(request);
    const body = commandSchema.parse(await request.json());
    if (body.revision !== data.snapshot.revision) throw new RequestError(409, 'Ces données ont changé. Actualisez avant de réessayer.');
    const changes: PersistentChange[] = [];
    let id: string;
    if (['create_profile', 'update_profile', 'set_active'].includes(body.action)) {
      requirePermission(data.context, 'staff.manage');
      if (!hasGlobalStaffManagement(data.context)) throw new RequestError(403, 'La gestion des profils enseignants nécessite un accès global au personnel.');
    } else {
      requirePermission(data.context, 'academic.assignment.manage');
      if (!data.year.selectedYearId) throw new RequestError(409, 'Choisissez une année scolaire précise pour gérer les affectations.');
      if (!data.directory.canManageAssignments) throw new RequestError(409, 'Cette année ne permet plus de modifier les affectations.');
    }

    if (body.action === 'create_profile') {
      const member = data.directory.staff.find(row => row.id === body.staffId);
      if (!member) throw new RequestError(409, 'Choisissez un dossier du personnel actif, sans profil enseignant existant.');
      id = crypto.randomUUID();
      changes.push({ table: 'teachers', operation: 'insert', record: { id, staff_id: member.id, specialty: body.specialty || null, active: true, reason: body.reason } });
    } else if (body.action === 'update_profile' || body.action === 'set_active') {
      const teacher = data.directory.teachers.find(row => row.id === body.teacherId);
      if (!teacher) throw new RequestError(404, 'Profil enseignant introuvable.');
      id = teacher.id;
      if (body.action === 'set_active' && !body.active && teacherHasUpcomingSessions(data.snapshot, teacher.id)) throw new RequestError(409, 'Désactivation impossible : cet enseignant doit encore assurer des séances futures ou en cours. Remplacez-le ou annulez ces séances avec motif avant de réessayer.');
      changes.push({ table: 'teachers', operation: 'update', record: { id, reason: body.reason,
        ...(body.action === 'update_profile' ? { specialty: body.specialty || null } : { active: body.active }) } });
    } else if (body.action === 'create_assignment') {
      const scoped = teacherAcademicScope(data.snapshot, data.context, data.year.selectedYearId);
      const offering = scoped.tables.academic_offerings?.find(row => row.id === body.offeringId && !row.archived_at);
      if (!offering || !assignmentIsGranted(data.context, offering, body.groupId)) throw new RequestError(404, 'Formation ou groupe hors de votre périmètre.');
      if (!data.directory.offerings.some(row => row.id === offering.id)
        || !data.directory.groups.some(row => row.id === body.groupId && row.offeringIds.includes(offering.id))
        || !data.directory.components.some(row => row.id === body.componentId && row.curriculumId === offering.curriculum_id)) throw new RequestError(400, 'Choisissez un groupe rattaché à cette formation et une matière active de sa maquette.');
      const teacher = data.directory.teachers.find(row => row.id === body.teacherId);
      if (!teacher || !teacher.active) throw new RequestError(409, 'Choisissez un enseignant actif disposant d’un dossier du personnel actif.');
      if (body.validUntil && body.validUntil < body.validFrom) throw new RequestError(400, 'La date de fin ne peut pas précéder la date de début.');
      const year = data.snapshot.tables.academic_years?.find(row => row.id === data.year.selectedYearId);
      if (year?.status === 'EN_CLOTURE') throw new RequestError(409, 'Année en clôture : aucune nouvelle affectation.');
      id = crypto.randomUUID();
      changes.push({ table: 'teaching_assignments', operation: 'insert', record: { id, teacher_id: teacher.id, group_id: body.groupId,
        offering_id: offering.id, curriculum_id: offering.curriculum_id, component_id: body.componentId, valid_from: body.validFrom,
        valid_until: body.validUntil, reason: body.reason } });
    } else {
      const assignment = data.directory.assignments.find(row => row.id === body.assignmentId);
      if (!assignment) throw new RequestError(404, 'Affectation introuvable dans l’année et le périmètre sélectionnés.');
      if (body.endOn < assignment.validFrom || assignment.validUntil && body.endOn > assignment.validUntil) throw new RequestError(400, 'La fin doit être comprise dans les dates de l’affectation ; cette action ne permet pas de la prolonger.');
      if (assignmentHasSessionsAfter(data.snapshot, assignment.id, body.endOn)) throw new RequestError(409, 'Fin impossible : des séances non annulées dépassent cette date. Déplacez-les ou annulez-les avec motif avant de réessayer.');
      id = assignment.id;
      changes.push({ table: 'teaching_assignments', operation: 'update', record: { id, valid_until: body.endOn, reason: body.reason } });
    }
    const saved = await data.client.rpc('escen_backend_transaction', { p_actor_id: data.context.accountId, p_expected_revision: body.revision, p_changes: changes });
    if (saved.error) throw new RequestError(409, 'Enregistrement refusé : vérifiez les dates, les doublons ou une modification concurrente. Aucune modification partielle n’est conservée.');
    return Response.json({ id, revision: saved.data }, { status: body.action.startsWith('create_') ? 201 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
