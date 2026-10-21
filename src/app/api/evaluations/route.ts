import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { filterSnapshotForAcademicYear } from '@/services/academicYearScopeService';
import type { PersistentChange, RelationalSnapshot } from '@/types/persistence';
import { ROLES } from '@/types/permissions';
import { isEvaluationEnrollmentStatus } from '@/services/evaluationCandidateService';
import { evaluationGradeIsComplete, evaluationGradeValue } from '@/services/evaluationGradePolicy';

export const dynamic = 'force-dynamic';

const commonSchema = {
  revision: z.number().int().nonnegative(),
};

const createEvaluationSchema = z.object({
  ...commonSchema,
  action: z.literal('create'),
  assignmentId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  kind: z.enum(['DEVOIR', 'EXAMEN', 'INTERROGATION', 'TP', 'EXPOSE', 'PROJET', 'RATTRAPAGE']),
  parentEvaluationId: z.string().uuid().nullable().optional(),
}).strict();

const enterGradesSchema = z.object({
  ...commonSchema,
  action: z.literal('enter_grades'),
  evaluationId: z.string().uuid(),
  advanceToSaisies: z.boolean().optional(),
  grades: z.array(z.object({
    candidateId: z.string().uuid(),
    value: z.number().min(0).max(20).nullable(),
    absenceStatus: z.enum(['ABSENT', 'JUSTIFIE', 'NON_TRAITE']).nullable().optional(),
  })).min(1),
}).strict();

const transitionSchema = z.object({
  ...commonSchema,
  action: z.literal('transition_workflow'),
  evaluationId: z.string().uuid(),
  fromStatus: z.enum(['BROUILLON', 'SAISIES', 'SOUMISES', 'A_CONTROLER', 'VALIDEES', 'PUBLIEES']),
  toStatus: z.enum(['BROUILLON', 'SAISIES', 'SOUMISES', 'A_CONTROLER', 'VALIDEES', 'PUBLIEES']),
  reason: z.string().trim().min(3).max(1000).optional(),
}).strict();

const correctGradeSchema = z.object({
  ...commonSchema,
  action: z.literal('correct_grade'),
  gradeId: z.string().uuid(),
  newValue: z.number().min(0).max(20),
  reason: z.string().trim().min(3).max(1000),
  complaintId: z.string().uuid().nullable().optional(),
}).strict();

const scheduleDeliverySchema = z.object({
  ...commonSchema,
  action: z.literal('schedule_delivery'),
  evaluationId: z.string().uuid(),
  sessionId: z.string().uuid(),
  accessOpensAt: z.string().datetime(),
  accessClosesAt: z.string().datetime(),
  durationMinutes: z.number().int().min(1).max(1440),
  reason: z.string().trim().min(3).max(1000),
}).strict();

const requestSchema = z.discriminatedUnion('action', [
  createEvaluationSchema,
  enterGradesSchema,
  transitionSchema,
  correctGradeSchema,
  scheduleDeliverySchema,
]);

async function loadContext(request: Request) {
  const auth = await requireAccount(request);
  const result = await auth.client.rpc('escen_backend_snapshot');
  if (result.error) throw new RequestError(503, 'Données académiques indisponibles.');
  const snapshot = result.data as RelationalSnapshot;
  const year = await resolveAcademicYear(request, auth.client, auth.context, snapshot);
  if (!year.selectedYearId) throw new RequestError(409, 'Choisissez une année scolaire précise.');
  // Teachers need enrollment ancestry for their candidates, without gaining directory access.
  const readContext = auth.context.role === ROLES.ENS
    ? { ...auth.context, permissions: [...auth.context.permissions, 'student.view' as const] }
    : auth.context;
  const roleScoped = filterRelationalSnapshot(snapshot, readContext);
  // An assignment must match one complete grant, including for a teacher with scoped access.
  const assignments = (roleScoped.tables.teaching_assignments || []).filter(assignment =>
    (roleScoped.tables.academic_offerings || []).some(offering => offering.id === assignment.offering_id
      && auth.context.grants.some(grant => (!grant.site_id || grant.site_id === offering.site_id)
        && (!grant.academic_year_id || grant.academic_year_id === offering.academic_year_id)
        && (!grant.group_id || grant.group_id === assignment.group_id))));
  const scoped = filterSnapshotForAcademicYear({
    ...roleScoped, tables: { ...roleScoped.tables, teaching_assignments: assignments },
  }, year.selectedYearId);
  return { ...auth, snapshot, scoped, year };
}

export async function POST(request: Request) {
  try {
    const data = await loadContext(request);
    const body = requestSchema.parse(await request.json());
    const changes: PersistentChange[] = [];

    if (body.action === 'create') {
      requirePermission(data.context, 'evaluation.create');
      const assignment = (data.scoped.tables.teaching_assignments || []).find(row => row.id === body.assignmentId);
      if (!assignment) throw new RequestError(404, 'Affectation pédagogique introuvable.');

      if (data.context.role === ROLES.ENS) {
        if (!data.context.teacherId || assignment.teacher_id !== data.context.teacherId) {
          throw new RequestError(403, 'Enseignement non affecté à votre profil enseignant.');
        }
      }

      if (body.kind === 'RATTRAPAGE' && !body.parentEvaluationId) {
        throw new RequestError(400, 'Un rattrapage doit être rattaché à une évaluation parente.');
      }

      // Candidats : étudiants inscrits dans le groupe de l'affectation
      const groupLinks = (data.scoped.tables.enrollment_groups || []).filter(eg => eg.group_id === assignment.group_id && (!eg.valid_until || new Date(String(eg.valid_until)).getTime() >= Date.now()));
      const groupEnrollmentIds = new Set(groupLinks.map(eg => eg.enrollment_id));
      const eligibleEnrollments = (data.scoped.tables.enrollments || []).filter(e => groupEnrollmentIds.has(e.id) && e.offering_id === assignment.offering_id && isEvaluationEnrollmentStatus(e.status));

      if (!eligibleEnrollments.length) {
        throw new RequestError(409, 'Aucun étudiant inscrit n’est rattaché à ce groupe pour cette formation.');
      }

      const evalId = crypto.randomUUID();
      changes.push({
        table: 'evaluations',
        operation: 'insert',
        record: {
          id: evalId,
          assignment_id: assignment.id,
          offering_id: assignment.offering_id,
          component_id: assignment.component_id,
          name: body.name,
          kind: body.kind,
          parent_evaluation_id: body.parentEvaluationId || null,
          status: 'BROUILLON',
          created_by: data.context.accountId,
        },
      });

      for (const enrollment of eligibleEnrollments) {
        changes.push({
          table: 'evaluation_candidates',
          operation: 'insert',
          record: {
            id: crypto.randomUUID(),
            evaluation_id: evalId,
            enrollment_id: enrollment.id,
            offering_id: assignment.offering_id,
            eligibility: 'ELIGIBLE',
          },
        });
      }

      const saved = await data.client.rpc('escen_evaluation_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });

      if (saved.error) {
        throw new RequestError(409, 'Création de l’évaluation refusée. Aucun lot partiel n’est conservé : l’évaluation et tous ses candidats sont enregistrés ensemble. Actualisez les données puis réessayez.');
      }
      return Response.json({ ok: true, id: evalId, revision: saved.data }, { status: 201 });
    }

    if (body.action === 'enter_grades') {
      requirePermission(data.context, 'grade.enter');
      const evaluation = (data.scoped.tables.evaluations || []).find(e => e.id === body.evaluationId);
      if (!evaluation) throw new RequestError(404, 'Évaluation introuvable.');
      if (evaluation.cancelled_at) throw new RequestError(409, 'Épreuve annulée.');
      if (!['BROUILLON', 'SAISIES'].includes(String(evaluation.status))) {
        throw new RequestError(409, 'Les notes ne sont modifiables qu’en statut brouillon ou en cours de saisie.');
      }

      const assignment = (data.scoped.tables.teaching_assignments || []).find(a => a.id === evaluation.assignment_id);
      if (data.context.role === ROLES.ENS) {
        if (!data.context.teacherId || assignment?.teacher_id !== data.context.teacherId) {
          throw new RequestError(403, 'Enseignement non affecté à votre profil.');
        }
      }

      const candidates = (data.scoped.tables.evaluation_candidates || []).filter(c => c.evaluation_id === evaluation.id);
      const candidateIds = new Set(candidates.map(c => c.id));

      for (const item of body.grades) {
        if (!candidateIds.has(item.candidateId)) {
          throw new RequestError(400, 'Candidat non rattaché à cette évaluation.');
        }
        if (item.absenceStatus === 'NON_TRAITE' && item.value !== null && item.value !== 0) {
          throw new RequestError(400, 'Une copie non traitée doit avoir une note de 0/20.');
        }
        if (item.value !== null && item.absenceStatus && item.absenceStatus !== 'NON_TRAITE') {
          throw new RequestError(400, 'Une note chiffrée ne peut pas être combinée avec un constat d’absence.');
        }
        const value = item.absenceStatus === 'NON_TRAITE' ? 0 : item.value;

        const existingGrade = (data.scoped.tables.grades || []).find(g => g.candidate_id === item.candidateId);
        if (existingGrade) {
          changes.push({
            table: 'grades',
            operation: 'update',
            record: {
              id: existingGrade.id,
              value,
              absence_status: item.absenceStatus || null,
              last_modified_by: data.context.accountId,
            },
          });
        } else {
          changes.push({
            table: 'grades',
            operation: 'insert',
            record: {
              id: crypto.randomUUID(),
              candidate_id: item.candidateId,
              value,
              absence_status: item.absenceStatus || null,
              entered_by: data.context.accountId,
              last_modified_by: data.context.accountId,
            },
          });
        }
      }

      if (body.advanceToSaisies && evaluation.status === 'BROUILLON') {
        changes.push({
          table: 'evaluation_transitions',
          operation: 'insert',
          record: {
            id: crypto.randomUUID(),
            evaluation_id: evaluation.id,
            from_status: 'BROUILLON',
            to_status: 'SAISIES',
            actor_id: data.context.accountId,
            reason: 'Initialisation de la saisie des notes',
          },
        });
      }

      const saved = await data.client.rpc('escen_evaluation_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });

      if (saved.error) {
        throw new RequestError(409, 'Enregistrement des notes refusé. Aucun lot partiel n’est conservé : toutes les notes sont enregistrées ensemble. Actualisez les données et vérifiez les saisies.');
      }
      return Response.json({ ok: true, revision: saved.data });
    }

    if (body.action === 'transition_workflow') {
      const scoped = filterSnapshotForAcademicYear(data.scoped, data.year.selectedYearId);
      const evaluation = (scoped.tables.evaluations || []).find(e => e.id === body.evaluationId);
      if (!evaluation) throw new RequestError(404, 'Évaluation introuvable.');
      if (evaluation.status !== body.fromStatus) {
        throw new RequestError(409, `L’état actuel de l’évaluation (${evaluation.status}) ne correspond pas à l’état attendu (${body.fromStatus}).`);
      }

      if (body.toStatus === 'SOUMISES') {
        if ((data.scoped.tables.exam_attempts || []).some(attempt => attempt.evaluation_id === evaluation.id && attempt.status === 'EN_COURS')) {
          throw new RequestError(409, 'Des copies sont encore en cours : attendez leur remise avant de soumettre les notes.');
        }
        requirePermission(data.context, 'grade.submit');
        if (data.context.role === ROLES.ENS) {
          const assignment = (data.scoped.tables.teaching_assignments || []).find(a => a.id === evaluation.assignment_id);
          if (!data.context.teacherId || assignment?.teacher_id !== data.context.teacherId) {
            throw new RequestError(403, 'Enseignement non affecté à votre profil.');
          }
        }
        const candidates = (data.scoped.tables.evaluation_candidates || []).filter(c => c.evaluation_id === evaluation.id);
        const gradesMap = new Map((data.scoped.tables.grades || []).map(g => [g.candidate_id, g]));
        if (candidates.some(candidate => gradesMap.get(candidate.id)?.absence_status === 'NON_TRAITE')) {
          throw new RequestError(409, 'Traitez toutes les copies NON_TRAITE avant de soumettre les notes.');
        }
        const missing = !candidates.length || candidates.some(c => c.eligibility !== 'ELIGIBLE' || !evaluationGradeIsComplete(gradesMap.get(c.id)));
        if (missing) {
          throw new RequestError(409, 'Chaque candidat doit être éligible et avoir une note ou une absence ABSENT/JUSTIFIE renseignée avant de soumettre.');
        }
      } else if (body.toStatus === 'A_CONTROLER') {
        requirePermission(data.context, 'grade.review');
      } else if (body.toStatus === 'SAISIES') {
        requirePermission(data.context, 'grade.review');
        if (!body.reason?.trim()) {
          throw new RequestError(400, 'Un motif est obligatoire pour retourner les notes à l’enseignant.');
        }
      } else if (body.toStatus === 'VALIDEES') {
        requirePermission(data.context, 'grade.approve');
      } else if (body.toStatus === 'PUBLIEES') {
        requirePermission(data.context, 'grade.publish');
      }

      changes.push({
        table: 'evaluation_transitions',
        operation: 'insert',
        record: {
          id: crypto.randomUUID(),
          evaluation_id: evaluation.id,
          from_status: body.fromStatus,
          to_status: body.toStatus,
          actor_id: data.context.accountId,
          reason: body.reason?.trim() || null,
        },
      });

      const saved = await data.client.rpc('escen_backend_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });

      if (saved.error) {
        throw new RequestError(409, 'Transition de notes refusée : vérifiez les prérequis.');
      }
      return Response.json({ ok: true, revision: saved.data });
    }

    if (body.action === 'correct_grade') {
      requirePermission(data.context, 'grade.approve');
      const grade = (data.scoped.tables.grades || []).find(g => g.id === body.gradeId);
      if (!grade) throw new RequestError(404, 'Note introuvable.');

      const candidate = (data.scoped.tables.evaluation_candidates || []).find(c => c.id === grade.candidate_id);
      const evaluation = candidate ? (data.scoped.tables.evaluations || []).find(e => e.id === candidate.evaluation_id) : null;
      if (!evaluation || evaluation.status !== 'PUBLIEES') {
        throw new RequestError(409, 'Une note ne peut être corrigée que lorsqu’elle est publiée.');
      }
      const currentValue = evaluationGradeValue(grade);
      if (currentValue === null) {
        throw new RequestError(409, 'Une absence enregistrée ne peut pas être corrigée directement.');
      }
      if (currentValue === body.newValue) {
        throw new RequestError(400, 'La nouvelle note doit être différente de la note actuelle.');
      }

      changes.push({
        table: 'grade_revisions',
        operation: 'insert',
        record: {
          id: crypto.randomUUID(),
          grade_id: grade.id,
          old_value: currentValue,
          new_value: body.newValue,
          actor_id: data.context.accountId,
          actor_role: data.context.role,
          reason: body.reason.trim(),
          complaint_id: body.complaintId || null,
        },
      });

      const saved = await data.client.rpc('escen_backend_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });

      if (saved.error) {
        throw new RequestError(409, 'Correction refusée : vérifiez les valeurs et l’état de la publication.');
      }
      return Response.json({ ok: true, revision: saved.data });
    }

    if (body.action === 'schedule_delivery') {
      requirePermission(data.context, 'evaluation.create');
      const evaluation = (data.scoped.tables.evaluations || []).find(row => row.id === body.evaluationId);
      if (!evaluation) throw new RequestError(404, 'Évaluation introuvable.');

      const assignment = (data.scoped.tables.teaching_assignments || []).find(row => row.id === evaluation.assignment_id);
      if (!assignment) throw new RequestError(404, 'Affectation pédagogique introuvable.');

      if (data.context.role === ROLES.ENS) {
        if (!data.context.teacherId || assignment.teacher_id !== data.context.teacherId) {
          throw new RequestError(403, 'Cette épreuve ne relève pas de vos enseignements affectés.');
        }
      }

      const session = (data.scoped.tables.sessions || []).find(row => row.id === body.sessionId);
      if (!session) throw new RequestError(404, 'Séance introuvable.');

      if (session.assignment_id !== assignment.id) {
        throw new RequestError(400, 'La séance choisie ne correspond pas à l’enseignement de l’épreuve.');
      }

      if (session.mode === 'COURS') {
        throw new RequestError(400, 'Une diffusion d’épreuve ne peut pas être programmée sur une séance ordinaire de cours.');
      }

      const opens = new Date(body.accessOpensAt).getTime();
      const closes = new Date(body.accessClosesAt).getTime();
      const sessionStart = new Date(String(session.starts_at)).getTime();
      const sessionEnd = new Date(String(session.ends_at)).getTime();

      if (isNaN(opens) || isNaN(closes) || opens >= closes) {
        throw new RequestError(400, 'La fenêtre d’accès est invalide : l’ouverture doit précéder la fermeture.');
      }

      if (opens < sessionStart || closes > sessionEnd) {
        throw new RequestError(400, 'La fenêtre d’accès à l’épreuve doit être comprise dans les limites de la séance.');
      }

      const existingDelivery = (data.scoped.tables.exam_deliveries || []).find(d => d.evaluation_id === body.evaluationId);
      if (existingDelivery) {
        changes.push({
          table: 'exam_deliveries',
          operation: 'update',
          record: {
            id: existingDelivery.id,
            session_id: body.sessionId,
            access_opens_at: body.accessOpensAt,
            access_closes_at: body.accessClosesAt,
            duration_minutes: body.durationMinutes,
            reason: body.reason.trim(),
          },
        });
      } else {
        changes.push({
          table: 'exam_deliveries',
          operation: 'insert',
          record: {
            id: crypto.randomUUID(),
            evaluation_id: body.evaluationId,
            session_id: body.sessionId,
            access_opens_at: body.accessOpensAt,
            access_closes_at: body.accessClosesAt,
            duration_minutes: body.durationMinutes,
            reason: body.reason.trim(),
          },
        });
      }

      const saved = await data.client.rpc('escen_backend_transaction', {
        p_actor_id: data.context.accountId,
        p_expected_revision: body.revision,
        p_changes: changes,
      });

      if (saved.error) {
        throw new RequestError(409, 'Programmation refusée : vérifiez les dates, la séance et le motif.');
      }
      return Response.json({ ok: true, revision: saved.data });
    }

    throw new RequestError(400, 'Action non reconnue.');
  } catch (error) {
    return errorResponse(error);
  }
}
