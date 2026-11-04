import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadLocalApiModule} from './local-api-fixture.mjs';

export async function verifyScholarshipApplication(db,check,{offering,account}){
 const {previewScholarshipApplication,planScholarshipApplication}=loadLocalApiModule('services/scholarshipApplicationService.ts',{},{});
 const {activePaymentAllocations}=loadLocalApiModule('services/paymentAllocationService.ts',{},{});
 const insert=async(table,record)=>{const keys=Object.keys(record);return(await db.query(`insert into escen.${table}(${keys.join(',')})values(${keys.map((_,i)=>'$'+(i+1)).join(',')})returning *`,Object.values(record))).rows[0];};
 for(const draft of [false,true])await check(`Bourse : ${draft?'brouillon conservé':'avenant avec affectations existantes'}, réduction réelle et paiements préservés`,async()=>{
  await db.exec('begin');
  try{
   const auth=randomUUID();await db.query('insert into auth.users(id)values($1)',[auth]);await db.query('update escen.accounts set auth_user_id=$1 where id=$2',[auth,account.id]);
   const person=await insert('people',{firstname:'Bourse',lastname:'Recette'});
   const student=await insert('students',{person_id:person.id,matricule:randomUUID()});
   const enrollment=await insert('enrollments',{student_id:student.id,offering_id:offering.id,status:'INSCRIT'});
   const contract=await insert('financial_contracts',{enrollment_id:enrollment.id,reference:randomUUID()});
   const version=await insert('contract_versions',{contract_id:contract.id,version:1,reason:'Contrat initial de recette bourse'});
   const lines=[];
   for(const [category,value]of [['INSCRIPTION',50000],['SCOLARITE',550000]]){
    const type=await insert('fee_types',{code:randomUUID(),name:category,category});
    lines.push(await insert('contract_lines',{contract_id:contract.id,version_id:version.id,fee_type_id:type.id,amount:value,description:category}));
   }
   const scholarship=await insert('scholarships',{code:randomUUID(),name:'Bourse de recette',kind:'POURCENTAGE',percent:draft?100:50,active:true});
   if(!draft){
    await insert('contract_discounts',{line_id:lines[1].id,version_id:version.id,amount:55000,reason:'Remise antérieure conservée'});
    const installment=await insert('installments',{version_id:version.id,position:1,due_on:'2026-10-15',amount:545000,description:'Échéance initiale'});
    await db.query("update escen.contract_versions set status='APPROVED',approved_by=$1,approved_at=now()where id=$2",[account.id,version.id]);
    const payment=await insert('payments',{enrollment_id:enrollment.id,amount:300000,payer_name:'Recette',provider:'Caisse',reference:randomUUID(),method:'ESPECES',paid_on:'2026-10-15',recorded_by:account.id});
    await insert('payment_allocations',{payment_id:payment.id,enrollment_id:enrollment.id,contract_id:contract.id,version_id:version.id,line_id:lines[1].id,installment_id:installment.id,amount:300000,allocated_by:account.id});
   }
   const snapshot=(await db.query('select public.escen_backend_snapshot()as data')).rows[0].data;
   const input={enrollmentId:enrollment.id,scholarshipId:scholarship.id,lineIds:[lines[1].id],calculationBasis:'GROSS',confirmStacking:!draft,validFrom:'2026-10-01',reason:'Attribution de bourse et effet financier validés'};
   if(!draft)assert.throws(()=>previewScholarshipApplication(snapshot,{...input,confirmStacking:false}),/cumul/);
   assert.throws(()=>previewScholarshipApplication(snapshot,{...input,lineIds:[randomUUID()]}),/lignes/);
   const preview=previewScholarshipApplication(snapshot,input);
   assert.equal(preview.reduction,draft?550000:275000);
   assert.equal(preview.newTotal,draft?50000:270000);
   assert.equal(preview.unallocatedCredit,draft?0:30000);
   const fixed={...snapshot,tables:{...snapshot.tables,scholarships:snapshot.tables.scholarships.map(row=>row.id===scholarship.id?{...row,kind:'MONTANT_FIXE',percent:null,amount:10000}:row)}};
   assert.equal(previewScholarshipApplication(fixed,input).reduction,10000);
   const excessive={...fixed,tables:{...fixed.tables,scholarships:fixed.tables.scholarships.map(row=>row.id===scholarship.id?{...row,amount:1000000}:row)}};
   assert.throws(()=>previewScholarshipApplication(excessive,input),/dépasserait/);
   if(!draft){
    assert.equal(previewScholarshipApplication(snapshot,{...input,calculationBasis:'REMAINING'}).reduction,247500);
    const refunded={...snapshot,tables:{...snapshot.tables,refunds:[...snapshot.tables.refunds,{id:randomUUID(),payment_id:snapshot.tables.payments.find(row=>row.enrollment_id===enrollment.id).id,amount:10000}]}};
    assert.equal(previewScholarshipApplication(refunded,input).unallocatedCredit,20000);
   }
   const schedule=[{dueOn:'2026-10-15',amount:preview.newTotal}];
   const changes=planScholarshipApplication(snapshot,input,schedule,account.id);
   assert.ok(!changes.some(change=>['payments','receipts','refunds'].includes(change.table)));
   const execute=batch=>db.query('select public.escen_backend_transaction($1,$2,$3::jsonb)',[account.id,snapshot.revision,JSON.stringify(batch)]);
   await db.exec('savepoint failed_scholarship');
   await assert.rejects(execute([...changes,{table:'contract_discounts',operation:'insert',record:{id:randomUUID(),line_id:randomUUID(),version_id:randomUUID(),amount:1,reason:'Erreur tardive'}}]));
   await db.exec('rollback to savepoint failed_scholarship');
   assert.equal((await db.query('select count(*)::integer n from escen.scholarship_awards where enrollment_id=$1',[enrollment.id])).rows[0].n,0);
   await execute(changes);
   const after=(await db.query('select public.escen_backend_snapshot()as data')).rows[0].data;
   const award=after.tables.scholarship_awards.find(row=>row.enrollment_id===enrollment.id);
   assert.equal(Number(award.terms_snapshot.applied_amount),preview.reduction);
   assert.deepEqual(after.tables.payments,snapshot.tables.payments);
   const active=after.tables.contract_versions.find(row=>row.contract_id===contract.id && row.status===(draft?'DRAFT':'APPROVED'));
   assert.equal(after.tables.contract_discounts.filter(row=>row.version_id===active.id && row.scholarship_award_id===award.id).reduce((n,row)=>n+Number(row.amount),0),preview.reduction);
   assert.equal(after.tables.installments.filter(row=>row.version_id===active.id).reduce((n,row)=>n+Number(row.amount),0),preview.newTotal);
   if(!draft){
    assert.equal(active.supersedes_id,version.id);
    assert.deepEqual(after.tables.contract_lines.filter(row=>row.version_id===version.id),snapshot.tables.contract_lines.filter(row=>row.version_id===version.id));
    assert.equal(activePaymentAllocations(after).filter(row=>row.enrollment_id===enrollment.id).reduce((n,row)=>n+Number(row.amount),0),270000);
   }
   assert.throws(()=>previewScholarshipApplication(after,input),/déjà attribuée/);
  }finally{await db.exec('rollback');}
 });
}
