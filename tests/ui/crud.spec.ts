import { test, expect, type Page } from '@playwright/test';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { captureWorkspace } from './helpers';
import type { DatabaseRow } from '../../src/types/persistence';
import type { PersonnelRecord } from '../../src/types/staff';
async function catalogFixture(page:Page) {
  await authenticateFixture(page);
  await page.route('**/api/campus',route=>route.fulfill({json:snapshot}));
  let revision=1;const historyLinks:{sourceRowId:string;targetId:string}[]=[];const tables:Record<string,DatabaseRow[]>={programs:[],tracks:[],subjects:[],academic_years:[],cycles:[],levels:[],sites:[],buildings:[],rooms:[],groups:[],assets:[],suppliers:[]};
  const mutations:{method:string;key:string;body:Record<string,unknown>}[]=[];
  await page.route('**/api/catalog/**',async route=>{
    expect(route.request().headers().authorization).toBe('Bearer fixture-auth-token');
    const segments=new URL(route.request().url()).pathname.split('/');const key=segments[3];const id=segments[4];const method=route.request().method();
    if(method==='GET'){await route.fulfill({json:{revision,tables,historyLinks}});return;}
    const body=route.request().postDataJSON();expect(body.revision).toBe(revision);mutations.push({method,key,body});
    if(method==='POST')tables[key].push({id:`00000000-0000-4000-8000-${String(mutations.length).padStart(12,'0')}`,...body.values,reason:body.reason});
    else {const row=tables[key].find(row=>row.id===id)!;Object.assign(row,method==='DELETE'?{archived_at:'2026-10-14T12:00:00Z',reason:body.reason}:body.values);}
    if(body.sourceRowId)historyLinks.push({sourceRowId:body.sourceRowId,targetId:tables[key].at(-1)!.id});
    revision++;await route.fulfill({status:method==='POST'?201:200,json:{revision}});
  });
  return {tables,mutations};
}
for(const width of [390,1440]) {
  test(`CRUD des référentiels et reprise historique à ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:950});const fixture=await catalogFixture(page);
    await page.goto('/academique/filieres');await page.getByRole('button',{name:'Ajouter une filière',exact:true}).click();
    const dialog=page.locator('.work-page');await dialog.getByLabel('Code',{exact:true}).fill('SG');await dialog.getByLabel('Nom',{exact:true}).fill('Sciences de gestion');await dialog.getByLabel('Description').fill('Une filière officielle');await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();
    const row=page.getByRole('row').filter({hasText:'Sciences de gestion'});await expect(row).toBeVisible();
    await row.getByRole('button',{name:'Modifier',exact:true}).click();await dialog.getByLabel('Nom',{exact:true}).fill('Gestion et commerce');await dialog.getByLabel('Motif').fill('Correction du libellé officiel');await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();
    const updated=page.getByRole('row').filter({hasText:'Gestion et commerce'});await expect(updated).toBeVisible();await page.reload();await expect(updated).toBeVisible();
    await updated.getByRole('button',{name:'Archiver',exact:true}).click();await dialog.getByLabel('Motif').fill('Filière retirée du catalogue');await dialog.getByRole('button',{name:'Confirmer l’archivage'}).click();await expect(updated).toHaveCount(0);
    await page.getByRole('combobox',{name:'Afficher',exact:true}).selectOption('archived');await expect(updated).toBeVisible();await updated.getByRole('button',{name:'Voir',exact:true}).click();await expect(dialog.getByText('Filière retirée du catalogue',{exact:true})).toBeVisible();await page.keyboard.press('Escape');
    await page.getByRole('combobox',{name:'Afficher',exact:true}).selectOption('active');
    await page.getByRole('row').filter({hasText:'Informatique'}).getByRole('button',{name:'Modifier',exact:true}).click();await expect(dialog.getByLabel('Nom',{exact:true})).toHaveValue('Informatique');await dialog.getByLabel('Code',{exact:true}).fill('INFO-OFFICIEL');await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await expect(page.getByRole('row').filter({hasText:'INFO-OFFICIEL'})).toBeVisible();await expect(page.getByRole('row').filter({hasText:'Informatique'})).toHaveCount(1);expect(fixture.mutations.at(-1)!.body.sourceRowId).toBeDefined();
    expect(fixture.mutations.map(item=>item.method)).toEqual(['POST','PATCH','DELETE','POST']);await captureWorkspace(page,'crud-filieres');
  });
  test(`CRUD du personnel et révocation visible à ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:950});await authenticateFixture(page);await page.route('**/api/campus',route=>route.fulfill({json:snapshot}));
    const records:PersonnelRecord[]=[{personId:'00000000-0000-4000-8000-000000000012',staffId:'00000000-0000-4000-8000-000000000013',firstname:'Marie',lastname:'Personnel',email:'marie@example.test',phone:'',employeeNumber:'EMP-1',active:true,contracts:[]}];let revision=1;const methods:string[]=[];
    await page.route('**/api/staff**',async route=>{
      const method=route.request().method();if(method==='GET'){await route.fulfill({json:{records,revision}});return;}
      const body=route.request().postDataJSON();expect(body.revision).toBe(revision);methods.push(method);
      if(method==='PATCH')Object.assign(records[0],body);
      if(method==='DELETE')records.splice(0,1);
      
    revision++;await route.fulfill({json:{revision}});
    });
    await page.goto('/personnel');await page.getByRole('row').filter({hasText:'EMP-1'}).getByRole('button',{name:'Modifier',exact:true}).click();
    const dialog=page.locator('.work-page');await dialog.getByLabel('Téléphone',{exact:true}).fill('90112233');await dialog.getByLabel('Motif').fill('Contact mis à jour');await dialog.getByRole('button',{name:'Enregistrer les modifications'}).click();
    await expect(page.getByRole('row').filter({hasText:'EMP-1'})).toContainText('90112233');await page.reload();await expect(page.getByRole('row').filter({hasText:'EMP-1'})).toContainText('90112233');
    await page.getByRole('row').filter({hasText:'EMP-1'}).getByRole('button',{name:'Archiver',exact:true}).click();await dialog.getByLabel('Motif').fill('Départ du personnel');await dialog.getByRole('button',{name:'Confirmer l’archivage'}).click();await expect(page.getByRole('row').filter({hasText:'EMP-1'})).toHaveCount(0);await page.reload();await expect(page.getByRole('row').filter({hasText:'EMP-1'})).toHaveCount(0);expect(methods).toEqual(['PATCH','DELETE']);
  });
  test(`Création et archivage du dossier étudiant à ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:950});await authenticateFixture(page);const campus=structuredClone(snapshot);
    await page.route('**/api/campus',route=>route.fulfill({json:campus}));let created=false;let archived=false;
    await page.route('**/api/students**',async route=>{
      const body=route.request().postDataJSON();if(route.request().method()==='POST'){
        expect(body.matricule).toBe('ESCEN-CRUD-1');created=true;campus.revision++;campus.tables.people.push({id:'PERSON-CRUD',...body.person});campus.tables.students.push({id:'STUDENT-CRUD',person_id:'PERSON-CRUD',matricule:body.matricule});await route.fulfill({status:201,json:{matricule:body.matricule}});
      }else if(route.request().method()==='PATCH'){expect(body.revision).toBe(campus.revision);Object.assign(campus.tables.people.find(row=>row.id==='PERSON-CRUD')!,body);campus.revision++;await route.fulfill({json:{revision:campus.revision}});
      }else{expect(body.reason).toBe('Retrait demandé');archived=true;campus.tables.students.find(row=>row.id==='STUDENT-CRUD')!.archived_at='2026-10-14';await route.fulfill({json:{revision:2}});}
    });
    await page.goto('/etudiants');await page.getByRole('button',{name:'Ajouter un dossier étudiant'}).click();const dialog=page.locator('.work-page');await dialog.getByLabel('Matricule officiel',{exact:true}).fill('ESCEN-CRUD-1');await dialog.getByLabel('Prénom',{exact:true}).fill('Marie');await dialog.getByLabel('Nom',{exact:true}).fill('Étudiante');await dialog.getByRole('button',{name:'Créer le dossier étudiant'}).click();
    await expect(page.getByRole('heading',{name:'Marie Étudiante',exact:true})).toBeVisible();expect(created).toBe(true);await page.reload();await expect(page.getByRole('heading',{name:'Marie Étudiante',exact:true})).toBeVisible();
    await page.getByLabel('Prénom',{exact:true}).fill('Marie Corrigée');await page.getByLabel('Téléphone (+228)',{exact:true}).fill('90001122');await page.getByRole('button',{name:'Enregistrer le dossier',exact:true}).click();await expect(page.getByRole('heading',{name:'Marie Corrigée Étudiante',exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel('Téléphone (+228)',{exact:true})).toHaveValue('90001122');
    await page.getByRole('button',{name:'Archiver le dossier',exact:true}).click();await dialog.getByLabel('Motif').fill('Retrait demandé');await dialog.getByRole('button',{name:'Confirmer l’archivage'}).click();await expect(page).toHaveURL(/\/etudiants$/);await expect(page.getByRole('row').filter({hasText:'ESCEN-CRUD-1'})).toHaveCount(0);expect(archived).toBe(true);await page.reload();await expect(page.getByRole('row').filter({hasText:'ESCEN-CRUD-1'})).toHaveCount(0);
  });
}

test('Les nouvelles API refusent les requêtes non authentifiées',async({request})=>{
  const id='00000000-0000-4000-8000-000000000010';
  const results=await Promise.all([
    request.get('/api/catalog/programs'),
    request.get('/api/subjects'),
    request.post('/api/subjects',{data:{revision:0,subject:{},reason:'Unauthorized'}}),
    request.post('/api/catalog/programs',{data:{values:{code:'DENIED',name:'Denied'},revision:0,reason:'Unauthorized'}}),
    request.patch(`/api/catalog/programs/${id}`,{data:{values:{code:'DENIED',name:'Denied'},revision:0,reason:'Unauthorized'}}),
    request.delete(`/api/staff/${id}`,{data:{revision:0,reason:'Unauthorized'}}),
    request.post('/api/students',{data:{matricule:'DENIED',person:{}}}),
    request.delete('/api/students/DENIED',{data:{reason:'Unauthorized'}}),
  ]);
  for(const result of results){expect(result.status()).toBe(401);expect(await result.json()).toEqual({error:'Connexion requise.'});}
});
