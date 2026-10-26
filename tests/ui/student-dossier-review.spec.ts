import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { installResponsiveAudit } from './responsive-audit-fixture';

const sections = ['Identité et contacts', 'Années et groupes', 'Assiduité et présences', 'Frais et versements', 'Notes', 'Pièces du dossier'];
const artifactRoot = 'tmp/screenshots/student-dossier-review';

for (const width of [390, 820, 1440]) {
  test(`Revue en lecture seule des six onglets du dossier à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { problems } = await installResponsiveAudit(page, 'staff');
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/etudiants/ESCEN-TEST-001');
    const tabs = page.getByRole('navigation', { name: 'Sections du dossier étudiant' });
    await expect(tabs).toBeVisible();
    const observations = [];
    for (const [index, section] of sections.entries()) {
      await tabs.getByRole('button', { name: section, exact: true }).click();
      await expect(tabs.getByRole('button', { name: section, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('main .loading-state:visible')).toHaveCount(0);
      if (section !== 'Frais et versements') {
        await expect(page.getByRole('heading', { name: 'Versements', exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Enregistrer un paiement', exact: true })).toHaveCount(0);
      }
      await expect(page.locator('main .error-state')).toHaveCount(0);
      await page.evaluate(() => { document.querySelector('main')!.scrollTop = 0; });
      await page.screenshot({ path: `${artifactRoot}/${width}/${index}-haut.png` });
      await tabs.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${artifactRoot}/${width}/${index}-contenu.png` });
      observations.push(await page.locator('main').evaluate((main, name) => ({
        section: name,
        headings: [...main.querySelectorAll('h1,h2,h3')].map(node => node.textContent),
        buttons: [...main.querySelectorAll('button')].filter(node => node.getClientRects().length).map(node => node.textContent),
        fields: [...main.querySelectorAll('input,select')].map(node => node.getAttribute('aria-label') || (node as HTMLInputElement).labels?.[0]?.textContent),
        tables: [...main.querySelectorAll('table')].map(table => [...table.querySelectorAll('thead th')].map(node => node.textContent)),
        text: main.textContent,
        summaryHeight: main.querySelector('[aria-label="Situation scolaire et financière"]')?.getBoundingClientRect().height,
      }), section));
    }
    mkdirSync(artifactRoot, { recursive: true });
    writeFileSync(`${artifactRoot}/review-${width}.json`, JSON.stringify(observations, null, 2));
    expect(errors).toEqual([]);
    expect(problems).toEqual([]);
  });
}
