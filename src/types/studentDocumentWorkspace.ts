import type { DatabaseRow } from './persistence';
export interface StudentDocumentDirectory {
  revision: number; yearId: string | null; canUpload: boolean; canReview: boolean;
  students: DatabaseRow[]; enrollments: DatabaseRow[]; types: DatabaseRow[];
  documents: DatabaseRow[]; reviews: DatabaseRow[];
}
