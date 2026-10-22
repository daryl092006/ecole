import { defineConfig } from '@playwright/test';

process.env.ESCEN_TEST_WEBSITE_URL ||= 'http://localhost:3200';
export default defineConfig({
  testDir: '.',
  testMatch: ['website-connection.spec.ts', 'website-levels.spec.ts', 'website-exchange.spec.ts', 'website-brochures.spec.ts', 'website-menu.spec.ts', 'website-admissions.spec.ts', 'website-resilience.spec.ts', 'website-seo.spec.ts', 'website-brand-seo.spec.ts', 'website-formations.spec.ts'],
  timeout: 60000, expect: { timeout: 12000 }, workers: 1, reporter: 'list',
  outputDir: '../../test-results/website-review',
  use: { baseURL: 'http://127.0.0.1:3000', channel: 'chrome', headless: true, viewport: { width: 390, height: 900 } },
});
