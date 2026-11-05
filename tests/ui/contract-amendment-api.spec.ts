import {test,expect} from '@playwright/test';
import {paymentFixture,financeId as f} from './payment-allocations-fixture';
import {securityContext,securityIds,uuid} from './security-fixture';

function fixture(context=securityContext()){
  const result=paymentFixture(context,true),t=result.snapshot.tables;
  const enrollment=t.enrollments.find(row=>row.id===f.enrollment)!;
  enrollment.status='INSCRIT';
  const offering=t.academic_offerings.find(row=>row.id===enrollment.offering_id)!;
  offering.curriculum_id=uuid(6001);offering.level_id=uuid(6002);
  t.curricula=[{id:uuid(6001),program_id:uuid(6003)}];
  t.programs=[{id:uuid(6003),double_degree_eligible:true}];
  t.annual_fee_schedules=[{id:uuid(6004),academic_year_id:securityIds.year,program_id:uuid(6003),level_id:uuid(6002),double_degree:true,category:'SCOLARITE',amount:975000}];
  t.fee_types=[{id:uuid(6005),category:'INSCRIPTION'},{id:uuid(6006),category:'SCOLARITE'}];
  t.contract_lines[0].fee_type_id=uuid(6005);t.contract_lines[0].amount=50000;
  t.contract_lines[1].fee_type_id=uuid(6006);t.contract_lines[1].amount=550000;
  t.contract_versions[0].version=1;
  t.contract_discounts=[];t.credit_notes=[];t.refunds=[];t.payment_allocations=[];
  t.payments[0].amount=878750;
  const input={action:'amend_contract',versionId:f.version,feeId:uuid(6004),discountPercent:15,dueOn:'2026-01-15',reason:'Double diplomation et remise individuelle validées'};
  return {...result,input};
}
test('Avenant : nouvelle version, paiements conservés, double confirmation sans doublon',async()=>{
  const result=fixture();
  expect((await result.get()).status).toBe(200);
  const response=await result.post(result.input);
  expect(response.status).toBe(201);
  expect(result.transactions).toHaveLength(1);
  expect(result.transactions[0].changes.some(row=>row.table==='payments')).toBe(false);
  expect(result.snapshot.tables.enrollments.find(row=>row.id===f.enrollment)?.double_degree).toBe(true);
  expect((await result.post(result.input)).status).toBe(409);
});
test('Avenant : tarif étranger, remise invalide et version périmée refusés',async()=>{
  for(const [patch,status] of [[{feeId:uuid(9999)},409],[{discountPercent:100},400],[{versionId:uuid(9998)},409]] as const){
    const result=fixture();expect((await result.post({...result.input,...patch})).status).toBe(status);expect(result.transactions).toHaveLength(0);
  }
});
test('Avenant : affectations préexistantes refusées avant toute écriture',async()=>{
  const result=fixture();
  result.snapshot.tables.payment_allocations=[{id:uuid(9997),payment_id:f.payment,enrollment_id:f.enrollment,amount:1}];
  expect((await result.post(result.input)).status).toBe(409);
  expect(result.transactions).toHaveLength(0);
});
test('Avenant : permission académique obligatoire avant toute écriture',async()=>{
  const context=securityContext();context.permissions=context.permissions.filter(value=>value!=='student.lifecycle.manage');
  const result=fixture(context);
  expect((await result.post(result.input)).status).toBe(403);
  expect(result.transactions).toHaveLength(0);
});
