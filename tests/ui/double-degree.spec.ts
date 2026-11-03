import {expect,test} from '@playwright/test';
import {authenticateFixture,snapshot} from './persistent-fixture';

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
  await page.getByRole('tab',{name:/Tarifs & Tranches/}).click();
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
