import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

export async function verifyWebsiteDatabase({ db, check, account, level, program, year }) {
  const value = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
  const manage = (action, data = {}, role = 'IT') => value('select public.escen_website_manage($1,$2,$3,$4::jsonb) as value', [account.id, role, action, JSON.stringify(action === 'article-save' ? {academic_year_id:year.id,...data} : data)]);
  const token = createHash('sha256').update(randomUUID()).digest('hex');
  const pub = (action, data = {}, hash = token) => value('select public.escen_website_public($1,$2,$3::jsonb) as value', [action, hash, JSON.stringify(data)]);
  await value("select public.escen_academic_year_command($1,'IT','current',$2,(select revision from escen_private.portal_revision where singleton),'Année de recette explicite') as value", [account.id,year.id]);
  await check('Brochures : brouillon privé, publication annuelle, retrait, concurrence et audit', async () => {
    const brochure = (action, data = {}, role = 'IT') => value('select public.escen_brochures_manage($1,$2,$3,$4::jsonb) as value', [account.id, role, action, JSON.stringify(data)]);
    const published = () => value('select public.escen_brochures_public() as value');
    const input = { academic_year_id: year.id, title: 'Brochure de recette', slug: 'brochure-recette', description: 'Présentation', status: 'BROUILLON', object_path: 'local/test.pdf', filename: 'test.pdf', byte_size: 100, sha256: 'c'.repeat(64), reason: 'Préparer la brochure' };
    const created = await brochure('save', input);
    assert.equal((await published()).length, 0);
    assert.equal(created.object_path, undefined);
    await assert.rejects(brochure('save', { ...input, id: created.id, version: 1 }, 'STUD'), /refusé/i);
    const live = await brochure('save', { ...input, id: created.id, version: 1, status: 'PUBLIE' });
    assert.equal((await published())[0].id, live.id);
    assert.equal((await published())[0].object_path, undefined);
    assert.equal((await value('select public.escen_brochures_public($1) as value', [input.slug]))[0].object_path, input.object_path);
    await assert.rejects(brochure('save', { ...input, id: live.id, version: 1 }), /concurrente/i);
    await assert.rejects(brochure('save', { ...input, id: live.id }), /concurrente/i);
    await brochure('save', { ...input, id: live.id, version: 2, status: 'RETIRE', reason: 'Retirer la brochure' });
    assert.equal((await published()).length, 0);
    assert.equal((await value('select public.escen_backend_snapshot() as value')).tables.website_brochures, undefined);
    const audit = (await db.query("select * from escen_private.audit_events where table_name='website_brochures' and entity_id=$1 and old_value is not null order by happened_at desc limit 1", [live.id])).rows[0];
    assert.equal(audit.actor_id, account.id);
    assert.equal(audit.new_value.status, 'RETIRE');
    await assert.rejects(db.query('delete from escen.website_brochures where id=$1', [live.id]));
  });
  let intake; let draft;
  await check('Site : synchronisation idempotente et fermeture explicite conservée', async () => {
    const before = await manage('admissions');
    const item = before.intakes.find(row => row.academic_year_id === year.id && row.level_id === level.id && row.program_id === program.id);
    assert.ok(item);
    await manage('intake-save', { ...item, active: false, required_documents: ['diplome_file'], reason: 'Fermeture explicite de recette' });
    await db.query('select escen_private.sync_website_offerings()');
    assert.equal((await pub('intakes')).some(row => row.id === item.id), false);
    const after = (await manage('admissions')).intakes.find(row => row.id === item.id);
    assert.equal(after.active, false);
    assert.deepEqual(after.required_documents, ['diplome_file']);
    assert.equal((await manage('admissions')).intakes.length, before.intakes.length);
  });
  const initialStudents = await value('select count(*)::integer as value from escen.students');
  const initialAccounts = await value('select count(*)::integer as value from escen.accounts');
  await check('Site : formations explicites, pièces privées et aucun dossier dans le snapshot général', async () => {
    const synced = (await manage('admissions')).intakes.find(item => item.academic_year_id === year.id && item.level_id === level.id && item.program_id === program.id);
    assert.ok(synced, 'Formation annuelle automatiquement proposée');
    intake = await manage('intake-save', { id: synced.id, version: synced.version, academic_year_id: year.id, level_id: level.id, program_id: program.id, label: 'Formation de recette locale', active: true, required_documents: ['diplome_file'], reason: 'Ouverture locale contrôlée' });
    assert.ok((await pub('intakes')).some(item => item.id === intake.id));
    draft = await pub('create', { academic_year_id:year.id, nom: 'Test', prenom: 'Inscription', email: 'candidate@example.test' });
    assert.equal((await pub('draft')).candidat.nom, 'Test');
    await assert.rejects(pub('draft', {}, 'a'.repeat(64)), /introuvable/i);
    assert.equal((await manage('admissions')).applications.length, 0);
    const snapshot = await value('select public.escen_backend_snapshot() as value');
    for (const table of ['online_applications', 'application_documents', 'website_articles', 'website_intakes']) assert.equal(snapshot.tables[table], undefined);
    assert.equal(JSON.stringify(snapshot).includes(token), false);
  });
  await check('Site : envoi complet, consentement, pièces requises et finalisation idempotente', async () => {
    await pub('diploma', { type_diplome_id: 'Master', annee_diplome: 2024, specialite_diplome: 'Finance', etablissement_diplome: 'Université de recette' });
    const savedDiploma = await value('select diploma as value from escen.online_applications where id=$1', [draft.id]);
    assert.equal(savedDiploma.type_diplome_id, 'Master');
    assert.equal(savedDiploma.annee_diplome, 2024);
    assert.equal(savedDiploma.specialite_diplome, 'Finance');
    assert.equal(savedDiploma.annee_bac, undefined);
    await pub('documents', { niveau_id: level.id, filiere_id: program.id, documents: [] });
    await assert.rejects(pub('submit', { accept_cgu: '1', tuteurs: [{ nom: 'Parent' }] }), /Pièces/i);
    const documentId = randomUUID();
    await pub('documents', { niveau_id: level.id, filiere_id: program.id, documents: [{ id: documentId, document_key: 'diplome_file', filename: 'diplome.pdf', mime_type: 'application/pdf', byte_size: 42, object_path: `${draft.id}/${documentId}`, sha256: 'b'.repeat(64) }] });
    await assert.rejects(pub('submit', { accept_cgu: '0', tuteurs: [] }), /incomplet/i);
    const sent = await pub('submit', { accept_cgu: '1', tuteurs: [{ nom: 'Tuteur', tel: '+22890000000' }] });
    assert.equal(sent.reference, draft.reference);
    assert.equal((await pub('submit', { accept_cgu: '1', tuteurs: [] })).reference, draft.reference);
    await assert.rejects(pub('identity', { nom: 'Modification interdite' }), /déjà envoyé/i);
    const application = (await manage('admissions')).applications.find(item => item.id === draft.id);
    assert.equal(application.status, 'RECU');
    assert.equal(application.documents[0].bucket, undefined);
    assert.equal(application.documents[0].object_path, undefined);
    assert.equal((await manage('document', { id: documentId })).bucket, 'escen-online-applications');
    const counts = await value('select count(*)::integer as value from escen.students');
    assert.equal(counts, initialStudents);
    assert.equal(await value('select count(*)::integer as value from escen.accounts'), initialAccounts);
    const accountsBefore = await value('select count(*)::integer as value from escen.accounts');
    await manage('application-status', { id: draft.id, version: application.version, status: 'EN_ANALYSE', reason: 'Dossier en cours de lecture' });
    await assert.rejects(manage('application-status', { id: draft.id, version: application.version, status: 'CLASSE', reason: 'Ancienne version' }), /concurrente/i);
    assert.equal(await value('select count(*)::integer as value from escen.accounts'), accountsBefore);
    const audit = (await db.query("select * from escen_private.audit_events where table_name='online_applications' and entity_id=$1 and actor_id=$2 order by happened_at desc limit 1", [draft.id, account.id])).rows[0];
    assert.equal(audit.old_value.status, 'RECU'); assert.equal(audit.new_value.status, 'EN_ANALYSE'); assert.equal(audit.reason, 'Dossier en cours de lecture');
  });
  await check('Pièces par niveau : atomicité, concurrence, droits, héritage et audit', async () => {
    await db.exec('begin');
    try {
      const rejected = async (run, pattern) => {
        await db.exec('savepoint rejected_command');
        try { await assert.rejects(run, pattern); }
        finally { await db.exec('rollback to savepoint rejected_command; release savepoint rejected_command'); }
      };
      const intakes = (await manage('admissions')).intakes.filter(item => item.academic_year_id === year.id && item.level_id === level.id);
      assert.ok(intakes.length > 0);
      const expected = intakes.map(({ id, version }) => ({ id, version }));
      const save = (documents, versions = expected, ruleVersion = null, role = 'IT') => value(
        'select public.escen_website_level_documents($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8) as value',
        [account.id, role, year.id, level.id, JSON.stringify(documents), JSON.stringify(versions), ruleVersion, 'Pièces communes de recette']);
      await rejected(() => save(['cv_file'], expected, null, 'STUD'), /Accès|autorisé/i);
      await rejected(() => save(['inconnu']), /Pièce/i);
      await rejected(() => save(['cv_file', 'cv_file']), /dupliquée/i);
      await rejected(() => save(['cv_file'], expected.map(item => ({ ...item, version: item.version + 1 }))), /changé/i);
      assert.equal(await value('select count(*)::integer as value from escen.website_level_document_rules'), 0);
      const saved = await save(['cv_file', 'diplome_file']);
      assert.equal(saved.updated_intakes, intakes.length);
      assert.equal(saved.rule.version, 1);
      const after = (await manage('admissions')).intakes;
      for (const item of intakes) {
        const updated = after.find(row => row.id === item.id);
        assert.deepEqual(updated.required_documents, ['cv_file', 'diplome_file']);
        assert.equal(updated.version, item.version + 1);
      }
      await rejected(() => save(['photo_identite_file']), /changé/i);
      const fresh = after.filter(item => item.academic_year_id === year.id && item.level_id === level.id).map(({ id, version }) => ({ id, version }));
      await rejected(() => save(['photo_identite_file'], fresh, null), /changé/i);
      assert.equal((await save(['diplome_file'], fresh, 1)).rule.version, 2);
      const newProgram = (await db.query("insert into escen.programs(code,name) values ('LEVEL-DOC-TEST','Filière de recette') returning id")).rows[0];
      const inherited = (await db.query(`insert into escen.website_intakes
        (academic_year_id,level_id,program_id,label,required_documents,reason)
        values ($1,$2,$3,'Nouvelle filière','[]','Recette héritage des pièces') returning required_documents`,
      [year.id, level.id, newProgram.id])).rows[0];
      assert.deepEqual(inherited.required_documents, ['diplome_file']);
      const otherIntakes = after.filter(item => item.academic_year_id !== year.id || item.level_id !== level.id);
      const finalIntakes = (await manage('admissions')).intakes;
      for (const item of otherIntakes) {
        const unchanged = finalIntakes.find(row => row.id === item.id);
        assert.deepEqual(unchanged.required_documents, item.required_documents);
        assert.equal(unchanged.version, item.version);
      }
      // Une édition de campagne ne peut contourner la règle commune.
      await db.query('update escen.website_intakes set required_documents=$1::jsonb where id=$2', [JSON.stringify(['cv_file']), intakes[0].id]);
      assert.deepEqual(await value('select required_documents as value from escen.website_intakes where id=$1', [intakes[0].id]), ['diplome_file']);
      const audit = (await db.query("select * from escen_private.audit_events where table_name='website_level_document_rules' and entity_id=$1 and old_value is not null", [saved.rule.id])).rows[0];
      assert.equal(audit.actor_id, account.id);
      assert.deepEqual(audit.old_value.required_documents, ['cv_file', 'diplome_file']);
      assert.deepEqual(audit.new_value.required_documents, ['diplome_file']);
      assert.equal((await value('select public.escen_backend_snapshot() as value')).tables.website_level_document_rules, undefined);
    } finally {
      await db.exec('rollback');
    }
  });
  await check('Site : brouillons privés, publication, retrait, concurrence et droits effectifs', async () => {
    const input = { title: 'Article de recette', slug: 'article-de-recette', excerpt: 'Résumé de recette', content: 'Un texte conservé', image: '', status: 'BROUILLON', reason: 'Préparation de la publication' };
    const article = await manage('article-save', input);
    assert.equal((await pub('articles')).length, 0);
    await manage('article-save', { ...input, id: article.id, version: 1, status: 'PUBLIE', reason: 'Publication confirmée' });
    const published = (await pub('articles'))[0];
    assert.equal(published.slug, input.slug); assert.ok(published.published_at);
    assert.equal(published.created_by, undefined); assert.equal(published.reason, undefined);
    await assert.rejects(manage('article-save', { ...input, id: article.id, version: 1 }), /concurrente/i);
    await manage('article-save', { ...input, id: article.id, version: 2, status: 'RETIRE', reason: 'Retrait conservant l’historique' });
    assert.equal((await pub('articles')).length, 0);
    assert.equal((await manage('articles')).find(item => item.id === article.id).version, 3);
    await assert.rejects(manage('admissions', {}, 'STUD'), /Accès/i);
    await assert.rejects(manage('article-save', input, 'ENS'), /Accès/i);
    await assert.rejects(db.query('delete from escen.online_applications where id=$1', [draft.id]), /Suppression/i);
    const key = 'c'.repeat(64);
    assert.equal(await value('select public.escen_website_rate($1,1) as value', [key]), true);
    assert.equal(await value('select public.escen_website_rate($1,1) as value', [key]), false);
  });
}
