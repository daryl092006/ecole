import { expect, type Page } from '@playwright/test';

export async function waitForBrochurePage(page: Page) {
  await page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt') as Element & { __vue_app__?: { config: { globalProperties: { $nuxt?: { isHydrating: boolean } } } } };
    return root?.__vue_app__?.config.globalProperties.$nuxt?.isHydrating === false;
  });
}

export async function completeBrochureRequest(page: Page) {
  await page.route('**/api/website/public/brochure-requests', route => route.fulfill({ status: 201, json: { received: true } }));
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox')).toHaveCount(3);
  await dialog.getByLabel('Nom complet', { exact: true }).fill('Visiteur de recette');
  await dialog.getByLabel('Adresse email', { exact: true }).fill('visiteur@example.test');
  await dialog.getByLabel('Téléphone', { exact: true }).fill('+228 90 00 00 00');
  await dialog.getByRole('button', { name: 'Accéder à la brochure', exact: true }).click();
}
