import type { AcademicYear, Group, Level, Program, RoleName } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';
import { createMockId } from '@/utils/createMockId';

interface CreateGroupInput {
  name: string;
  programIds: string[];
  levelId: string;
  academicYearId: string;
}

type GroupResult = { success: true; group: Group } | { success: false; error: string };

export function createGroup(
  groups: Group[],
  programs: Program[],
  levels: Level[],
  academicYears: AcademicYear[],
  input: CreateGroupInput,
  actorRole: RoleName,
): GroupResult {
  if (!hasPermission(actorRole, 'academic.group.manage')) return { success: false, error: 'Votre rôle ne peut pas créer de groupe.' };
  const name = input.name.trim();
  if (!name) return { success: false, error: 'Le nom du groupe est obligatoire.' };
  const selectedPrograms = programs.filter(program => input.programIds.includes(program.id) && program.active);
  if (!selectedPrograms.length || selectedPrograms.length !== new Set(input.programIds).size) return { success: false, error: 'Sélectionnez au moins une filière active.' };
  const level = levels.find(item => item.id === input.levelId && item.active);
  if (!level) return { success: false, error: 'Sélectionnez un niveau actif.' };
  const year = academicYears.find(item => item.id === input.academicYearId && item.status === 'OUVERTE' && item.active);
  if (!year) return { success: false, error: 'Sélectionnez une année scolaire ouverte.' };
  if (groups.some(group => group.academicYearId === year.id && group.levelId === level.id && group.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))) {
    return { success: false, error: 'Un groupe portant ce nom existe déjà pour cette année et ce niveau.' };
  }
  return {
    success: true,
    group: {
      id: createMockId('GRP'),
      name,
      filieres: selectedPrograms.map(program => program.name),
      niveau: level.name,
      academicYear: year.label,
      studentIds: [],
      programIds: selectedPrograms.map(program => program.id),
      trackIds: [],
      levelId: level.id,
      academicYearId: year.id,
    },
  };
}

