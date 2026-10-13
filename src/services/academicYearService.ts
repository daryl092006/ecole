import type { AcademicYear, AcademicYearHistoryEntry, AcademicYearStatus, RoleName } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';
import { createMockId } from '@/utils/createMockId';
import { isValidDate } from '@/utils/date';

export interface AcademicYearInput {
  label: string;
  startDate: string;
  endDate: string;
}

interface AcademicYearContext {
  actor: string;
  role: RoleName;
  reason?: string;
}

export type AcademicYearResult =
  | { success: true; academicYear: AcademicYear }
  | { success: false; errors: Partial<Record<keyof AcademicYearInput | 'form', string>> };

const STATUS_TRANSITIONS: Record<AcademicYearStatus, AcademicYearStatus[]> = {
  BROUILLON: ['OUVERTE'],
  OUVERTE: ['EN_CLOTURE'],
  EN_CLOTURE: ['CLOTUREE'],
  CLOTUREE: [],
};

function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ');
}

function validateInput(input: AcademicYearInput, years: AcademicYear[], excludedId?: string) {
  const errors: Partial<Record<keyof AcademicYearInput | 'form', string>> = {};
  const label = normalizeLabel(input.label);
  if (!label) errors.label = 'Le libellé est obligatoire.';
  if (!isValidDate(input.startDate)) errors.startDate = 'La date de début doit être valide.';
  if (!isValidDate(input.endDate)) errors.endDate = 'La date de fin doit être valide.';
  if (input.startDate && input.endDate && input.startDate >= input.endDate) {
    errors.endDate = 'La date de fin doit être postérieure à la date de début.';
  }
  if (years.some(year => year.id !== excludedId && year.label.toLocaleLowerCase('fr') === label.toLocaleLowerCase('fr'))) {
    errors.label = 'Ce libellé existe déjà.';
  }
  if (input.startDate && input.endDate && years.some(year =>
    year.id !== excludedId && input.startDate <= year.endDate && input.endDate >= year.startDate
  )) {
    errors.form = 'Les dates chevauchent une autre année scolaire.';
  }
  return errors;
}

function historyEntry(
  action: AcademicYearHistoryEntry['action'],
  context: AcademicYearContext,
  newValue: Partial<AcademicYear>,
  oldValue?: Partial<AcademicYear>,
): AcademicYearHistoryEntry {
  return {
    id: createMockId('AYH'),
    dateTime: new Date().toISOString(),
    actor: context.actor,
    role: context.role,
    action,
    oldValue,
    newValue,
    reason: context.reason?.trim() || undefined,
  };
}

export function createAcademicYear(
  years: AcademicYear[],
  input: AcademicYearInput,
  context: AcademicYearContext,
): AcademicYearResult {
  if (!hasPermission(context.role, 'academic.structure.manage')) return { success: false, errors: { form: 'Gestion des années non autorisée.' } };
  const errors = validateInput(input, years);
  if (Object.keys(errors).length) return { success: false, errors };
  const base = {
    id: createMockId('AY'),
    label: normalizeLabel(input.label),
    startDate: input.startDate,
    endDate: input.endDate,
    status: 'BROUILLON' as const,
    active: false,
  };
  const academicYear: AcademicYear = {
    ...base,
    history: [historyEntry('CREATION', context, base)],
  };
  return { success: true, academicYear };
}

export function updateAcademicYear(
  years: AcademicYear[],
  academicYear: AcademicYear,
  input: AcademicYearInput,
  context: AcademicYearContext,
): AcademicYearResult {
  if (!hasPermission(context.role, 'academic.structure.manage')) return { success: false, errors: { form: 'Gestion des années non autorisée.' } };
  if (academicYear.status === 'CLOTUREE') {
    return { success: false, errors: { form: 'Une année clôturée est protégée contre les modifications.' } };
  }
  const errors = validateInput(input, years, academicYear.id);
  if (Object.keys(errors).length) return { success: false, errors };
  const changed = {
    label: normalizeLabel(input.label),
    startDate: input.startDate,
    endDate: input.endDate,
  };
  const updated: AcademicYear = {
    ...academicYear,
    ...changed,
    history: [...academicYear.history, historyEntry('MODIFICATION', context, changed, {
      label: academicYear.label,
      startDate: academicYear.startDate,
      endDate: academicYear.endDate,
    })],
  };
  return { success: true, academicYear: updated };
}

export function transitionAcademicYear(
  academicYear: AcademicYear,
  target: AcademicYearStatus,
  context: AcademicYearContext,
): AcademicYear {
  if (target === 'OUVERTE' && !hasPermission(context.role, 'academic.year.open')) {
    throw new Error('Seul le Directeur Académique peut ouvrir une année scolaire.');
  }
  if (target !== 'OUVERTE' && !hasPermission(context.role, 'academic.year.open')) throw new Error('Clôture réservée à la direction académique.');
  if (target !== 'OUVERTE' && !context.reason?.trim()) throw new Error('Un motif de clôture est obligatoire.');
  if (!STATUS_TRANSITIONS[academicYear.status].includes(target)) {
    throw new Error(`Transition d'année scolaire interdite : ${academicYear.status} → ${target}.`);
  }
  return {
    ...academicYear,
    status: target,
    active: target === 'OUVERTE',
    history: [...academicYear.history, historyEntry('CHANGEMENT_STATUT', context, { status: target }, { status: academicYear.status })],
  };
}
