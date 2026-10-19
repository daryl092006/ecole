import type { RoleName, Student } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';

export interface StudentFilters { search: string; level: string; program: string; groupId: string; nationality: string; gender: string; status: string; }
export const EMPTY_STUDENT_FILTERS: StudentFilters = { search: '', level: '', program: '', groupId: '', nationality: '', gender: '', status: '' };
export const MISSING_STUDENT_VALUE = '__missing__';
export function studentFilterValue(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr') || MISSING_STUDENT_VALUE;
}
export function studentGroupFilterKey(student: Student): string {
  return student.groupId || (student.historical?.groupSourceId ? `archive:${student.historical.batchId}:${student.historical.groupSourceId}` : '');
}
export function filterRegisteredStudents(students: Student[], filters: StudentFilters, role: RoleName): Student[] {
  if (!hasPermission(role, 'student.view')) throw new Error('Consultation des dossiers non autorisée.');
  const search = filters.search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  return students.filter(student => (!filters.level || student.niveau === filters.level)
    && (!filters.program || student.filiere === filters.program)
    && (!filters.groupId || studentGroupFilterKey(student) === filters.groupId)
    && (!filters.nationality || studentFilterValue(student.nationality) === filters.nationality)
    && (!filters.gender || studentFilterValue(student.gender) === filters.gender)
    && (!filters.status || studentFilterValue(student.status) === filters.status)
    && (!search || [student.matricule, student.firstname, student.lastname, student.email, student.filiere, student.groupe].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').includes(search)));
}
