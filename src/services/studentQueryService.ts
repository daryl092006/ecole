import type { RoleName, Student } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';

export interface StudentFilters { search: string; level: string; program: string; groupId: string; }
export const EMPTY_STUDENT_FILTERS: StudentFilters = { search: '', level: '', program: '', groupId: '' };
export function filterRegisteredStudents(students: Student[], filters: StudentFilters, role: RoleName): Student[] {
  if (!hasPermission(role, 'student.view')) throw new Error('Consultation des dossiers non autorisée.');
  const search = filters.search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  return students.filter(student => (!filters.level || student.niveau === filters.level)
    && (!filters.program || student.filiere === filters.program)
    && (!filters.groupId || student.groupId === filters.groupId)
    && (!search || [student.matricule, student.firstname, student.lastname, student.email, student.filiere, student.groupe].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').includes(search)));
}
