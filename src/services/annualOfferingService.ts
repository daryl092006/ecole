import type { DatabaseRow, PersistentChange, RelationalSnapshot } from '@/types/persistence';

export interface AnnualOfferingVariant { curriculum_id: string; delivery_mode: string | null; }
export interface AnnualOfferingGroup { id: string; programId: string; name: string; rows: DatabaseRow[]; }
export const offeringVariantKey = (row: DatabaseRow | AnnualOfferingVariant) => JSON.stringify([row.curriculum_id, row.delivery_mode || null]);

export function groupAnnualOfferings(rows: DatabaseRow[], snapshot: RelationalSnapshot): AnnualOfferingGroup[] {
  const groups = new Map<string, AnnualOfferingGroup>();
  for (const row of rows) {
    const curriculum = snapshot.tables.curricula?.find(item => item.id === row.curriculum_id);
    const programId = String(curriculum?.program_id || row._programId || '');
    const program = snapshot.tables.programs?.find(item => item.id === programId);
    // Une absence de filière confirmée ne permet pas de fusionner deux formations.
    const id = programId || `unresolved:${row.id}`;
    const group = groups.get(id) || { id, programId, name: String(program?.name || (programId ? row._programName : '') || 'Filière à préciser'), rows: [] };
    group.rows.push(row);
    groups.set(id, group);
  }
  return [...groups.values()];
}

export function annualOfferingChanges(snapshot: RelationalSnapshot, yearId: string, programId: string, variants: AnnualOfferingVariant[], reason: string): PersistentChange[] {
  const year = snapshot.tables.academic_years?.find(row => row.id === yearId && !row.archived_at);
  if (!year || !['BROUILLON', 'OUVERTE'].includes(String(year.status))) throw new Error('Choisissez une année en préparation ou ouverte.');
  if (!snapshot.tables.programs?.some(row => row.id === programId && !row.archived_at && row.active !== false)) throw new Error('La filière sélectionnée est introuvable ou archivée.');
  const seen = new Set<string>();
  return variants.flatMap(variant => {
    if (![null, '', 'Présentiel', 'En ligne'].includes(variant.delivery_mode)) throw new Error('Mode de formation invalide.');
    const key = offeringVariantKey(variant);
    if (seen.has(key)) throw new Error('Un même niveau et mode de formation ne peut être choisi deux fois.');
    seen.add(key);
    const curriculum = snapshot.tables.curricula?.find(row => row.id === variant.curriculum_id && row.program_id === programId && !row.archived_at && row.status !== 'ARCHIVED');
    if (!curriculum || !snapshot.tables.levels?.some(row => row.id === curriculum.level_id && !row.archived_at && row.active !== false)) throw new Error('Choisissez uniquement des niveaux enregistrés pour cette filière.');
    if (snapshot.tables.academic_offerings?.some(row => row.academic_year_id === yearId && !row.archived_at && offeringVariantKey(row) === key)) return [];
    return [{ table: 'academic_offerings', operation: 'insert' as const, record: { id: crypto.randomUUID(), academic_year_id: yearId, curriculum_id: curriculum.id, level_id: curriculum.level_id, delivery_mode: variant.delivery_mode || null, reason } }];
  });
}
