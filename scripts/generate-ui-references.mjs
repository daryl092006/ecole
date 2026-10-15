import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

// Only actual SQL foreign keys establish equivalence between identifiers.
const references = {};
for (const file of readdirSync('supabase/migrations').sort()) {
  const sql = readFileSync(`supabase/migrations/${file}`, 'utf8');
  for (const match of sql.matchAll(/create table escen\.(\w+)\s*\(([\s\S]*?)\n\);/gi)) {
    const fields = {};
    for (const ref of match[2].matchAll(/^  ([a-z_]+)\s+uuid[^\n]*?references escen\.(\w+)\((\w+)\)/gm)) {
      fields[ref[1]] = { table: ref[2], key: ref[3] };
    }
    for (const ref of match[2].matchAll(/foreign key \(([^)]+)\)\s+references escen\.(\w+)\(([^)]+)\)/g)) {
      const keys = ref[1].split(',').map(key => key.trim());
      const targets = ref[3].split(',').map(key => key.trim());
      targets.forEach((key, index) => { fields[keys[index]] ??= { table: ref[2], key }; });
    }
    if (Object.keys(fields).length) references[match[1]] = fields;
  }
}
const flattened = {};
for (const [table, fields] of Object.entries(references)) {
  flattened[table] = {};
  for (const [key, target] of Object.entries(fields)) {
    let current = target;
    const seen = new Set();
    while (current.key !== 'id' && !seen.has(`${current.table}.${current.key}`)) {
      seen.add(`${current.table}.${current.key}`);
      const next = references[current.table]?.[current.key];
      if (!next) break;
      current = next;
    }
    if (current.key === 'id') flattened[table][key] = current.table;
  }
}
writeFileSync('src/data/relationalReferences.json', JSON.stringify(flattened, null, 2) + '\n');
console.log('Références d’affichage régénérées depuis les clés étrangères du schéma.');
