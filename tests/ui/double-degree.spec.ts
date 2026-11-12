import {expect,test} from '@playwright/test';
import {authenticateFixture,snapshot} from './persistent-fixture';
import {installResponsiveAudit} from './responsive-audit-fixture';

for(const width of [390,1440]) for(const selected of [false,true]) {
  test(`Double diplomation facultative : ${selected} à ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:1000});
    await authenticateFixture(page);
    await page.route('**/api/campus',route=>route.fulfill({json:snapshot}));
    const commands:Record<string,unknown>[]=[];
    await page.route('**/api/enrollments',route=>{
      if(route.request().method()==='POST'){
        commands.push(route.request().postDataJSON());
        return route.fulfill({status:201,json:{revision:2}});
      }
      return route.fulfill({json:{revision:1,
        candidates:[{id:'NEW',name:'Nouveau dossier',matricule:'NEW-1',kind:'new',eligible:true}],
        offerings:[{id:'O',name:'IA et GL',programId:'P',levelId:'L',doubleDegreeEligible:true},
          {id:'OTHER',name:'Autre filière',programId:'OTHER',levelId:'L',doubleDegreeEligible:false}],
        groups:[{id:'G',offeringId:'O',levelId:'L',name:'Groupe L1'},{id:'G2',offeringId:'OTHER',levelId:'L',name:'Autre groupe'}],
        fees:[{id:'F1',category:'SCOLARITE',amount:500000},{id:'F2',category:'INSCRIPTION',amount:50000},
          {id:'DD1',category:'SCOLARITE',amount:850000,double_degree:true},
          {id:'DD2',category:'INSCRIPTION',amount:50000,double_degree:true}],
      }});
    });
    await page.goto('/etudiants');
    await page.getByRole('button',{name:'Nouvelle inscription',exact:true}).click();
    const dialog=page.getByRole('dialog');
    await dialog.getByRole('combobox',{name:'Étudiant',exact:true}).selectOption('NEW');
    const formation=dialog.getByRole('combobox',{name:'Formation de l’année'});
    await formation.selectOption('O');
    const choice=dialog.getByRole('combobox',{name:'Double diplomation (facultative)'});
    await expect(choice).toHaveValue('no');
    await expect(dialog.getByRole('combobox',{name:'Tarif de scolarité'})).not.toContainText('850');
    await choice.selectOption('yes');
    await expect(dialog.getByRole('combobox',{name:'Tarif de scolarité'})).toHaveValue('DD1');
    await expect(dialog.getByRole('combobox',{name:'Tarif de scolarité'})).not.toContainText('500');
    await formation.selectOption('OTHER');
    await expect(choice).toHaveCount(0);
    await formation.selectOption('O');
    await expect(choice).toHaveValue('no');
    if(selected)await choice.selectOption('yes');
    await dialog.getByRole('button',{name:'Vérifier l’inscription'}).click();
    expect(commands).toHaveLength(0);
    await expect(dialog).toContainText('Double diplomation (facultative)');
    await dialog.getByRole('button',{name:'Confirmer la nouvelle inscription',exact:true}).click();
    await expect.poll(()=>commands.length).toBe(1);
    expect(commands[0]).toMatchObject({doubleDegree:selected,tuitionId:selected?'DD1':'F1',registrationId:selected?'DD2':'F2'});
  });
}

test('Tarif de double diplomation configurable avec récapitulatif avant écriture',async({page})=>{
  await authenticateFixture(page);
  await page.route('**/api/campus',route=>route.fulfill({json:snapshot}));
  const writes:Record<string,unknown>[]=[];
  await page.route('**/api/finance/fees-and-scholarships',route=>{
    if(route.request().method()==='POST'){
      writes.push(route.request().postDataJSON());
      return route.fulfill({json:{success:true,revision:2}});
    }
    return route.fulfill({json:{revision:1,selectedYearId:'Y',selectedYearCode:'2026-2027',
      scholarships:[],feeSchedules:[],scholarshipAwards:[],enrolledStudents:[],
      programs:[{id:'P',name:'IA et GL',code:'IA-GL',doubleDegreeEligible:true}],
      levels:[{id:'L',name:'Licence 1',code:'L1'}],
    }});
  });
  await page.goto('/finance/contrats');
  await page.getByRole('tab',{name:/Tarifs annuels/}).click();
  await page.getByRole('button',{name:/Configurer un tarif annuel/}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Filière (facultative)').selectOption('P');
  await dialog.getByLabel('Double diplomation (facultative)').selectOption('true');
  await dialog.getByLabel('Montant en FCFA').fill('850000');
  await dialog.locator('#fee-reason').fill('Grille double diplomation validée');
  await dialog.getByRole('button',{name:/Vérifier/}).click();
  expect(writes).toHaveLength(0);
  await expect(dialog).toContainText('Double diplomation');
  await dialog.getByRole('button',{name:'Enregistrer le tarif',exact:true}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toMatchObject({action:'create_fee_schedule',doubleDegree:true,programId:'P',amount:850000});
});

for(const width of [390,1440])test(`Avenant relu à 15 % et paiements conservés à ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await installResponsiveAudit(page,'staff');await authenticateFixture(page);
  const writes:Record<string,unknown>[]=[];
  await page.route('**/api/students/*/operations',route=>{
    if(route.request().method()==='POST'){writes.push(route.request().postDataJSON());return route.fulfill({status:201,json:{revision:2}});}
    return route.fulfill({json:{revision:1,enrollments:[{id:'E',status:'INSCRIT'}],contracts:[{id:'C',versionId:'V',enrollmentId:'E',status:'APPROVED',reference:'CON',amount:600000}],payments:[],paid:878750,
      amendmentOptions:writes.length?[]:[{enrollmentId:'E',versionId:'V',feeId:'F',tuition:975000,registration:50000,currentTotal:600000}]}});
  });
  await page.goto('/etudiants/ESCEN-TEST-001');
  await page.getByRole('navigation',{name:'Sections du dossier étudiant'}).getByRole('button',{name:'Frais et versements',exact:true}).click();
  await page.getByRole('button',{name:'Régulariser la double diplomation'}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Remise individuelle (%)').fill('15');
  await dialog.getByLabel('Date d’échéance de l’avenant').fill('2026-10-15');
  
  await dialog.getByRole('button',{name:'Vérifier l’avenant'}).click();
  expect(writes).toHaveLength(0);
  await expect(dialog).toContainText(/828\s*750/);
  await expect(dialog).toContainText(/878\s*750/);
  await dialog.getByRole('button',{name:'Confirmer l’avenant',exact:true}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toMatchObject({action:'amend_contract',discountPercent:15,feeId:'F'});
});
test('Une attribution seule n’est pas présentée comme une réduction appliquée',async({page})=>{
  await authenticateFixture(page);
  await page.route('**/api/campus',route=>route.fulfill({json:snapshot}));
  await page.route('**/api/finance/fees-and-scholarships',route=>route.fulfill({json:{revision:1,selectedYearId:'Y',selectedYearCode:'2026-2027',scholarships:[],feeSchedules:[],enrolledStudents:[],programs:[],levels:[],
    scholarshipAwards:[{id:'A',studentMatricule:'BOURSE-TEST',studentName:'Bénéficiaire de recette',scholarshipName:'Bourse 50 %',scholarshipValue:'50%',scholarshipCode:'B50',financialStatus:'NOT_APPLIED',appliedAmount:0,validFrom:'2026-10-01'}],
  }}));
  await page.goto('/finance/contrats');
  await page.getByRole('tab',{name:/Attributions/}).click();
  await expect(page.getByRole('row').filter({hasText:'BOURSE-TEST'})).toContainText('Réduction non appliquée');
});
