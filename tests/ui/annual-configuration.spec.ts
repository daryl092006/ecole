import {expect,test} from '@playwright/test';
import {authenticateFixture,snapshot} from './persistent-fixture';
const yearId='10000000-0000-4000-8000-000000000001';
for(const width of [390,1440])test(`Tarifs annuels communs ou par filière à ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await authenticateFixture(page);
 await page.route('**/api/campus',route=>route.fulfill({json:{...snapshot,academicContext:{currentYearId:yearId,selectedYearId:yearId,selection:'current',years:[{id:yearId,name:'2026-2027',status:'OUVERTE',starts_on:'2026-10-12',ends_on:'2027-06-30'}]}}}));
 const rows:Record<string,unknown>[]=[];const commands:Record<string,unknown>[]=[];
 await page.route('**/api/catalog/annual_fee_schedules',route=>{
 if(route.request().method()==='POST'){const body=route.request().postDataJSON();commands.push(body);rows.push({id:'FEE1',...body.values});return route.fulfill({status:201,json:{revision:2}});}
 return route.fulfill({json:{revision:1,tables:{annual_fee_schedules:rows,academic_years:[{id:yearId,name:'2026-2027',status:'OUVERTE'}],programs:[],levels:[]},historyLinks:[]}});
 });
 await page.route('**/api/catalog/academic_years',route=>route.fulfill({json:{revision:1,tables:{academic_years:[{id:yearId,name:'2026-2027',status:'OUVERTE'}]},historyLinks:[]}}));
 await page.route('**/api/year-preparation*',route=>route.fulfill({json:{ready:false,checks:[{key:'registration',label:'Frais d’inscription',ready:rows.length>0,href:''}]}}));
 await page.goto('/academique/referentiel');
 const rubriques=page.getByRole('combobox',{name:'Rubrique',exact:true});
 await expect(rubriques.locator('option[value=academic_offerings]')).toHaveCount(0);
 await expect(rubriques.locator('option[value=groups]')).toHaveCount(0);
 await page.getByRole('button',{name:'Configurer 2026-2027',exact:true}).click();
 await expect(page.getByText('Programme des cours',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Configurer frais d’inscription',exact:true}).click();
 await page.getByLabel('Montant FCFA',{exact:true}).fill('50000');
 await page.getByRole('button',{name:'Vérifier les informations',exact:true}).click();expect(commands).toHaveLength(0);
 await page.getByRole('button',{name:'Confirmer l’enregistrement',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Préparer l’année · 2026-2027',exact:true})).toBeVisible();
 expect(commands[0]).toMatchObject({values:{academic_year_id:yearId,category:'INSCRIPTION',program_id:'',level_id:'',amount:50000}});
 await page.goto('/finance/contrats');
 await expect(page.getByRole('button',{name:'Ajouter un tarif annuel',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Tarifs de l’année',exact:true})).toHaveCount(0);
});

for (const width of [390, 1440]) test(`Consulter les frais ouvre la liste avant toute saisie à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await authenticateFixture(page);
  const years = [{ id: yearId, name: '2026-2027', status: 'OUVERTE', starts_on: '2026-10-12', ends_on: '2027-06-30' }];
  await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { currentYearId: yearId, selectedYearId: yearId, selection: 'current', years } } }));
  await page.route('**/api/catalog/academic_years', route => route.fulfill({ json: { revision: 1, tables: { academic_years: years }, historyLinks: [] } }));
  await page.route('**/api/year-preparation*', route => route.fulfill({ json: { ready: true, checks: [{ key: 'tuition', label: 'Scolarité', ready: true }] } }));
  await page.route('**/api/catalog/annual_fee_schedules', route => route.fulfill({ json: { revision: 1, tables: { academic_years: years, programs: [], levels: [], annual_fee_schedules: [{ id: 'TUITION', academic_year_id: yearId, category: 'SCOLARITE', amount: 480000 }, { id: 'REGISTRATION', academic_year_id: yearId, category: 'INSCRIPTION', amount: 50000 }] }, historyLinks: [] } }));
  await page.goto('/academique/referentiel');
  await page.getByRole('button', { name: 'Configurer 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Consulter frais de scolarité', exact: true }).click();
  const list = page.getByRole('dialog', { name: 'Frais de scolarité · 2026-2027', exact: true });
  await expect(list.getByRole('cell', { name: /(?:^| )480000$/ })).toBeVisible();
  await expect(list.getByRole('cell', { name: /(?:^| )50000$/ })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: /^Ajouter/ })).toHaveCount(0);
  await list.getByRole('button', { name: 'Voir', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Consulter un tarif annuel · 2026-2027', exact: true })).toBeVisible();
  await expect(page.getByLabel('Montant FCFA', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await list.getByRole('button', { name: 'Modifier', exact: true }).click();
  await expect(page.getByLabel('Montant FCFA', { exact: true })).toHaveValue('480000');
  await page.keyboard.press('Escape');
  await list.getByRole('button', { name: 'Ajouter un tarif annuel', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouter un tarif annuel · 2026-2027', exact: true })).toBeVisible();
  await expect(page.getByLabel('Montant FCFA', { exact: true })).toHaveValue('');
});

for (const width of [390, 1440]) test(`Un groupe affiche plusieurs filières du même niveau à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await authenticateFixture(page);
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  const years = [{ id: yearId, name: '2026-2027', status: 'OUVERTE' }];
  await page.route('**/api/catalog/academic_years', route => route.fulfill({ json: { revision: 1, tables: { academic_years: years }, historyLinks: [] } }));
  await page.route('**/api/year-preparation*', route => route.fulfill({ json: { ready: true, checks: [{ key: 'groups', label: 'Groupes', ready: true }] } }));
  await page.route('**/api/catalog/groups', route => route.fulfill({ json: { revision: 1, historyLinks: [], tables: {
    academic_years: years, levels: [{ id: 'L1', name: 'Licence 1' }],
    groups: [{ id: 'GROUP', name: 'Tronc commun A', academic_year_id: yearId, level_id: 'L1' }],
    group_offerings: [{ id: 'LINK1', group_id: 'GROUP', offering_id: 'O1' }, { id: 'LINK2', group_id: 'GROUP', offering_id: 'O2' }],
    academic_offerings: [{ id: 'O1', name: 'Gestion · Licence 1' }, { id: 'O2', name: 'Commerce · Licence 1' }],
  } } }));
  await page.goto('/academique/referentiel');
  await page.getByRole('button', { name: 'Configurer 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Consulter groupes', exact: true }).click();
  const list = page.getByRole('dialog', { name: 'Groupes · 2026-2027', exact: true });
  await expect(list.getByRole('button', { name: 'Groupes et formations', exact: true })).toHaveCount(0);
  const row = list.getByRole('row').filter({ hasText: 'Tronc commun A' });
  await expect(row).toContainText('Gestion · Licence 1');
  await expect(row).toContainText('Commerce · Licence 1');
  await expect(list.getByRole('columnheader', { name: 'Formations associées', exact: true })).toBeVisible();
  await page.goto('/academique/referentiel?collection=group_offerings');
  await expect(page.getByRole('row').filter({ hasText: 'Tronc commun A' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Ajouter un rattachement de groupe', exact: true })).toHaveCount(0);
});
