import { filterSnapshotForAcademicYear } from './academicYearScopeService';
import { filterRelationalSnapshot } from './persistentPermissionsService';
import { readTranscriptDocument } from './transcriptDocumentService';
import type { PersistentContext, RelationalSnapshot } from '@/types/persistence';

export function authorizedTranscriptDocument(snapshot: RelationalSnapshot, context: PersistentContext, yearId: string | null, documentId: string) {
  if (!context.permissions.includes('grade.view')) return null;
  // Resolve annual ancestry before hiding jury internals from personal roles.
  const annual = filterSnapshotForAcademicYear(snapshot, yearId);
  const scoped = filterRelationalSnapshot(annual, context);
  const row = scoped.tables.generated_documents?.find(item => item.id === documentId && item.kind === 'RELEVE');
  return row ? readTranscriptDocument(row) : null;
}
