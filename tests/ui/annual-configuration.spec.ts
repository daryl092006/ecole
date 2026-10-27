import {expect,test} from '@playwright/test';
import {authenticateFixture,snapshot} from './persistent-fixture';
import { getPreviousYearConfigSummary } from '../../src/services/yearPreparationService';
import type { DatabaseRow } from '../../src/types/persistence';
const yearId='10000000-0000-4000-8000-000000000001';
for (const width of [390, 1440]) test(`Les filières du groupe sont pré-cochées puis enregistrées selon le choix à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await authenticateFixture(page);
  const previousYearId = '10000000-0000-4000-8000-000000000002';
  const years = [
    { id: yearId, name: '2026-2027', status: 'BROUILLON', starts_on: '2026-10-12', ends_on: '2027-06-30' },
    { id: previousYearId, name: '2025-2026', status: 'CLOTUREE', starts_on: '2025-10-13', ends_on: '2026-06-30' },
  ];
  const previousTables: Record<string, DatabaseRow[]> = {
    academic_years: years, levels: [{ id: 'L1', name: 'Licence 1' }],
    programs: [{ id: 'P1', name: 'Marketing Digital & E-commerce' }, { id: 'P2', name: 'Finance Digitale' }],
    curricula: [{ id: 'C1', program_id: 'P1', level_id: 'L1' }, { id: 'C2', program_id: 'P2', level_id: 'L1' }],
    groups: [{ id: 'PREVIOUS-GROUP', name: 'L1 TRONC COMMUN', academic_year_id: previousYearId, level_id: 'L1' }],
    academic_offerings: [
      { id: 'PREVIOUS-O1', academic_year_id: previousYearId, level_id: 'L1', curriculum_id: 'C1', delivery_mode: 'Présentiel' },
      { id: 'PREVIOUS-O2', academic_year_id: previousYearId, level_id: 'L1', curriculum_id: 'C2', delivery_mode: 'Présentiel' },
    ],
    group_offerings: [
      { id: 'LINK1', group_id: 'PREVIOUS-GROUP', offering_id: 'PREVIOUS-O1', academic_year_id: previousYearId },
      { id: 'LINK2', group_id: 'PREVIOUS-GROUP', offering_id: 'PREVIOUS-O2', academic_year_id: previousYearId },
    ],
  };
  const previousSummary = getPreviousYearConfigSummary({ revision: 1, tables: previousTables }, previousYearId)!;
  const tables: Record<string, DatabaseRow[]> = {
    academic_years: years, levels: previousTables.levels, groups: [], group_offerings: [],
    academic_offerings: [
      { id: 'O1', academic_year_id: yearId, level_id: 'L1', curriculum_id: 'C1', program_id: 'P1', delivery_mode: 'Présentiel', name: 'Marketing Digital & E-commerce · Présentiel' },
      { id: 'O2', academic_year_id: yearId, level_id: 'L1', curriculum_id: 'C2', program_id: 'P2', delivery_mode: 'Présentiel', name: 'Finance Digitale · Présentiel' },
      { id: 'ONLINE', academic_year_id: yearId, level_id: 'L1', curriculum_id: 'C1', program_id: 'P1', delivery_mode: 'En ligne', name: 'Marketing Digital & E-commerce · En ligne' },
      { id: 'NEW', academic_year_id: yearId, level_id: 'L1', curriculum_id: 'C3', program_id: 'P3', delivery_mode: 'Présentiel', name: 'Nouvelle filière · Présentiel' },
    ],
  };
  let revision = 1;
  let campusReads = 0;
  const commands: Record<string, unknown>[] = [];
  await page.route('**/api/campus', route => {
    campusReads += 1;
    return route.fulfill({ json: { ...snapshot, academicContext: { selection: 'current', selectedYearId: yearId, currentYearId: yearId, years } } });
  });
  await page.route('**/api/catalog/academic_years', route => route.fulfill({ json: { revision, tables: { academic_years: years }, historyLinks: [] } }));
  await page.route('**/api/year-preparation', route => route.fulfill({ json: {
    ready: false, checks: [{ key: 'groups', label: 'Groupes', ready: tables.groups.length > 0, href: '' }],
    previousYear: previousSummary.previousYear, previousSummary,
  } }));
  await page.route('**/api/catalog/groups{,/**}', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { revision, tables, historyLinks: [] } });
    const body = route.request().postDataJSON();
    expect(body.revision).toBe(revision);
    expect(route.request().headers()['x-escen-year']).toBe(yearId);
    commands.push(body);
    revision += 1;
    const { offering_ids: ids, ...group } = body.values;
    const groupId = route.request().method() === 'PATCH' ? 'SAVED-GROUP' : commands.length === 1 ? 'SAVED-GROUP' : 'SECOND-GROUP';
    tables.groups = [...tables.groups.filter(row => row.id !== groupId), { id: groupId, ...group }];
    tables.group_offerings = [...tables.group_offerings.filter(row => row.group_id !== groupId), ...ids.map((id: string, index: number) => ({ id: `${groupId}-LINK-${index}`, group_id: groupId, offering_id: id, academic_year_id: yearId }))];
    return route.fulfill({ status: 201, json: { id: groupId, revision } });
  });
  await page.goto('/academique/referentiel');
  await page.getByRole('button', { name: 'Ouvrir l’année 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Préparer 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Configurer groupes', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'L1 TRONC COMMUN' }).getByRole('button', { name: 'Modifier', exact: true }).click();
  const marketing = page.getByRole('checkbox', { name: 'Marketing Digital & E-commerce · Présentiel', exact: true });
  const finance = page.getByRole('checkbox', { name: 'Finance Digitale · Présentiel', exact: true });
  const online = page.getByRole('checkbox', { name: 'Marketing Digital & E-commerce · En ligne', exact: true });
  await expect(marketing).toBeChecked();
  await expect(finance).toBeChecked();
  await expect(online).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Nouvelle filière · Présentiel', exact: true })).not.toBeChecked();
  await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/groupes-filieres-selectionnees.png` });
  await marketing.uncheck();
  await finance.uncheck();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Choisissez au moins une filière');
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0);
  expect(commands).toHaveLength(0);
  await online.check();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  expect(commands).toHaveLength(0);
  const readsBeforeSave = campusReads;
  await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Préparer : Groupes · 2026-2027', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Préparation de l’année' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ajouter un groupe', exact: true })).toBeVisible();
  expect(commands).toHaveLength(1);
  expect(commands[0]).toMatchObject({ values: { name: 'L1 TRONC COMMUN', academic_year_id: yearId, level_id: 'L1', offering_ids: ['ONLINE'] } });
  await expect.poll(() => campusReads).toBeGreaterThan(readsBeforeSave);
  await page.getByRole('row').filter({ hasText: 'L1 TRONC COMMUN' }).getByRole('button', { name: 'Modifier', exact: true }).click();
  await expect(online).toBeChecked();
  await expect(marketing).not.toBeChecked();
  await expect(finance).not.toBeChecked();
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(1);
  await page.getByLabel('Nom', { exact: true }).fill('L1 GROUPE MODIFIÉ');
  await page.getByLabel('Motif', { exact: true }).fill('Correction du nom du groupe');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Préparer : Groupes · 2026-2027', exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'L1 GROUPE MODIFIÉ' })).toBeVisible();
  expect(commands).toHaveLength(2);
  await page.getByRole('button', { name: 'Ajouter un groupe', exact: true }).click();
  await page.getByLabel('Nom', { exact: true }).fill('L1 SECOND GROUPE');
  await online.check();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'L1 SECOND GROUPE' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'L1 GROUPE MODIFIÉ' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Préparation de l’année' })).toHaveCount(0);
  expect(commands).toHaveLength(3);
  await page.getByRole('button', { name: 'Retourner à la préparation de l’année', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Préparation de l’année' })).toBeVisible();
  await page.getByRole('button', { name: 'Consulter groupes', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'L1 SECOND GROUPE' })).toBeVisible();
  await page.getByRole('row').filter({ hasText: 'L1 GROUPE MODIFIÉ' }).getByRole('button', { name: 'Modifier', exact: true }).click();
  await page.getByLabel('Nom', { exact: true }).fill('L1 GROUPE FINAL');
  await page.getByLabel('Motif', { exact: true }).fill('Ajustement après consultation');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'L1 GROUPE FINAL' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Préparation de l’année' })).toHaveCount(0);
  expect(commands).toHaveLength(4);
});
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
 await page.getByRole('button', { name: 'Ouvrir l’année 2026-2027', exact: true }).click();
  await page.getByRole('button',{name:'Configurer 2026-2027',exact:true}).click();
 await expect(page.getByText('Programme des cours',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Configurer frais d’inscription',exact:true}).click();
 await page.getByLabel('Montant FCFA',{exact:true}).fill('50000');
 await page.getByRole('button',{name:'Enregistrer le tarif',exact:true}).click();expect(commands).toHaveLength(0);
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
  await page.getByRole('button', { name: 'Ouvrir l’année 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Configurer 2026-2027', exact: true }).click();
  await page.getByRole('button', { name: 'Consulter frais de scolarité', exact: true }).click();
  const list = page.getByRole('dialog', { name: 'Frais de scolarité · 2026-2027', exact: true });
  await expect(list.getByRole('cell', { name: /480\s000 FCFA$/ })).toBeVisible();
  await expect(list.getByRole('cell', { name: /50\s000 FCFA$/ })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: /^Ajouter/ })).toHaveCount(0);
  await list.getByRole('button', { name: 'Voir', exact: true }).click();
  await expect(list.getByRole('heading', { name: 'Consulter un tarif annuel · 2026-2027', exact: true })).toBeVisible();
  await expect(page.getByLabel('Montant FCFA', { exact: true })).toHaveCount(0);
  await list.getByRole('button', { name: '← Retour à la liste', exact: true }).click();
  await list.getByRole('button', { name: 'Modifier', exact: true }).click();
  await expect(page.getByLabel('Montant FCFA', { exact: true })).toHaveValue('480000');
  await list.getByRole('button', { name: '← Retour à la liste', exact: true }).click();
  await list.getByRole('button', { name: 'Ajouter un tarif annuel', exact: true }).click();
  await expect(list.getByRole('heading', { name: 'Ajouter un tarif annuel · 2026-2027', exact: true })).toBeVisible();
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
  await page.getByRole('button', { name: 'Ouvrir l’année 2026-2027', exact: true }).click();
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
