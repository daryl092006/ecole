import {test,expect} from '@playwright/test';
import {evaluationSecurityRoute,loadSecurityApi,securityContext,securityIds,uuid} from './security-fixture';
import {ROLES} from '../../src/types/permissions';

function fixture(context=securityContext()){
  const snapshot=evaluationSecurityRoute(context).snapshot;
  snapshot.tables.students[0].matricule='BOURSE-TEST';
  snapshot.tables.scholarships=[{id:uuid(8000),code:'CATALOGUE',name:'Catalogue modifié',kind:'POURCENTAGE',percent:50,active:true}];
  snapshot.tables.scholarship_awards=[{id:uuid(8001),enrollment_id:uuid(500),scholarship_id:uuid(8000),valid_from:'2026-01-15',reason:'Décision initiale',terms_snapshot:{code:'INITIAL',name:'Conditions initiales',kind:'POURCENTAGE',percent:15}}];
  snapshot.tables.financial_contracts=[{id:uuid(8002),enrollment_id:uuid(500)}];
  snapshot.tables.contract_versions=[{id:uuid(8003),contract_id:uuid(8002),status:'APPROVED'}];
  snapshot.tables.contract_discounts=[];
  const writes:Record<string,unknown>[]=[];
  const client={rpc:async(name:string,args:Record<string,unknown>={})=>{
    if(name==='escen_backend_snapshot')return {data:snapshot,error:null};
    if(name==='escen_academic_year_context')return {data:{currentYearId:securityIds.year},error:null};
    if(name==='escen_backend_transaction'){writes.push(args);return {data:5,error:null};}
    throw new Error(`RPC imprévue : ${name}`);
  }};
  const route=loadSecurityApi('app/api/finance/fees-and-scholarships/route.ts',client,context) as {GET:(request:Request)=>Promise<Response>;POST:(request:Request)=>Promise<Response>};
  const get=()=>route.GET(new Request('http://local.test/api/finance/fees-and-scholarships',{headers:{'x-escen-year':securityIds.year}}));
  const post=(body:Record<string,unknown>)=>route.POST(new Request('http://local.test/api/finance/fees-and-scholarships',{method:'POST',headers:{'x-escen-year':securityIds.year},body:JSON.stringify({revision:snapshot.revision,...body})}));
  return {snapshot,writes,get,post};
}
test('Bourses : conditions figées et réduction absente affichées honnêtement',async()=>{
  const f=fixture();const response=await f.get();expect(response.status).toBe(200);
  const data=await response.json();
  expect(data.scholarshipAwards[0]).toMatchObject({scholarshipName:'Conditions initiales',scholarshipValue:'15%',financialStatus:'NOT_APPLIED',appliedAmount:0});
});
test('Bourses : attribution refusée pour une autre année ou une date incohérente',async()=>{
  const f=fixture();
  const body={action:'award_scholarship',scholarshipId:uuid(8000),validFrom:'2026-01-15',reason:'Attribution contrôlée'};
  expect((await f.post({...body,enrollmentId:uuid(502)})).status).toBe(409);
  expect((await f.post({...body,enrollmentId:uuid(500),validFrom:'2030-01-01'})).status).toBe(400);
  expect(f.writes).toHaveLength(0);
});
test('Bourses : consultation DG ne permet pas de modifier le catalogue',async()=>{
  const f=fixture(securityContext(ROLES.DG,{roleCode:'DG'}));
  expect((await f.post({action:'toggle_scholarship',id:uuid(8000),active:false,reason:'Tentative sans droit'})).status).toBe(403);
  expect(f.writes).toHaveLength(0);
});
test('Bourses : une attribution limitée à un groupe ne gère pas le catalogue global',async()=>{
  const context=securityContext();context.grants=[{role_code:'IT',role_name:ROLES.IT,site_id:null,group_id:securityIds.group,academic_year_id:null}];
  const f=fixture(context);
  expect((await f.post({action:'toggle_scholarship',id:uuid(8000),active:false,reason:'Tentative hors périmètre'})).status).toBe(403);
  expect(f.writes).toHaveLength(0);
});
test('Bourses : aperçu avec frais et base explicites, sans écriture financière',async()=>{
  const f=fixture();
  f.snapshot.tables.scholarships.push({id:uuid(8010),kind:'POURCENTAGE',percent:50,active:true});
  f.snapshot.tables.contract_lines=[{id:uuid(8011),contract_id:uuid(8002),version_id:uuid(8003),amount:1000}];
  f.snapshot.tables.installments=[{id:uuid(8012),version_id:uuid(8003),position:1,due_on:'2026-01-15',amount:1000}];
  const response=await f.post({action:'preview_scholarship',scholarshipId:uuid(8010),enrollmentId:uuid(500),validFrom:'2026-01-15',reason:'Aperçu avant décision',lineIds:[uuid(8011)],calculationBasis:'GROSS',confirmStacking:false});
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({preview:{base:1000,reduction:500,oldTotal:1000,newTotal:500}});
  expect(f.writes).toHaveLength(0);
});
