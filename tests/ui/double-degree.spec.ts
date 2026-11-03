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
        fees:[{id:'F1',category:'SCOLARITE',amount:500000},{id:'F2',category:'INSCRIPTION',amount:50000}],
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
    await choice.selectOption('yes');
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
    expect(commands[0]).toMatchObject({doubleDegree:selected,tuitionId:'F1',registrationId:'F2'});
  });
}
