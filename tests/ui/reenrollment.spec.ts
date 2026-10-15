import {expect,test} from '@playwright/test';
import {authenticateFixture,snapshot} from './persistent-fixture';
for(const width of [390,1440]) test(`Réinscription contextualisée à ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000}); await authenticateFixture(page);
  await page.route('**/api/campus',route=>route.fulfill({json:snapshot}));
  await page.route('**/api/reenrollments',route=>route.fulfill({json:{target:{id:'Y2',name:'2025-2026'},previous:{id:'Y1',name:'2024-2025'},students:[{id:'S2',matricule:'ATTENTE-1',firstname:'Élodie',lastname:'À réinscrire'}]}}));
  await page.goto('/etudiants/parcours');
  await expect(page.getByRole('heading',{name:'À réinscrire en 2025-2026'})).toBeVisible();
  await expect(page.getByRole('row').filter({hasText:'ATTENTE-1'})).toContainText('2024-2025');
  await expect(page.getByRole('row').filter({hasText:'ESCEN-TEST-001'})).toHaveCount(0);
  await page.getByRole('searchbox',{name:'Rechercher un étudiant'}).fill('inconnu');
  await expect(page.getByText(/Aucun étudiant à réinscrire/)).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
