import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';

/** Only confirmed, available annual relationships may be used for an enrollment. */
export function availableEnrollmentGroupLinks(snapshot: RelationalSnapshot, offerings: DatabaseRow[]): DatabaseRow[] {
  const available = (row: DatabaseRow) => !row.archived_at && row.active !== false;
  const offeringById = new Map(offerings.filter(available).map(row => [row.id, row]));
  const groups = new Map((snapshot.tables.groups || []).filter(available).map(row => [row.id, row]));
  return (snapshot.tables.group_offerings || []).filter(link => {
    const offering = offeringById.get(String(link.offering_id));
    const group = groups.get(String(link.group_id));
    return available(link) && !!offering && !!group
      && group.academic_year_id === offering.academic_year_id
      && link.academic_year_id === offering.academic_year_id
      && group.level_id === offering.level_id
      && link.level_id === offering.level_id;
  });
}
