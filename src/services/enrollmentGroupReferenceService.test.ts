import assert from 'node:assert/strict';
import { availableEnrollmentGroupLinks } from './enrollmentGroupReferenceService';
import type { RelationalSnapshot } from '@/types/persistence';

const offerings = [
  { id: 'O1', academic_year_id: 'Y', level_id: 'L1' },
  { id: 'O2', academic_year_id: 'Y', level_id: 'L1' },
  { id: 'ARCHIVED', academic_year_id: 'Y', level_id: 'L1', archived_at: '2026-10-15' },
];
const snapshot: RelationalSnapshot = { revision: 1, tables: {
  groups: [{ id: 'G', academic_year_id: 'Y', level_id: 'L1' }, { id: 'OLD', academic_year_id: 'Y', level_id: 'L1', archived_at: '2026-10-15' }, { id: 'OTHER_YEAR', academic_year_id: 'Z', level_id: 'L1' }, { id: 'OTHER_LEVEL', academic_year_id: 'Y', level_id: 'L2' }],
  group_offerings: [
    { id: 'A', group_id: 'G', offering_id: 'O1', academic_year_id: 'Y', level_id: 'L1' },
    { id: 'B', group_id: 'G', offering_id: 'O2', academic_year_id: 'Y', level_id: 'L1' },
    { id: 'C', group_id: 'OLD', offering_id: 'O1', academic_year_id: 'Y', level_id: 'L1' },
    { id: 'D', group_id: 'G', offering_id: 'O1', academic_year_id: 'Y', level_id: 'L1', archived_at: '2026-10-15' },
    { id: 'E', group_id: 'OTHER_YEAR', offering_id: 'O1', academic_year_id: 'Y', level_id: 'L1' },
    { id: 'F', group_id: 'OTHER_LEVEL', offering_id: 'O1', academic_year_id: 'Y', level_id: 'L1' },
    { id: 'G', group_id: 'G', offering_id: 'ARCHIVED', academic_year_id: 'Y', level_id: 'L1' },
    { id: 'H', group_id: 'MISSING', offering_id: 'O1', academic_year_id: 'Y', level_id: 'L1' },
  ],
} };
assert.deepEqual(availableEnrollmentGroupLinks(snapshot, offerings).map(row => row.id), ['A', 'B']);
// Un groupe partagé reste disponible pour ses deux filières ; l’archivage après lecture invalide le choix.
snapshot.tables.groups[0].archived_at = '2026-10-16';
assert.deepEqual(availableEnrollmentGroupLinks(snapshot, offerings), []);
