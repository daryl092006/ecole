import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';
export interface ReenrollmentDirectory {
  target: {id: string; name: string};
  previous: {id: string; name: string} | null;
  students: {id: string; matricule: string; firstname: string; lastname: string}[];
}
export function previousAcademicYear(years: DatabaseRow[], target: DatabaseRow): DatabaseRow | null {
  const label = String(target.name).match(/^(\d{4})-(\d{4})$/);
  if (!label || Number(label[2]) !== Number(label[1]) + 1) return null;
  const previous = years.filter(year => !year.archived_at && year.name === `${Number(label[1]) - 1}-${label[1]}`);
  return previous.length === 1 ? previous[0] : null;
}
export function reenrollmentCandidates(snapshot: RelationalSnapshot, previousId: string, targetId: string, historicalPrevious: string[] = [], historicalTarget: string[] = []) {
  const offerings = new Map((snapshot.tables.academic_offerings || []).map(row => [row.id, row.academic_year_id]));
  const previous = new Set(historicalPrevious); const registered = new Set(historicalTarget);
  for (const enrollment of snapshot.tables.enrollments || []) {
    const year = offerings.get(String(enrollment.offering_id));
    if (year === previousId) previous.add(String(enrollment.student_id));
    if (year === targetId) registered.add(String(enrollment.student_id));
  }
  const people = new Map((snapshot.tables.people || []).map(row => [row.id, row]));
  return (snapshot.tables.students || []).filter(row => !row.archived_at && previous.has(row.id) && !registered.has(row.id)).map(row => {
    const person = people.get(String(row.person_id));
    return {id: row.id, matricule: String(row.matricule), firstname: String(person?.firstname || ''), lastname: String(person?.lastname || '')};
  }).sort((a,b) => a.lastname.localeCompare(b.lastname,'fr') || a.firstname.localeCompare(b.firstname,'fr'));
}
