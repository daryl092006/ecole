import {expect,test} from '@playwright/test';
import {authenticateFixture,snapshot} from './persistent-fixture';
for(const width of [390,1440]){
  test(`Dossier dans une fenêtre sans quitter la liste à ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:1000});await authenticateFixture(page);
    await page.route('**/api/campus',route=>route.fulfill({json:snapshot}));
    await page.goto('/etudiants');
    await page.getByRole('button',{name:'Fiche & Dossier',exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Alice Exemple',exact:true})).toBeVisible();
    await expect(page.getByRole('region',{name:'Situation scolaire et financière'})).toContainText('Montant non établi');
    await expect(page.getByRole('region',{name:'Situation scolaire et financière'})).not.toContainText('0 FCFA');
    await expect(page).toHaveURL(/\/etudiants$/);
    await page.getByRole('button',{name:'Fermer le détail'}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('row').filter({hasText:'ESCEN-TEST-001'})).toBeVisible();
  });
  test(`Dossier de l’année précédente chargé hors de la liste cible à ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:1000});await authenticateFixture(page);
    await page.route('**/api/campus',route=>route.fulfill({json:snapshot}));
    await page.route('**/api/reenrollments',route=>route.fulfill({json:{target:{id:'Y2',name:'2025-2026'},previous:{id:'Y1',name:'2024-2025'},students:[{id:'OLD',matricule:'ANCIEN-1',firstname:'Ancien',lastname:'Étudiant'}]}}));
    await page.route('**/api/students/ANCIEN-1',route=>route.fulfill({json:{student:{matricule:'ANCIEN-1',firstname:'Ancien',lastname:'Étudiant',history:[],financials:{available:false},bourse:{active:false}}}}));
    await page.goto('/etudiants/parcours');await page.getByRole('button',{name:'Consulter le dossier'}).click();
    await expect(page.getByRole('dialog').getByRole('heading',{name:'Ancien Étudiant',exact:true})).toBeVisible();
    await expect(page.getByText('Dossier indisponible',{exact:true})).toHaveCount(0);
    await expect(page).toHaveURL(/\/etudiants\/parcours$/);
    await page.getByRole('button',{name:'Fermer le détail'}).click();
  });
}
