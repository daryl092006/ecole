import { prepareTestYear } from './academic-year-test-helpers.mjs';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
export async function verifyAcademicYears({ db, check, insert, account, year, level, site, curriculum, component, teacher, student }) {
  const value = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
  const command = async (action, yearId, status = null, revision = undefined, role = 'IT') => value('select public.escen_academic_year_command($1,$2,$3,$4,$5,$6,$7) as value', [account.id, role, action, yearId, revision ?? await value('select revision as value from escen_private.portal_revision where singleton'), 'Commande annuelle motivée de recette', status]);
  let fresh = await insert('academic_years', { code: 'ARCHIVE-2040', name: 'Archive de recette', starts_on: '2040-09-01', ends_on: '2041-07-31', status: 'CLOTUREE' }); let offering; let enrollment; let application;
  const draftToken = createHash('sha256').update(randomUUID()).digest('hex');
  await check('Années : archives filtrées par référence exacte, lots distincts et absences non inventées', async () => {
    const batch = randomUUID(); const otherBatch = randomUUID();
    await db.query("insert into escen_private.import_batches(id,source_name,archive_sha256,sql_sha256,source_rows) values($1,'Recette années',$2,$3,3),($4,'Autre lot mêmes identifiants',$5,$6,2)", [batch, createHash('sha256').update(randomUUID()).digest('hex'), createHash('sha256').update(randomUUID()).digest('hex'), otherBatch, createHash('sha256').update(randomUUID()).digest('hex'), createHash('sha256').update(randomUUID()).digest('hex')]);
    const sourceYear = randomUUID(); const otherYear = randomUUID();
    await db.query("insert into escen_private.legacy_rows(id,batch_id,source_table,source_id,payload) values($1,$2,'annee_scolaires','7','{}'),($3,$4,'annee_scolaires','7','{}')", [sourceYear, batch, otherYear, otherBatch]);
    await db.query("insert into escen_private.source_mappings(row_id,target_table,target_id,mapped_by,reason,mapping_method) values($1,'academic_years',$2,$3,'Lien exact de recette','HUMAN_REVIEW'),($4,'academic_years',$5,$3,'Autre lot explicitement lié','HUMAN_REVIEW')", [sourceYear, year.id, account.id, otherYear, fresh.id]);
    const sourcePayment = randomUUID(); const foreignPayment = randomUUID(); const unknownPayment = randomUUID();
    await db.query("insert into escen_private.legacy_rows(id,batch_id,source_table,source_id,payload) values($1,$2,'paiements','paiement-year','{\"annee_scolaire_id\":\"7\",\"montant\":12}'),($3,$4,'paiements','paiement-year','{\"annee_scolaire_id\":\"7\",\"montant\":99}'),($5,$2,'paiements','paiement-inconnu','{\"annee_scolaire_id\":\"404\",\"montant\":50}')", [sourcePayment, batch, foreignPayment, otherBatch, unknownPayment]);
    const page = await value("select public.escen_history_page_year($1,'paiements',0,100,'',false) as value", [year.id]);
    assert.ok(page.records.some(row => row.id === sourcePayment));
    assert.equal(page.records.some(row => [foreignPayment, unknownPayment].includes(row.id)), false);
    const catalog = await value('select public.escen_history_catalog_year($1) as value', [year.id]);
    assert.equal(catalog.datasets.find(row => row.table === 'paiements').count, page.total);
    assert.equal(await value('select count(*)::integer as value from escen_private.legacy_rows where id=$1', [unknownPayment]), 1);
    const undatedBlog=randomUUID();
    await db.query("insert into escen_private.legacy_rows(id,batch_id,source_table,source_id,payload) values($1,$2,'blogs','article-sans-annee','{\"titre\":\"Archive sans année\"}')",[undatedBlog,batch]);
    const annualBlogs=await value("select public.escen_history_page_year($1,'blogs',0,100,'',false) as value",[year.id]);
    assert.equal(annualBlogs.records.some(row=>row.id===undatedBlog),false);
    const allBlogs=await value("select public.escen_history_page('blogs',0,100,'',false) as value");
    assert.ok(allBlogs.records.some(row=>row.id===undatedBlog));

  });
  await check('Années : activités obligatoirement rattachées, années figées et articles publics isolés', async () => {
    const article={title:'Article annuel de recette',slug:'recette-annuelle-'+randomUUID(),excerpt:'Résumé',content:'Contenu',created_by:account.id,reason:'Rattachement annuel vérifié'};
    await assert.rejects(insert('website_articles',article),/année scolaire/i);
    const saved=await insert('website_articles',{...article,academic_year_id:year.id,status:'PUBLIE',published_at:new Date().toISOString()});
    const other=await insert('website_articles',{...article,slug:'autre-'+randomUUID(),academic_year_id:fresh.id,status:'PUBLIE',published_at:new Date().toISOString()});
    await assert.rejects(db.query('update escen.website_articles set academic_year_id=$1 where id=$2',[fresh.id,saved.id]),/figée/i);
    await assert.rejects(value("select public.escen_website_manage($1,'IT','article-save',$2::jsonb) as value",[account.id,JSON.stringify({...article})]),/année scolaire/i);
    await command('current',year.id);
    const published=await value("select public.escen_website_public('articles') as value");
    assert.ok(published.some(row=>row.id===saved.id));
    assert.equal(published.some(row=>row.id===other.id),false);
    assert.equal(await value('select count(*)::integer as value from escen.website_articles where id=$1',[other.id]),1);
    const subject=await insert('exam_papers',{academic_year_id:year.id,author_id:account.id,title:'Sujet annuel',version:1});
    await assert.rejects(insert('exam_papers',{academic_year_id:fresh.id,library_id:subject.library_id,author_id:account.id,title:'Autre année interdite',version:2}),/versions.*année/i);
  });

  await check('Années : reprise des dates réelles, codes distincts, source active restaurée et absence préservée', async () => {
    const batch=randomUUID();
    await db.query("insert into escen_private.import_batches(id,source_name,archive_sha256,sql_sha256,source_rows) values($1,'Années historiques de recette',$2,$3,3)",[batch,createHash('sha256').update(randomUUID()).digest('hex'),createHash('sha256').update(randomUUID()).digest('hex')]);
    const entries=[{nom:'2060-2061',date_debut:'2060-10-13',date_fin:'2061-06-30',active:'1',code:'as_code_duplique'},{nom:'2061-2062',date_debut:'2061-10-12',date_fin:'2062-06-30',active:'0',code:'as_code_duplique'},{nom:'2062-2063',date_debut:null,date_fin:null,active:'0',code:'as_incomplet'}];
    const sourceIds=[];
    for(let index=0;index<entries.length;index++){const id=randomUUID();sourceIds.push(id);await db.query("insert into escen_private.legacy_rows(id,batch_id,source_table,source_id,payload) values($1,$2,'annee_scolaires',$3,$4::jsonb)",[id,batch,String(index+1),JSON.stringify(entries[index])]);}
    await command('current',null);
    const restored=await value('select escen_private.restore_source_academic_years() as value');
    assert.equal(restored.created,2);
    const restoredYear=(await db.query("select * from escen.academic_years where code='2060-2061'")).rows[0];
    assert.equal(restored.restoredCurrentYearId, null);
    assert.equal(restoredYear.code,'2060-2061');assert.equal(restoredYear.name,'2060-2061');assert.equal(new Date(restoredYear.starts_on).toISOString().slice(0,10),'2060-10-13');assert.equal(restoredYear.status,'BROUILLON');
    assert.equal((await value('select public.escen_academic_year_context() as value')).currentYearId,null);
    for(const id of sourceIds.slice(0,2))assert.equal(await value("select count(*)::integer as value from escen_private.source_mappings where row_id=$1 and target_table='academic_years' and mapping_method='SOURCE_EXACT'",[id]),1);
    assert.equal(await value("select count(*)::integer as value from escen_private.source_mappings where row_id=$1 and target_table='academic_years'",[sourceIds[2]]),0);
    assert.equal(await value("select payload->>'code' as value from escen_private.legacy_rows where id=$1",[sourceIds[0]]),'as_code_duplique');
    const revision=await value('select revision as value from escen_private.portal_revision where singleton');
    assert.equal((await value('select escen_private.restore_source_academic_years() as value')).created,0);
    assert.equal(await value('select revision as value from escen_private.portal_revision where singleton'),revision);
    await command('current',year.id);
    await value('select escen_private.restore_source_academic_years() as value');
    assert.equal((await value('select public.escen_academic_year_context() as value')).currentYearId,year.id);
  });

  await check('Années : tarifs communs ou par filière, matières distinctes et historique protégé', async () => {
    const fee=await insert('annual_fee_schedules',{academic_year_id:year.id,category:'SCOLARITE',amount:480000,reason:'Tarif commun approuvé'});
    const registration=await insert('annual_fee_schedules',{academic_year_id:year.id,category:'INSCRIPTION',amount:50000,reason:'Inscription annuelle'});
    assert.notEqual(fee.id,registration.id);
    await assert.rejects(insert('annual_fee_schedules',{academic_year_id:year.id,category:'SCOLARITE',amount:500000,reason:'Doublon interdit'}),/unique|duplicate/i);
    const newYear=await insert('academic_years',{code:'2070-2071',name:'2070-2071',starts_on:'2070-09-01',ends_on:'2071-07-31',status:'BROUILLON'});
    await insert('annual_fee_schedules',{academic_year_id:newYear.id,category:'SCOLARITE',amount:550000,reason:'Tarif nouvelle année'});
    assert.equal(Number(await value('select amount as value from escen.annual_fee_schedules where id=$1',[fee.id])),480000);
    await assert.rejects(db.query('update escen.annual_fee_schedules set academic_year_id=$1 where id=$2',[newYear.id,fee.id]),/figée|déplacé/i);
    const first=await insert('subjects',{academic_year_id:year.id,code:'ANNUAL-SUBJECT',name:'Matière première année'});
    await insert('subjects',{academic_year_id:newYear.id,code:'ANNUAL-SUBJECT',name:'Matière nouvelle année'});
    await assert.rejects(insert('subjects',{academic_year_id:year.id,code:'ANNUAL-SUBJECT',name:'Doublon'}),/unique|duplicate/i);
    await assert.rejects(db.query('update escen.subjects set academic_year_id=$1 where id=$2',[newYear.id,first.id]),/figée|déplacé/i);
  });

  await check('Années : préparation en brouillon autorisée, exploitation et paiement non inventés',async()=>{
    const draft=await insert('academic_years',{code:'2080-2081',name:'2080-2081',starts_on:'2080-10-01',ends_on:'2081-06-30'});
    await insert('annual_fee_schedules',{academic_year_id:draft.id,category:'INSCRIPTION',amount:50000,reason:'Préparation avant ouverture'});
    const channel=await insert('annual_payment_channels',{academic_year_id:draft.id,name:'Caisse principale',method:'ESPECES',reason:'Préparation de la caisse'});
    await db.query("update escen.annual_payment_channels set name='Caisse centrale',reason='Correction de la caisse' where id=$1",[channel.id]);
    await db.query("update escen.annual_fee_schedules set amount=51000,reason='Correction du tarif' where academic_year_id=$1",[draft.id]);
    await insert('subjects',{academic_year_id:draft.id,code:'PREP',name:'Matière préparée'});
    const offer=await insert('academic_offerings',{academic_year_id:draft.id,curriculum_id:curriculum.id,level_id:level.id});
    await insert('groups',{academic_year_id:draft.id,level_id:level.id,name:'Groupe préparatoire'});
    await assert.rejects(insert('enrollments',{student_id:student.id,offering_id:offer.id,status:'INSCRIT'}),/année/i);
    assert.equal(await value('select count(*)::integer as value from escen.enrollments where offering_id=$1',[offer.id]),0);
  });
  await check('Années : ouverture explicite, désignation unique, concurrence et autorisations', async () => {
    fresh = await insert('academic_years', { code: '2040-TEST', name: '2040-2041 de recette', starts_on: '2040-09-01', ends_on: '2041-07-31' });
    await assert.rejects(command('current', fresh.id), /ouverte/i);
    await assert.rejects(command('transition', fresh.id, 'OUVERTE', undefined, 'ENS'), /Pilotage/i);
    await assert.rejects(db.query("update escen.academic_years set status='OUVERTE' where id=$1", [fresh.id]), /commande/i);
    await assert.rejects(command('transition', fresh.id, 'OUVERTE'), /ouverte/i);
    await command('current', null);
    await command('transition', year.id, 'EN_CLOTURE');
    await assert.rejects(command('transition', fresh.id, 'OUVERTE'), /non prête/i);
    offering = await prepareTestYear({ db, insert, yearId: fresh.id, curriculum, level });
    for (const table of ['group_offerings', 'annual_fee_schedules', 'annual_payment_channels']) {
      const row = (await db.query(`select id from escen.${table} where academic_year_id=$1 limit 1`, [fresh.id])).rows[0];
      await db.query(`update escen.${table} set archived_at=now(),reason='Retrait motive de recette' where id=$1`, [row.id]);
      const revision = await value('select revision as value from escen_private.portal_revision where singleton');
      await assert.rejects(command('transition', fresh.id, 'OUVERTE'), /non prête/i);
      assert.equal(await value('select revision as value from escen_private.portal_revision where singleton'), revision);
      assert.equal(await value('select status as value from escen.academic_years where id=$1', [fresh.id]), 'BROUILLON');
      await db.query(`update escen.${table} set archived_at=null,reason='Reference retablie de recette' where id=$1`, [row.id]);
    }
    const previousRevision = await value('select revision as value from escen_private.portal_revision where singleton');
    await command('transition', fresh.id, 'OUVERTE');
    await assert.rejects(insert('academic_years', { code: 'SECOND-OPEN', name: 'Seconde ouverture interdite', starts_on: '2042-01-01', ends_on: '2042-12-31', status: 'OUVERTE' }), /academic_year_single_open/i);
    assert.equal(await value("select count(*)::int as value from escen.academic_years where status='OUVERTE'"), 1);
    await assert.rejects(command('current', fresh.id, null, previousRevision), /concurrente/i);
    await command('current', fresh.id);
    assert.equal((await value('select public.escen_academic_year_context() as value')).currentYearId, fresh.id);
    assert.equal(await value('select count(*)::integer as value from escen.academic_working_year'), 1);
    await assert.rejects(command('transition', fresh.id, 'EN_CLOTURE'), /désignation/i);
    await assert.rejects(db.query('update escen.academic_working_year set academic_year_id=$1', [year.id]), /commande/i);
  });
  await check('Années : rattachements figés, clôture contrôlée et dettes historiques conservées', async () => {

    await value("select public.escen_website_manage($1,'IT','intake-save',$2::jsonb) as value",[account.id,JSON.stringify({academic_year_id:fresh.id,level_id:level.id,program_id:curriculum.program_id,label:'Même formation, nouvelle année',active:true,required_documents:[],reason:'Campagne annuelle explicite'})]);
    application = await value("select public.escen_website_public('create',$1,$2::jsonb) as value",[draftToken,JSON.stringify({academic_year_id:fresh.id,nom:'Campagne',prenom:'Année',email:'campagne@example.test'})]);
    const group = await insert('groups', { academic_year_id: fresh.id, level_id: level.id, name: 'Groupe annuel de recette' });
    await insert('group_offerings',{group_id:group.id,offering_id:offering.id,academic_year_id:fresh.id,level_id:level.id});
    enrollment = await insert('enrollments', { student_id: student.id, offering_id: offering.id, status: 'REINSCRIT' });
    const assignment = await insert('teaching_assignments', { teacher_id: teacher.id, group_id: group.id, offering_id: offering.id, curriculum_id: curriculum.id, component_id: component.id, valid_from: '2040-09-01', valid_until: '2041-07-31' });
    const evaluation = await insert('evaluations', { assignment_id: assignment.id, offering_id: offering.id, component_id: component.id, name: 'À terminer avant clôture', kind: 'DEVOIR', created_by: account.id });
    await assert.rejects(db.query('update escen.groups set academic_year_id=$1 where id=$2', [year.id, group.id]), /déplacé/i);
    await command('current', null);
    await command('transition', fresh.id, 'EN_CLOTURE');
    await assert.rejects(insert('enrollments', { student_id: student.id, offering_id: offering.id, status: 'INSCRIT' }), /clôture/i);
    await assert.rejects(command('transition', fresh.id, 'CLOTUREE'), /évaluations/i);
    await db.query('update escen.evaluations set cancelled_at=now(),cancellation_reason=$1 where id=$2', ['Évaluation de recette annulée explicitement', evaluation.id]);
    await command('transition', fresh.id, 'CLOTUREE');
    await assert.rejects(insert('groups', { academic_year_id: fresh.id, level_id: level.id, name: 'Interdit après clôture' }), /année/i);
    await assert.rejects(db.query('update escen.evaluations set name=$1 where id=$2', ['Modification interdite', evaluation.id]), /année/i);
    await assert.rejects(db.query('update escen.academic_years set name=$1 where id=$2', ['Réécriture interdite', fresh.id]), /protégé/i);
    await assert.rejects(command('transition', fresh.id, 'OUVERTE'), /Transition/i);
    assert.deepEqual(await value("select public.escen_website_public('intakes') as value"),[]);
    assert.equal(await value('select academic_year_id as value from escen.online_applications where id=$1',[application.id]),fresh.id);
    await assert.rejects(db.query('update escen.online_applications set academic_year_id=$1 where id=$2',[year.id,application.id]),/année de dépôt/i);
    await assert.rejects(value("select public.escen_website_public('submit',$1,$2::jsonb) as value",[draftToken,JSON.stringify({accept_cgu:'1',tuteurs:[{nom:'Parent'}]})]),/fermée/i);
    const payment = await insert('payments', { enrollment_id: enrollment.id, payer_name: 'Payeur de recette', amount: 1, method: 'ESPECES', provider: 'CAISSE-RECETTE', paid_on: '2042-01-01', recorded_by: account.id, reference: 'REGLEMENT-ANCIENNE-ANNEE' });
    assert.equal((await value('select to_jsonb(e) as value from escen.enrollments e where id=$1', [payment.enrollment_id])).offering_id, offering.id);
    assert.ok(await value("select exists(select 1 from escen_private.audit_events where table_name='academic_years' and entity_id=$1 and actor_id=$2 and old_value->>'status'='EN_CLOTURE' and new_value->>'status'='CLOTUREE' and reason is not null) as value", [fresh.id, account.id]));
  });

}
