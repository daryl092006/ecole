import type { CatalogHistoryEntry, Program, RoleName, Track } from '@/types';
import { createMockId } from '@/utils/createMockId';
import { hasPermission } from '@/permissions/rolePermissions';

export interface ProgramInput { code: string; name: string; description: string; }
export interface TrackInput { programId: string; code: string; name: string; }
type Errors<T> = Partial<Record<keyof T | 'form', string>>;
export type CatalogResult<T> = { success: true; entity: T } | { success: false; errors: Errors<T extends Program ? ProgramInput : TrackInput> };

function clean(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function history(actorRole: RoleName, action: CatalogHistoryEntry['action'], details: string): CatalogHistoryEntry {
  return { id: createMockId('CAT-H'), dateTime: new Date().toISOString(), actorRole, action, details };
}

function permissionError<T>(): CatalogResult<T> {
  return { success: false, errors: { form: 'Votre rôle ne peut pas modifier le référentiel académique.' } } as CatalogResult<T>;
}

export function saveProgram(programs: Program[], input: ProgramInput, actorRole: RoleName, existing?: Program): CatalogResult<Program> {
  if (!hasPermission(actorRole, 'academic.structure.manage')) return permissionError<Program>();
  const code = clean(input.code).toUpperCase();
  const name = clean(input.name);
  const errors: Errors<ProgramInput> = {};
  if (!code) errors.code = 'Le code est obligatoire.';
  if (!name) errors.name = 'Le nom est obligatoire.';
  if (programs.some(item => item.id !== existing?.id && item.code.toUpperCase() === code)) errors.code = 'Ce code de filière existe déjà.';
  if (programs.some(item => item.id !== existing?.id && item.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))) errors.name = 'Cette filière existe déjà.';
  if (Object.keys(errors).length) return { success: false, errors };
  const action = existing ? 'MODIFICATION' : 'CREATION';
  return { success: true, entity: { id: existing?.id ?? createMockId('PRG'), code, name, description: clean(input.description), active: existing?.active ?? true, history: [...(existing?.history ?? []), history(actorRole, action, existing ? `Filière ${code} modifiée.` : `Filière ${code} créée.`)] } };
}

export function saveTrack(programs: Program[], tracks: Track[], input: TrackInput, actorRole: RoleName, existing?: Track): CatalogResult<Track> {
  if (!hasPermission(actorRole, 'academic.structure.manage')) return permissionError<Track>();
  const code = clean(input.code).toUpperCase();
  const name = clean(input.name);
  const errors: Errors<TrackInput> = {};
  if (!input.programId || !programs.some(item => item.id === input.programId && item.active)) errors.programId = 'Sélectionnez une filière active.';
  if (!code) errors.code = 'Le code est obligatoire.';
  if (!name) errors.name = 'Le nom est obligatoire.';
  if (tracks.some(item => item.id !== existing?.id && item.programId === input.programId && item.code.toUpperCase() === code)) errors.code = 'Ce code existe déjà dans cette filière.';
  if (Object.keys(errors).length) return { success: false, errors };
  const action = existing ? 'MODIFICATION' : 'CREATION';
  return { success: true, entity: { id: existing?.id ?? createMockId('TRK'), programId: input.programId, code, name, active: existing?.active ?? true, history: [...(existing?.history ?? []), history(actorRole, action, existing ? `Parcours ${code} modifié.` : `Parcours ${code} créé.`)] } };
}

export function toggleProgram(programs: Program[], tracks: Track[], id: string, actorRole: RoleName): { success: true; programs: Program[]; tracks: Track[] } | { success: false; error: string } {
  if (!hasPermission(actorRole, 'academic.structure.manage')) return { success: false, error: 'Votre rôle ne peut pas modifier le référentiel académique.' };
  const program = programs.find(item => item.id === id);
  if (!program) return { success: false, error: 'Cette filière est introuvable.' };
  const active = !program.active;
  return {
    success: true,
    programs: programs.map(item => item.id === id ? { ...item, active, history: [...item.history, history(actorRole, active ? 'ACTIVATION' : 'DESACTIVATION', `Filière ${item.code} ${active ? 'activée' : 'désactivée'}.`)] } : item),
    tracks: active ? tracks : tracks.map(item => item.programId === id && item.active ? { ...item, active: false, history: [...item.history, history(actorRole, 'DESACTIVATION', 'Désactivation automatique avec la filière.')] } : item),
  };
}

export function toggleTrack(tracks: Track[], id: string, actorRole: RoleName): { success: true; tracks: Track[] } | { success: false; error: string } {
  if (!hasPermission(actorRole, 'academic.structure.manage')) return { success: false, error: 'Votre rôle ne peut pas modifier le référentiel académique.' };
  const track = tracks.find(item => item.id === id);
  if (!track) return { success: false, error: 'Ce parcours est introuvable.' };
  const active = !track.active;
  return { success: true, tracks: tracks.map(item => item.id === id ? { ...item, active, history: [...item.history, history(actorRole, active ? 'ACTIVATION' : 'DESACTIVATION', `Parcours ${item.code} ${active ? 'activé' : 'désactivé'}.`)] } : item) };
}
