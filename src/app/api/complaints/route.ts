import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { filterSnapshotForAcademicYear } from '@/services/academicYearScopeService';
import { connectedRecordName } from '@/services/connectedRecordDisplayService';
import { evaluationGradeValue } from '@/services/evaluationGradePolicy';
import type { PersistentChange, RelationalSnapshot } from '@/types/persistence';
import { ROLES } from '@/types/permissions';

export const dynamic = 'force-dynamic';

const commonSchema = {
  revision: z.number().int().nonnegative(),
};

const createComplaintSchema = z.object({
  ...commonSchema,
  action: z.literal('create_complaint'),
  gradeId: z.string().uuid(),
  reason: z.string().trim().min(5).max(1000),
}).strict();

const transitionComplaintSchema = z.object({
  ...commonSchema,
  action: z.literal('transition_complaint'),
  complaintId: z.string().uuid(),
  fromStatus: z.enum(['NOUVELLE', 'EN_ANALYSE', 'TRANSMISE_ENSEIGNANT', 'AVIS_ENSEIGNANT', 'DECISION_ACADEMIQUE', 'CORRECTION_EVENTUELLE', 'CLOTUREE']),
  toStatus: z.enum(['NOUVELLE', 'EN_ANALYSE', 'TRANSMISE_ENSEIGNANT', 'AVIS_ENSEIGNANT', 'DECISION_ACADEMIQUE', 'CORRECTION_EVENTUELLE', 'CLOTUREE']),
  reason: z.string().trim().min(3).max(1000),
  correctedGrade: z.number().min(0).max(20).optional(),
}).strict();

const markNotificationsReadSchema = z.object({
  ...commonSchema,
  action: z.literal('mark_notifications_read'),
  notificationIds: z.array(z.string().uuid()).min(1).max(50),
}).strict();

const requestSchema = z.discriminatedUnion('action', [
  createComplaintSchema,
  transitionComplaintSchema,
  markNotificationsReadSchema,
]);

interface NotificationRecipient {
  accountId: string;
  roleCode: string;
  email: string | null;
  fullName: string;
}

function findComplaintRecipients(snapshot: RelationalSnapshot, evaluationId: string, yearId: string): NotificationRecipient[] {
  const evaluations = snapshot.tables.evaluations || [];
  const assignments = snapshot.tables.teaching_assignments || [];
  const offerings = snapshot.tables.academic_offerings || [];
  const teachers = snapshot.tables.teachers || [];
  const staff = snapshot.tables.staff || [];
  const accounts = snapshot.tables.accounts || [];
  const people = snapshot.tables.people || [];
  const roles = snapshot.tables.roles || [];
  const grants = snapshot.tables.role_grants || [];

  const evaluation = evaluations.find(e => e.id === evaluationId);
  const assignment = evaluation ? assignments.find(a => a.id === evaluation.assignment_id) : undefined;
  const offering = evaluation ? offerings.find(o => o.id === evaluation.offering_id) : undefined;
  const teacher = assignment ? teachers.find(t => t.id === assignment.teacher_id) : undefined;
  const teacherStaff = teacher ? staff.find(s => s.id === teacher.staff_id) : undefined;
  const teacherPersonId = teacherStaff?.person_id ? String(teacherStaff.person_id) : null;

  const now = Date.now();
  const recipients: NotificationRecipient[] = [];
  const seen = new Set<string>();

  for (const grant of grants) {
    const validFrom = grant.valid_from ? Date.parse(String(grant.valid_from)) : 0;
    const validUntil = grant.valid_until ? Date.parse(String(grant.valid_until)) : null;
    if (validFrom > now || (validUntil !== null && validUntil <= now)) continue;
    if (grant.academic_year_id && grant.academic_year_id !== yearId) continue;
    if (grant.site_id && offering?.site_id && grant.site_id !== offering.site_id) continue;
    if (grant.group_id && assignment?.group_id && grant.group_id !== assignment.group_id) continue;

    const role = roles.find(r => r.id === grant.role_id && r.active !== false);
    const roleCode = role?.code ? String(role.code) : '';
    if (!['DA', 'LOG', 'SURV', 'ENS'].includes(roleCode)) continue;

    const account = accounts.find(a => a.id === grant.account_id && a.active !== false && !a.archived_at);
    if (!account) continue;

    if (roleCode === 'ENS' && (!teacherPersonId || account.person_id !== teacherPersonId)) {
      continue;
    }

    const key = `${account.id}:${roleCode}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const person = people.find(p => p.id === account.person_id);
    const email = typeof person?.email === 'string' && person.email.includes('@') ? person.email.trim() : null;
    const fullName = `${String(person?.firstname || '')} ${String(person?.lastname || '')}`.trim() || 'Équipe académique ESCEN';
    recipients.push({
      accountId: String(account.id),
      roleCode,
      email,
      fullName,
    });
  }

  return recipients.slice(0, 30);
}

async function loadContext(request: Request) {
  const auth = await requireAccount(request);
  const result = await auth.client.rpc('escen_backend_snapshot');
  if (result.error) throw new RequestError(503, 'Données des réclamations indisponibles.');
  const snapshot = result.data as RelationalSnapshot;
  const year = await resolveAcademicYear(request, auth.client, auth.context, snapshot);
  if (!year.selectedYearId && year.selection !== 'all') throw new RequestError(409, 'Choisissez une année scolaire précise.');
  // Resolve annual relationships before removing tables the role cannot read.
  // Teachers can view candidates without receiving the enrollment directory.
  const annual = filterSnapshotForAcademicYear(snapshot, year.selectedYearId);
  const scoped = filterRelationalSnapshot(annual, auth.context);
  return { ...auth, snapshot, scoped, year, annual };
}

export async function GET(request: Request) {
  try {
    const data = await loadContext(request);
    requirePermission(data.context, 'complaint.view');
    const complaints = data.scoped.tables.complaints || [];
    const ids = new Set(complaints.map(row => row.id));
    return Response.json({
      revision: data.snapshot.revision,
      complaints: complaints.map(complaint => {
        const candidate = data.scoped.tables.evaluation_candidates?.find(row => row.id === complaint.candidate_id);
        const grade = data.scoped.tables.grades?.find(row => row.id === complaint.grade_id);
        const enrollment = candidate ? data.annual.tables.enrollments?.find(row => row.id === candidate.enrollment_id) : undefined;
        const student = enrollment && data.context.permissions.includes('student.view')
          ? data.annual.tables.students?.find(row => row.id === enrollment.student_id)
          : undefined;
        const hasOnlineCopy = Boolean((data.scoped.tables.exam_attempts || []).some(row => row.candidate_id === complaint.candidate_id));
        return {
          ...complaint,
          label: candidate ? connectedRecordName('evaluation_candidates', candidate, data.annual) : 'Dossier ou évaluation non retrouvé',
          evaluation_id: candidate?.evaluation_id || null,
          grade_value: evaluationGradeValue(grade),
          absence_status: grade?.absence_status || null,
          student_matricule: student?.matricule ? String(student.matricule) : null,
          has_online_copy: hasOnlineCopy,
        };
      }),
      events: (data.snapshot.tables.complaint_events || []).filter(row => ids.has(String(row.complaint_id))),
      revisions: (data.scoped.tables.grade_revisions || []).filter(row => ids.has(String(row.complaint_id))),
      notifications: (data.scoped.tables.complaint_notifications || [])
        .filter(row => !row.read_at && (!data.year.selectedYearId || row.academic_year_id === data.year.selectedYearId))
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const data = await loadContext(request);
    const body = requestSchema.parse(await request.json());
    requirePermission(data.context, 'complaint.view');
    if (!data.year.selectedYearId) throw new RequestError(409, 'Choisissez une année scolaire précise.');
    const changes: PersistentChange[] = [];

    if (body.action === 'create_complaint') {
      if (![ROLES.STUD, ROLES.DEL, ROLES.IT].includes(data.context.role as typeof ROLES.STUD)) {
        throw new RequestError(403, 'Le dépôt est réservé à l’étudiant, au délégué pour ses propres notes et à l’Informaticien dans son périmètre.');
      }
      const grade = (data.scoped.tables.grades || []).find(g => g.id === body.gradeId);
      if (!grade) throw new RequestError(404, 'Note introuvable.');

      const candidate = (data.scoped.tables.evaluation_candidates || []).find(c => c.id === grade.candidate_id);
      if (!candidate) throw new RequestError(404, 'Candidat introuvable.');

      const evaluation = (data.scoped.tables.evaluations || []).find(e => e.id === candidate.evaluation_id);
      if (!evaluation || evaluation.status !== 'PUBLIEES') {
        throw new RequestError(409, 'Une réclamation ne peut être déposée que sur une note publiée.');
      }

      if (data.context.role === ROLES.STUD || data.context.role === ROLES.DEL) {
        const enrollment = (data.snapshot.tables.enrollments || []).find(e => e.id === candidate.enrollment_id);
        if (!enrollment || enrollment.student_id !== data.context.studentId) {
          throw new RequestError(403, 'Vous ne pouvez réclamer que sur vos propres notes.');
        }
      }

      const existingOpen = (data.snapshot.tables.complaints || []).find(c => c.grade_id === grade.id && c.status !== 'CLOTUREE');
      if (existingOpen) {
        throw new RequestError(409, 'Une réclamation est déjà en cours de traitement pour cette note.');
      }

      const complaintId = crypto.randomUUID();
      changes.push({
        table: 'complaints',
        operation: 'insert',
        record: {
          id: complaintId,
          candidate_id: candidate.id,
          grade_id: grade.id,
          status: 'NOUVELLE',
          reason: body.reason,
        },
      });

      const candidateLabel = connectedRecordName('evaluation_candidates', candidate, data.annual);
      const recipients = findComplaintRecipients(data.snapshot, String(evaluation.id), data.year.selectedYearId);
      const notificationMessage = `Nouvelle réclamation de note : ${candidateLabel} (${String(evaluation.name || 'Évaluation')}) — Motif : ${body.reason}`;
      for (const recipient of recipients) {
        changes.push({
          table: 'complaint_notifications',
          operation: 'insert',
          record: {
            id: crypto.randomUUID(),
            complaint_id: complaintId,
            evaluation_id: evaluation.id,
            academic_year_id: data.year.selectedYearId,
            account_id: recipient.accountId,
            role_code: recipient.roleCode,
            action: 'OPENED',
            message: notificationMessage.slice(0, 950),
          },
        });
      }

      const saved = await data.client.rpc('escen_backend_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });

      if (saved.error) {
        throw new RequestError(409, 'Dépôt de réclamation refusé : vérifiez les données.');
      }

      for (const recipient of recipients) {
        if (!recipient.email) continue;
        try {
          await data.client.rpc('escen_email_enqueue', {
            p_year_id: data.year.selectedYearId,
            p_template: 'application_status_changed',
            p_entity_table: 'complaints',
            p_entity_id: complaintId,
            p_dedupe_key: `OPENED:${recipient.accountId}:${recipient.roleCode}`,
            p_recipient_email: recipient.email,
            p_recipient_name: recipient.fullName,
            p_subject: `Réclamation de note ESCEN · ${String(evaluation.name || 'Évaluation')}`,
            p_text_body: `${notificationMessage}\n\nConnectez-vous au portail ESCEN (rubrique Réclamations) pour consulter et traiter cette demande.`,
            p_html_body: `<p><strong>Nouvelle réclamation de note déposée sur le portail ESCEN</strong></p><p>${notificationMessage}</p><p>Connectez-vous au portail ESCEN (rubrique <em>Évaluations &amp; Examens &rarr; Réclamations</em>) pour la traiter.</p>`,
            p_actor_id: data.context.accountId,
          });
        } catch {
          // Ne pas interrompre la réponse si l'envoi d'email échoue
        }
      }

      return Response.json({ ok: true, id: complaintId, revision: saved.data }, { status: 201 });
    }

    if (body.action === 'mark_notifications_read') {
      const unread = (data.scoped.tables.complaint_notifications || []).filter(
        n => body.notificationIds.includes(String(n.id)) && !n.read_at && n.account_id === data.context.accountId
      );
      if (!unread.length) {
        return Response.json({ ok: true, revision: data.snapshot.revision });
      }
      const nowIso = new Date().toISOString();
      for (const item of unread) {
        changes.push({
          table: 'complaint_notifications',
          operation: 'update',
          record: {
            id: item.id,
            read_at: nowIso,
          },
        });
      }
      const saved = await data.client.rpc('escen_backend_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });
      if (saved.error) {
        throw new RequestError(409, 'Mise à jour des notifications refusée.');
      }
      return Response.json({ ok: true, revision: saved.data });
    }

    if (body.action === 'transition_complaint') {
      const complaint = (data.scoped.tables.complaints || []).find(c => c.id === body.complaintId);
      if (!complaint) throw new RequestError(404, 'Réclamation introuvable.');
      if (complaint.status !== body.fromStatus) {
        throw new RequestError(409, `L’état actuel (${complaint.status}) ne correspond pas à l’état attendu (${body.fromStatus}).`);
      }

      const teacherOpinion = data.context.role === ROLES.ENS && complaint.status === 'TRANSMISE_ENSEIGNANT' && body.toStatus === 'AVIS_ENSEIGNANT';
      if (!teacherOpinion) {
        requirePermission(data.context, 'complaint.review');
      }
      if (teacherOpinion) {
        const candidate = data.scoped.tables.evaluation_candidates?.find(row => row.id === complaint.candidate_id);
        const evaluation = data.scoped.tables.evaluations?.find(row => row.id === candidate?.evaluation_id);
        const assignment = data.scoped.tables.teaching_assignments?.find(row => row.id === evaluation?.assignment_id);
        if (!data.context.teacherId || assignment?.teacher_id !== data.context.teacherId) throw new RequestError(403, 'Enseignement non affecté à votre profil.');
      }
      const next: Record<string, string[]> = {
        NOUVELLE: ['EN_ANALYSE'], EN_ANALYSE: ['TRANSMISE_ENSEIGNANT'],
        TRANSMISE_ENSEIGNANT: ['AVIS_ENSEIGNANT'], AVIS_ENSEIGNANT: ['DECISION_ACADEMIQUE'],
        DECISION_ACADEMIQUE: ['CORRECTION_EVENTUELLE', 'CLOTUREE'], CORRECTION_EVENTUELLE: ['CLOTUREE'],
      };
      if (!next[String(complaint.status)]?.includes(body.toStatus)) throw new RequestError(409, 'Transition de réclamation interdite.');
      const correcting = complaint.status === 'CORRECTION_EVENTUELLE' && body.toStatus === 'CLOTUREE';
      if (!correcting && body.correctedGrade !== undefined) throw new RequestError(400, 'La correction doit être appliquée à l’étape de correction avant clôture.');
      if (correcting) {
        requirePermission(data.context, 'grade.approve');
        if (body.correctedGrade === undefined) throw new RequestError(400, 'Nouvelle note obligatoire pour corriger et clôturer.');
        const grade = data.scoped.tables.grades?.find(g => g.id === complaint.grade_id);
        const candidate = data.scoped.tables.evaluation_candidates?.find(row => row.id === complaint.candidate_id);
        const evaluation = data.scoped.tables.evaluations?.find(row => row.id === candidate?.evaluation_id);
        const currentGradeValue = evaluationGradeValue(grade);
        if (!grade || currentGradeValue === null || evaluation?.status !== 'PUBLIEES') throw new RequestError(409, 'Une note numérique publiée est nécessaire pour cette correction.');
        if (currentGradeValue === body.correctedGrade) throw new RequestError(400, 'La nouvelle note doit être différente de la note actuelle.');
        changes.push({
          table: 'grade_revisions',
          operation: 'insert',
          record: {
            id: crypto.randomUUID(),
            grade_id: grade.id,
            old_value: currentGradeValue,
            new_value: body.correctedGrade,
            actor_id: data.context.accountId,
            actor_role: data.context.role,
            reason: `Réclamation acceptée : ${body.reason}`,
            complaint_id: complaint.id,
          },
        });

      }
      changes.push({
        table: 'complaint_events',
        operation: 'insert',
        record: {
          id: crypto.randomUUID(),
          complaint_id: complaint.id,
          from_status: body.fromStatus,
          to_status: body.toStatus,
          actor_id: data.context.accountId,
          reason: body.reason,
        },
      });

      const candidateRow = data.annual.tables.evaluation_candidates?.find(row => row.id === complaint.candidate_id);
      const evaluationRow = candidateRow ? data.annual.tables.evaluations?.find(row => row.id === candidateRow.evaluation_id) : undefined;
      if (evaluationRow && candidateRow) {
        const recipients = findComplaintRecipients(data.snapshot, String(evaluationRow.id), data.year.selectedYearId);
        const candidateLabel = connectedRecordName('evaluation_candidates', candidateRow, data.annual);
        const actionType = body.toStatus === 'CLOTUREE' ? (correcting ? 'RESOLVED' : 'REJECTED') : 'IN_REVIEW';
        const statusMsg = `Réclamation (${candidateLabel}) passée à l’étape ${body.toStatus} : ${body.reason}`;
        for (const recipient of recipients) {
          if (recipient.accountId === data.context.accountId && recipient.roleCode === data.context.roleCode) continue;
          changes.push({
            table: 'complaint_notifications',
            operation: 'insert',
            record: {
              id: crypto.randomUUID(),
              complaint_id: complaint.id,
              evaluation_id: evaluationRow.id,
              academic_year_id: data.year.selectedYearId,
              account_id: recipient.accountId,
              role_code: recipient.roleCode,
              action: actionType,
              message: statusMsg.slice(0, 950),
            },
          });
        }
      }

      const saved = await data.client.rpc('escen_backend_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });

      if (saved.error) {
        throw new RequestError(409, 'Transition de la réclamation refusée : vérifiez les prérequis.');
      }
      return Response.json({ ok: true, revision: saved.data });
    }

    throw new RequestError(400, 'Action non reconnue.');
  } catch (error) {
    return errorResponse(error);
  }
}
