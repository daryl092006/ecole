import { expect, test } from '@playwright/test';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { auditAccountId, auditYearId, type JournalPage } from './audit-fixture';

test.describe('Lecture PostgreSQL du journal', () => {
  let db: PGlite;
  const secondYear = '10000000-0000-4000-8000-000000000002';
  const dg = '10000000-0000-4000-8000-000000000011';
  const scopedIt = '10000000-0000-4000-8000-000000000012';
  test.beforeAll(async () => {
    test.setTimeout(120000);
    db = new PGlite({ extensions: { btree_gist, pgcrypto } });
    await db.exec('create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role;');
    for (const filename of readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort()) {
      await db.exec(readFileSync(resolve('supabase/migrations', filename), 'utf8'));
    }
    for (const [id, code, scope] of [[auditAccountId, 'IT', null], [dg, 'DG', null], [scopedIt, 'IT', auditYearId]] as const) {
      await db.query('insert into auth.users values ($1)', [id]);
      await db.query("insert into escen.people(id,firstname,lastname) values ($1,'Jean','Technique')", [id]);
      await db.query('insert into escen.accounts(id,person_id,auth_user_id,active) values ($1,$1,$1,true)', [id]);
      if (scope) await db.query("insert into escen.academic_years(id,code,name,starts_on,ends_on) values ($1,'2026','2026-2027','2026-10-01','2027-07-01')", [auditYearId]);
      await db.query("insert into escen.role_grants(account_id,role_id,academic_year_id,valid_from,reason,granted_by) select $1,id,$3,now()-interval '1 day','Attribution de test',$1 from escen.roles where code=$2", [id, code, scope]);
    }
    await db.query("insert into escen_private.audit_events(table_schema,table_name,entity_id,action,actor_id,role_codes,old_value,new_value,reason,happened_at,database_actor) values ('escen','journal_fixture',$1,'UPDATE',$2,array['IT'],$3,$4,'Versement contrôlé','2026-10-16 12:00:00Z','postgres')", [
      '10000000-0000-4000-8000-000000000020', auditAccountId,
      JSON.stringify({ amount: 100, academic_year_id: secondYear, password: 'SECRET_OLD', configuration: { token: 'SECRET_NESTED' } }),
      JSON.stringify({ amount: 150, status: 'POSTED', academic_year_id: auditYearId, auth_user_id: 'SECRET_AUTH', token: 'SECRET_TOKEN', metadata: { password: 'SECRET_META' } }),
    ]);
    await db.query("insert into escen_private.audit_events(table_schema,table_name,entity_id,action,actor_id,new_value,happened_at,database_actor) select 'escen','pagination',gen_random_uuid(),'INSERT',$1,jsonb_build_object('amount',i),'2026-10-17 12:00:00Z','postgres' from generate_series(1,51) i", [auditAccountId]);
    await db.query("insert into escen_private.audit_events(table_schema,table_name,entity_id,action,new_value,happened_at,database_actor) values ('escen','grades',gen_random_uuid(),'INSERT','{\"candidate_id\":\"candidate-year1\",\"value\":15}','2026-10-17 12:00:00Z','postgres')");
    await db.exec("insert into escen_private.import_batches(id,source_name,archive_sha256,sql_sha256,source_rows) values ('10000000-0000-4000-8000-000000000030','journal-test',repeat('a',64),repeat('b',64),1); insert into escen_private.legacy_rows(batch_id,source_table,source_id,payload) values ('10000000-0000-4000-8000-000000000030','activity_log','77','{\"created_at\":\"2025-06-12 08:00:00\",\"causer_id\":42,\"subject_type\":\"Etudiant\",\"subject_id\":123,\"event\":\"updated\",\"password\":\"SECRET_ARCHIVE\",\"description\":\"SECRET_FREE_TEXT\"}');");
  });
  test.afterAll(async () => { await db?.close(); });

  async function read(options: { actor?: string; role?: string; source?: string; offset?: number; query?: string; author?: string; table?: string; action?: string; start?: string; end?: string; year?: string; scope?: Record<string, unknown> } = {}) {
    const result = await db.query<{ value: JournalPage }>('select public.escen_audit_journal_page($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) as value', [
      options.actor || auditAccountId, options.role || 'IT', options.source || 'current', options.offset || 0,
      options.query || '', options.author || '', options.table || '', options.action || '', options.start || null, options.end || null, options.year || null, JSON.stringify(options.scope || {}),
    ]);
    return result.rows[0].value;
  }

  test('Valeurs sensibles exclues, originaux conservés et filtres sur les champs affichés', async () => {
    const result = await read({ table: 'journal_fixture', author: 'Jean', action: 'UPDATE', start: '2026-10-16', end: '2026-10-16' });
    expect(result.total).toBe(1);
    expect(result.records[0].oldValue).toEqual({ amount: 100, academic_year_id: secondYear });
    expect(result.records[0].newValue).toEqual({ amount: 150, status: 'POSTED', academic_year_id: auditYearId });
    expect(JSON.stringify(result)).not.toContain('SECRET');
    expect((await read({ query: 'SECRET' })).total).toBe(0);
    expect((await read({ table: 'journal_fixture', start: '2026-10-17' })).total).toBe(0);
    const original = await db.query<{ password: string }>("select old_value->>'password' as password from escen_private.audit_events where table_name='journal_fixture'");
    expect(original.rows[0].password).toBe('SECRET_OLD');
  });

  test('DG global autorisé ; rôle usurpé, attribution restreinte et compte inconnu refusés', async () => {
    expect((await read({ actor: dg, role: 'DG', table: 'journal_fixture' })).total).toBe(1);
    for (const options of [{ actor: dg, role: 'IT' }, { actor: scopedIt }, { actor: '10000000-0000-4000-8000-000000000099' }]) await expect(read(options)).rejects.toThrow(/réservée/);
  });

  test('Pagination stable de 50 lignes, sans doublon, et filtre littéral', async () => {
    const first = await read({ table: 'pagination' });
    const second = await read({ table: 'pagination', offset: 50 });
    expect(first.total).toBe(51); expect(first.records).toHaveLength(50); expect(second.records).toHaveLength(1);
    expect(new Set([...first.records, ...second.records].map(row => row.id)).size).toBe(51);
    expect((await read({ query: '%' })).total).toBe(0);
  });

  test('Année issue des valeurs avant/après ou des références ; aucun rattachement par date', async () => {
    expect((await read({ table: 'journal_fixture', year: auditYearId })).total).toBe(1);
    expect((await read({ table: 'journal_fixture', year: secondYear })).total).toBe(1);
    expect((await read({ table: 'pagination', year: auditYearId })).total).toBe(0);
    expect((await read({ table: 'grades', year: auditYearId })).total).toBe(0);
    expect((await read({ table: 'grades', year: auditYearId, scope: { references: { grades: { candidate_id: 'evaluation_candidates' } }, ids: { evaluation_candidates: ['candidate-year1'] } } })).total).toBe(1);
  });

  test('Archives séparées, auteur source conservé et absence de valeurs inventées', async () => {
    const result = await read({ source: 'history', author: '42', action: 'updated', start: '2025-06-12', end: '2025-06-12' });
    expect(result.total).toBe(1);
    expect(result.records[0]).toMatchObject({ actorId: '42', actorName: null, sourceId: '77', oldValue: null, newValue: null, reason: null });
    expect(JSON.stringify(result)).not.toContain('SECRET');
    expect((await read({ source: 'history', year: auditYearId })).total).toBe(0);
  });

  test('RPC inaccessible au navigateur et aucune ouverture des tables privées', async () => {
    const signature = 'public.escen_audit_journal_page(uuid,text,text,integer,text,text,text,text,date,date,uuid,jsonb)';
    for (const role of ['anon', 'authenticated']) {
      const privilege = await db.query<{ allowed: boolean }>('select has_function_privilege($1,$2,\'EXECUTE\') as allowed', [role, signature]);
      expect(privilege.rows[0].allowed).toBe(false);
      await db.exec(`set role ${role}`);
      try {
        await expect(read()).rejects.toThrow(/permission/);
        await expect(db.query('select * from escen_private.audit_events')).rejects.toThrow(/permission/);
      } finally { await db.exec('reset role'); }
    }
    const service = await db.query<{ allowed: boolean }>('select has_function_privilege(\'service_role\',$1,\'EXECUTE\') as allowed', [signature]);
    expect(service.rows[0].allowed).toBe(true);
  });
});
