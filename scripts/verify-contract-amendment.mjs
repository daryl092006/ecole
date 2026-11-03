import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadLocalApiModule} from './local-api-fixture.mjs';

export async function verifyContractAmendment(db,check,{offering,account}){
  const {planContractAmendment,contractAmendmentOptions}=loadLocalApiModule('services/contractAmendmentService.ts',{},{});
  const insert=async(table,record)=>{const keys=Object.keys(record);return(await db.query(`insert into escen.${table}(${keys.join(',')})values(${keys.map((_,i)=>'$'+(i+1)).join(',')})returning *`,Object.values(record))).rows[0];};
  await check('Avenant double diplomation : historique, remise 15 %, paiements et rollback atomique',async()=>{
    await db.exec('begin');
    try{
      const auth=randomUUID();
      await db.query('insert into auth.users(id) values($1)',[auth]);
      await db.query('update escen.accounts set auth_user_id=$1 where id=$2',[auth,account.id]);
      const curriculum=(await db.query('select program_id from escen.curricula where id=$1',[offering.curriculum_id])).rows[0];
      await db.query('update escen.programs set double_degree_eligible=true where id=$1',[curriculum.program_id]);
      const fee=await insert('annual_fee_schedules',{academic_year_id:offering.academic_year_id,program_id:curriculum.program_id,level_id:offering.level_id,category:'SCOLARITE',double_degree:true,amount:975000,reason:'Grille de recette double diplomation'});
      const person=await insert('people',{firstname:'Avenant',lastname:'Recette'});
      const student=await insert('students',{person_id:person.id,matricule:randomUUID()});
      const enrollment=await insert('enrollments',{student_id:student.id,offering_id:offering.id,status:'INSCRIT'});
      const contract=await insert('financial_contracts',{enrollment_id:enrollment.id,reference:randomUUID()});
      const version=await insert('contract_versions',{contract_id:contract.id,version:1,reason:'Contrat initial de recette'});
      for(const [category,amount,position] of [['INSCRIPTION',50000,1],['SCOLARITE',550000,2]]){
        const type=await insert('fee_types',{code:randomUUID(),name:category,category});
        await insert('contract_lines',{contract_id:contract.id,version_id:version.id,fee_type_id:type.id,amount,description:category});
        await insert('installments',{version_id:version.id,position,due_on:'2026-10-15',amount,description:category});
      }
      await db.query("update escen.contract_versions set status='APPROVED',approved_by=$1,approved_at=now() where id=$2",[account.id,version.id]);
      for(const amount of [50000,828750])await insert('payments',{enrollment_id:enrollment.id,amount,payer_name:'Recette',provider:'Caisse de recette',reference:randomUUID(),method:'ESPECES',paid_on:'2026-10-15',recorded_by:account.id});
      const snapshot=(await db.query('select public.escen_backend_snapshot() as data')).rows[0].data;
      const input={enrollmentId:enrollment.id,versionId:version.id,feeId:fee.id,discountPercent:15,dueOn:'2026-10-15',reason:'Double diplomation choisie et remise individuelle validée'};
      assert.equal(contractAmendmentOptions(snapshot,new Set([enrollment.id])).length,1);
      assert.throws(()=>planContractAmendment(snapshot,{...input,discountPercent:100},account.id),/invalide/);
      assert.throws(()=>planContractAmendment(snapshot,{...input,dueOn:'2029-10-15'},account.id),/année/);
      const changes=planContractAmendment(snapshot,input,account.id);
      const execute=async(batch)=>db.query('select public.escen_backend_transaction($1,$2,$3::jsonb)',[account.id,snapshot.revision,JSON.stringify(batch)]);
      await db.exec('savepoint invalid_amendment');
      await assert.rejects(execute([...changes,{table:'contract_discounts',operation:'insert',record:{id:randomUUID(),line_id:randomUUID(),version_id:randomUUID(),amount:1,reason:'Erreur tardive'}}]));
      await db.exec('rollback to savepoint invalid_amendment');
      assert.equal((await db.query('select status from escen.contract_versions where id=$1',[version.id])).rows[0].status,'APPROVED');
      await execute(changes);
      const after=(await db.query('select public.escen_backend_snapshot() as data')).rows[0].data;
      const approved=after.tables.contract_versions.find(row=>row.contract_id===contract.id && row.status==='APPROVED');
      assert.equal(approved.supersedes_id,version.id);
      assert.equal(after.tables.enrollments.find(row=>row.id===enrollment.id).double_degree,true);
      assert.deepEqual(after.tables.contract_lines.filter(row=>row.version_id===version.id),snapshot.tables.contract_lines.filter(row=>row.version_id===version.id));
      assert.deepEqual(after.tables.payments.filter(row=>row.enrollment_id===enrollment.id),snapshot.tables.payments.filter(row=>row.enrollment_id===enrollment.id));
      assert.equal(after.tables.contract_discounts.filter(row=>row.version_id===approved.id).reduce((n,row)=>n+Number(row.amount),0),146250);
      assert.equal(after.tables.installments.filter(row=>row.version_id===approved.id).reduce((n,row)=>n+Number(row.amount),0),878750);
      assert.equal(after.tables.payment_allocations.filter(row=>row.version_id===approved.id).reduce((n,row)=>n+Number(row.amount),0),878750);
      assert.equal(contractAmendmentOptions(after,new Set([enrollment.id])).length,0);
      await db.exec('savepoint stale_amendment');
      await assert.rejects(execute(changes),/CONCURRENT_UPDATE/);
      await db.exec('rollback to savepoint stale_amendment');
    }finally{await db.exec('rollback');}
  });
}
