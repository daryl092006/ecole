import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';

// Run writeCatalog against real local PostgreSQL RPCs with fixture authentication.
// No Supabase connection is created by this isolated TypeScript loader.
function loadCatalogWriter(client, context) {
  const overrides = new Map([
    ['server-only', {}],
    ['@/lib/supabase/server', { getSupabaseServerClient() { throw new Error('Connexion distante interdite dans ces tests.'); } }],
  ]);
  const cache = new Map();
  const root = new URL('../src/', import.meta.url);
  function load(url) {
    const filename = fileURLToPath(url);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} };
    cache.set(filename, loaded);
    const localRequire = createRequire(url);
    const requireModule = name => {
      if (overrides.has(name)) return overrides.get(name);
      if (name.startsWith('@/') || name.startsWith('.')) {
        const target = new URL(name.startsWith('@/') ? name.slice(2) : name, name.startsWith('@/') ? root : url);
        if (target.pathname.endsWith('.json')) return localRequire(fileURLToPath(target));
        return load(new URL(target.href.endsWith('.ts') ? target.href : `${target.href}.ts`));
      }
      return localRequire(name);
    };
    const compiled = ts.transpileModule(readFileSync(url, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(requireModule, loaded, loaded.exports);
    return loaded.exports;
  }
  const auth = load(new URL('server/auth.ts', root));
  overrides.set('@/server/auth', { ...auth, requireAccount: async () => ({ client, context }) });
  return load(new URL('server/catalogCrud.ts', root)).writeCatalog;
}

export async function verifyCurriculumCatalog(db, check) {
  const value = async (sql, params = []) => (await db.query(sql, params)).rows[0].value;
  const insert = async (table, record) => {
    assert.match(table, /^[a-z_]+$/);
    const keys = Object.keys(record);
    keys.forEach(key => assert.match(key, /^[a-z_]+$/));
    return (await db.query(`insert into escen.${table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`, Object.values(record))).rows[0];
  };
  const token = randomUUID();
  await db.query('insert into auth.users(id) values ($1)', [token]);
  const person = await insert('people', { firstname: 'Catalogue', lastname: 'Recette' });
  const actor = await insert('accounts', { person_id: person.id, auth_user_id: token, active: true });
  const role = await value("select id as value from escen.roles where code='IT'");
  await insert('role_grants', { account_id: actor.id, role_id: role, granted_by: actor.id, valid_from: new Date().toISOString(), reason: 'Recette locale du catalogue' });
  const context = {
    accountId: actor.id, personId: person.id, authUserId: token, roleCode: 'IT', role: 'Informaticien',
    permissions: ['academic.view', 'academic.structure.manage'], studentId: null, teacherId: null,
    grants: [{ site_id: null, group_id: null, academic_year_id: null }],
  };
  const client = {
    async rpc(name, args) {
      try {
        const data = name === 'escen_backend_snapshot'
          ? await value('select public.escen_backend_snapshot() as value')
          : name === 'escen_academic_year_context'
            ? await value('select public.escen_academic_year_context() as value')
          : name === 'escen_backend_transaction'
            ? await value('select public.escen_backend_transaction($1,$2,$3::jsonb) as value', [args.p_actor_id, args.p_expected_revision, JSON.stringify(args.p_changes)])
            : assert.fail(`RPC inattendue : ${name}`);
        return { data, error: null };
      } catch (error) { return { data: null, error: { code: error.code, message: error.message } }; }
    },
  };
  const writeCatalog = loadCatalogWriter(client, context);
  const revision = () => value('select revision as value from escen_private.portal_revision where singleton');
  const save = async (collection, values, { id, archive = false, reason = 'Modification de recette locale' } = {}) => {
    const body = { revision: await revision(), reason, ...(values ? { values } : {}) };
    const response = await writeCatalog(new Request(`http://local.test/api/catalog/${collection}${id ? `/${id}` : ''}`, {
      method: archive ? 'DELETE' : id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }), collection, id);
    assert.equal(response.status, id ? 200 : 201);
    return response.json();
  };
  const row = async (table, id) => (await db.query(`select * from escen.${table} where id=$1`, [id])).rows[0];
  const audit = async (table, id) => (await db.query('select * from escen_private.audit_events where table_name=$1 and entity_id=$2 order by happened_at', [table, id])).rows;
  const assertRejection = async (collection, id, pattern) => {
    const before = await revision();
    const count = (await audit(collection, id)).length;
    await assert.rejects(save(collection, null, { id, archive: true }), error => error.status === 409 && pattern.test(error.message));
    assert.equal(await revision(), before);
    assert.equal((await row(collection, id)).archived_at, null);
    assert.equal((await audit(collection, id)).length, count);
  };

  const suffix = randomUUID().slice(0, 8);
  const cycle = await insert('cycles', { code: `CAT-${suffix}`, name: 'Cycle de recette' });
  const level = await insert('levels', { cycle_id: cycle.id, code: `CAT-${suffix}`, name: 'Niveau de recette', position: 1 });
  const program = await insert('programs', { code: `CAT-${suffix}`, name: 'Filière de recette' });
  const subject = await insert('subjects', { code: `CAT-${suffix}`, name: 'Matière de recette' });
  let version = 0;
  const draft = () => insert('curricula', { program_id: program.id, level_id: level.id, version: ++version });
  const curriculum = await draft();
  await check('Filières : décocher un niveau archive toutes ses versions inutilisées, puis recocher crée une nouvelle version', async () => {
    const entity = await insert('programs', { code: `LVL-${suffix}`, name: 'Filière des niveaux' });
    const extraLevel = await insert('levels', { cycle_id: cycle.id, code: `L2-${suffix}`, name: 'Niveau à retirer', position: 2 });
    const values = { code: entity.code, name: entity.name, description: '' };
    // Anciennes versions réellement inutilisées : l'API crée désormais deux
    // semestres pour toute nouvelle association filière/niveau.
    await insert('curricula', { program_id: entity.id, level_id: level.id, version: 1 });
    await insert('curricula', { program_id: entity.id, level_id: extraLevel.id, version: 1 });
    const candidates = (await db.query('select * from escen.curricula where program_id=$1 and level_id=$2', [entity.id, extraLevel.id])).rows;
    const second = await insert('curricula', { program_id: entity.id, level_id: extraLevel.id, version: 2 });
    const before = await revision();
    await save('programs', { ...values, level_ids: [level.id] }, { id: entity.id, reason: 'Niveau décoché' });
    assert.equal(await revision(), before + 1);
    for (const removed of [...candidates, second]) {
      assert.ok((await row('curricula', removed.id)).archived_at);
      const events = await audit('curricula', removed.id);
      assert.equal(events.at(-1).actor_id, actor.id);
      assert.equal(events.at(-1).reason, 'Niveau décoché');
      assert.equal(events.at(-1).old_value.archived_at, null);
      assert.ok(events.at(-1).new_value.archived_at);
    }
    assert.equal((await row('levels', extraLevel.id)).archived_at, null);
    const active = () => db.query('select * from escen.curricula where program_id=$1 and archived_at is null', [entity.id]);
    assert.equal((await active()).rows.length, 1);
    await save('programs', { ...values, name: 'Nom seul modifié' }, { id: entity.id });
    assert.equal((await active()).rows.length, 1);
    await save('programs', { ...values, level_ids: [] }, { id: entity.id });
    assert.equal((await active()).rows.length, 0);
    await save('programs', { ...values, level_ids: [level.id, extraLevel.id] }, { id: entity.id });
    assert.equal((await active()).rows.find(item => item.level_id === extraLevel.id).version, 3);
    const withSemesters = (await active()).rows;
    for (const item of withSemesters) {
      assert.equal(await value('select count(*)::int as value from escen.curriculum_semesters where curriculum_id=$1 and archived_at is null', [item.id]), 2);
    }
    const beforeRefusal = await revision();
    await assert.rejects(save('programs', { ...values, level_ids: [] }, { id: entity.id }), error => error.status === 409 && /cours ou des semestres/.test(error.message));
    assert.equal(await revision(), beforeRefusal);
    assert.equal((await active()).rows.length, 2);
  });
  await check('Filières : niveau utilisé refusé avant toute modification du nom, des autres niveaux ou de l’audit', async () => {
    const entity = await insert('programs', { code: `USED-${suffix}`, name: 'Filière utilisée' });
    const used = await insert('curricula', { program_id: entity.id, level_id: level.id, version: 1 });
    const unused = await insert('curricula', { program_id: entity.id, level_id: level.id, version: 2 });
    const year = await insert('academic_years', { code: `USED-${suffix}`, name: '2037-2038', starts_on: '2037-09-01', ends_on: '2038-07-01', status: 'BROUILLON' });
    const offering = await insert('academic_offerings', { curriculum_id: used.id, level_id: level.id, academic_year_id: year.id });
    const before = await revision();
    const auditCount = await value('select count(*)::int as value from escen_private.audit_events');
    await assert.rejects(save('programs', { code: entity.code, name: 'Ne doit pas changer', description: '', level_ids: [] }, { id: entity.id }), error => error.status === 409 && /2037-2038/.test(error.message));
    assert.equal(await revision(), before);
    assert.equal(await value('select count(*)::int as value from escen_private.audit_events'), auditCount);
    assert.equal((await row('programs', entity.id)).name, entity.name);
    for (const item of [used, unused]) assert.equal((await row('curricula', item.id)).archived_at, null);
    assert.equal((await row('academic_offerings', offering.id)).archived_at, null);
  });
  await check('Formations annuelles : création, modification, réactivation et année isolée via API et RPC', async () => {
    const year = await insert('academic_years', { code: `OFF-${suffix}`, name: 'Année des formations', starts_on: '2039-09-01', ends_on: '2040-07-01', status: 'BROUILLON' });
    const otherYear = await insert('academic_years', { code: `OFF2-${suffix}`, name: 'Autre année des formations', starts_on: '2040-09-01', ends_on: '2041-07-01', status: 'BROUILLON' });
    const updateOfferings = async (modes, yearId = year.id) => writeCatalog(new Request('http://local.test/api/catalog/academic_offerings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-escen-year': yearId },
      body: JSON.stringify({ revision: await revision(), reason: 'Modification des niveaux annuels', values: {
        academic_year_id: year.id, program_id: program.id, variants: modes.map(delivery_mode => ({ curriculum_id: curriculum.id, delivery_mode })),
      } }),
    }), 'academic_offerings');
    assert.equal((await updateOfferings(['Présentiel', 'En ligne'])).status, 201);
    const offerings = () => db.query('select * from escen.academic_offerings where academic_year_id=$1 order by delivery_mode', [year.id]);
    const initial = (await offerings()).rows;
    assert.equal(initial.length, 2);
    const online = initial.find(item => item.delivery_mode === 'En ligne');
    assert.equal((await updateOfferings(['Présentiel'])).status, 201);
    assert.ok((await row('academic_offerings', online.id)).archived_at);
    assert.equal((await updateOfferings(['Présentiel', 'En ligne'])).status, 201);
    assert.equal((await row('academic_offerings', online.id)).archived_at, null);
    assert.equal((await offerings()).rows.length, 2);
    const events = await audit('academic_offerings', online.id);
    assert.equal(events.length, 3);
    assert.equal(events[2].actor_id, actor.id);
    assert.ok(events[2].old_value.archived_at);
    assert.equal(events[2].new_value.archived_at, null);
    const before = await revision();
    assert.equal((await updateOfferings(['Présentiel', 'En ligne'])).status, 200);
    assert.equal(await revision(), before);
    await assert.rejects(updateOfferings(['Présentiel'], otherYear.id), /année précise/);
    assert.equal(await revision(), before);
    assert.equal((await offerings()).rows.filter(item => !item.archived_at).length, 2);
    assert.equal(await value('select count(*)::int as value from escen.academic_offerings where academic_year_id=$1', [otherYear.id]), 0);
  });
  let semester; let unit; let component;
  await check('Catalogue / curriculum_semesters : création persistée avec crédits décimaux', async () => {
    const saved = await save('curriculum_semesters', { curriculum_id: curriculum.id, position: 1, name: 'Semestre de recette', target_credits: 3.5 }, { reason: 'Création du semestre' });
    semester = await row('curriculum_semesters', saved.id);
    assert.equal(Number(semester.target_credits), 3.5);
    assert.equal(semester.reason, 'Création du semestre');
  });
  await check('Catalogue / teaching_units : création persistée avec crédits décimaux', async () => {
    const saved = await save('teaching_units', { curriculum_id: curriculum.id, semester_id: semester.id, code: 'UE1', name: 'Unité de recette', credits: 3.5 }, { reason: 'Création de l’unité' });
    unit = await row('teaching_units', saved.id);
    assert.equal(Number(unit.credits), 3.5);
    assert.equal(unit.reason, 'Création de l’unité');
  });
  await check('Catalogue / curriculum_components : création persistée avec coefficient décimal', async () => {
    const saved = await save('curriculum_components', { curriculum_id: curriculum.id, unit_id: unit.id, subject_id: subject.id, code: 'EC1', credits: 3.5, coefficient: 0.5 }, { reason: 'Création de la matière' });
    component = await row('curriculum_components', saved.id);
    assert.equal(Number(component.coefficient), 0.5);
    assert.equal(Number(component.credits), 3.5);
    assert.equal(component.reason, 'Création de la matière');
  });
  const changes = [
    ['curriculum_semesters', () => semester, { curriculum_id: curriculum.id, position: 1, name: 'Semestre modifié', target_credits: 3.75 }],
    ['teaching_units', () => unit, { curriculum_id: curriculum.id, semester_id: semester.id, code: 'UE1', name: 'Unité modifiée', credits: 3.75 }],
    ['curriculum_components', () => component, { curriculum_id: curriculum.id, unit_id: unit.id, subject_id: subject.id, code: 'EC1', credits: 3.75, coefficient: 0.625 }],
  ];
  for (const [table, entity, values] of changes) {
    await check(`Catalogue / ${table} : modification décimale, auteur et avant/après conservés`, async () => {
      await save(table, values, { id: entity().id, reason: 'Révision des crédits' });
      const saved = await row(table, entity().id);
      const credits = table === 'curriculum_semesters' ? 'target_credits' : 'credits';
      assert.equal(Number(saved[credits]), 3.75);
      if (table === 'curriculum_components') assert.equal(Number(saved.coefficient), 0.625);
      const events = await audit(table, saved.id);
      assert.equal(events.length, 2);
      assert.equal(events[0].action, 'INSERT');
      assert.equal(events[1].action, 'UPDATE');
      assert.equal(Number(events[1].old_value[credits]), 3.5);
      assert.equal(Number(events[1].new_value[credits]), 3.75);
      assert.equal(events[1].reason, 'Révision des crédits');
      assert.equal(events[1].actor_id, actor.id);
      assert.ok(events[1].role_codes.includes('IT'));
    });
  }
  await check('Catalogue : semestre avec UE actives refusé sans mutation, message API clair', () => assertRejection('curriculum_semesters', semester.id, /semestre interdit.*unités.*actives/i));
  await check('Catalogue : UE avec matières actives refusée sans mutation, message API clair', () => assertRejection('teaching_units', unit.id, /unité.*interdit.*matières actives/i));
  for (const [table, entity] of [...changes].reverse()) {
    await check(`Catalogue / ${table} : archivage logique motivé et audité, ligne conservée`, async () => {
      await save(table, null, { id: entity().id, archive: true, reason: 'Retrait explicite de recette' });
      const saved = await row(table, entity().id);
      assert.ok(saved.archived_at);
      assert.equal(saved.reason, 'Retrait explicite de recette');
      const events = await audit(table, saved.id);
      assert.equal(events.length, 3);
      assert.equal(events[2].old_value.archived_at, null);
      assert.ok(events[2].new_value.archived_at);
      assert.equal(events[2].actor_id, actor.id);
      assert.equal(events[2].reason, saved.reason);
      await assert.rejects(db.query(`delete from escen.${table} where id=$1`, [saved.id]), /Suppression interdite/i);
    });
  }
  await check('Catalogue : motif obligatoire et aucun enfant actif sous un parent archivé', async () => {
    const other = await draft();
    const empty = await insert('curriculum_semesters', { curriculum_id: other.id, position: 1, name: 'Vide', target_credits: 1 });
    await assert.rejects(db.query('update escen.curriculum_semesters set archived_at=now(),reason=$1 where id=$2', [' ', empty.id]), /semester_archive_reason/);
    await assert.rejects(save('teaching_units', { curriculum_id: curriculum.id, semester_id: semester.id, code: 'REFUSE', name: 'Refusée', credits: 1 }), /introuvable ou archivé/i);
    await assert.rejects(insert('teaching_units', { curriculum_id: curriculum.id, semester_id: semester.id, code: 'REFUSE', name: 'Refusée', credits: 1 }), /semestre archivé/i);
    await assert.rejects(insert('curriculum_components', { curriculum_id: curriculum.id, unit_id: unit.id, subject_id: subject.id, code: 'REFUSE', credits: 1, coefficient: 1 }), /unité.*archivée/i);
    for (const table of ['teaching_units', 'curriculum_components']) {
      await assert.rejects(db.query(`update escen.${table} set reason=$1 where id=$2`, [' ', table === 'teaching_units' ? unit.id : component.id]), /archive_reason/);
    }
  });

  const budgets = await draft();
  const activeSemester = await insert('curriculum_semesters', { curriculum_id: budgets.id, position: 1, name: 'Actif', target_credits: 6.25 });
  const activeUnit = await insert('teaching_units', { curriculum_id: budgets.id, semester_id: activeSemester.id, code: 'ACTIF', name: 'Active', credits: 6.25 });
  const activeComponent = await insert('curriculum_components', { curriculum_id: budgets.id, unit_id: activeUnit.id, subject_id: subject.id, code: 'ACTIF', credits: 6.25, coefficient: 0.625 });
  const archived = { archived_at: new Date().toISOString(), reason: 'Archive ignorée dans les budgets' };
  await insert('curriculum_semesters', { curriculum_id: budgets.id, position: 2, name: 'Archivé sans UE', target_credits: 99.99, ...archived });
  const archivedUnit = await insert('teaching_units', { curriculum_id: budgets.id, semester_id: activeSemester.id, code: 'ARCHIVE', name: 'Archivée sans matière', credits: 99.99, ...archived });
  const archivedComponent = await insert('curriculum_components', { curriculum_id: budgets.id, unit_id: activeUnit.id, subject_id: subject.id, code: 'ARCHIVE', credits: 99.99, coefficient: 1, ...archived });
  await insert('assessment_weights', { curriculum_id: budgets.id, component_id: archivedComponent.id, evaluation_kind: 'DEVOIR', percent: 10 });
  await insert('assessment_weights', { curriculum_id: budgets.id, component_id: activeComponent.id, evaluation_kind: 'DEVOIR', percent: 60 });
  const approve = id => db.query("update escen.curricula set status='APPROVED',approved_by=$1,approved_at=now() where id=$2", [actor.id, id]);
  await check('Maquette : les pondérations actives doivent toujours totaliser 100', async () => {
    await assert.rejects(approve(budgets.id), /Pondérations/i);
    await insert('assessment_weights', { curriculum_id: budgets.id, component_id: activeComponent.id, evaluation_kind: 'EXAMEN', percent: 40 });
  });
  await check('Maquette : les crédits actifs incohérents restent refusés', async () => {
    await db.query('update escen.teaching_units set credits=6.20 where id=$1', [activeUnit.id]);
    await assert.rejects(approve(budgets.id), /crédits/i);
    await db.query('update escen.teaching_units set credits=6.25 where id=$1', [activeUnit.id]);
  });
  await check('Maquette : crédits et pondérations ignorent les trois types de lignes archivées', async () => {
    await approve(budgets.id);
    assert.equal((await row('curricula', budgets.id)).status, 'APPROVED');
    assert.ok((await row('teaching_units', archivedUnit.id)).archived_at);
  });
  for (const [table, entity] of [['curriculum_semesters', activeSemester], ['teaching_units', activeUnit], ['curriculum_components', activeComponent]]) {
    await check(`Maquette approuvée / ${table} : le gel prime sur l’archivage et les dépendances`, async () => {
      await assertRejection(table, entity.id, /Archivage interdit.*maquette.*approuvée.*gel/i);
      await assert.rejects(db.query(`update escen.${table} set reason=$1 where id=$2`, ['Modification interdite', entity.id]), /Maquette approuvée immuable/i);
    });
  }
  await check('Maquette : aucun semestre actif signifie approbation refusée', async () => {
    const empty = await draft();
    await insert('curriculum_semesters', { curriculum_id: empty.id, position: 1, name: 'Seul semestre archivé', target_credits: 1, ...archived });
    await assert.rejects(approve(empty.id), /crédits/i);
  });
  await check('REESAO : création API atomique de la matière, de son UE et du rattachement, code serveur et audit', async () => {
    const resaoCycle = await insert('cycles', { code: `M-${suffix}`, name: 'Master' });
    const resaoLevel = await insert('levels', { cycle_id: resaoCycle.id, code: `M1-${suffix}`, name: 'Master 1', position: 1 });
    const resaoCurriculum = await insert('curricula', { program_id: program.id, level_id: resaoLevel.id, version: 1 });
    const semester = await insert('curriculum_semesters', { curriculum_id: resaoCurriculum.id, position: 1, name: 'Semestre REESAO', target_credits: 30 });
    const year = await insert('academic_years', { code: `RESAO-${suffix}`, name: '2041-2042', starts_on: '2041-09-01', ends_on: '2042-07-01', status: 'BROUILLON' });
    const create = async (code, revisionNumber = null) => writeCatalog(new Request('http://local.test/api/catalog/subjects', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-escen-year': year.id },
      body: JSON.stringify({ revision: revisionNumber ?? await revision(), reason: 'Création matière avec code REESAO', values: { name: 'Finance digitale', code, academic_year_id: year.id, resao: { discipline: 'ECN', semester_id: semester.id, credits: 3.75, coefficient: 0.625 } } }),
    }), 'subjects');
    const before = await revision();
    await assert.rejects(create('FAUX'), error => error.status === 400);
    assert.equal(await revision(), before);
    const response = await create('ECN2101');
    assert.equal(response.status, 201);
    const { id } = await response.json();
    const subject = await row('subjects', id);
    const units = (await db.query('select * from escen.teaching_units where semester_id=$1', [semester.id])).rows;
    const components = (await db.query('select * from escen.curriculum_components where subject_id=$1', [id])).rows;
    assert.equal(subject.code, 'ECN2101'); assert.equal(units.length, 1); assert.equal(components.length, 1);
    assert.equal(units[0].code, subject.code); assert.equal(components[0].code, subject.code);
    assert.equal(components[0].unit_id, units[0].id);
    assert.equal(Number(components[0].coefficient), 0.625);
    assert.equal(await revision(), before + 1);
    for (const [table, entity] of [['subjects', subject], ['teaching_units', units[0]], ['curriculum_components', components[0]]]) assert.equal((await audit(table, entity.id)).at(-1).actor_id, actor.id);
    await assert.rejects(create('ECN2102', before), error => error.status === 409);
    const failedId = randomUUID(), unitId = randomUUID();
    await assert.rejects(client.rpc('escen_backend_transaction', { p_actor_id: actor.id, p_expected_revision: await revision(), p_changes: [
      { table: 'subjects', operation: 'insert', record: { id: failedId, code: 'ECN2102', name: 'Rollback REESAO', academic_year_id: year.id } },
      { table: 'teaching_units', operation: 'insert', record: { id: unitId, curriculum_id: resaoCurriculum.id, semester_id: semester.id, code: 'ECN2102', name: 'Rollback REESAO', credits: 3.75 } },
      { table: 'curriculum_components', operation: 'insert', record: { id: randomUUID(), subject_id: failedId, unit_id: unitId, curriculum_id: resaoCurriculum.id, code: 'ECN2102', credits: 3.75, coefficient: 0 } },
    ] }).then(result => { if (result.error) throw new Error(result.error.message); }), /check|constraint/i);
    assert.equal(await row('subjects', failedId), undefined); assert.equal(await row('teaching_units', unitId), undefined);
    assert.equal((await audit('subjects', failedId)).length, 0); assert.equal(await revision(), before + 1);
  });
}
