import {test,expect} from '@playwright/test';
import {authenticateFixture,snapshot} from './persistent-fixture';

for(const width of [390,1440])for(const existing of [false,true])test(`Attribution réelle relue : cumul ${existing}, ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await authenticateFixture(page);
  await page.route('**/api/campus',route=>route.fulfill({json:snapshot}));
  const writes:Record<string,unknown>[]=[];
  const previews:Record<string,unknown>[]=[];
  const reduction=existing?247500:275000,oldTotal=existing?545000:600000,newTotal=oldTotal-reduction;
  const paid=existing?300000:100000;
  await page.route('**/api/finance/fees-and-scholarships',route=>{
    if(route.request().method()==='POST'){
      const body=route.request().postDataJSON();
      if(body.action==='preview_scholarship'){
        previews.push(body);
        return route.fulfill({json:{revision:1,preview:{versionId:'V',base:existing?495000:550000,reduction,oldTotal,newTotal,paid,remaining:Math.max(0,newTotal-paid),unallocatedCredit:Math.max(0,paid-newTotal),contractStatus:'APPROVED',registration:50000,installments:[{id:'I',dueOn:'2026-10-15',amount:newTotal}]}}});
      }
      writes.push(body);return route.fulfill({status:201,json:{success:true,revision:2}});
    }
    return route.fulfill({json:{revision:1,selectedYearId:'Y',selectedYearCode:'2026-2027',feeSchedules:[],programs:[],levels:[],
      scholarships:[{id:'S',code:'B50',name:'Bourse 50 %',kind:'POURCENTAGE',percent:50,active:true}],
      enrolledStudents:[{enrollmentId:'E',studentId:'ST',matricule:'BOURSE-TEST',name:'Alice Bénéficiaire',programName:'Filière de recette',levelName:'Licence 1',scholarshipContext:{eligible:true,versionId:'V',status:'APPROVED',tuitionGross:550000,tuitionRemaining:existing?495000:550000,existingReductions:existing?55000:0,hasExistingBenefits:existing,registration:50000,currentTotal:oldTotal}}],
      scholarshipAwards:writes.length?[{id:'A',studentMatricule:'BOURSE-TEST',studentName:'Alice Bénéficiaire',scholarshipCode:'B50',scholarshipName:'Bourse 50 %',scholarshipValue:'50%',validFrom:'2026-10-15',financialStatus:'APPROVED',appliedAmount:reduction}]:[],
    }});
  });
  await page.goto('/finance/contrats');
  await page.getByRole('tab',{name:/Attributions/}).click();
  await page.getByRole('button',{name:/Attribuer une bourse/}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('button',{name:'Vérifier l’attribution et le contrat'})).toBeDisabled();
  await dialog.getByLabel('Date de prise d’effet').fill('2026-10-15');
  
  if(existing){
    await dialog.getByRole('button',{name:'Calculer l’effet financier'}).click();
    await expect(dialog.getByRole('alert')).toContainText('Décidez explicitement du cumul');
    expect(previews).toHaveLength(0);
    await dialog.getByRole('checkbox',{name:/J’autorise explicitement le cumul/}).check();
    await dialog.getByLabel('Base du cumul').selectOption('REMAINING');
  }
  await dialog.getByRole('button',{name:'Calculer l’effet financier'}).click();
  await expect(dialog.getByRole('region',{name:'Effet financier de la bourse'})).toContainText(existing?/297\s*500/:/325\s*000/);
  expect(writes).toHaveLength(0);
  await dialog.getByRole('button',{name:'Vérifier l’attribution et le contrat'}).click();
  await expect(dialog).toContainText('Scolarité uniquement');
  await expect(dialog).toContainText('Inscription brute inchangée');
  expect(writes).toHaveLength(0);
  await dialog.getByRole('button',{name:'Confirmer l’attribution et le contrat',exact:true}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toMatchObject({action:'award_scholarship',calculationBasis:existing?'REMAINING':'GROSS',confirmStacking:existing,versionId:'V',reviewedReduction:reduction,reviewedTotal:newTotal});
  await expect(page.getByRole('row').filter({hasText:'BOURSE-TEST'})).toContainText('Réduction appliquée');
});
