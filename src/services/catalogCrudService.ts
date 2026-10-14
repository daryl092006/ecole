import { z } from 'zod';
import { CRUD_CATALOG } from '@/data/crudCatalog';
import type { DatabaseRow, RelationalSnapshot, PersistentContext } from '@/types/persistence';
export function catalogSpec(key: string) { const spec = CRUD_CATALOG.find(item => item.key === key); if (!spec) throw new Error('Collection inconnue.'); return spec; }
export function parseCatalogRecord(key: string, input: unknown): Record<string, unknown> {
  const spec = catalogSpec(key); const fields: Record<string,z.ZodType> = {};
  for (const field of spec.fields) {
    if (field.type === 'reference') fields[field.key] = z.uuid();
    else if (field.type === 'select') fields[field.key] = z.enum(field.options!.map(option=>option.value));
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
    const row = snapshot.tables[field.reference!]?.find(row => row.id === values[field.key] && !row.archived_at && row.active !== false);
    if (!row) throw new Error(`${field.label} introuvable ou archivé.`);
  }
  if (key === 'rooms') {
    const building = snapshot.tables.buildings?.find(row => row.id === values.building_id);
    if (building?.site_id !== values.site_id) throw new Error('Le bâtiment doit appartenir au site choisi.');
  }
}
export function catalogLabel(table: string, row: DatabaseRow, snapshot: RelationalSnapshot): string {
  const spec = catalogSpec(table);
  const pieces = spec.fields.filter(field => field.key === 'name' || field.key === 'code').map(field => row[field.key]).filter(Boolean);
  if (table === 'buildings') pieces.push(snapshot.tables.sites?.find(site => site.id === row.site_id)?.name || 'Site non renseigné');
  return pieces.join(' · ');
}
