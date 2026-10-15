import {expect,test} from '@playwright/test';
import {authenticateFixture,snapshot} from './persistent-fixture';
for(const width of [390,1440]) test(`Chargement visible puis erreur et reprise à ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000}); await authenticateFixture(page);
  let release:()=>void=()=>{}; const pending=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/campus',async route=>{await pending;await route.fulfill({json:snapshot});});
  await page.goto('/communication/actualites');
  await expect(page.getByRole('status').filter({hasText:'Chargement des dossiers'})).toBeVisible();
  await expect(page.locator('.loading-skeleton')).toBeVisible();
  let fail=true;
  await page.route('**/api/website-management*',route=>fail?route.fulfill({status:503,json:{error:'Service indisponible pour la recette'}}):route.fulfill({json:[]}));
  release();
  await expect(page.getByRole('heading',{name:'Articles indisponibles'})).toBeVisible();
  await expect(page.getByText('Aucun article créé pour le site.')).toHaveCount(0);
  fail=false;await page.getByRole('button',{name:'Réessayer',exact:true}).click();
  await expect(page.getByText('Aucun article créé pour le site.')).toBeVisible();
  await expect(page.locator('.loading-skeleton')).toHaveCount(0);
});
