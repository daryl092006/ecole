import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const migrationDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
export const createDatabase = (options = {}) => new PGlite({ ...options, extensions: { btree_gist, pgcrypto } });
export async function applyMigrations(db) {
  for (const filename of (await readdir(migrationDir)).filter(name => name.endsWith('.sql')).sort()) {
    try { await db.exec(await readFile(`${migrationDir}/${filename}`, 'utf8')); }
    catch (error) { throw new Error(`Migration ${filename}: ${error.message}`, { cause: error }); }
  }
}
