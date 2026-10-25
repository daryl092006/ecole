import { resolveAcademicYear } from '@/server/academicYearContext';
import { filterSnapshotForAcademicYear } from '@/services/academicYearScopeService';
import { z } from 'zod';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import { subjectExams, subjectExamIssue } from '@/services/subjectExamPolicy';
import { ROLES } from '@/types/permissions';
import { subjectSchema, buildSubjectChanges, projectSubjects } from '@/services/subjectCompositionService';
import type { RelationalSnapshot, PersistentContext, DatabaseRow } from '@/types/persistence';

export const dynamic = 'force-dynamic';

const privileged = (context: PersistentContext) =>
  [ROLES.IT, ROLES.DG, ROLES.DA].includes(context.role as typeof ROLES.IT) &&
  context.grants.some(g => !g.site_id && !g.group_id && !g.academic_year_id);

function visible(snapshot: RelationalSnapshot, context: PersistentContext): DatabaseRow[] {
  const papers = snapshot.tables.exam_papers || [];
  const evaluationIds = new Set((filterRelationalSnapshot(snapshot, context).tables.evaluations || []).map(row => row.id));
  return papers.filter(row => row.evaluation_id ? evaluationIds.has(String(row.evaluation_id))
    : privileged(context) || row.author_id === context.accountId);
}

export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'evaluation.create');
    const response = await client.rpc('escen_backend_snapshot');
    if (response.error) throw new RequestError(503, 'Chargement des sujets indisponible.');
    const snapshot = response.data as RelationalSnapshot;
    const year = await resolveAcademicYear(request, client, context, snapshot);
    const scoped = filterSnapshotForAcademicYear(
      snapshot,
      year.selectedYearId || (year.selection === 'all' ? null : '00000000-0000-0000-0000-000000000000')
    );
    return Response.json(
      { revision: snapshot.revision, subjects: projectSubjects(scoped, visible(scoped, context)),
        exams: year.selectedYearId ? subjectExams(filterRelationalSnapshot(scoped, context)) : [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { client, context } = await requireAccount(request);
    requirePermission(context, 'evaluation.create');
    const body = z.object({
      revision: z.number().int().nonnegative(),
      previousId: z.uuid().optional(),
      subject: subjectSchema,
      reason: z.string().trim().min(3).max(1000),
    }).strict().parse(await request.json());

    const response = await client.rpc('escen_backend_snapshot');
    if (response.error) throw new RequestError(503, 'Chargement des sujets indisponible.');
    const snapshot = response.data as RelationalSnapshot;
    const year = await resolveAcademicYear(request, client, context, snapshot);
    if (!year.selectedYearId) throw new RequestError(409, 'Choisissez une année scolaire précise avant de composer un sujet.');
    if (snapshot.revision !== body.revision) throw new RequestError(409, 'Les sujets ont changé. Actualisez avant d’enregistrer.');

    const previous = body.previousId ? visible(snapshot, context).find(row => row.id === body.previousId && !row.archived_at) : undefined;
    if (previous && previous.academic_year_id !== year.selectedYearId) {
      throw new RequestError(409, 'Ce sujet appartient à une autre année ou son année doit être confirmée.');
    }
    if (body.previousId && !previous) throw new RequestError(404, 'Sujet introuvable ou non modifiable.');

    if (!body.subject.evaluationId || body.subject.sourceEvaluationRowId) {
      throw new RequestError(400, 'Choisissez un examen programmé : un sujet doit appartenir à cet examen.');
    }
    if (previous && previous.evaluation_id !== body.subject.evaluationId) throw new RequestError(409, 'Le sujet ne peut pas être déplacé vers un autre examen.');
    const scoped = filterSnapshotForAcademicYear(filterRelationalSnapshot(snapshot, context), year.selectedYearId);
    const exam = subjectExams(scoped).find(row => row.id === body.subject.evaluationId);
    const issue = subjectExamIssue(exam);
    if (issue) throw new RequestError(409, issue);
    if (exam && (body.subject.purpose !== exam.purpose || body.subject.durationMinutes !== exam.durationMinutes)) {
      throw new RequestError(409, 'La nature et la durée du sujet doivent correspondre à la programmation de l’examen. Actualisez la page.');
    }
    if (!previous && (snapshot.tables.exam_papers || []).some(row => row.evaluation_id === body.subject.evaluationId && !row.archived_at)) {
      throw new RequestError(409, 'Cet examen possède déjà un sujet. Ouvrez ce sujet pour le compléter.');
    }

    if (body.subject.evaluationId) {
      const evaluation = (snapshot.tables.evaluations || []).find(e => e.id === body.subject.evaluationId);
      if (!evaluation) throw new RequestError(404, 'Évaluation introuvable.');

      const assignment = (snapshot.tables.teaching_assignments || []).find(ta => ta.id === evaluation.assignment_id);
      if (!assignment) throw new RequestError(404, 'Affectation pédagogique introuvable.');

      if (context.role === ROLES.ENS && context.teacherId && assignment.teacher_id !== context.teacherId) {
        throw new RequestError(403, 'Cette épreuve ne relève pas de vos enseignements affectés.');
      }

      const offering = (snapshot.tables.academic_offerings || []).find(o => o.id === assignment.offering_id);
      if (!offering || offering.academic_year_id !== year.selectedYearId) {
        throw new RequestError(409, 'L’évaluation sélectionnée n’appartient pas à l’année scolaire consultée.');
      }

      if (evaluation.kind === 'EXAMEN' && evaluation.session_type !== 'RATTRAPAGE' && body.subject.purpose !== 'EXAMEN') {
        throw new RequestError(400, 'La nature du sujet doit être EXAMEN pour cette épreuve.');
      }
      if ((evaluation.kind === 'RATTRAPAGE' || evaluation.session_type === 'RATTRAPAGE') && body.subject.purpose !== 'RATTRAPAGE') {
        throw new RequestError(400, 'La nature du sujet doit être RATTRAPAGE pour cette épreuve.');
      }
      if (!['EXAMEN', 'RATTRAPAGE'].includes(String(evaluation.kind)) && body.subject.purpose !== 'CONTROLE_CONTINU') {
        throw new RequestError(400, 'La nature du sujet doit être CONTROLE_CONTINU pour cette épreuve.');
      }
    }

    const prepared = buildSubjectChanges(body.subject, context.accountId, body.reason, previous as DatabaseRow | undefined);
    prepared.changes[0].record.academic_year_id = year.selectedYearId;

    if (!previous && body.subject.evaluationId) {
      const existingVersions = (snapshot.tables.exam_papers || [])
        .filter(p => p.evaluation_id === body.subject.evaluationId)
        .map(p => Number(p.version) || 0);
      if (existingVersions.length > 0) {
        prepared.changes[0].record.version = Math.max(...existingVersions) + 1;
      }
    }

    const saved = await client.rpc('escen_subject_transaction', {
      p_actor_id: context.accountId,
      p_expected_revision: snapshot.revision,
      p_changes: prepared.changes,
    });

    if (saved.error) {
      throw new RequestError(409, 'Le sujet n’a pas été enregistré. Vérifiez ses questions et actualisez en cas de modification concurrente.');
    }
    return Response.json({ id: prepared.id, revision: saved.data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
