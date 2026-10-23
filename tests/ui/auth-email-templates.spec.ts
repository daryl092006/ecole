import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const types = ['recovery', 'confirmation', 'invite', 'magic_link', 'email_change', 'reauthentication'];
const confirmationUrl = 'https://example.test/auth/v1/verify?token=jeton-fictif&type=recovery&redirect_to=https%3A%2F%2Fportail.example.test%2Fmot-de-passe-reinitialiser';

for (const type of types) for (const width of [360, 768]) {
  test(`Email ${type} : lien sécurisé, identité ESCEN et lecture à ${width}px`, async ({ page }) => {
    const source = readFileSync(`supabase/templates/auth/${type}.html`, 'utf8');
    expect(source).not.toMatch(/<script|<form|supabase|unsubscribe|opt out/i);
    expect(source).toContain('<html lang="fr">');
    if (type === 'reauthentication') {
      expect(source).toContain('{{ .Token }}');
      expect(source).not.toContain('{{ .ConfirmationURL }}');
    } else {
      expect(source.match(/href="{{ \.ConfirmationURL }}"/g)).toHaveLength(2);
      expect(source).not.toContain('{{ .Token }}');
    }
    await page.setViewportSize({ width, height: 1000 });
    await page.setContent(source.replaceAll('{{ .ConfirmationURL }}', confirmationUrl.replaceAll('&', '&amp;')).replaceAll('{{ .Token }}', '123456'));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('body')).toContainText('L’équipe ESCEN');
    await expect(page.locator('body')).toContainText('Lomé, Togo');
    if (type === 'reauthentication') {
      await expect(page.getByText('123456', { exact: true })).toBeVisible();
      await expect(page.getByRole('link')).toHaveCount(0);
    } else {
      for (const link of await page.getByRole('link').all()) await expect(link).toHaveAttribute('href', confirmationUrl);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (type === 'recovery' || type === 'reauthentication') await page.screenshot({ path: `tmp/screenshots/auth-email-templates/${width}/${type}.png`, fullPage: true });
  });
}
