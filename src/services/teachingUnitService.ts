import type { TeachingUnit, Subject } from '@/types/academic';
import type { RoleName } from '@/types';
import type { AcademicReferencesState } from '@/hooks/useAcademicReferences';
import { hasPermission } from '@/permissions/rolePermissions';
import { createMockId } from '@/utils/createMockId';
export function createTeachingUnit(refs: AcademicReferencesState, input: Omit<TeachingUnit, 'id' | 'active'>, role: RoleName): TeachingUnit {
  if (!hasPermission(role, 'academic.structure.manage')) throw new Error('Gestion de la structure non autorisée.');
  const semester = refs.semesters.find(item => item.id === input.semesterId && item.active);
  const year = refs.academicYears.find(item => item.id === input.academicYearId && item.status !== 'CLOTUREE');
  if (!semester || !year || semester.academicYearId !== year.id || !refs.programs.some(item => item.id === input.programId && item.active)) throw new Error('Filière, année et semestre compatibles obligatoires.');
  if (!input.code.trim() || !input.name.trim() || !Number.isSafeInteger(input.credits) || input.credits <= 0) throw new Error('Code, nom et crédits entiers positifs obligatoires.');
  if (refs.units.some(item => item.academicYearId === input.academicYearId && item.programId === input.programId && item.code.toLowerCase() === input.code.trim().toLowerCase())) throw new Error('Code UE déjà utilisé dans cette filière et cette année.');
  return { ...input, code: input.code.trim(), name: input.name.trim(), id: createMockId('UE'), active: true };
}
export function createAnnualSubject(refs: AcademicReferencesState, input: { code: string; name: string; coefficient: number; credits: number; teachingUnitId: string }, role: RoleName): Subject {
  if (!hasPermission(role, 'academic.structure.manage')) throw new Error('Gestion de la structure non autorisée.');
  const unit = refs.units.find(item => item.id === input.teachingUnitId && item.active);
  if (!unit || !input.code.trim() || !input.name.trim() || !Number.isFinite(input.coefficient) || input.coefficient <= 0 || !Number.isSafeInteger(input.credits) || input.credits <= 0) throw new Error('UE active, nom, code, coefficient et crédits positifs obligatoires.');
  if (refs.subjects.some(item => item.academicYearId === unit.academicYearId && item.code.toLowerCase() === input.code.trim().toLowerCase())) throw new Error('Code matière déjà utilisé pour cette année.');
  const usedCredits = refs.subjects.filter(item => item.teachingUnitId === unit.id && item.active).reduce((sum, item) => sum + (item.credits ?? 0), 0);
  if (usedCredits + input.credits > unit.credits) throw new Error('Les crédits des matières dépassent les crédits de l’UE.');
  return { ...input, code: input.code.trim(), name: input.name.trim(), academicYearId: unit.academicYearId, id: createMockId('SUB'), active: true };
}
