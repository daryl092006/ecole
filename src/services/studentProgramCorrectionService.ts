import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
import type { StudentProgramCorrectionDirectory } from '@/types/studentCorrections';

export function offeringLabel(snapshot: RelationalSnapshot, id: unknown) {
  const tables = snapshot.tables;
  const offering = tables.academic_offerings?.find(row => row.id === id);
  const curriculum = tables.curricula?.find(row => row.id === offering?.curriculum_id);
  const program = tables.programs?.find(row => row.id === curriculum?.program_id);
  const level = tables.levels?.find(row => row.id === offering?.level_id);
  return [program?.name, level?.name].filter(Boolean).join(' · ') || 'Formation non renseignée';
}

export function studentProgramCorrectionDirectory(snapshot: RelationalSnapshot, tickets: DatabaseRow[], yearId: string | null): StudentProgramCorrectionDirectory {
  const rows = (table: string) => snapshot.tables[table] || [];
  if (!yearId || !rows('academic_years').some(year => year.id === yearId && year.status === 'OUVERTE')) return { enrollments: [], offerings: [] };
  const enrollments = tickets.filter(ticket => ['OPEN', 'IN_PROGRESS'].includes(String(ticket.status))).flatMap(ticket => {
    const account = rows('accounts').find(row => row.id === ticket.author_id);
    const student = rows('students').find(row => row.person_id === account?.person_id && !row.archived_at);
    return rows('enrollments').filter(row => row.student_id === student?.id && ['INSCRIT', 'REINSCRIT'].includes(String(row.status))).flatMap(enrollment => {
      const offering = rows('academic_offerings').find(row => row.id === enrollment.offering_id && row.academic_year_id === yearId);
      if (!offering) return [];
      const groupNames = rows('enrollment_groups').filter(link => link.enrollment_id === enrollment.id && link.historical_only !== true && !link.valid_until)
        .map(link => rows('groups').find(group => group.id === link.group_id)?.name).filter(Boolean);
      return [{ ticketId: ticket.id, id: enrollment.id, offeringId: offering.id, siteId: String(offering.site_id), label: offeringLabel(snapshot, offering.id), groupLabel: groupNames.join(', ') || 'Non affecté' }];
    });
  });
  const siteIds = new Set(enrollments.map(row => row.siteId));
  const offerings = rows('academic_offerings').filter(row => row.academic_year_id === yearId && !row.archived_at && siteIds.has(String(row.site_id))).map(offering => ({
    id: offering.id, siteId: String(offering.site_id), label: offeringLabel(snapshot, offering.id),
    groups: rows('group_offerings').filter(link => link.offering_id === offering.id && !link.archived_at).flatMap(link => {
      const group = rows('groups').find(row => row.id === link.group_id && !row.archived_at);
      return group ? [{ id: group.id, label: String(group.name) }] : [];
    }),
  })).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  return { enrollments, offerings };
}
