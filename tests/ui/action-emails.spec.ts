import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';

for (const width of [390, 1440]) {
  test(`Réinitialisation : demande de mail, erreur et nouvel essai à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await installResponsiveAudit(page, 'anonymous');
    let fail = true;
    const requests: { email: string; redirectTo: string | null }[] = [];
    await page.route('**/auth/v1/recover*', route => {
      requests.push({ email: route.request().postDataJSON().email, redirectTo: new URL(route.request().url()).searchParams.get('redirect_to') });
      return route.fulfill({ status: fail ? 503 : 200, json: fail ? { message: 'Service de courriel indisponible.' } : {} });
    });
    await page.goto('/mot-de-passe-oublie');
    const email = page.getByRole('textbox', { name: 'Adresse email', exact: true });
    const submit = page.getByRole('button', { name: 'Recevoir un lien de réinitialisation', exact: true });
    await email.fill('Candidate@example.test');
    await submit.click();
    await expect(page.getByRole('alert').filter({ hasText: 'La demande n’a pas pu être envoyée.' })).toBeVisible();
    await expect(email).toHaveValue('Candidate@example.test');
    await expect(submit).toBeEnabled();
    await expect(page.getByRole('status').filter({ hasText: 'un lien de réinitialisation sera envoyé' })).toHaveCount(0);
    fail = false;
    await submit.click();
    await expect(page.getByRole('status').filter({ hasText: 'Si cette adresse correspond à un compte, un lien de réinitialisation sera envoyé.' })).toBeVisible();
    expect(requests).toEqual(Array.from({ length: 2 }, () => ({ email: 'candidate@example.test', redirectTo: 'http://127.0.0.1:3117/mot-de-passe-reinitialiser' })));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
