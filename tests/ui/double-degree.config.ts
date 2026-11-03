import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: ['double-degree.spec.ts'],
  timeout: 60000, expect: { timeout: 12000 }, workers: 1, reporter: 'list',
  outputDir: '../../test-results/double-degree',
  use: { baseURL: 'http://127.0.0.1:3128', channel: 'chrome', headless: true, trace: 'off' },
  webServer: {
    command: 'node scripts/run-next.mjs dev --port 3128', cwd: process.cwd(),
    env: { ESCEN_BUILD_DIR: 'tmp/next-double-degree' },
    url: 'http://127.0.0.1:3128/connexion', reuseExistingServer: true, timeout: 120000,
  },
});
