import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: ['page-review-fixes.spec.ts'],
  timeout: 60000, expect: { timeout: 15000 }, workers: 1, reporter: 'list',
  outputDir: '../../test-results/page-review-fixes',
  use: { baseURL: 'http://127.0.0.1:3129', channel: 'chrome', headless: true, viewport: { width: 1440, height: 950 }, trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3129', cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: 'tmp/next-page-audit-20261023', ESCEN_RESPONSIVE_AUDIT: '1' },
    url: 'http://127.0.0.1:3129/connexion', reuseExistingServer: true, timeout: 120000,
  },
});
