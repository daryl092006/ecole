'use client';
import { createContext, useContext, useState } from 'react';
import { initialAcademicYears, initialGroups, initialLevels, initialPrograms, initialSemesters, initialSubjects, initialTeachers, initialTeachingAssignments, initialTracks } from '@/mocks/data';
import { createLocalEntity, toggleLocalEntity, updateLocalEntity } from '@/services/academicReferenceService';
import type { TeachingUnit } from '@/types/academic';
import { SYSTEM_LEVELS } from '@/constants/academicStructure';

export function useAcademicReferenceStore() {
  const [academicYears, setAcademicYears] = useState(initialAcademicYears);
  const [semesters, setSemesters] = useState(initialSemesters);
  const [programs, setPrograms] = useState(initialPrograms);
  const [tracks, setTracks] = useState(initialTracks);
  const [levels, setLevels] = useState(initialLevels.length ? initialLevels : SYSTEM_LEVELS);
  const [groups, setGroups] = useState(initialGroups);
  const [units, setUnits] = useState<TeachingUnit[]>([]);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [teachers, setTeachers] = useState(initialTeachers);
  const [assignments, setAssignments] = useState(initialTeachingAssignments);
  return { units, setUnits, academicYears, semesters, programs, tracks, levels, groups, subjects, teachers, assignments,
    setAcademicYears, setSemesters, setPrograms, setTracks, setLevels, setGroups, setSubjects, setTeachers, setAssignments,
    createLocalEntity, updateLocalEntity, toggleLocalEntity };
}
export type AcademicReferencesState = ReturnType<typeof useAcademicReferenceStore>;

export const AcademicReferencesContext = createContext<AcademicReferencesState | null>(null);
export function useAcademicReferences() {
  const state = useContext(AcademicReferencesContext);
  if (!state) throw new Error('Référentiel académique indisponible.');
  return state;
}
