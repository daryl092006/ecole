import { z } from 'zod';
import type { SubjectInput, PreparedSubject } from '@/types/subject';
import type { PersistentChange, RelationalSnapshot, DatabaseRow } from '@/types/persistence';

const option = z.object({
  label: z.string().trim().min(1).max(1000),
  correct: z.boolean(),
}).strict();

const question = z.object({
  prompt: z.string().trim().min(1).max(8000),
  kind: z.enum(['TEXTE', 'QCM_SIMPLE', 'QCM_MULTIPLE']),
  points: z.number().min(0.001).max(99999.999),
  options: z.array(option).max(8),
  correction: z.string().max(8000),
}).strict().superRefine((q, ctx) => {
  if (q.kind === 'TEXTE' && q.options.length) {
    ctx.addIssue({ code: 'custom', message: 'Une réponse ouverte ne comporte pas de choix.' });
  }
  if (q.kind !== 'TEXTE' && q.options.length < 2) {
    ctx.addIssue({ code: 'custom', message: 'Un QCM nécessite au moins deux choix.' });
  }
  if (q.kind === 'QCM_SIMPLE' && q.options.filter(o => o.correct).length > 1) {
    ctx.addIssue({ code: 'custom', message: 'Le QCM simple admet une seule bonne réponse.' });
  }
});

export const subjectSchema = z.object({
  title: z.string().trim().min(1).max(160),
  instructions: z.string().max(8000),
  durationMinutes: z.number().int().min(1).max(2147483647),
  purpose: z.enum(['CONTROLE_CONTINU', 'EXAMEN', 'RATTRAPAGE']),
  evaluationId: z.string().uuid().nullable().optional(),
  sourceEvaluationRowId: z.string().uuid().nullable().optional(),
  authorize: z.boolean().optional(),
  parts: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    instructions: z.string().max(4000),
    questions: z.array(question).max(100),
  }).strict()).max(20),
}).strict()
  .refine(input => input.parts.reduce((sum, p) => sum + p.questions.length, 0) <= 100, {
    message: 'Un sujet comporte au plus 100 questions.',
  })
  .refine(input => !input.evaluationId || !input.sourceEvaluationRowId, {
    message: 'Un sujet ne peut pas associer à la fois une évaluation de l’année et une archive historique.',
  })
  .refine(input => !input.authorize || (!!input.evaluationId && input.parts.some(p => p.questions.length > 0)), {
    message: 'L’autorisation pour diffusion nécessite une évaluation rattachée et au moins une question.',
  });

export function subjectPoints(subject: SubjectInput) {
  return Math.round(subject.parts.reduce((sum, part) => sum + part.questions.reduce((total, q) => total + q.points, 0), 0) * 1000) / 1000;
}

export function buildSubjectChanges(
  input: SubjectInput,
  authorId: string,
  reason: string,
  previous?: DatabaseRow,
  uuid = () => crypto.randomUUID()
) {
  const subject = subjectSchema.parse(input);
  const id = uuid();
  const libraryId = previous ? String(previous.library_id) : uuid();
  const evaluationId = subject.evaluationId || null;
  const sourceEvaluationRowId = evaluationId ? null : (subject.sourceEvaluationRowId || null);

  const changes: PersistentChange[] = [{
    table: 'exam_papers',
    operation: 'insert',
    record: {
      id,
      library_id: libraryId,
      version: previous ? Number(previous.version) + 1 : 1,
      evaluation_id: evaluationId,
      title: subject.title,
      instructions: subject.instructions,
      duration_minutes: subject.durationMinutes,
      purpose: subject.purpose,
      author_id: previous?.author_id || authorId,
      source_evaluation_row_id: sourceEvaluationRowId,
      status: 'BROUILLON',
      reason,
    },
  }];

  subject.parts.forEach((part, index) => {
    const partId = uuid();
    changes.push({
      table: 'exam_parts',
      operation: 'insert',
      record: {
        id: partId,
        paper_id: id,
        title: part.title,
        instructions: part.instructions,
        position: index + 1,
      },
    });
    part.questions.forEach((q, position) => {
      const questionId = uuid();
      changes.push({
        table: 'exam_questions',
        operation: 'insert',
        record: {
          id: questionId,
          paper_id: id,
          part_id: partId,
          kind: q.kind,
          prompt: q.prompt,
          points: q.points,
          position: position + 1,
          configuration: { correction: q.correction },
        },
      });
      q.options.forEach((choice, choiceIndex) => {
        changes.push({
          table: 'exam_options',
          operation: 'insert',
          record: {
            id: uuid(),
            question_id: questionId,
            label: choice.label,
            is_correct: choice.correct,
            position: choiceIndex + 1,
          },
        });
      });
    });
  });

  if (subject.authorize && evaluationId) {
    changes.push({
      table: 'exam_papers',
      operation: 'update',
      record: {
        id,
        status: 'AUTORISE',
        authorized_by: authorId,
        authorized_at: new Date().toISOString(),
        reason,
      },
    });
  }

  if (previous) {
    changes.push({
      table: 'exam_papers',
      operation: 'update',
      record: {
        id: previous.id,
        archived_at: new Date().toISOString(),
        reason,
      },
    });
  }

  return { id, changes };
}

export function projectSubjects(snapshot: RelationalSnapshot, papers: DatabaseRow[]): PreparedSubject[] {
  const rows = (name: string) => snapshot.tables[name] || [];
  return papers.map(paper => ({
    id: paper.id,
    libraryId: String(paper.library_id),
    version: Number(paper.version),
    archived: !!paper.archived_at,
    title: String(paper.title || ''),
    instructions: String(paper.instructions || ''),
    durationMinutes: Number(paper.duration_minutes || 60),
    purpose: paper.purpose as PreparedSubject['purpose'],
    evaluationId: paper.evaluation_id ? String(paper.evaluation_id) : null,
    status: (paper.status as PreparedSubject['status']) || 'BROUILLON',
    authorizedBy: paper.authorized_by ? String(paper.authorized_by) : null,
    authorizedAt: paper.authorized_at ? String(paper.authorized_at) : null,
    sourceEvaluationRowId: paper.source_evaluation_row_id ? String(paper.source_evaluation_row_id) : null,
    parts: rows('exam_parts')
      .filter(part => part.paper_id === paper.id)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map(part => ({
        title: String(part.title),
        instructions: String(part.instructions || ''),
        questions: rows('exam_questions')
          .filter(q => q.part_id === part.id && q.paper_id === paper.id)
          .sort((a, b) => Number(a.position) - Number(b.position))
          .map(q => ({
            prompt: String(q.prompt),
            kind: q.kind as PreparedSubject['parts'][number]['questions'][number]['kind'],
            points: Number(q.points),
            correction: String((q.configuration as Record<string, unknown>)?.correction || ''),
            options: rows('exam_options')
              .filter(o => o.question_id === q.id)
              .sort((a, b) => Number(a.position) - Number(b.position))
              .map(o => ({
                label: String(o.label),
                correct: o.is_correct === true,
              })),
          })),
      })),
  }));
}
