export function createLocalEntity<T extends { id: string }>(items: T[], entity: T): T[] {
  if (items.some(item => item.id === entity.id)) throw new Error(`L'identifiant ${entity.id} existe déjà.`);
  return [...items, entity];
}

export function updateLocalEntity<T extends { id: string }>(items: T[], entity: T): T[] {
  if (!items.some(item => item.id === entity.id)) throw new Error(`L'entité ${entity.id} est introuvable.`);
  return items.map(item => item.id === entity.id ? entity : item);
}

export function toggleLocalEntity<T extends { id: string; active: boolean }>(items: T[], id: string): T[] {
  return items.map(item => item.id === id ? { ...item, active: !item.active } : item);
}
