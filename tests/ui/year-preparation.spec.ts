import {expect,test} from '@playwright/test';
import {authenticateFixture,snapshot} from './persistent-fixture';
const yearId='10000000-0000-4000-8000-000000000001';
const rows={revision:1,candidates:[{id:'NEW',name:'Nouveau dossier',matricule:'NOUVEAU-1',kind:'new',eligible:true},{id:'OLD',name:'Ancien dossier',matricule:'ANCIEN-1',kind:'reenroll',eligible:true},{id:'ARCHIVE',name:'Ancienne archive',matricule:'ARCHIVE-1',kind:'reenroll',eligible:false}],offerings:[{id:'O',name:'Informatique · Licence 1 · 2026-2027',programId:'P',levelId:'L'}],groups:[{id:'G',name:'Groupe A',offeringId:'O'}],fees:[{id:'F1',category:'SCOLARITE',amount:480000,program_id:null,level_id:null},{id:'F2',category:'INSCRIPTION',amount:50000,program_id:null,level_id:null}]};
for(const width of [390,1440]){
 test(`Inscription et réinscription distinctes à ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await authenticateFixture(page);
  await page.route('**/api/campus',route=>route.fulfill({json:snapshot}));const commands:Record<string,unknown>[]=[];
  await page.route('**/api/enrollments',route=>{if(route.request().method()==='POST'){commands.push(route.request().postDataJSON());return route.fulfill({status:201,json:{revision:2}});}return route.fulfill({json:rows});});
  await page.route('**/api/reenrollments',route=>route.fulfill({json:{target:{id:yearId,name:'2026-2027'},previous:{id:'Y0',name:'2025-2026'},students:[]}}));
  await page.goto('/etudiants');await page.getByRole('button',{name:'Nouvelle inscription',exact:true}).click();
  const dialog=page.getByRole('dialog');const students=dialog.getByRole('combobox',{name:'Étudiant',exact:true});
  await expect(students.locator('option')).toHaveCount(2);await expect(students).not.toContainText('Ancien dossier');
  await students.selectOption('NEW');await dialog.getByRole('combobox',{name:'Formation de l’année'}).selectOption('O');await dialog.getByRole('combobox',{name:'Groupe',exact:true}).selectOption('G');await dialog.getByRole('combobox',{name:'Tarif de scolarité'}).selectOption('F1');await dialog.getByRole('combobox',{name:'Tarif d’inscription'}).selectOption('F2');await dialog.getByLabel('Date d’inscription').fill('2026-10-15');await dialog.getByLabel('Motif').fill('Nouvel étudiant, tarifs vérifiés');await dialog.getByRole('button',{name:'Vérifier l’inscription'}).click();expect(commands).toHaveLength(0);await dialog.getByRole('button',{name:'Confirmer la nouvelle inscription',exact:true}).click();await expect(page.getByText('Nouvelle inscription enregistrée',{exact:true})).toBeVisible();expect(commands[0]).toMatchObject({kind:'new',studentId:'NEW',tuitionId:'F1',registrationId:'F2'});
  await page.goto('/etudiants/parcours');await page.getByRole('button',{name:'Réinscrire un ancien étudiant',exact:true}).click();const oldStudents=page.getByRole('dialog').getByRole('combobox',{name:'Étudiant',exact:true});await expect(oldStudents).not.toContainText('Nouveau dossier');await expect(oldStudents.locator('option[value="ARCHIVE"]')).toHaveJSProperty('disabled',true);
 });
 test(`Préparation affiche la configuration opérationnelle à ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await authenticateFixture(page);
  const years=[{id:yearId,name:'2026-2027',status:'BROUILLON',starts_on:'2026-10-12',ends_on:'2027-06-30'}];
  await page.route('**/api/campus',route=>route.fulfill({json:{...snapshot,academicContext:{selection:'current',selectedYearId:yearId,currentYearId:yearId,years}}}));
  await page.route('**/api/catalog/*',route=>route.fulfill({json:{revision:1,tables:{academic_years:years},historyLinks:[]}}));
  await page.route('**/api/year-preparation',route=>route.fulfill({json:{ready:false,checks:[{key:'groups',label:'Groupes',ready:true,href:''}],history:[{table:'groups',count:13,flagged:0},{table:'paiements',count:62,flagged:0},{table:'notes',count:640,flagged:111}]}}));
  await page.goto('/academique/referentiel?collection=academic_years');
  await page.getByRole('button',{name:'Préparer 2026-2027',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('region',{name:'Données de la sauvegarde'})).toHaveCount(0);
  await expect(dialog).toContainText('Configuration prête');
  await expect(dialog).toContainText('1 sur 1 étapes terminées');
 });
 test(`Préparation affiche les configurations manquantes à ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await authenticateFixture(page);
  const years=[{id:'10000000-0000-4000-8000-000000000099',name:'2025-2026',status:'OUVERTE',starts_on:'2025-10-13',ends_on:'2026-06-30'},{id:yearId,name:'2026-2027',status:'BROUILLON',starts_on:'2026-10-12',ends_on:'2027-06-30'}];
  await page.route('**/api/campus',route=>route.fulfill({json:{...snapshot,academicContext:{selection:'current',selectedYearId:years[0].id,currentYearId:years[0].id,years}}}));
  const writes:{year:string|undefined;body:Record<string,unknown>}[]=[];await page.route('**/api/catalog/*',route=>{if(route.request().method()==='POST')writes.push({year:route.request().headers()['x-escen-year'],body:route.request().postDataJSON()});return route.fulfill({json:{revision:1,tables:{academic_years:years},historyLinks:[]}});});
  await page.route('**/api/year-preparation',route=>route.fulfill({json:{ready:false,checks:[{key:'registration',label:'Frais d’inscription',ready:false,href:'/finance/contrats'},{key:'offerings',label:'Filières',ready:true,href:'/academique/filieres'}]}}));
  await page.goto('/academique/referentiel?collection=academic_years');await expect(page.getByRole('combobox',{name:'Année consultée',exact:true}).locator('option:checked')).toHaveText('Année de travail : 2025-2026');await page.getByRole('button',{name:'Préparer 2026-2027',exact:true}).click();await expect(page.getByRole('heading',{name:'Préparer l’année · 2026-2027'})).toBeVisible();await expect(page.getByText('1 sur 2', {exact:true})).toBeVisible();await page.getByRole('button',{name:'Configurer frais d’inscription',exact:true}).click();await expect(page.getByRole('navigation',{name:'Étapes de configuration'})).toHaveCount(0);const config=page.getByRole('dialog');await expect(config.getByRole('heading',{name:'Ajouter un tarif annuel · 2026-2027'})).toBeVisible();await page.screenshot({path:`.tmp/interface/${width}/preparation-formulaire-direct.png`});await expect(config.getByRole('combobox',{name:'Année universitaire',exact:true})).toHaveCount(0);await expect(config.getByRole('combobox',{name:'Filière (facultative)',exact:true})).toHaveCount(0);await expect(config.getByRole('combobox',{name:'Niveau (facultatif)',exact:true})).toHaveCount(0);await expect(config.getByText('Année : 2026-2027',{exact:true})).toBeVisible();expect(new URL(page.url()).pathname).toBe('/academique/referentiel');await config.getByLabel('Montant FCFA').fill('50000');await config.getByRole('textbox',{name:/^Motif/}).fill('Frais annuels validés');await config.getByRole('button',{name:'Vérifier les informations'}).click();expect(writes).toHaveLength(0);await config.getByRole('button',{name:'Confirmer l’enregistrement',exact:true}).click();await expect(page.getByRole('dialog',{name:'Ajouter un tarif annuel · 2026-2027',exact:true})).toHaveCount(0);expect(writes).toHaveLength(1);expect(writes[0]).toMatchObject({year:yearId,body:{values:{academic_year_id:yearId,category:'INSCRIPTION',amount:50000}}});await expect(page.getByRole('heading',{name:'Préparer l’année · 2026-2027'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 });
}
test('Routes d’inscription et préparation refusent une requête sans session',async({request})=>{
 for(const route of ['/api/enrollments','/api/year-preparation'])expect((await request.get(route)).status()).toBe(401);
});
test('Pré-remplissage des formations proposées avec vérification et enregistrement d’après l’année précédente', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await authenticateFixture(page);
  const years = [
    { id: '10000000-0000-4000-8000-000000000099', name: '2025-2026', status: 'OUVERTE', starts_on: '2025-10-13', ends_on: '2026-06-30' },
    { id: yearId, name: '2026-2027', status: 'BROUILLON', starts_on: '2026-10-12', ends_on: '2027-06-30' },
  ];
  await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, academicContext: { selection: 'current', selectedYearId: years[0].id, currentYearId: years[0].id, years } } }));
  const reconductCalls: Record<string, unknown>[] = [];
  await page.route('**/api/catalog/*', route => route.fulfill({ json: { revision: 1, tables: { academic_years: years, programs: [{ id: 'P1', name: 'Informatique' }], levels: [{ id: 'L1', name: 'Licence 1' }], curricula: [{ id: 'C1', program_id: 'P1', level_id: 'L1' }], academic_offerings: [] }, historyLinks: [] } }));
  await page.route('**/api/year-preparation', route => {
    if (route.request().method() === 'POST') {
      reconductCalls.push(route.request().postDataJSON());
      return route.fulfill({ json: { count: 25, success: true } });
    }
    return route.fulfill({
      json: {
        ready: false,
        previousYear: { id: years[0].id, name: '2025-2026' },
        previousSummary: {
          offerings: [
            'Marketing Digital & E-commerce · Licence 1 · Présentiel',
            'Finance Digitale · Licence 1 · Présentiel',
            'Formation · Licence 1 · Présentiel',
            'Intelligence Artificielle & Génie Logiciel · Licence 1 · Présentiel',
            'Finance Digitale · Licence 2 · Présentiel',
            'Formation · Licence 2 · Présentiel',
            'Marketing Digital & E-commerce · Licence 2 · Présentiel',
            'Intelligence Artificielle & Génie Logiciel · Licence 2 · Présentiel',
            'Formation · Licence 3 · Présentiel',
            'Marketing Digital & E-commerce · Licence 3 · Présentiel',
            'Finance Digitale · Licence 3 · En ligne',
            'Finance Digitale · Licence 3 · Présentiel',
            'Finance Digitale · Master 1 · En ligne',
            'Marketing Digital & E-commerce · Master 1 · En ligne',
            'Formation · Master 1 · En ligne',
            'Finance Digitale · Master 2 · En ligne',
            'Formation · Master 2 · En ligne',
            'Intelligence Artificielle & Génie Logiciel · Licence 3',
            'Finance Digitale · Executive Master',
            'Management de Projets & Transformation Digitale · Executive Master',
            'Management de Projets Numériques · Licence 1',
            'Management de Projets & Transformation Digitale · Master 1',
            'Management de Projets Numériques · Master 1',
            'Management de Projets Numériques · Licence 2',
            'Management de Projets Numériques · Licence 3',
          ],
          groups: [],
          tuitionFees: [],
          registrationFees: [],
          paymentChannels: [],
        },
        checks: [
          { key: 'offerings', label: 'Formations proposées', ready: false, href: '/academique/filieres' },
          { key: 'groups', label: 'Groupes', ready: false, href: '' },
        ],
      },
    });
  });

  await page.goto('/academique/referentiel?collection=academic_years');
  await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Configurer formations proposées', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Formations de l’année', exact: false })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Ajouter une formation annuelle', exact: true })).toBeVisible();
  await expect(dialog.getByText('Aucun enregistrement. Commencez par « Ajouter une formation annuelle ».')).not.toBeVisible();
  await expect(dialog.getByText('En attente de validation').first()).toBeVisible();

  await expect(dialog.getByText('Éléments pré-remplis pour Formations proposées (25) d’après 2025-2026 :')).not.toBeVisible();
  await expect(dialog.getByText('Marketing Digital & E-commerce').first()).toBeVisible();
  await expect(dialog.getByText('Management de Projets Numériques').first()).toBeVisible();

  await dialog.getByRole('button', { name: 'Valider', exact: true }).first().click();
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement de formations proposées', exact: true }).click();
  expect(reconductCalls).toHaveLength(1);
  expect(reconductCalls[0]).toMatchObject({
    targetYearId: yearId,
    previousYearId: years[0].id,
    step: 'offerings',
  });
});

