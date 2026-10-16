import { connectedRecordName } from './connectedRecordDisplayService';
import { z } from 'zod';
import { CRUD_CATALOG } from '@/data/crudCatalog';
import type { DatabaseRow, RelationalSnapshot, PersistentContext, PersistentChange } from '@/types/persistence';
export function programLevelChanges(programId: string, levelIds: string[], snapshot: RelationalSnapshot, reason: string): PersistentChange[] {
  return levelIds.flatMap(levelId => {
    if (snapshot.tables.curricula?.some(row => row.program_id === programId && row.level_id === levelId && !row.archived_at && row.status !== 'ARCHIVED')) return [];
    const previous = (snapshot.tables.curricula || []).filter(row => row.program_id === programId && row.level_id === levelId && !row.track_id);
    return [{ table: 'curricula', operation: 'insert' as const, record: { id: crypto.randomUUID(), program_id: programId, level_id: levelId, version: Math.max(0, ...previous.map(row => Number(row.version) || 0)) + 1, reason } }];
  });
}
export function catalogSpec(key: string) { const spec = CRUD_CATALOG.find(item => item.key === key); if (!spec) throw new Error('Collection inconnue.'); return spec; }
export function parseCatalogRecord(key: string, input: unknown): Record<string, unknown> {
  const spec = catalogSpec(key); const fields: Record<string,z.ZodType> = {};
  for (const field of spec.fields) {
    if (field.type === 'reference') fields[field.key] = field.required === false ? z.union([z.uuid(),z.literal(''),z.null()]).transform(value=>value || null) : z.uuid();
    else if (field.type === 'select') fields[field.key] = field.required === false ? z.union([z.enum(field.options!.map(option=>option.value)),z.literal(''),z.null()]).transform(value=>value || null) : z.enum(field.options!.map(option=>option.value));
    else if (field.type === 'email') fields[field.key] = z.union([z.email(),z.literal('')]);
    else if (field.type === 'number') fields[field.key] = z.number().int().min(field.min || 0).max(field.key==='position'?32767:2147483647);
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
export function validateCatalogReferences(key: string, values: Record<string,unknown>, snapshot: RelationalSnapshot) {
  for (const field of catalogSpec(key).fields.filter(field => field.reference)) {
    if (field.required === false && !values[field.key]) continue;
    const row = snapshot.tables[field.reference!]?.find(row => row.id === values[field.key] && !row.archived_at && row.active !== false);
    if (!row) throw new Error(`${field.label} introuvable ou archivé.`);
  }
  if (key === 'groups' && snapshot.tables.academic_years?.find(year => year.id === values.academic_year_id)?.status !== 'OUVERTE' && snapshot.tables.academic_years?.find(year => year.id === values.academic_year_id)?.status !== 'BROUILLON') throw new Error('Choisissez une année en préparation ou ouverte pour ce groupe.');

}
export function catalogLabel(table: string, row: DatabaseRow, snapshot: RelationalSnapshot): string {
  const spec = CRUD_CATALOG.find(item=>item.key===table);
  if (!spec) return String(row.name || row.code || row.id);
  const pieces = spec.fields.filter(field => field.key === 'name' || field.key === 'code').map(field => row[field.key]).filter(Boolean);
  return pieces.length ? pieces.join(' · ') : connectedRecordName(table,row,snapshot);
}
