import { expect, test } from '@playwright/test';
import { loadSecurityApi, securityContext, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';
import type { RoleName } from '../../src/types/permissions';
const year = uuid(1), id = uuid(2);
function api(role: RoleName = ROLES.IT, roleCode = 'IT') {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const client = { rpc: async (name: string,args: Record<string,unknown> = {}) => {
    calls.push({name,args});
    if (name === 'escen_academic_year_context') return {data:{currentYearId:year},error:null};
    if (name === 'escen_admissions_context') return {data:{enabled:true,applications:[],notices:[]},error:null};
    if (name === 'escen_application_notices') return {data:[],error:null};
    if (name === 'escen_website_rate') return {data:true,error:null};
    if (name === 'escen_candidate_dossier') return {data:{application:{id,reference:'LOCAL'}},error:null};
    return {data:{id},error:null};
  } };
  const context = securityContext(role,{roleCode,grants:[{role_code:roleCode,role_name:role,site_id:null,group_id:null,academic_year_id:null}]});
  const route = loadSecurityApi('app/api/admissions/route.ts',client,context,client) as {GET:(r:Request)=>Promise<Response>;POST:(r:Request)=>Promise<Response>};
  return {route,calls,client,context};
}
const post = (body: unknown, selected = year) => new Request('http://local.test/api/admissions',{method:'POST',headers:{'Content-Type':'application/json','x-escen-year':selected},body:JSON.stringify(body)});
test('API : le marketing ne peut pas prendre une décision académique',async()=>{
  const f=api(ROLES.MKT,'MKT');const response=await f.route.POST(post({action:'admissible',id,version:1,reason:'Tentative non autorisée'}));
  expect(response.status).toBe(403);expect(f.calls.some(x=>x.name==='escen_application_command')).toBe(false);
});
test('API : une année précise et une version sont obligatoires pour les mutations',async()=>{
  const f=api();expect((await f.route.POST(post({action:'review',id,version:1,reason:'Dossier local'},'all'))).status).toBe(409);
  expect((await f.route.POST(post({action:'review',id,reason:'Version absente'}))).status).toBe(400);
  expect(f.calls.some(x=>x.name==='escen_application_command')).toBe(false);
});
test('API : une consultation ne charge pas le snapshot général',async()=>{
  const f=api();expect((await f.route.GET(new Request('http://local.test/api/admissions',{headers:{'x-escen-year':year}}))).status).toBe(200);
  expect(f.calls.map(x=>x.name)).toEqual(['escen_admissions_context']);
});
test('API : les notifications utilisent leur lecture dédiée',async()=>{
  const f=api();expect((await f.route.GET(new Request('http://local.test/api/admissions?view=notifications',{headers:{'x-escen-year':year}}))).status).toBe(200);
  expect(f.calls.map(x=>x.name)).toEqual(['escen_application_notices']);
});
test('API : la référence de paiement et le montant sont validés avant la RPC',async()=>{
  const f=api(ROLES.CC,'CC');const response=await f.route.POST(post({action:'confirm_payment',id,version:1,reason:'Paiement local',amount:-1,channel_id:uuid(3),reference:'ABC'}));
  expect(response.status).toBe(400);expect(f.calls.some(x=>x.name==='escen_application_command')).toBe(false);
});
test('API candidat : un identifiant en URL ne remplace pas le lien personnel',async()=>{
  const f=api();const route=loadSecurityApi('app/api/candidate-dossier/route.ts',f.client,f.context,f.client) as {GET:(r:Request)=>Promise<Response>};
  expect((await route.GET(new Request(`http://local.test/api/candidate-dossier?id=${id}`))).status).toBe(401);
  expect(f.calls.some(x=>x.name==='escen_candidate_dossier')).toBe(false);
});
test('API candidat : le cookie personnel sélectionne le dossier côté serveur',async()=>{
  const f=api();const route=loadSecurityApi('app/api/candidate-dossier/route.ts',f.client,f.context,f.client) as {GET:(r:Request)=>Promise<Response>};
  expect((await route.GET(new Request('http://local.test/api/candidate-dossier',{headers:{cookie:`escen_candidate_access=${'a'.repeat(64)}`}}))).status).toBe(200);
  expect(f.calls[0].args).toMatchObject({p_action:'read'});expect(f.calls[0].args.p_token_hash).not.toBe('a'.repeat(64));
});
test('API non authentifiée : administration refusée',async({request})=>{
  expect((await request.get('/api/admissions')).status()).toBe(401);
  expect((await request.post('/api/admissions',{data:{action:'review',id,version:1,reason:'Sans session'}})).status()).toBe(401);
});
test('API publique : dépôt sans pièce, accès personnel et seconde soumission idempotente',async()=>{
  const previousPortal=process.env.ESCEN_PORTAL_URL; const previousMail=process.env.ESCEN_EMAIL_ENABLED;
  process.env.ESCEN_PORTAL_URL='http://local.test';process.env.ESCEN_EMAIL_ENABLED='false';
  try {
    const f=api();let submitted=false;let creates=0;
    const client={rpc:async(name:string,args:Record<string,unknown>={})=>{
      if(name==='escen_website_rate')return {data:true,error:null};
      if(name==='escen_candidate_dossier')return submitted?{data:{application:{id,reference:'LOCAL-RECEIVED'}},error:null}:{data:null,error:{code:'P0002'}};
      if(name==='escen_application_submit'){submitted=true;creates++;return {data:{id,reference:'LOCAL-RECEIVED'},error:null};}
      if(name==='escen_website_public'){
        if(args.p_action==='year')return {data:{id:year},error:null};
        if(args.p_action==='draft')return {data:null,error:{code:'P0002'}};
        if(args.p_action==='create')return {data:{id},error:null};
        if(args.p_action==='intakes')return {data:[{id:uuid(3),academic_year_id:year,level_id:uuid(4),program_id:uuid(5)}],error:null};
      }
      throw new Error('RPC de recette inattendue');
    }};
    const route=loadSecurityApi('app/api/candidature/route.ts',client,f.context,client) as {POST:(r:Request)=>Promise<Response>};
    const send=()=>{const form=new FormData();form.append('payload',JSON.stringify({request_token:'a'.repeat(64),application:{identity:{nom:'Local',prenom:'Candidat',genre:'M',date_naissance:'2000-01-01',lieu_naissance:'Lomé',nationalite:'Togo',email:'candidate@example.test',tel:'+22890000000',adresse:'Adresse locale'},diploma:{type_diplome_id:'BAC'},intake_id:uuid(3),guardians:[{nom:'Parent',prenom:'Local',lien:'Père',tel:'+22890000001'}],consent:true}}));return new Request('http://local.test/api/candidature',{method:'POST',headers:{Origin:'http://local.test'},body:form});};
    const first=await route.POST(send());expect(first.status).toBe(201);expect(first.headers.get('set-cookie')).toContain('HttpOnly');expect(first.headers.get('set-cookie')).toContain('SameSite=Lax');
    const receipt=await first.json();expect(receipt.reference).toBe('LOCAL-RECEIVED');expect(receipt.token).toBeUndefined();
    const second=await route.POST(send());expect(second.status).toBe(201);expect((await second.json()).reference).toBe(receipt.reference);expect(creates).toBe(1);
  } finally {if(previousPortal===undefined)delete process.env.ESCEN_PORTAL_URL;else process.env.ESCEN_PORTAL_URL=previousPortal;if(previousMail===undefined)delete process.env.ESCEN_EMAIL_ENABLED;else process.env.ESCEN_EMAIL_ENABLED=previousMail;}
});
test('API publique : refus d’une écriture depuis une autre origine',async()=>{
  const f=api();const route=loadSecurityApi('app/api/candidature/route.ts',f.client,f.context,f.client) as {POST:(r:Request)=>Promise<Response>};
  expect((await route.POST(new Request('http://local.test/api/candidature',{method:'POST',headers:{Origin:'https://wrong-origin.invalid'},body:new FormData()}))).status).toBe(403);
  expect(f.calls).toHaveLength(0);
});

for (const [role, code] of [[ROLES.LOG, 'LOG'], [ROLES.RAF, 'RAF']] as const) {
  test(`API : ${code} ne traite plus les candidatures`, async () => {
    const f = api(role, code);
    expect((await f.route.GET(new Request('http://local.test/api/admissions'))).status).toBe(403);
    expect((await f.route.POST(post({ action: 'review', id, version: 1, reason: 'Ancien accès' }))).status).toBe(403);
    expect(f.calls).toHaveLength(0);
  });
}
test('API : le chargé de clientèle vérifie et confirme les frais sans décider de l’admissibilité', async () => {
  const f = api(ROLES.CC, 'CC');
  expect((await f.route.POST(post({ action: 'review', id, version: 1, reason: 'Vérification clientèle' }))).status).toBe(200);
  expect((await f.route.POST(post({ action: 'confirm_payment', id, version: 2, reason: 'Règlement effectivement reçu', amount: 50000, channel_id: uuid(3), reference: 'RECU-CC-001' }))).status).toBe(200);
  expect((await f.route.POST(post({ action: 'admissible', id, version: 3, reason: 'Décision interdite' }))).status).toBe(403);
  expect(f.calls.filter(call => call.name === 'escen_application_command').map(call => call.args.p_action)).toEqual(['review', 'confirm_payment']);
});

test('API : les pièces du chargé de clientèle passent par le périmètre admissions et une URL temporaire', async () => {
  const f = api(ROLES.CC, 'CC');
  const downloads: unknown[] = [];
  const client = { ...f.client,
    rpc: async (name: string, args: Record<string, unknown>) => {
      f.calls.push({ name, args });
      return { data: { bucket: 'private-applications', object_path: 'local/diploma.pdf', filename: 'diploma.pdf' }, error: null };
    },
    storage: { from: (bucket: string) => ({ createSignedUrl: async (path: string, seconds: number, options: unknown) => {
      downloads.push({ bucket, path, seconds, options });
      return { data: { signedUrl: 'https://storage.example.test/temporary' }, error: null };
    } }) },
  };
  const route = loadSecurityApi('app/api/admissions/route.ts', client, f.context, client) as { GET: (request: Request) => Promise<Response> };
  const response = await route.GET(new Request(`http://local.test/api/admissions?document=${uuid(3)}`, { headers: { 'x-escen-year': year } }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ url: 'https://storage.example.test/temporary' });
  expect(f.calls).toEqual([{ name: 'escen_admission_document', args: { p_actor_id: f.context.accountId, p_role_code: 'CC', p_year_id: year, p_id: uuid(3) } }]);
  expect(downloads).toEqual([{ bucket: 'private-applications', path: 'local/diploma.pdf', seconds: 60, options: { download: 'diploma.pdf' } }]);
});
