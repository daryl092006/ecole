import type { RoleName, Semester, TeachingAssignment } from '@/types';
import type { AcademicReferencesState } from '@/hooks/useAcademicReferences';
import { hasPermission } from '@/permissions/rolePermissions';
import { createMockId } from '@/utils/createMockId';

export function createSemester(refs: AcademicReferencesState, yearId: string, levelId: string, order: number, startDate: string, endDate: string, role: RoleName): Semester {
  if (!hasPermission(role, 'academic.structure.manage')) throw new Error('Permission insuffisante.');
  const year = refs.academicYears.find(item => item.id === yearId);
  const level = refs.levels.find(item => item.id === levelId && item.active);
  const first = level ? (level.order - 1) * 2 + 1 : 0;
  if (!year || !level || ![first, first + 1].includes(order)) throw new Error('Année, niveau ou numéro de semestre invalide.');
  if (!startDate || !endDate || startDate > endDate || startDate < year.startDate || endDate > year.endDate) throw new Error('Dates hors de l’année scolaire.');
  if (refs.semesters.some(item => item.academicYearId === yearId && item.levelId === levelId && (item.order === order || (item.startDate <= endDate && item.endDate >= startDate)))) throw new Error('Semestre existant ou dates en chevauchement.');
  return { id: createMockId('SEM'), academicYearId: yearId, levelId, order, name: `Semestre ${order}`, startDate, endDate, active: true };
}

export function createAssignment(refs: AcademicReferencesState, input: Omit<TeachingAssignment, 'id' | 'active'>, role: RoleName): TeachingAssignment {
  if (!hasPermission(role, 'academic.assignment.manage')) throw new Error('Permission insuffisante.');
  const group = refs.groups.find(item => item.id === input.groupId);
  const semester = refs.semesters.find(item => item.id === input.semesterId && item.active);
  const year = refs.academicYears.find(item => item.id === input.academicYearId && item.status === 'OUVERTE');
  if (!year || !group || !semester || group.academicYearId !== year.id || semester.academicYearId !== year.id || semester.levelId !== group.levelId) throw new Error('Groupe et semestre doivent correspondre à une même année ouverte et au même niveau.');
  const subject = refs.subjects.find(item => item.id === input.subjectId);
  const unit = refs.units?.find(item => item.id === subject?.teachingUnitId);
  if (subject?.academicYearId && (subject.academicYearId !== year.id || !unit || unit.semesterId !== semester.id || !group.programIds.includes(unit.programId))) throw new Error('Matière incompatible avec l’année, le semestre ou les filières du groupe.');
  if (!refs.subjects.some(item => item.id === input.subjectId && item.active) || !refs.teachers.some(item => item.id === input.teacherId && item.active)) throw new Error('Matière ou enseignant inactif.');
  if (refs.assignments.some(item => item.active && item.subjectId === input.subjectId && item.groupId === input.groupId && item.semesterId === input.semesterId)) throw new Error('Cet enseignement est déjà affecté.');
  return { ...input, id: createMockId('ASSIGN'), active: true };
}
