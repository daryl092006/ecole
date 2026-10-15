import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

export async function verifyWebsiteDatabase({ db, check, account, level, program, year }) {
  const value = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
  const manage = (action, data = {}, role = 'IT') => value('select public.escen_website_manage($1,$2,$3,$4::jsonb) as value', [account.id, role, action, JSON.stringify(action === 'article-save' ? {academic_year_id:year.id,...data} : data)]);
  const token = createHash('sha256').update(randomUUID()).digest('hex');
  const pub = (action, data = {}, hash = token) => value('select public.escen_website_public($1,$2,$3::jsonb) as value', [action, hash, JSON.stringify(data)]);
  await value("select public.escen_academic_year_command($1,'IT','current',$2,(select revision from escen_private.portal_revision where singleton),'Année de recette explicite') as value", [account.id,year.id]);
  let intake; let draft;
  const initialStudents = await value('select count(*)::integer as value from escen.students');
  const initialAccounts = await value('select count(*)::integer as value from escen.accounts');
  await check('Site : formations explicites, pièces privées et aucun dossier dans le snapshot général', async () => {
    intake = await manage('intake-save', { academic_year_id: year.id, level_id: level.id, program_id: program.id, label: 'Formation de recette locale', active: true, required_documents: ['diplome_file'], reason: 'Ouverture locale contrôlée' });
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
    await pub('diploma', { type_diplome_id: 'Diplôme déclaré pour la recette' });
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
