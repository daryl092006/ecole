import { connectedRecordName } from './connectedRecordDisplayService';
import { z } from 'zod';
import { CRUD_CATALOG } from '@/data/crudCatalog';
import type { DatabaseRow, RelationalSnapshot, PersistentContext, PersistentChange } from '@/types/persistence';
export function programLevelChanges(programId: string, levelIds: string[], snapshot: RelationalSnapshot, reason: string): PersistentChange[] {
  const current = (snapshot.tables.curricula || []).filter(row => row.program_id === programId && !row.archived_at && row.status !== 'ARCHIVED');
  const removed = current.filter(row => !levelIds.includes(String(row.level_id)));
  const archivedAt = new Date().toISOString();
  const removals: PersistentChange[] = removed.map(curriculum => {
    const level = snapshot.tables.levels?.find(row => row.id === curriculum.level_id);
    const label = String(level?.name || 'Ce niveau');
    if (curriculum.status !== 'DRAFT') throw new Error(`${label} : retrait impossible, le programme de cours est approuvé.`);
    const offering = snapshot.tables.academic_offerings?.find(row => row.curriculum_id === curriculum.id);
    if (offering) {
      const year = snapshot.tables.academic_years?.find(row => row.id === offering.academic_year_id);
      throw new Error(`${label} est déjà utilisé${year?.name ? ` en ${year.name}` : ' dans une formation annuelle'}. Pour le retirer uniquement de cette année, revenez aux formations de l’année.`);
    }
    if (Object.entries(snapshot.tables).some(([table, rows]) => table !== 'curricula' && rows.some(row => row.curriculum_id === curriculum.id && !row.archived_at))) {
      throw new Error(`${label} : retrait impossible, des cours ou des semestres sont encore rattachés à ce niveau.`);
    }
    return { table: 'curricula', operation: 'update', record: { id: curriculum.id, archived_at: archivedAt, reason } };
  });
  const additions: PersistentChange[] = levelIds.flatMap(levelId => {
    if (snapshot.tables.curricula?.some(row => row.program_id === programId && row.level_id === levelId && !row.archived_at && row.status !== 'ARCHIVED')) return [];
    const previous = (snapshot.tables.curricula || []).filter(row => row.program_id === programId && row.level_id === levelId && !row.track_id);
    return [{ table: 'curricula', operation: 'insert' as const, record: { id: crypto.randomUUID(), program_id: programId, level_id: levelId, version: Math.max(0, ...previous.map(row => Number(row.version) || 0)) + 1, reason } }];
  });
  return [...removals, ...additions];
}
export function catalogSpec(key: string) { const spec = CRUD_CATALOG.find(item => item.key === key); if (!spec) throw new Error('Collection inconnue.'); return spec; }
export function parseCatalogRecord(key: string, input: unknown): Record<string, unknown> {
  const spec = catalogSpec(key); const fields: Record<string,z.ZodType> = {};
  for (const field of spec.fields) {
    if (field.type === 'reference') fields[field.key] = field.required === false ? z.union([z.uuid(),z.literal(''),z.null()]).transform(value=>value || null) : z.uuid();
    else if (field.type === 'select') fields[field.key] = field.required === false ? z.union([z.enum(field.options!.map(option=>option.value)),z.literal(''),z.null()]).transform(value=>value || null) : z.enum(field.options!.map(option=>option.value));
    else if (field.type === 'email') fields[field.key] = z.union([z.email(),z.literal('')]);
    else if (field.type === 'number') {
      const numeric = z.number().min(field.min ?? 0).max(field.max ?? (field.key === 'position' ? 32767 : 2147483647));
      fields[field.key] = field.step === undefined ? numeric.int() : numeric.multipleOf(field.step);
    }
    else if (field.type === 'date') fields[field.key] = z.iso.date();
    else fields[field.key] = field.required ? z.string().trim().min(1).max(160) : z.string().trim().max(4000);
  }
  const values = z.object(fields).strict().parse(input) as Record<string,unknown>;
  if (key === 'academic_years' && String(values.ends_on) <= String(values.starts_on)) throw new Error('La fin de l’année doit être postérieure à son début.');
  return values;
}
export function canManageCatalog(context: PersistentContext, key: string): boolean {
  return context.permissions.includes(catalogSpec(key).write) && context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id);
}
export function programLevelIds(snapshot: Pick<RelationalSnapshot, 'tables'>, programId: string): string[] {
  return [...new Set((snapshot.tables.curricula || [])
    .filter(row => row.program_id === programId && !row.archived_at && row.active !== false && row.status !== 'ARCHIVED')
    .map(row => String(row.level_id || '')).filter(Boolean))];
}
export function annualFeeScheduleChanges(snapshot: RelationalSnapshot, input: Record<string, unknown>, reason: string, targetId?: string): PersistentChange[] {
  const { program_ids: rawIds, ...values } = input;
  if ('program_id' in values) throw new Error('Utilisez une seule sélection de filières.');
  const ids = z.array(z.uuid().nullable()).min(1).max(50).parse(rawIds);
  if (new Set(ids).size !== ids.length || (ids.includes(null) && ids.length > 1)) throw new Error('Choisissez toutes les filières ou une liste de filières distinctes.');
  const target = targetId ? snapshot.tables.annual_fee_schedules?.find(row => row.id === targetId && !row.archived_at) : undefined;
  if (targetId && !target) throw new Error('Le tarif à modifier est introuvable ou archivé.');
  return ids.map((programId, index) => {
    const record = parseCatalogRecord('annual_fee_schedules', { ...values, program_id: programId });
    validateCatalogReferences('annual_fee_schedules', record, snapshot);
    if (target && target.academic_year_id !== record.academic_year_id) throw new Error('Le tarif doit rester dans son année d’origine.');
    if (snapshot.tables.annual_fee_schedules?.some(row => row.id !== targetId && !row.archived_at && ['academic_year_id', 'category', 'program_id', 'level_id', 'delivery_mode'].every(key => (row[key] || null) === (record[key] || null)))) {
      throw new Error('Un tarif existe déjà pour une filière sélectionnée, ce niveau et ce mode. Modifiez le tarif existant. Aucun tarif enregistré.');
    }
    return { table: 'annual_fee_schedules', operation: index === 0 && targetId ? 'update' : 'insert', record: { ...record, id: index === 0 && targetId ? targetId : crypto.randomUUID(), reason } };
  });
}
export function validateCatalogReferences(key: string, values: Record<string,unknown>, snapshot: RelationalSnapshot) {
  for (const field of catalogSpec(key).fields.filter(field => field.reference)) {
    if (field.required === false && !values[field.key]) continue;
    const row = snapshot.tables[field.reference!]?.find(row => row.id === values[field.key] && !row.archived_at && row.active !== false);
    if (!row) throw new Error(`${field.label} introuvable ou archivé.`);
  }
  if (key === 'annual_fee_schedules' && values.program_id && values.level_id && !programLevelIds(snapshot, String(values.program_id)).includes(String(values.level_id))) {
    throw new Error('Cette filière ne propose pas le niveau sélectionné. Choisissez une filière de ce niveau.');
  }
  if (key === 'groups' && snapshot.tables.academic_years?.find(year => year.id === values.academic_year_id)?.status !== 'OUVERTE' && snapshot.tables.academic_years?.find(year => year.id === values.academic_year_id)?.status !== 'BROUILLON') throw new Error('Choisissez une année en préparation ou ouverte pour ce groupe.');

}
export function catalogLabel(table: string, row: DatabaseRow, snapshot: RelationalSnapshot): string {
  const spec = CRUD_CATALOG.find(item=>item.key===table);
  if (!spec) return String(row.name || row.code || row.id);
  const pieces = spec.fields.filter(field => field.key === 'name' || field.key === 'code').map(field => row[field.key]).filter(Boolean);
  return pieces.length ? pieces.join(' · ') : connectedRecordName(table,row,snapshot);
}
