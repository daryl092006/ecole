import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const migrationDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
export const createDatabase = (options = {}) => new PGlite({ ...options, extensions: { btree_gist, pgcrypto } });
export async function applyMigrations(db, { before, uncachedFixtureSnapshots = false } = {}) {
  for (const filename of (await readdir(migrationDir)).filter(name => name.endsWith('.sql') && (!before || name < before)).sort()) {
    try { await db.exec(await readFile(`${migrationDir}/${filename}`, 'utf8')); }
    catch (error) { throw new Error(`Migration ${filename}: ${error.message}`, { cause: error }); }
  }
  if (uncachedFixtureSnapshots) await enableUncachedFixtureSnapshots(db);
}

/** Direct SQL fixtures do not advance portal_revision; keep their reads live.
 * Cache behavior is exercised separately with the actual migration unchanged. */
async function enableUncachedFixtureSnapshots(db) {
  await db.exec(`do $fixture$ begin
    if to_regprocedure('public.escen_backend_snapshot_before_shared_cache()') is not null then
      execute $definition$create or replace function public.escen_backend_snapshot() returns jsonb
        language sql security definer set search_path=pg_catalog as $body$
          select public.escen_backend_snapshot_before_shared_cache();
        $body$$definition$;
    end if;
  end $fixture$;`);
}
