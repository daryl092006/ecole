import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createDatabase, applyMigrations } from './database-engine.mjs';

export async function verifyPublicArticleVisibility(check) {
  await check('Articles publics : correctif sur la chaîne SQL de production, toutes années, confidentialité et droits préservés', async () => {
    const db = createDatabase();
    const value = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
    const publicData = action => value('select public.escen_website_public($1) as value', [action]);
    const state = async () => ({
      articles: (await db.query('select * from escen.website_articles order by id')).rows,
      audits: await value('select count(*)::int as value from escen_private.audit_events'),
      revision: await value('select revision as value from escen_private.portal_revision where singleton'),
      year: await publicData('year'),
      intakes: await publicData('intakes'),
      functions: (await db.query("select n.nspname,p.proname,p.prosrc,p.proacl,p.proowner,p.prosecdef,p.proconfig,p.proargnames from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','escen','escen_private') and p.prokind='f' order by p.oid")).rows,
    });
    try {
      await db.exec('create role anon; create role authenticated; create role service_role;');
      // Production has not applied 073. Reproduce the actual layered RPC instead of relying on its local replacement.
      await applyMigrations(db, { before: '202611010073_website_articles_timeless.sql' });
      const person = await value("insert into escen.people(firstname,lastname) values('Auteur','Publication') returning id as value");
      const account = await value('insert into escen.accounts(person_id) values($1) returning id as value', [person]);
      const oldYear = await value("insert into escen.academic_years(code,name,starts_on,ends_on,status) values('2025-2026','2025-2026','2025-09-01','2026-08-31','CLOTUREE') returning id as value");
      const currentYear = await value("insert into escen.academic_years(code,name,starts_on,ends_on,status) values('2026-2027','2026-2027','2026-09-01','2027-08-31','OUVERTE') returning id as value");
      await db.exec("begin; select set_config('escen.year_lifecycle','yes',true);");
      await db.query("update escen.academic_working_year set academic_year_id=$1,reason='Année de recette explicitement sélectionnée' where singleton", [currentYear]);
      await db.exec('commit;');
      const insertArticle = (slug, year, status) => value("insert into escen.website_articles(title,slug,excerpt,content,academic_year_id,status,published_at,created_by,reason) values('Article de recette',$1,'Résumé','Contenu',$2,$3,case when $3='PUBLIE' then now() end,$4,'Recette de publication') returning id as value", [slug, year, status, account]);
      const oldPublished = await insertArticle('publie-ancien', oldYear, 'PUBLIE');
      const draft = await insertArticle('brouillon-actuel', currentYear, 'BROUILLON');
      const retired = await insertArticle('retire-ancien', oldYear, 'RETIRE');
      assert.deepEqual(await publicData('articles'), []);
      const before = await state();
      const sql = await readFile(new URL('../supabase/migrations/202611070093_public_articles_all_years.sql', import.meta.url), 'utf8');
      await db.exec(sql);
      const published = await publicData('articles');
      assert.deepEqual(published.map(article => article.id), [oldPublished]);
      assert.equal(published.some(article => [draft, retired].includes(article.id)), false);
      assert.equal(Object.hasOwn(published[0], 'reason'), false);
      assert.equal(Object.hasOwn(published[0], 'created_by'), false);
      const after = await state();
      const targetIndex = before.functions.findIndex(fn => fn.proname === 'escen_website_public_before_offerings');
      assert.notEqual(before.functions[targetIndex].prosrc, after.functions[targetIndex].prosrc);
      after.functions[targetIndex].prosrc = before.functions[targetIndex].prosrc;
      assert.deepEqual(after, before);
      for (const role of ['anon', 'authenticated', 'service_role']) {
        assert.equal(await value("select has_function_privilege($1,'public.escen_website_public_before_offerings(text,text,jsonb)','EXECUTE') as value", [role]), false);
        assert.equal(await value("select has_function_privilege($1,'public.escen_website_public(text,text,jsonb)','EXECUTE') as value", [role]), role === 'service_role');
      }
      await assert.rejects(publicData('draft'), /Jeton/i);
      await db.exec(sql);
      assert.deepEqual((await publicData('articles')).map(article => article.id), [oldPublished]);
      const currentPublished = await insertArticle('publie-actuel', currentYear, 'PUBLIE');
      assert.deepEqual(new Set((await publicData('articles')).map(article => article.id)), new Set([oldPublished, currentPublished]));
    } finally { await db.close(); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyPublicArticleVisibility(async (name, run) => { await run(); console.log(`✓ ${name}`); });
}
