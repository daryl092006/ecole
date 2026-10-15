import { catalogSpec } from './catalogCrudService';
import type { CatalogSnapshot } from '@/types/persistence';

export interface CatalogTask { collection: string; depth: number; }
/** Missing references are entered before their dependants; optional references never block a task. */
export async function catalogTaskOrder(root: string, load: (collection: string) => Promise<CatalogSnapshot>): Promise<CatalogTask[]> {
  const pending = new Map<string, CatalogTask>();
  const visiting = new Set<string>();
  async function visit(collection: string): Promise<number> {
    if (pending.has(collection)) return pending.get(collection)!.depth;
    if (visiting.has(collection)) throw new Error('Une dépendance circulaire empêche la préparation.');
    visiting.add(collection);
    const snapshot = await load(collection);
    let depth = 0;
    for (const field of catalogSpec(collection).fields) {
      if (!field.reference || field.required === false) continue;
      if (snapshot.tables[field.reference]?.some(row => !row.archived_at && row.active !== false)) continue;
      depth = Math.max(depth, await visit(field.reference) + 1);
    }
    visiting.delete(collection);
    pending.set(collection, { collection, depth });
    return depth;
  }
  await visit(root);
  return [...pending.values()].sort((a, b) => a.depth - b.depth);
}
export function catalogTaskNeedsYear(collection: string, visited = new Set<string>()): boolean {
  if (visited.has(collection)) return false;
  visited.add(collection);
  return catalogSpec(collection).fields.some(field => field.key === 'academic_year_id' || (!!field.reference && field.required !== false && catalogTaskNeedsYear(field.reference, visited)));
}
