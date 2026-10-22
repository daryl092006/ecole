import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

const screens = [
  { route: '/personnel/enseignants', api: 'teachers', label: 'Chargement des enseignants et affectations…', title: 'Enseignants et affectations', error: 'Annuaire indisponible' },
  { route: '/academique/presences', api: 'attendances', label: 'Chargement des feuilles de présence…', title: 'Feuilles de présence', error: 'Présences indisponibles' },
  { route: '/academique/emploi-du-temps', api: 'schedule', label: 'Chargement du planning…', title: 'Séances et emploi du temps', error: 'Planning indisponible' },
  { route: '/academique/sujets', api: 'subjects', label: 'Chargement des sujets…', title: 'Bibliothèque des sujets', error: 'Bibliothèque des sujets indisponible' },
];

for (const width of [390, 1440]) for (const screen of screens) {
  test(`Attente, erreur et reprise : ${screen.api} à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const { problems } = await installResponsiveAudit(page, 'staff');
    let attempts = 0;
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/api/${screen.api}`, async route => {
      attempts++;
      if (attempts > 1) return route.fallback();
      await pending;
      await route.fulfill({ status: 503, json: { error: 'Service temporairement indisponible.' } });
    });
    try {
      await page.goto(screen.route);
      const loading = page.locator('.loading-state').filter({ hasText: screen.label });
      await expect(loading).toBeVisible();
      await expect(loading.locator('[aria-hidden="true"]').last()).toBeVisible();
      await page.screenshot({ path: `tmp/screenshots/loading-feedback/${screen.api}-${width}-loading.png` });
    } finally {
      release();
    }
    const error = page.locator('section.error-state');
    await expect(error.getByRole('heading', { name: screen.error, exact: true })).toBeVisible();
    await expect(error).toContainText('Service temporairement indisponible.');
    await expect(page.getByRole('heading', { name: screen.title, exact: true })).toHaveCount(0);
    await page.screenshot({ path: `tmp/screenshots/loading-feedback/${screen.api}-${width}-error.png` });
    await error.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByRole('heading', { name: screen.title, exact: true })).toBeVisible();
    await expect(page.locator('.error-state')).toHaveCount(0);
    expect(attempts).toBe(2);
    expect(problems).toEqual([]);
    const geometry = await page.locator('main').evaluate(element => [element.scrollWidth, element.clientWidth]);
    expect(geometry[0]).toBeLessThanOrEqual(geometry[1] + 1);
  });
}

import {authenticateFixture,snapshot} from './persistent-fixture';
for(const width of [390,1440]) test(`Chargement visible puis erreur et reprise à ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000}); await authenticateFixture(page);
  let release:()=>void=()=>{}; const pending=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/campus',async route=>{await pending;await route.fulfill({json:snapshot});});
  await page.goto('/communication/actualites');
  await expect(page.getByRole('status').filter({hasText:'Chargement des dossiers'})).toBeVisible();
  await expect(page.locator('.loading-state [aria-hidden="true"]').last()).toBeVisible();
  const label = page.getByRole('status').locator('.loading-state-heading strong');
  await expect(label).toContainText('Chargement des dossiers');
  await expect(label).toBeVisible();
  let fail=true;
  await page.route('**/api/website-management*',route=>fail?route.fulfill({status:503,json:{error:'Service indisponible pour la recette'}}):route.fulfill({json:[]}));
  release();
  await expect(page.getByRole('heading',{name:'Articles indisponibles'})).toBeVisible();
  await expect(page.getByText('Aucun article créé pour le site.')).toHaveCount(0);
  fail=false;await page.getByRole('button',{name:'Réessayer',exact:true}).click();
  await expect(page.getByText('Aucun article créé pour le site.')).toBeVisible();
  await expect(page.locator('.loading-state')).toHaveCount(0);
});
