import {expect,test} from '@playwright/test';
import {authenticateFixture} from './persistent-fixture';
import { installResponsiveAudit } from './responsive-audit-fixture';
test.beforeEach(async ({ page }) => { await installResponsiveAudit(page, 'staff'); });
for(const width of [390,1440])test(`Paiement relu et enregistré une seule fois à ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await authenticateFixture(page);
 const operations:Record<string,unknown>[]=[];let paid=0;
 await page.route('**/api/students/*/operations',route=>{
  if(route.request().method()==='POST'){const body=route.request().postDataJSON();operations.push(body);paid=body.amount;return route.fulfill({status:201,json:{revision:2}});}
  return route.fulfill({json:{revision:1,enrollments:[{id:'00000000-0000-4000-8000-000000000101',status:'REINSCRIT'}],payments:[],paid}});
 });
 await page.goto('/etudiants/ESCEN-TEST-001');
 await page.getByRole('navigation',{name:'Sections du dossier étudiant'}).getByRole('button',{name:'Frais et versements',exact:true}).click();
 await page.getByRole('button',{name:'Enregistrer un paiement',exact:true}).click();
 await page.getByLabel('Montant FCFA',{exact:true}).fill('50000');await page.getByLabel('Payeur',{exact:true}).fill('Parent de recette');await page.getByLabel('Référence du versement').fill('RECETTE-001');await page.getByLabel('Organisme ou caisse').fill('Caisse ESCEN');await page.getByLabel('Date du paiement').fill('2026-10-15');await page.getByLabel('Motif',{exact:true}).fill('Versement contrôlé de recette');
 await page.getByRole('button',{name:'Vérifier l’opération'}).click();expect(operations).toHaveLength(0);
 await page.getByRole('button',{name:'Confirmer le paiement',exact:true}).click();
 await expect(page.getByText('Paiement et reçu enregistrés.',{exact:true})).toBeVisible();expect(operations).toHaveLength(1);expect(operations[0]).toMatchObject({action:'payment',amount:50000,reference:'RECETTE-001'});
});
test('Sans inscription officielle, aucun encaissement proposé',async({page})=>{
 await authenticateFixture(page);await page.route('**/api/students/*/operations',route=>route.fulfill({json:{revision:1,enrollments:[],payments:[],paid:0}}));
 await page.goto('/etudiants/ESCEN-TEST-001');await page.getByRole('navigation',{name:'Sections du dossier étudiant'}).getByRole('button',{name:'Frais et versements',exact:true}).click();await expect(page.getByText('Aucune inscription officielle pour cette année. Une inscription est nécessaire avant un encaissement.')).toBeVisible();await expect(page.getByRole('button',{name:'Enregistrer un paiement',exact:true})).toHaveCount(0);
});
test('Contrat en brouillon : approbation et continuité dans Frais et versements',async({page})=>{
 await authenticateFixture(page);
 const operations:Record<string,unknown>[]=[];let contractStatus='DRAFT';
 await page.route('**/api/students/*/operations',route=>{
  if(route.request().method()==='POST'){const body=route.request().postDataJSON();operations.push(body);contractStatus='APPROVED';return route.fulfill({status:201,json:{revision:2}});}
  return route.fulfill({json:{revision:1,enrollments:[{id:'00000000-0000-4000-8000-000000000101',status:'INSCRIT',enrolledOn:'2026-10-15'}],contracts:[{id:'C1',versionId:'V1',enrollmentId:'00000000-0000-4000-8000-000000000101',reference:'CON-001',status:contractStatus,amount:530000}],payments:[],paid:0}});
 });
 await page.goto('/etudiants/ESCEN-TEST-001');
 await page.getByRole('navigation',{name:'Sections du dossier étudiant'}).getByRole('button',{name:'Frais et versements',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Gestion des paiements'})).toBeVisible();
 await expect(page.locator('.availability-details')).toHaveCount(0);
 await page.getByRole('button',{name:'Approuver le contrat',exact:true}).click();
 await page.getByLabel('Motif',{exact:true}).fill('Contrat vérifié et validé');
 await page.getByRole('button',{name:'Vérifier l’opération'}).click();expect(operations).toHaveLength(0);
 await page.getByRole('button',{name:'Confirmer l’approbation du contrat',exact:true}).click();
 await expect(page.getByText('Contrat approuvé et situation financière établie.',{exact:true})).toBeVisible();
 expect(operations).toHaveLength(1);
 expect(operations[0]).toMatchObject({action:'approve_contract',enrollmentId:'00000000-0000-4000-8000-000000000101',dueOn:'2026-10-15'});
});
test('Changement de groupe relu et enregistré une seule fois',async({page})=>{
 await authenticateFixture(page);
 const operations:Record<string,unknown>[]=[];
 const groupA='00000000-0000-4000-8000-000000000201',groupB='00000000-0000-4000-8000-000000000202';
 await page.route('**/api/students/*/operations',route=>{
  if(route.request().method()==='POST'){const body=route.request().postDataJSON();operations.push(body);return route.fulfill({status:201,json:{revision:2}});}
  return route.fulfill({json:{revision:1,enrollments:[{id:'00000000-0000-4000-8000-000000000101',status:'INSCRIT',enrolledOn:'2026-10-12',currentGroupId:groupA,currentGroupName:'Groupe A',currentGroupValidFrom:'2026-10-12',availableGroups:[{id:groupA,name:'Groupe A'},{id:groupB,name:'Groupe B'}]}],payments:[],paid:0}});
 });
 await page.goto('/etudiants/ESCEN-TEST-001');
 await page.getByRole('navigation',{name:'Sections du dossier étudiant'}).getByRole('button',{name:'Années et groupes',exact:true}).click();
 await page.getByRole('button',{name:'Changer de groupe',exact:true}).click();
 await page.getByLabel('Date d’effet',{exact:true}).fill('2026-11-02');
 await page.getByLabel('Motif',{exact:true}).fill('Rééquilibrage des effectifs');
 await page.getByRole('button',{name:'Vérifier l’opération'}).click();expect(operations).toHaveLength(0);
 await page.getByRole('button',{name:'Confirmer le changement de groupe',exact:true}).click();
 await expect(page.getByText('Changement de groupe enregistré.',{exact:true})).toBeVisible();
 expect(operations).toHaveLength(1);
 expect(operations[0]).toMatchObject({action:'change_group',enrollmentId:'00000000-0000-4000-8000-000000000101',groupId:groupB,effectiveOn:'2026-11-02'});
});
