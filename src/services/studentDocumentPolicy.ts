import { z } from 'zod';
import { ROLES } from '@/types/permissions';
import type { DatabaseRow, PersistentContext, RelationalSnapshot, PersistentChange } from '@/types/persistence';
export const studentDocumentUploadSchema = z.object({ revision: z.number().int().nonnegative(), studentId: z.uuid(), enrollmentId: z.uuid(), documentTypeId: z.uuid(), supersedesId: z.uuid().nullable() }).strict();
export const studentDocumentReviewSchema = z.object({ revision: z.number().int().nonnegative(), id: z.uuid(), status: z.enum(['CONFORME', 'NON_CONFORME']), reason: z.string().trim().min(3).max(1000) }).strict();
export function canUploadStudentDocument(context: PersistentContext) { return context.permissions.includes('student.group.assign') || [ROLES.STUD, ROLES.DEL].includes(context.role as typeof ROLES.STUD); }
export function canReviewStudentDocument(context: PersistentContext) { return context.permissions.includes('student.update') && [ROLES.DA, ROLES.LOG, ROLES.IT].includes(context.role as typeof ROLES.DA); }
export function documentUploadPlan(scoped: RelationalSnapshot, raw: RelationalSnapshot, context: PersistentContext, yearId: string | null, input: z.infer<typeof studentDocumentUploadSchema>, file: DatabaseRow, newId: string): PersistentChange[] {
  if (!canUploadStudentDocument(context)) throw new Error('Dépôt non autorisé.');
  if (!yearId || input.revision !== raw.revision) throw new Error('Choisissez une année précise et actualisez les données avant de réessayer.');
  if (!scoped.tables.students?.some(row => row.id === input.studentId && !row.archived_at)) throw new Error('Dossier étudiant introuvable ou archivé.');
  if ([ROLES.STUD, ROLES.DEL].includes(context.role as typeof ROLES.STUD) && context.studentId !== input.studentId) throw new Error('Le dépôt est réservé à votre propre dossier.');
  if (!scoped.tables.enrollments?.some(row => row.id === input.enrollmentId && row.student_id === input.studentId)) throw new Error('Inscription annuelle incompatible.');
  const type = raw.tables.document_types?.find(row => row.id === input.documentTypeId);
  if (!type) throw new Error('Type de pièce introuvable.');
  const versions = (raw.tables.student_documents || []).filter(row => row.student_id === input.studentId && row.enrollment_id === input.enrollmentId && row.document_type_id === input.documentTypeId);
  const superseded = new Set(versions.map(row => row.supersedes_id));
  const current = versions.filter(row => !superseded.has(row.id));
  let version = 1;
  if (input.supersedesId) {
    const previous = current.find(row => row.id === input.supersedesId);
    if (!previous) throw new Error('La version à remplacer n’est plus actuelle ou appartient à un autre dossier.');
    version = Number(previous.version) + 1;
  } else if (type.multiple !== true && current.length) throw new Error('Cette pièce existe déjà. Choisissez explicitement la version à remplacer.');
  return [{ table: 'file_objects', operation: 'insert', record: file }, { table: 'student_documents', operation: 'insert', record: { id: newId, student_id: input.studentId, enrollment_id: input.enrollmentId, document_type_id: input.documentTypeId, academic_year_id: yearId, file_id: file.id, supersedes_id: input.supersedesId, version, status: 'A_VERIFIER' } }];
}
