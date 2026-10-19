import type { DatabaseRow, PersistentChange, RelationalSnapshot } from '@/types/persistence';

export interface AnnualOfferingVariant { curriculum_id: string; delivery_mode: string | null; }
export function archiveAnnualOfferings(snapshot: RelationalSnapshot, yearId: string, ids: string[], reason: string): PersistentChange[] {
  const year = snapshot.tables.academic_years?.find(row => row.id === yearId && !row.archived_at);
  if (!year || !['BROUILLON', 'OUVERTE'].includes(String(year.status))) throw new Error('Choisissez une année en préparation ou ouverte.');
  if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length) throw new Error('Sélection de formations invalide.');
  const archivedAt = new Date().toISOString();
  return ids.map(id => {
    const row = snapshot.tables.academic_offerings?.find(item => item.id === id && !item.archived_at);
    if (!row || row.academic_year_id !== yearId) throw new Error('Une formation est indisponible ou appartient à une autre année.');
    if (Object.entries(snapshot.tables).some(([table, records]) => table !== 'academic_offerings' && records.some(item => item.offering_id === id && !item.archived_at))) throw new Error('Cette filière comporte une formation rattachée à un groupe, une inscription ou une activité. Retirez ses rattachements avant de retirer la ligne.');
    return { table: 'academic_offerings', operation: 'update', record: { id, archived_at: archivedAt, reason } };
  });
}
export interface AnnualOfferingGroup { id: string; programId: string; name: string; rows: DatabaseRow[]; }
export const offeringVariantKey = (row: DatabaseRow | AnnualOfferingVariant) => JSON.stringify([row.curriculum_id, row.delivery_mode || null]);

// Dès qu'une filière a été enregistrée pour l'année, sa sélection persistée
// remplace les suggestions historiques, y compris les niveaux retirés.
export function annualOfferingProposals(snapshot: RelationalSnapshot, yearId: string, proposals: DatabaseRow[]): DatabaseRow[] {
  const programByCurriculum = new Map((snapshot.tables.curricula || []).map(row => [row.id, row.program_id]));
  const savedPrograms = new Set((snapshot.tables.academic_offerings || [])
    .filter(row => row.academic_year_id === yearId)
    .map(row => programByCurriculum.get(String(row.curriculum_id)))
    .filter(Boolean));
  return proposals.filter(row => !savedPrograms.has(programByCurriculum.get(String(row.curriculum_id))));
}

export function groupAnnualOfferings(rows: DatabaseRow[], snapshot: RelationalSnapshot): AnnualOfferingGroup[] {
  const groups = new Map<string, AnnualOfferingGroup>();
  for (const row of rows) {
    const curriculum = snapshot.tables.curricula?.find(item => item.id === row.curriculum_id);
    const program = snapshot.tables.programs?.find(item => item.id === curriculum?.program_id);
    const programId = program ? program.id : '';
    // Une absence de filière confirmée ne permet pas de fusionner deux formations.
    const id = programId || `unresolved:${row.id}`;
    const group = groups.get(id) || { id, programId, name: String(program?.name || (programId ? row._programName : '') || 'Filière à préciser'), rows: [] };
    group.rows.push(row);
    groups.set(id, group);
  }
  const levelName = (row: DatabaseRow) => String(snapshot.tables.levels?.find(level => level.id === row.level_id)?.name || row._levelName || '');
  const rank = (row: DatabaseRow) => {
    const name = levelName(row).toLocaleLowerCase('fr');
    return name.startsWith('licence') ? 1 : name.startsWith('master') ? 2 : name.startsWith('executive') ? 3 : name.startsWith('doctorat') ? 4 : 5;
  };
  for (const group of groups.values()) group.rows.sort((a, b) => rank(a) - rank(b) || levelName(a).localeCompare(levelName(b), 'fr', { numeric: true }));
  return [...groups.values()];
}

export function annualOfferingLabel(row: DatabaseRow, snapshot: RelationalSnapshot): string {
  const curriculum = snapshot.tables.curricula?.find(item => item.id === row.curriculum_id);
  const program = snapshot.tables.programs?.find(item => item.id === curriculum?.program_id);
  const level = snapshot.tables.levels?.find(item => item.id === row.level_id);
  return `${program?.name || 'Filière à préciser'} · ${level?.name || row._levelName || 'Niveau à préciser'} · ${row.delivery_mode || 'Mode à préciser'}`;
}

export function annualOfferingChanges(snapshot: RelationalSnapshot, yearId: string, programId: string, variants: AnnualOfferingVariant[], reason: string): PersistentChange[] {
  const year = snapshot.tables.academic_years?.find(row => row.id === yearId && !row.archived_at);
  if (!year || !['BROUILLON', 'OUVERTE'].includes(String(year.status))) throw new Error('Choisissez une année en préparation ou ouverte.');
  if (!snapshot.tables.programs?.some(row => row.id === programId && !row.archived_at && row.active !== false)) throw new Error('La filière sélectionnée est introuvable ou archivée.');
  const seen = new Set<string>();
  const requestedKeys = new Set<string>();
  const inserts: PersistentChange[] = [];

  for (const variant of variants) {
    if (![null, '', 'Présentiel', 'En ligne'].includes(variant.delivery_mode)) throw new Error('Mode de formation invalide.');
    const key = offeringVariantKey(variant);
    if (seen.has(key)) throw new Error('Un même niveau et mode de formation ne peut être choisi deux fois.');
    seen.add(key);
    requestedKeys.add(key);
    const curriculum = snapshot.tables.curricula?.find(row => row.id === variant.curriculum_id && row.program_id === programId && !row.archived_at && row.status !== 'ARCHIVED');
    if (!curriculum || !snapshot.tables.levels?.some(row => row.id === curriculum.level_id && !row.archived_at && row.active !== false)) throw new Error('Choisissez uniquement des niveaux enregistrés pour cette filière.');
    const matching = (snapshot.tables.academic_offerings || []).filter(row => row.academic_year_id === yearId && offeringVariantKey(row) === key);
    if (!matching.some(row => !row.archived_at)) {
      const archived = matching.find(row => row.archived_at && !row.site_id);
      // L'index unique couvre aussi les archives : réutiliser la ligne annuelle.
      inserts.push(archived
        ? { table: 'academic_offerings', operation: 'update', record: { id: archived.id, archived_at: null, reason } }
        : { table: 'academic_offerings', operation: 'insert', record: { id: crypto.randomUUID(), academic_year_id: yearId, curriculum_id: curriculum.id, level_id: curriculum.level_id, delivery_mode: variant.delivery_mode || null, reason } });
    }
  }

  const programCurriculaIds = new Set((snapshot.tables.curricula || []).filter(c => c.program_id === programId && !c.archived_at).map(c => c.id));
  const existingOfferings = (snapshot.tables.academic_offerings || []).filter(row => row.academic_year_id === yearId && !row.archived_at && programCurriculaIds.has(String(row.curriculum_id)));
  const toArchive = existingOfferings.filter(row => !requestedKeys.has(offeringVariantKey(row)));

  const archivedAt = new Date().toISOString();
  const updates: PersistentChange[] = toArchive.map(row => {
    if (Object.entries(snapshot.tables).some(([table, records]) => table !== 'academic_offerings' && records.some(item => item.offering_id === row.id && !item.archived_at))) {
      throw new Error('Une des formations décochées est déjà rattachée à un groupe ou une inscription.');
    }
    return { table: 'academic_offerings', operation: 'update' as const, record: { id: row.id, archived_at: archivedAt, reason } };
  });

  return [...inserts, ...updates];
}
